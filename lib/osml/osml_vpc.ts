/*
 * Copyright 2023 Amazon.com, Inc. or its affiliates.
 */
import {
  GatewayVpcEndpointAwsService,
  InterfaceVpcEndpointAwsService,
  InterfaceVpcEndpointService,
  IVpc,
  SelectedSubnets,
  SubnetType,
  Vpc
} from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";

import { OSMLAccount } from "./osml_account";

export interface OSMLVpcProps {
  // the osml deployment account
  account: OSMLAccount;
  // name of the VPC to create
  vpcName?: string;
  // the vpc id to import
  vpcId?: string;
}

export class OSMLVpc extends Construct {
  public readonly vpc: IVpc;
  public readonly vpcDefaultSecurityGroup: string;
  public readonly selectedSubnets: SelectedSubnets;

  /**
   * Creates or imports a VPC for OSML.
   * @param scope the scope/stack in which to define this construct.
   * @param id the id of this construct within the current scope.
   * @param props the properties of this construct.
   * @returns the OSMLVpc construct.
   */
  constructor(scope: Construct, id: string, props: OSMLVpcProps) {
    super(scope, id);
    // if an osmlVpc id is not explicitly given, use the default osmlVpc
    if (props.vpcId) {
      this.vpc = Vpc.fromLookup(this, "OSMLImportVPC", {
        vpcId: props.vpcId,
        isDefault: false
      });
    } else {
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
      this.vpcDefaultSecurityGroup = vpc.vpcDefaultSecurityGroup;
      this.selectedSubnets = vpc.selectSubnets({
        subnetType: SubnetType.PRIVATE_WITH_EGRESS
      });

      // create custom endpoint prefix's for know ADC regions requiring it
      let partitionPrefix;
      if (props.account.region === "us-iso-east-1") {
        partitionPrefix = "gov.ic.c2s";
      } else if (props.account.region === "us-isob-east-1") {
        partitionPrefix = "gov.sgov.sc2s";
      }

      // create vpc endpoints
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
      // certain endpoints are not supported in ADC regions
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
  }
}
