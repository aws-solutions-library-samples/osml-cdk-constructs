import { RemovalPolicy } from "aws-cdk-lib";
import { IVpc } from "aws-cdk-lib/aws-ec2";
import { IRole } from "aws-cdk-lib/aws-iam";
import { Stream } from "aws-cdk-lib/aws-kinesis";
import { ITopic } from "aws-cdk-lib/aws-sns";
import { Construct } from "constructs";
import { OSMLAccount } from "../osml/osml_account";
import { OSMLBucket } from "../osml/osml_bucket";
import { OSMLQueue } from "../osml/osml_queue";
import { OSMLRepository } from "../osml/osml_repository";
import { OSMLSMEndpoint } from "../osml/osml_sm_endpoint";
export declare class MRTestingConfig {
    SQS_IMAGE_STATUS_QUEUE: string;
    SQS_REGION_STATUS_QUEUE: string;
    SM_CENTER_POINT_MODEL: string;
    SM_FLOOD_MODEL: string;
    SM_AIRCRAFT_MODEL: string;
    SM_ROLE_NAME: string;
    SM_INITIAL_INSTANCE_COUNT: number;
    SM_INITIAL_VARIANT_WEIGHT: number;
    SM_VARIANT_NAME: string;
    SM_CPU_INSTANCE_TYPE: string;
    SM_GPU_INSTANCE_TYPE: string;
    S3_RESULTS_BUCKET: string;
    S3_IMAGE_BUCKET: string;
    S3_TEST_IMAGES_PATH: string;
    ECR_CENTERPOINT_MODEL_REPOSITORY: string;
    ECR_FLOOD_MODEL_REPOSITORY: string;
    ECR_AIRCRAFT_MODEL_REPOSITORY: string;
    ECR_MODELS_PATH: string;
    ECR_MODEL_TARGET: string;
    constructor(SQS_IMAGE_STATUS_QUEUE?: string, SQS_REGION_STATUS_QUEUE?: string, SM_CENTER_POINT_MODEL?: string, SM_FLOOD_MODEL?: string, SM_AIRCRAFT_MODEL?: string, SM_ROLE_NAME?: string, SM_INITIAL_INSTANCE_COUNT?: number, SM_INITIAL_VARIANT_WEIGHT?: number, SM_VARIANT_NAME?: string, SM_CPU_INSTANCE_TYPE?: string, SM_GPU_INSTANCE_TYPE?: string, S3_RESULTS_BUCKET?: string, S3_IMAGE_BUCKET?: string, S3_TEST_IMAGES_PATH?: string, ECR_CENTERPOINT_MODEL_REPOSITORY?: string, ECR_FLOOD_MODEL_REPOSITORY?: string, ECR_AIRCRAFT_MODEL_REPOSITORY?: string, ECR_MODELS_PATH?: string, ECR_MODEL_TARGET?: string);
}
export interface MRTestingProps {
    account: OSMLAccount;
    vpc: IVpc;
    imageStatusTopic: ITopic;
    regionStatusTopic: ITopic;
    mrTestingConfig?: MRTestingConfig;
    smRole?: IRole;
    centerpointModelUri?: string;
    floodModelUri?: string;
    aircraftModelUri?: string;
    deployCenterpointModel?: boolean;
    deployFloodModel?: boolean;
    deployAircraftModel?: boolean;
}
export declare class MRTesting extends Construct {
    resultsBucket: OSMLBucket;
    imageBucket: OSMLBucket;
    resultStream: Stream;
    centerPointModelEndpoint: OSMLSMEndpoint;
    centerPointModelRepository: OSMLRepository;
    centerPointModelImageAsset: string;
    floodModelRepository: OSMLRepository;
    floodModelImageAsset: string;
    floodModelEndpoint: OSMLSMEndpoint;
    aircraftModelRepository: OSMLRepository;
    aircraftModelImageAsset: string;
    aircraftModelEndpoint: OSMLSMEndpoint;
    imageStatusQueue: OSMLQueue;
    regionStatusQueue: OSMLQueue;
    removalPolicy: RemovalPolicy;
    smRole?: IRole;
    mrTestingConfig: MRTestingConfig;
    /**
     * Creates an MRTesting construct.
     * @param scope the scope/stack in which to define this construct.
     * @param id the id of this construct within the current scope.
     * @param props the properties of this construct.
     * @returns the MRTesting construct.
     */
    constructor(scope: Construct, id: string, props: MRTestingProps);
}
