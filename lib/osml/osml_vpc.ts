/*
 * Copyright 2023-2024 Amazon.com, Inc. or its affiliates.
 */

import { RemovalPolicy } from "aws-cdk-lib";
import {
  FlowLog,
  FlowLogDestination,
  FlowLogResourceType,
  GatewayVpcEndpointAwsService,
  InterfaceVpcEndpointAwsService,
  InterfaceVpcEndpointService,
  IVpc,
  SelectedSubnets,
  SubnetFilter,
  SubnetType,
  Vpc
} from "aws-cdk-lib/aws-ec2";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

import { OSMLAccount } from "./osml_account";
import { RegionalConfig } from "./utils/regional_config";

/**
 * Configuration properties for the OSMLVpc Construct, defining how the VPC should be setup.
 *
 * @interface OSMLVpcProps
 */
export interface OSMLVpcProps {
  /**
   * The account details for OSML which will determine some VPC settings based on region and environment.
   *
   * @type {OSMLAccount}
   */
  account: OSMLAccount;

  /**
   * An optional custom name to identify the VPC.
   *
   * @type {string | undefined}
   */
  vpcName?: string;

  /**
   * Optional unique identifier to import/use an existing VPC instead of creating a new one.
   *
   * @type {string | undefined}
   */
  vpcId?: string;

  /**
   * Specifies an optional list of subnet IDs to specifically target within the VPC.
   *
   * @type {string[] | undefined}
   */
  targetSubnets?: string[];

  /**
   * Define the maximum number of AZs for the VPC
   *
   * @type {number[] | undefined}
   */
  maxAzs?: number;
}

/**
 * OSMLVpc is a construct that defines a Virtual Private Cloud specifically configured for OSML operations.
 */
export class OSMLVpc extends Construct {
  /**
   * Holds the AWS VPC instance.
   */
  public readonly vpc: IVpc;

  /**
   * The default security group automatically created with the VPC. Useful for configuring network access.
   */
  public readonly vpcDefaultSecurityGroup: string;

  /**
   * Selected subnets based on the configuration, these are typically private subnets with egress access.
   */
  public selectedSubnets: SelectedSubnets;

  /**
   * Flow log instance to monitor and capture IP traffic related to the VPC.
   */
  public flowLog: FlowLog;

  /**
   * Determines the lifecycle of VPC resources upon stack deletion.
   */
  public removalPolicy: RemovalPolicy;

  /**
   * Constructor for OSMLVpc. Sets up a VPC with or without custom configurations based on the provided properties.
   * @param scope - The scope/stack in which to define this construct.
   * @param id - The ID of this construct within the current scope.
   * @param props - The properties defining how the VPC should be configured.
   */
  constructor(scope: Construct, id: string, props: OSMLVpcProps) {
    super(scope, id);

    const regionConfig = RegionalConfig.getConfig(props.account.region);

    this.removalPolicy = props.account.prodLike
      ? RemovalPolicy.RETAIN
      : RemovalPolicy.DESTROY;

    if (props.vpcId) {
      this.vpc = Vpc.fromLookup(this, "OSMLImportVPC", {
        vpcId: props.vpcId,
        isDefault: false
      });
    } else {
      const vpc = new Vpc(this, "OSMLVPC", {
        vpcName: props.vpcName,
        maxAzs: props.maxAzs ?? regionConfig.maxVpcAzs,
        subnetConfiguration: [
          {
            cidrMask: 23,
            name: "OSML-Public",
            subnetType: SubnetType.PUBLIC
          },
          {
            cidrMask: 23,
            name: "OSML-Private",
            subnetType: SubnetType.PRIVATE_WITH_EGRESS
          }
        ]
      });
      this.vpc = vpc;
      this.vpcDefaultSecurityGroup = vpc.vpcDefaultSecurityGroup;

      this.setupVpcEndpoints(props);
    }

    this.selectSubnets(props);

    if (props.account.prodLike) {
      this.setupFlowLogs();
    }
  }

  /**
   * Configures the VPC endpoints based on regional and account-specific requirements.
   * It dynamically sets up the endpoints for S3, SageMaker, and optionally DynamoDB and CloudWatch,
   * depending on the region and whether the account is associated with the US Government's secured networks.
   *
   * @param props - The properties object containing account and VPC configurations.
   */
  private setupVpcEndpoints(props: OSMLVpcProps): void {
    let partitionPrefix;
    if (props.account.region === "us-iso-east-1") {
      partitionPrefix = "gov.ic.c2s";
    } else if (props.account.region === "us-isob-east-1") {
      partitionPrefix = "gov.sgov.sc2s";
    }

    this.vpc.addGatewayEndpoint("S3GatewayEndpoint", {
      service: GatewayVpcEndpointAwsService.S3
    });
    this.vpc.addInterfaceEndpoint("SMApiInterfaceEndpoint", {
      service: partitionPrefix
        ? new InterfaceVpcEndpointService(
            `${partitionPrefix}.${props.account.region}.sagemaker.api`
          )
        : InterfaceVpcEndpointAwsService.SAGEMAKER_API,
      privateDnsEnabled: true
    });
    this.vpc.addInterfaceEndpoint("SMRuntimeInterfaceEndpoint", {
      service: partitionPrefix
        ? new InterfaceVpcEndpointService(
            `${partitionPrefix}.${props.account.region}.sagemaker.runtime`
          )
        : InterfaceVpcEndpointAwsService.SAGEMAKER_RUNTIME,
      privateDnsEnabled: true
    });

    if (!props.account.isAdc) {
      this.vpc.addGatewayEndpoint("DDBGatewayEndpoint", {
        service: GatewayVpcEndpointAwsService.DYNAMODB
      });
      this.vpc.addInterfaceEndpoint("CWInterfaceEndpoint", {
        service: InterfaceVpcEndpointAwsService.CLOUDWATCH_MONITORING,
        privateDnsEnabled: true
      });
      this.vpc.addInterfaceEndpoint("CWLogsInterfaceEndpoint", {
        service: InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
        privateDnsEnabled: true
      });
    }
  }

  /**
   * Sets up the VPC flow logs for monitoring and auditing network traffic.
   * The logs are stored in CloudWatch with a specified retention period and removal policy.
   */
  private setupFlowLogs(): void {
    const flowLogGroup = new LogGroup(this, "OSMLVpcFlowLogsLogGroup", {
      logGroupName: `OSML-VPC-FlowLogs`,
      retention: RetentionDays.TEN_YEARS,
      removalPolicy: this.removalPolicy
    });

    this.flowLog = new FlowLog(this, "OSMLVpcFlowLogs", {
      resourceType: FlowLogResourceType.fromVpc(this.vpc),
      destination: FlowLogDestination.toCloudWatchLogs(flowLogGroup)
    });
  }

  /**
   * Selects subnets within the VPC based on user specifications.
   * If target subnets are provided, those are selected; otherwise,
   * it defaults to selecting all private subnets with egress.
   *
   * @param props - The object containing the target subnet IDs and VPC configurations.
   */
  private selectSubnets(props: OSMLVpcProps): void {
    // If specified subnets are provided, use them
    if (props.targetSubnets) {
      this.selectedSubnets = this.vpc.selectSubnets({
        subnetFilters: [SubnetFilter.byIds(props.targetSubnets)]
      });
    } else {
      // Otherwise, select all private subnets
      this.selectedSubnets = this.vpc.selectSubnets({
        subnetType: SubnetType.PRIVATE_WITH_EGRESS
      });
    }
  }
}
