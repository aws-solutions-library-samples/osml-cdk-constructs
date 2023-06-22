import { Role } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { OSMLAccount } from "../osml/osml_account";
export interface MRTaskRoleProps {
    account: OSMLAccount;
    roleName: string;
}
export declare class MRTaskRole extends Construct {
    role: Role;
    partition: string;
    /**
     * Creates an MRTaskRole construct.
     * @param scope the scope/stack in which to define this construct.
     * @param id the id of this construct within the current scope.
     * @param props the properties of this construct.
     * @returns the MRTaskRole construct.
     */
    constructor(scope: Construct, id: string, props: MRTaskRoleProps);
}
