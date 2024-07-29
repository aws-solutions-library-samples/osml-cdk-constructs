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
import { IRole, Role } from "aws-cdk-lib/aws-iam";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

import { OSMLAccount } from "./osml_account";
import { BaseConfig, ConfigType } from "./utils/base_config";
import { RegionalConfig } from "./utils/regional_config";

export class OSMLVpcConfig extends BaseConfig {
  /**
   * The name to assign the creation of the VPC.
   * @default "OSML-VPC"
   */
  public VPC_NAME: string;

  /**
   * Unique identifier to import/use an existing VPC instead of creating a new one.
   */
  public VPC_ID?: string;

  /**
   * Specifies an optional list of subnet IDs to specifically target within the VPC.
   */
  public TARGET_SUBNETS?: [string];

  /**
   * Define the maximum number of AZs for the VPC.
   */
  public MAX_AZS?: number;

  /**
   * Specify role to provide when creating CW flow logs.
   */
  public IAM_FLOW_LOG_ROLE?: string;

  /**
   * Constructor for MRDataplaneConfig.
   * @param config - The configuration object for the VPC.
   */

  constructor(config: ConfigType = {}) {
    super({
      // Set default values here
      VPC_NAME: "OSML-VPC",
      ...config
    });
  }
}

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
   * The custom configuration to be used when deploying this VPC.
   *
   * @type {OSMLVpcConfig | undefined}
   */
  config?: OSMLVpcConfig;
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
  public readonly removalPolicy: RemovalPolicy;

  /**
   * The configuration of this construct.
   */
  public readonly config: OSMLVpcConfig;

  /**
   * The flow log Role used for the VPC.
   */
  public flowLogRole?: IRole;

  /**
   * Constructor for OSMLVpc. Sets up a VPC with or without custom configurations based on the provided properties.
   * @param scope - The scope/stack in which to define this construct.
   * @param id - The ID of this construct within the current scope.
   * @param props - The properties defining how the VPC should be configured.
   */
  constructor(scope: Construct, id: string, props: OSMLVpcProps) {
    super(scope, id);

    // Check if a custom configuration was provided
    if (props.config) {
      // Import existing passed-in MR configuration
      this.config = props.config;
    } else {
      // Create a new default configuration
      this.config = new OSMLVpcConfig();
    }

    const regionConfig = RegionalConfig.getConfig(props.account.region);

    this.removalPolicy = props.account.prodLike
      ? RemovalPolicy.RETAIN
      : RemovalPolicy.DESTROY;

    if (this.config.VPC_ID) {
      this.vpc = Vpc.fromLookup(this, "OSMLImportVPC", {
        vpcId: this.config.VPC_ID,
        isDefault: false
      });
    } else {
      const vpc = new Vpc(this, "OSMLVPC", {
        vpcName: this.config.VPC_NAME,
        maxAzs: this.config.MAX_AZS ?? regionConfig.maxVpcAzs,
        subnetConfiguration: [
          {
            cidrMask: 23,
            name: `${this.config.VPC_NAME}-Public`,
            subnetType: SubnetType.PUBLIC
          },
          {
            cidrMask: 23,
            name: `${this.config.VPC_NAME}-Private`,
            subnetType: SubnetType.PRIVATE_WITH_EGRESS
          }
        ]
      });
      this.vpc = vpc;
      this.vpcDefaultSecurityGroup = vpc.vpcDefaultSecurityGroup;

      this.setupVpcEndpoints(props);
    }

    this.selectSubnets();

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

    // Check if a custom flow log role was provided
    if (this.config.IAM_FLOW_LOG_ROLE) {
      this.flowLogRole = Role.fromRoleName(
        this,
        "ImportFlowLog",
        this.config.IAM_FLOW_LOG_ROLE
      );
    }

    // Creat the Flow Logs for the VPC
    this.flowLog = new FlowLog(this, "OSMLVpcFlowLogs", {
      resourceType: FlowLogResourceType.fromVpc(this.vpc),
      destination: FlowLogDestination.toCloudWatchLogs(
        flowLogGroup,
        this.flowLogRole
      )
    });
  }

  /**
   * Selects subnets within the VPC based on user specifications.
   * If target subnets are provided, those are selected; otherwise,
   * it defaults to selecting all private subnets with egress.
   *
   * */
  private selectSubnets(): void {
    // If specified subnets are provided, use them
    if (this.config.TARGET_SUBNETS) {
      this.selectedSubnets = this.vpc.selectSubnets({
        subnetFilters: [SubnetFilter.byIds(this.config.TARGET_SUBNETS)]
      });
    } else {
      // Otherwise, select all private subnets
      this.selectedSubnets = this.vpc.selectSubnets({
        subnetType: SubnetType.PRIVATE_WITH_EGRESS
      });
    }
  }
}
