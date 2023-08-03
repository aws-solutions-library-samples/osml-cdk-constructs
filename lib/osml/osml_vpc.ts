/*
 * Copyright 2023 Amazon.com, Inc. or its affiliates.
 */
import { IVpc, SelectedSubnets, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";

export interface OSMLVpcProps {
  // name of the VPC to create
  vpcName?: string;
  // the vpcid to import
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
    // if a osmlVpc id is not explicitly given use the default osmlVpc
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
    }
  }
}
