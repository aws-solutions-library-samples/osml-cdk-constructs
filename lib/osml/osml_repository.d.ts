import { RemovalPolicy } from "aws-cdk-lib";
import { Repository } from "aws-cdk-lib/aws-ecr";
import { Construct } from "constructs";
export interface OSMLRepositoryProps {
    repositoryName: string;
    removalPolicy: RemovalPolicy;
}
export declare class OSMLRepository extends Construct {
    repository: Repository;
    /**
     * Creates a new OSMLRepository (ECR).
     * @param scope the scope/stack in which to define this construct.
     * @param id the id of this construct within the current scope.
     * @param props the properties of this construct.
     * @returns the OSMLRepository construct.
     */
    constructor(scope: Construct, id: string, props: OSMLRepositoryProps);
}
