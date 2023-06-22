import { RemovalPolicy } from "aws-cdk-lib";
import { Cluster, ContainerDefinition, ContainerImage, FargateService, TaskDefinition } from "aws-cdk-lib/aws-ecs";
import { IRole } from "aws-cdk-lib/aws-iam";
import { LogGroup } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { OSMLAccount } from "../osml/osml_account";
import { OSMLQueue } from "../osml/osml_queue";
import { OSMLRepository } from "../osml/osml_repository";
import { OSMLTable } from "../osml/osml_table";
import { OSMLTopic } from "../osml/osml_topic";
import { OSMLVpc } from "../osml/osml_vpc";
import { MRAutoScaling } from "./mr_autoscaling";
export declare class MRDataplaneConfig {
    VPC_NAME: string;
    SNS_IMAGE_STATUS_TOPIC: string;
    SNS_REGION_STATUS_TOPIC: string;
    SQS_IMAGE_REQUEST_QUEUE: string;
    SQS_REGION_REQUEST_QUEUE: string;
    DDB_JOB_STATUS_TABLE: string;
    DDB_FEATURES_TABLE: string;
    DDB_ENDPOINT_PROCESSING_TABLE: string;
    DDB_REGION_REQUEST_TABLE: string;
    DDB_TTL_ATTRIBUTE: string;
    METRICS_NAMESPACE: string;
    MR_CLUSTER_NAME: string;
    MR_TASK_ROLE_NAME: string;
    MR_CONTAINER_NAME: string;
    MR_TASK_MEMORY: number;
    MR_TASK_CPU: number;
    MR_CONTAINER_MEMORY: number;
    MR_CONTAINER_CPU: number;
    MR_LOGGING_MEMORY: number;
    MR_LOGGING_CPU: number;
    MR_WORKERS_PER_CPU: number;
    MR_REGION_SIZE: string;
    ECR_MODEL_RUNNER_REPOSITORY: string;
    ECR_MODEL_RUNNER_PATH: string;
    ECR_MODEL_RUNNER_TARGET: string;
    constructor(VPC_NAME?: string, SNS_IMAGE_STATUS_TOPIC?: string, SNS_REGION_STATUS_TOPIC?: string, SQS_IMAGE_REQUEST_QUEUE?: string, SQS_REGION_REQUEST_QUEUE?: string, DDB_JOB_STATUS_TABLE?: string, DDB_FEATURES_TABLE?: string, DDB_ENDPOINT_PROCESSING_TABLE?: string, DDB_REGION_REQUEST_TABLE?: string, DDB_TTL_ATTRIBUTE?: string, METRICS_NAMESPACE?: string, MR_CLUSTER_NAME?: string, MR_TASK_ROLE_NAME?: string, MR_CONTAINER_NAME?: string, MR_TASK_MEMORY?: number, MR_TASK_CPU?: number, MR_CONTAINER_MEMORY?: number, MR_CONTAINER_CPU?: number, MR_LOGGING_MEMORY?: number, MR_LOGGING_CPU?: number, MR_WORKERS_PER_CPU?: number, MR_REGION_SIZE?: string, ECR_MODEL_RUNNER_REPOSITORY?: string, ECR_MODEL_RUNNER_PATH?: string, ECR_MODEL_RUNNER_TARGET?: string);
}
export interface MRDataplaneProps {
    account: OSMLAccount;
    mrImage?: ContainerImage;
    mrTerrainUri?: string;
    taskRole?: IRole;
    dataplaneConfig?: MRDataplaneConfig;
    enableAutoscaling?: boolean;
}
export declare class MRDataplane extends Construct {
    mrRole: IRole;
    mrDataplaneConfig: MRDataplaneConfig;
    removalPolicy: RemovalPolicy;
    regionalS3Endpoint: string;
    vpc: OSMLVpc;
    jobStatusTable: OSMLTable;
    featureTable: OSMLTable;
    endpointStatisticsTable: OSMLTable;
    regionRequestTable: OSMLTable;
    mrRepository?: OSMLRepository;
    mrContainer: ContainerImage;
    imageStatusTopic: OSMLTopic;
    regionStatusTopic: OSMLTopic;
    imageRequestQueue: OSMLQueue;
    regionRequestQueue: OSMLQueue;
    logGroup: LogGroup;
    cluster: Cluster;
    taskDefinition: TaskDefinition;
    workers: string;
    containerDefinition: ContainerDefinition;
    fargateService: FargateService;
    autoScaling?: MRAutoScaling;
    mrTerrainUri?: string;
    /**
     * This construct is responsible for managing the data plane of the model runner application
     * It is responsible for:
     * - creating the VPC
     * - creating the DDB tables
     * - create the SQS queues
     * - creating the SNS topics
     * - creating the ECR repositories
     * - creating the ECR containers
     * - creating the ECS cluster
     * - creating the ECS task definition
     * - creating the ECS container
     * - creating the ECS service
     * - creating the ECS auto-scaling group
     * - creating the ECS monitoring dashboards
     *
     * @param scope the scope/stack in which to define this construct.
     * @param id the id of this construct within the current scope.
     * @param props the properties of this construct.
     * @returns the MRDataplane construct
     */
    constructor(scope: Construct, id: string, props: MRDataplaneProps);
}
