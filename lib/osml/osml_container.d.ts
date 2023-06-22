import { Repository } from "aws-cdk-lib/aws-ecr";
import { DockerImageAsset } from "aws-cdk-lib/aws-ecr-assets";
import { ContainerImage } from "aws-cdk-lib/aws-ecs";
import { ECRDeployment } from "cdk-ecr-deployment";
import { Construct } from "constructs";
export interface OSMLECRContainerProps {
    directory: string;
    target: string;
    imageAsset?: DockerImageAsset;
    repository?: Repository;
    buildArgs?: {
        [key: string]: string;
    };
}
export declare class OSMLECRContainer extends Construct {
    repository: Repository;
    imageAsset: DockerImageAsset;
    containerImage: ContainerImage;
    ecrDeployment: ECRDeployment;
    /**
     * Create a new OSMLECRContainer. This construct takes a local directory and copies it to a docker image asset
     * and deploys it to an ECR repository with the "latest" tag if a repository is provided.
     * @param scope the scope/stack in which to define this construct.
     * @param id the id of this construct within the current scope.
     * @param props the properties of this construct.
     * @returns the OSMLECRContainer construct.
     */
    constructor(scope: Construct, id: string, props: OSMLECRContainerProps);
}
