import { IVpc } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
export interface OSMLVpcProps {
    vpcName?: string;
    vpcId?: string;
}
export declare class OSMLVpc extends Construct {
    readonly vpc: IVpc;
    /**
     * Creates or imports a VPC for OSML.
     * @param scope the scope/stack in which to define this construct.
     * @param id the id of this construct within the current scope.
     * @param props the properties of this construct.
     * @returns the OSMLVpc construct.
     */
    constructor(scope: Construct, id: string, props: OSMLVpcProps);
}
