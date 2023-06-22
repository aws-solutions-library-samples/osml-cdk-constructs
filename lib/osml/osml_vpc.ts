/*
 * Copyright 2023 Amazon.com, Inc. or its affiliates.
 */
import { IVpc, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";

export interface OSMLVpcProps {
  // name of the VPC to create
  vpcName?: string;
  // the vpcid to import
  vpcId?: string;
}

export class OSMLVpc extends Construct {
  public readonly vpc: IVpc;

  /**
   * Creates or imports a VPC for OSML.
   * @param scope the scope/stack in which to define this construct.
   * @param id the id of this construct within the current scope.
   * @param props the properties of this construct.
   * @returns the OSMLVpc construct.
   */
  constructor(scope: Construct, id: string, props: OSMLVpcProps) {
    super(scope, id);
    // if a vpc id is not explicitly given use the default vpc
    if (props.vpcId) {
      this.vpc = Vpc.fromLookup(this, "OSMLImportVPC", {
        vpcId: props.vpcId,
        isDefault: false
      });
    } else {
      this.vpc = new Vpc(this, "OSMLVPC", {
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
    }
  }
}
