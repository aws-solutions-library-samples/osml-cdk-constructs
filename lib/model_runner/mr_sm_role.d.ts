import { Role } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { OSMLAccount } from "../osml/osml_account";
export interface MRSMRoleProps {
    account: OSMLAccount;
    roleName: string;
}
export declare class MRSMRole extends Construct {
    role: Role;
    /**
     * Creates a SageMaker execution role for hosting CV models at SM endpoint.
     * @param scope the scope/stack in which to define this construct.
     * @param id the id of this construct within the current scope.
     * @param props the properties of this construct.
     * @returns the MRSMRole construct.
     */
    constructor(scope: Construct, id: string, props: MRSMRoleProps);
}
