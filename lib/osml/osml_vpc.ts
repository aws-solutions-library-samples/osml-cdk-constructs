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

/**
 * Represents the properties for configuring the OSMLVpc Construct.
 *
 * @interface OSMLVpcProps
 */
export interface OSMLVpcProps {
  /**
   * The OSML account associated with this VPC.
   *
   * @type {OSMLAccount}
   */
  account: OSMLAccount;

  /**
   * An optional name for the VPC.
   *
   * @type {string | undefined}
   */
  vpcName?: string;

  /**
   * An optional unique identifier for the VPC.
   *
   * @type {string | undefined}
   */
  vpcId?: string;

  /**
   * An optional array of target subnets within the VPC.
   *
   * @type {string[] | undefined}
   */
  targetSubnets?: string[];
}

/**
 * Represents a Virtual Private Cloud (VPC) for OSML (Open Source Machine Learning) to operate in.
 */
export class OSMLVpc extends Construct {
  /**
   * The VPC resource.
   */
  public readonly vpc: IVpc;

  /**
   * The default security group associated with the VPC.
   */
  public readonly vpcDefaultSecurityGroup: string;

  /**
   * The selected subnets within the VPC.
   */
  public readonly selectedSubnets: SelectedSubnets;

  /**
   * The VPC flow log resource which captures network flow information for a VPC
   */
  public readonly flowLog: FlowLog;

  /**
   * The removal policy for the Construct resources.
   */
  public removalPolicy: RemovalPolicy;

  /**
   * Creates or imports a VPC for OSML to operate in.
   * @param scope - The scope/stack in which to define this construct.
   * @param id - The ID of this construct within the current scope.
   * @param props - The properties of this construct.
   * @returns The OSMLVpc construct.
   */
  constructor(scope: Construct, id: string, props: OSMLVpcProps) {
    super(scope, id);

    // Set the removal policy based on the account type
    this.removalPolicy = props.account.prodLike
      ? RemovalPolicy.RETAIN
      : RemovalPolicy.DESTROY;

    // if an osmlVpc ID is not explicitly given, use the default osmlVpc
    if (props.vpcId) {
      this.vpc = Vpc.fromLookup(this, "OSMLImportVPC", {
        vpcId: props.vpcId,
        isDefault: false
      });
    } else {
      // Create a new VPC
      const vpc = new Vpc(this, "OSMLVPC", {
        vpcName: props.vpcName,
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

      // Expose the default security group created with the VPC
      this.vpcDefaultSecurityGroup = vpc.vpcDefaultSecurityGroup;

      // Expose the private subnets associated with the VPC
      this.selectedSubnets = vpc.selectSubnets({
        subnetType: SubnetType.PRIVATE_WITH_EGRESS
      });

      // Create custom endpoint prefixes for known ADC (AWS Direct Connect) regions requiring it
      let partitionPrefix;
      if (props.account.region === "us-iso-east-1") {
        partitionPrefix = "gov.ic.c2s";
      } else if (props.account.region === "us-isob-east-1") {
        partitionPrefix = "gov.sgov.sc2s";
      }

      // Create VPC endpoints
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

      // Certain endpoints are not supported in ADC regions
      if (!props.account.isAdc) {
        this.vpc.addGatewayEndpoint("DDBGatewayEndpoint", {
          service: GatewayVpcEndpointAwsService.DYNAMODB
        });
        this.vpc.addInterfaceEndpoint("CWInterfaceEndpoint", {
          service: InterfaceVpcEndpointAwsService.CLOUDWATCH,
          privateDnsEnabled: true
        });
        this.vpc.addInterfaceEndpoint("CWLogsInterfaceEndpoint", {
          service: InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
          privateDnsEnabled: true
        });
      }
    }

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

    if (props.account.prodLike) {
      // enable vpc flow logs
      const flowLogGroup = new LogGroup(this, "OSMLVpcFlowLogsLogGroup", {
        logGroupName: `OSML-VPC-FlowLogs-${id}`,
        retention: RetentionDays.TEN_YEARS,
        removalPolicy: this.removalPolicy
      });

      this.flowLog = new FlowLog(this, "OSMLVpcFlowLogs", {
        resourceType: FlowLogResourceType.fromVpc(this.vpc),
        destination: FlowLogDestination.toCloudWatchLogs(flowLogGroup)
      });
    }
  }
}
