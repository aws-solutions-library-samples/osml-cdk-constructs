import { CfnEndpoint, CfnEndpointConfig, CfnModel } from "aws-cdk-lib/aws-sagemaker";
import { Construct } from "constructs";
export interface OSMLSMEndpointProps {
    roleArn: string;
    modelContainerUri: string;
    modelName: string;
    initialInstanceCount: number;
    initialVariantWeight: number;
    instanceType: string;
    variantName: string;
}
export declare class OSMLSMEndpoint extends Construct {
    model: CfnModel;
    endpointConfig: CfnEndpointConfig;
    endpoint: CfnEndpoint;
    /**
     * Creates a SageMaker endpoint for the specified model.
     * @param scope the scope/stack in which to define this construct.
     * @param id the id of this construct within the current scope.
     * @param props the properties of this construct.
     * @returns the OSMLSMEndpoint construct.
     */
    constructor(scope: Construct, id: string, props: OSMLSMEndpointProps);
}
