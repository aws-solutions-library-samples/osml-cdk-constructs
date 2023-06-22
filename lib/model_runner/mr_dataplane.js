"use strict";
/*
 * Copyright 2023 Amazon.com, Inc. or its affiliates.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MRDataplane = exports.MRDataplaneConfig = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_dynamodb_1 = require("aws-cdk-lib/aws-dynamodb");
const aws_ecs_1 = require("aws-cdk-lib/aws-ecs");
const aws_logs_1 = require("aws-cdk-lib/aws-logs");
const constructs_1 = require("constructs");
const osml_container_1 = require("../osml/osml_container");
const osml_queue_1 = require("../osml/osml_queue");
const osml_repository_1 = require("../osml/osml_repository");
const osml_table_1 = require("../osml/osml_table");
const osml_topic_1 = require("../osml/osml_topic");
const osml_vpc_1 = require("../osml/osml_vpc");
const mr_autoscaling_1 = require("./mr_autoscaling");
const mr_task_role_1 = require("./mr_task_role");
// mutable configuration dataclass for model runner
// for a more detailed breakdown of the configuration see: configuration_guide.md in the documentation directory.
class MRDataplaneConfig {
    constructor(
    // vpc names
    VPC_NAME = "OSMLVPC", 
    // topic names
    SNS_IMAGE_STATUS_TOPIC = "ImageStatusTopic", SNS_REGION_STATUS_TOPIC = "RegionStatusTopic", 
    // queue names
    SQS_IMAGE_REQUEST_QUEUE = "ImageRequestQueue", SQS_REGION_REQUEST_QUEUE = "RegionRequestQueue", 
    // table names
    DDB_JOB_STATUS_TABLE = "ImageProcessingJobStatus", DDB_FEATURES_TABLE = "ImageProcessingFeatures", DDB_ENDPOINT_PROCESSING_TABLE = "EndpointProcessingStatistics", DDB_REGION_REQUEST_TABLE = "RegionProcessingJobStatus", 
    // time to live attribute to be used on tables
    DDB_TTL_ATTRIBUTE = "expire_time", 
    // metrics constants
    METRICS_NAMESPACE = "OSML", 
    // fargate configuration
    // for valid task resource values see:
    // https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-cpu-memory-error.html
    MR_CLUSTER_NAME = "OSMLCluster", MR_TASK_ROLE_NAME = "OSMLTaskExecutionRole", MR_CONTAINER_NAME = "OSMLModelRunnerContainer", MR_TASK_MEMORY = 8192, MR_TASK_CPU = 4096, MR_CONTAINER_MEMORY = 6144, MR_CONTAINER_CPU = 3072, MR_LOGGING_MEMORY = 512, MR_LOGGING_CPU = 512, MR_WORKERS_PER_CPU = 1, MR_REGION_SIZE = "(2048, 2048)", 
    // repository name for the model runner container
    ECR_MODEL_RUNNER_REPOSITORY = "model-runner-container", 
    // path to the local source for model runner to build against
    ECR_MODEL_RUNNER_PATH = "lib/model_runner", 
    // build target for model runner container
    ECR_MODEL_RUNNER_TARGET = "model_runner") {
        this.VPC_NAME = VPC_NAME;
        this.SNS_IMAGE_STATUS_TOPIC = SNS_IMAGE_STATUS_TOPIC;
        this.SNS_REGION_STATUS_TOPIC = SNS_REGION_STATUS_TOPIC;
        this.SQS_IMAGE_REQUEST_QUEUE = SQS_IMAGE_REQUEST_QUEUE;
        this.SQS_REGION_REQUEST_QUEUE = SQS_REGION_REQUEST_QUEUE;
        this.DDB_JOB_STATUS_TABLE = DDB_JOB_STATUS_TABLE;
        this.DDB_FEATURES_TABLE = DDB_FEATURES_TABLE;
        this.DDB_ENDPOINT_PROCESSING_TABLE = DDB_ENDPOINT_PROCESSING_TABLE;
        this.DDB_REGION_REQUEST_TABLE = DDB_REGION_REQUEST_TABLE;
        this.DDB_TTL_ATTRIBUTE = DDB_TTL_ATTRIBUTE;
        this.METRICS_NAMESPACE = METRICS_NAMESPACE;
        this.MR_CLUSTER_NAME = MR_CLUSTER_NAME;
        this.MR_TASK_ROLE_NAME = MR_TASK_ROLE_NAME;
        this.MR_CONTAINER_NAME = MR_CONTAINER_NAME;
        this.MR_TASK_MEMORY = MR_TASK_MEMORY;
        this.MR_TASK_CPU = MR_TASK_CPU;
        this.MR_CONTAINER_MEMORY = MR_CONTAINER_MEMORY;
        this.MR_CONTAINER_CPU = MR_CONTAINER_CPU;
        this.MR_LOGGING_MEMORY = MR_LOGGING_MEMORY;
        this.MR_LOGGING_CPU = MR_LOGGING_CPU;
        this.MR_WORKERS_PER_CPU = MR_WORKERS_PER_CPU;
        this.MR_REGION_SIZE = MR_REGION_SIZE;
        this.ECR_MODEL_RUNNER_REPOSITORY = ECR_MODEL_RUNNER_REPOSITORY;
        this.ECR_MODEL_RUNNER_PATH = ECR_MODEL_RUNNER_PATH;
        this.ECR_MODEL_RUNNER_TARGET = ECR_MODEL_RUNNER_TARGET;
    }
}
exports.MRDataplaneConfig = MRDataplaneConfig;
class MRDataplane extends constructs_1.Construct {
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
    constructor(scope, id, props) {
        super(scope, id);
        // check if a custom configuration was provided
        if (props.dataplaneConfig != undefined) {
            // import existing pass in MR configuration
            this.mrDataplaneConfig = props.dataplaneConfig;
        }
        else {
            // create a new default configuration
            this.mrDataplaneConfig = new MRDataplaneConfig();
        }
        // check if a role was provided
        if (props.taskRole != undefined) {
            // import passed in MR task role
            this.mrRole = props.taskRole;
        }
        else {
            // create a new role
            this.mrRole = new mr_task_role_1.MRTaskRole(this, "MRRole", {
                account: props.account,
                roleName: this.mrDataplaneConfig.MR_TASK_ROLE_NAME
            }).role;
        }
        // check if a custom model runner container image was provided
        if (props.mrImage != undefined) {
            // import the passed image
            this.mrContainer = props.mrImage;
        }
        else {
            // build an ECR repo for the model runner container
            this.mrRepository = new osml_repository_1.OSMLRepository(this, "MRModelRunnerRepository", {
                repositoryName: this.mrDataplaneConfig.ECR_MODEL_RUNNER_REPOSITORY,
                removalPolicy: this.removalPolicy
            });
            // build and deploy model runner container to target repo
            this.mrContainer = new osml_container_1.OSMLECRContainer(this, "MRModelRunnerContainer", {
                directory: this.mrDataplaneConfig.ECR_MODEL_RUNNER_PATH,
                target: this.mrDataplaneConfig.ECR_MODEL_RUNNER_TARGET,
                repository: this.mrRepository.repository
            }).containerImage;
        }
        // set up a regional s3 endpoint for GDAL to use
        this.regionalS3Endpoint = aws_cdk_lib_1.region_info.Fact.find(props.account.region, aws_cdk_lib_1.region_info.FactName.servicePrincipal("s3.amazonaws.com"));
        // setup a removal policy
        this.removalPolicy = props.account.prodLike
            ? aws_cdk_lib_1.RemovalPolicy.RETAIN
            : aws_cdk_lib_1.RemovalPolicy.DESTROY;
        // build a VPC to house containers and services
        this.vpc = new osml_vpc_1.OSMLVpc(this, "MRVPC", {
            vpcName: this.mrDataplaneConfig.VPC_NAME
        });
        // job status table to store worker status info
        this.jobStatusTable = new osml_table_1.OSMLTable(this, "MRJobStatusTable", {
            tableName: this.mrDataplaneConfig.DDB_JOB_STATUS_TABLE,
            partitionKey: {
                name: "image_id",
                type: aws_dynamodb_1.AttributeType.STRING
            },
            removalPolicy: this.removalPolicy,
            ttlAttribute: this.mrDataplaneConfig.DDB_TTL_ATTRIBUTE
        });
        // geojson feature storage for mapping back to images
        this.featureTable = new osml_table_1.OSMLTable(this, "MRFeaturesTable", {
            tableName: this.mrDataplaneConfig.DDB_FEATURES_TABLE,
            partitionKey: {
                name: "hash_key",
                type: aws_dynamodb_1.AttributeType.STRING
            },
            sortKey: {
                name: "range_key",
                type: aws_dynamodb_1.AttributeType.STRING
            },
            removalPolicy: this.removalPolicy,
            ttlAttribute: this.mrDataplaneConfig.DDB_TTL_ATTRIBUTE
        });
        // used to track in-progress regions by model endpoint
        this.endpointStatisticsTable = new osml_table_1.OSMLTable(this, "MREndpointProcessingTable", {
            tableName: this.mrDataplaneConfig.DDB_ENDPOINT_PROCESSING_TABLE,
            partitionKey: {
                name: "hash_key",
                type: aws_dynamodb_1.AttributeType.STRING
            },
            removalPolicy: this.removalPolicy,
            ttlAttribute: this.mrDataplaneConfig.DDB_TTL_ATTRIBUTE
        });
        // region request table to store region status info
        this.regionRequestTable = new osml_table_1.OSMLTable(this, "MRRegionRequestTable", {
            tableName: this.mrDataplaneConfig.DDB_REGION_REQUEST_TABLE,
            partitionKey: {
                name: "image_id",
                type: aws_dynamodb_1.AttributeType.STRING
            },
            sortKey: {
                name: "region_id",
                type: aws_dynamodb_1.AttributeType.STRING
            },
            removalPolicy: this.removalPolicy,
            ttlAttribute: this.mrDataplaneConfig.DDB_TTL_ATTRIBUTE
        });
        // create topic for image request status notifications
        this.imageStatusTopic = new osml_topic_1.OSMLTopic(this, "MRImageStatusTopic", {
            topicName: this.mrDataplaneConfig.SNS_IMAGE_STATUS_TOPIC
        });
        // create topic for region request status notifications
        this.regionStatusTopic = new osml_topic_1.OSMLTopic(this, "MRRegionStatusTopic", {
            topicName: this.mrDataplaneConfig.SNS_REGION_STATUS_TOPIC
        });
        // create a SQS queue for the image processing jobs. This queue is subscribed to the SNS topic for new
        // image processing tasks and will eventually filter those tasks to make sure they are destined for this
        // processing cell. If a task fails multiple times it will be sent to a DLQ.
        this.imageRequestQueue = new osml_queue_1.OSMLQueue(this, "MRImageRequestQueue", {
            queueName: this.mrDataplaneConfig.SQS_IMAGE_REQUEST_QUEUE
        });
        // create a SQS queue for the image region processing tasks. If an image is too large to be handled by that
        // a single instance it will divide the image into regions and place a task for each on this queue. That allows
        // other model runner instances to pickup part of the overall processing load for this image.
        this.regionRequestQueue = new osml_queue_1.OSMLQueue(this, "MRRegionRequestQueue", {
            queueName: this.mrDataplaneConfig.SQS_REGION_REQUEST_QUEUE
        });
        // log group for MR container
        this.logGroup = new aws_logs_1.LogGroup(this, "MRServiceLogGroup", {
            logGroupName: "/aws/OSML/MRService",
            retention: aws_logs_1.RetentionDays.TEN_YEARS,
            removalPolicy: this.removalPolicy
        });
        // build cluster to house our containers when they spin up
        this.cluster = new aws_ecs_1.Cluster(this, "MRCluster", {
            clusterName: this.mrDataplaneConfig.MR_CLUSTER_NAME,
            vpc: this.vpc.vpc
        });
        // define our ecs task
        this.taskDefinition = new aws_ecs_1.TaskDefinition(this, "MRTaskDefinition", {
            // Guessing what specs are needed
            memoryMiB: this.mrDataplaneConfig.MR_TASK_MEMORY.toString(),
            cpu: this.mrDataplaneConfig.MR_TASK_CPU.toString(),
            compatibility: aws_ecs_1.Compatibility.FARGATE,
            taskRole: this.mrRole
        });
        // calculate the workers to assign per task instance
        this.workers = Math.ceil((this.mrDataplaneConfig.MR_TASK_CPU / 1024) *
            this.mrDataplaneConfig.MR_WORKERS_PER_CPU).toString();
        // build our container to run our service
        let containerEnv = {
            AWS_DEFAULT_REGION: props.account.region,
            JOB_TABLE: this.jobStatusTable.table.tableName,
            FEATURE_TABLE: this.featureTable.table.tableName,
            ENDPOINT_TABLE: this.endpointStatisticsTable.table.tableName,
            REGION_REQUEST_TABLE: this.regionRequestTable.table.tableName,
            IMAGE_QUEUE: this.imageRequestQueue.queue.queueUrl,
            REGION_QUEUE: this.regionRequestQueue.queue.queueUrl,
            IMAGE_STATUS_TOPIC: this.imageStatusTopic.topic.topicArn,
            REGION_STATUS_TOPIC: this.regionStatusTopic.topic.topicArn,
            AWS_S3_ENDPOINT: this.regionalS3Endpoint,
            WORKERS_PER_CPU: this.mrDataplaneConfig.MR_WORKERS_PER_CPU.toString(),
            WORKERS: this.workers,
            REGION_SIZE: this.mrDataplaneConfig.MR_REGION_SIZE
        };
        // check if a custom model runner container image was provided
        if (props.mrTerrainUri != undefined) {
            // import the passed image
            this.mrTerrainUri = props.mrTerrainUri;
            containerEnv = Object.assign(containerEnv, {
                ELEVATION_DATA_LOCATION: this.mrTerrainUri
            });
        }
        // build a container definition to run our service
        this.containerDefinition = this.taskDefinition.addContainer("MRContainerDefinition", {
            containerName: this.mrDataplaneConfig.MR_CONTAINER_NAME,
            image: this.mrContainer,
            memoryLimitMiB: this.mrDataplaneConfig.MR_CONTAINER_MEMORY,
            cpu: this.mrDataplaneConfig.MR_CONTAINER_CPU,
            environment: containerEnv,
            startTimeout: aws_cdk_lib_1.Duration.minutes(1),
            stopTimeout: aws_cdk_lib_1.Duration.minutes(1),
            // create log group for console output (STDOUT)
            logging: new aws_ecs_1.FireLensLogDriver({
                options: {
                    Name: "cloudwatch",
                    region: props.account.region,
                    log_key: "log",
                    log_format: "json/emf",
                    log_group_name: this.logGroup.logGroupName,
                    log_stream_prefix: "${TASK_ID}/"
                }
            }),
            disableNetworking: false
        });
        // add port mapping to container
        this.taskDefinition.defaultContainer?.addPortMappings({
            containerPort: 80,
            hostPort: 80,
            protocol: aws_ecs_1.Protocol.TCP
        });
        // set up fargate service
        this.fargateService = new aws_ecs_1.FargateService(this, "MRService", {
            taskDefinition: this.taskDefinition,
            cluster: this.cluster,
            minHealthyPercent: 100
        });
        // build a fluent bit log router for the MR container
        this.taskDefinition.addFirelensLogRouter("MRFireLensContainer", {
            image: (0, aws_ecs_1.obtainDefaultFluentBitECRImage)(this.taskDefinition, this.taskDefinition.defaultContainer?.logDriverConfig),
            essential: true,
            firelensConfig: {
                type: aws_ecs_1.FirelensLogRouterType.FLUENTBIT
            },
            cpu: this.mrDataplaneConfig.MR_LOGGING_CPU,
            memoryLimitMiB: this.mrDataplaneConfig.MR_LOGGING_MEMORY,
            environment: { LOG_REGION: props.account.region },
            logging: aws_ecs_1.LogDriver.awsLogs({
                logGroup: new aws_logs_1.LogGroup(this, "MRFireLens", {
                    logGroupName: "/aws/OSML/MRFireLens",
                    retention: aws_logs_1.RetentionDays.TEN_YEARS,
                    removalPolicy: this.removalPolicy
                }),
                streamPrefix: "OSML"
            }),
            readonlyRootFilesystem: false,
            healthCheck: {
                command: [
                    "CMD-SHELL",
                    'echo \'{"health": "check"}\' | nc 127.0.0.1 8877 || exit 1'
                ],
                retries: 3
            }
        });
        if (props.account.enableAutoscaling) {
            // build service autoscaling group for MR fargate service
            this.autoScaling = new mr_autoscaling_1.MRAutoScaling(this, "MRAutoScaling", {
                account: props.account,
                role: this.mrRole,
                imageRequestQueue: this.imageRequestQueue.queue,
                regionRequestQueue: this.regionRequestQueue.queue,
                cluster: this.cluster,
                service: this.fargateService,
                mrDataplaneConfig: this.mrDataplaneConfig
            });
        }
    }
}
exports.MRDataplane = MRDataplane;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXJfZGF0YXBsYW5lLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibXJfZGF0YXBsYW5lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7R0FFRzs7O0FBRUgsNkNBQW1FO0FBQ25FLDJEQUF5RDtBQUN6RCxpREFZNkI7QUFFN0IsbURBQStEO0FBQy9ELDJDQUF1QztBQUd2QywyREFBMEQ7QUFDMUQsbURBQStDO0FBQy9DLDZEQUF5RDtBQUN6RCxtREFBK0M7QUFDL0MsbURBQStDO0FBQy9DLCtDQUEyQztBQUMzQyxxREFBaUQ7QUFDakQsaURBQTRDO0FBRTVDLG1EQUFtRDtBQUNuRCxpSEFBaUg7QUFDakgsTUFBYSxpQkFBaUI7SUFDNUI7SUFDRSxZQUFZO0lBQ0wsV0FBVyxTQUFTO0lBQzNCLGNBQWM7SUFDUCx5QkFBeUIsa0JBQWtCLEVBQzNDLDBCQUEwQixtQkFBbUI7SUFDcEQsY0FBYztJQUNQLDBCQUEwQixtQkFBbUIsRUFDN0MsMkJBQTJCLG9CQUFvQjtJQUN0RCxjQUFjO0lBQ1AsdUJBQXVCLDBCQUEwQixFQUNqRCxxQkFBcUIseUJBQXlCLEVBQzlDLGdDQUFnQyw4QkFBOEIsRUFDOUQsMkJBQTJCLDJCQUEyQjtJQUM3RCw4Q0FBOEM7SUFDdkMsb0JBQW9CLGFBQWE7SUFDeEMsb0JBQW9CO0lBQ2Isb0JBQW9CLE1BQU07SUFDakMsd0JBQXdCO0lBQ3hCLHNDQUFzQztJQUN0Qyx5RkFBeUY7SUFDbEYsa0JBQWtCLGFBQWEsRUFDL0Isb0JBQW9CLHVCQUF1QixFQUMzQyxvQkFBb0IsMEJBQTBCLEVBQzlDLGlCQUFpQixJQUFJLEVBQ3JCLGNBQWMsSUFBSSxFQUNsQixzQkFBc0IsSUFBSSxFQUMxQixtQkFBbUIsSUFBSSxFQUN2QixvQkFBb0IsR0FBRyxFQUN2QixpQkFBaUIsR0FBRyxFQUNwQixxQkFBcUIsQ0FBQyxFQUN0QixpQkFBaUIsY0FBYztJQUN0QyxpREFBaUQ7SUFDMUMsOEJBQThCLHdCQUF3QjtJQUM3RCw2REFBNkQ7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YztnQkFDNUIsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLGlCQUFpQjthQUMxQyxDQUFDLENBQUM7U0FDSjtJQUNILENBQUM7Q0FDRjtBQW5VRCxrQ0FtVUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IDIwMjMgQW1hem9uLmNvbSwgSW5jLiBvciBpdHMgYWZmaWxpYXRlcy5cbiAqL1xuXG5pbXBvcnQgeyBEdXJhdGlvbiwgcmVnaW9uX2luZm8sIFJlbW92YWxQb2xpY3kgfSBmcm9tIFwiYXdzLWNkay1saWJcIjtcbmltcG9ydCB7IEF0dHJpYnV0ZVR5cGUgfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiXCI7XG5pbXBvcnQge1xuICBDbHVzdGVyLFxuICBDb21wYXRpYmlsaXR5LFxuICBDb250YWluZXJEZWZpbml0aW9uLFxuICBDb250YWluZXJJbWFnZSxcbiAgRmFyZ2F0ZVNlcnZpY2UsXG4gIEZpcmVMZW5zTG9nRHJpdmVyLFxuICBGaXJlbGVuc0xvZ1JvdXRlclR5cGUsXG4gIExvZ0RyaXZlcixcbiAgb2J0YWluRGVmYXVsdEZsdWVudEJpdEVDUkltYWdlLFxuICBQcm90b2NvbCxcbiAgVGFza0RlZmluaXRpb25cbn0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1lY3NcIjtcbmltcG9ydCB7IElSb2xlIH0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1pYW1cIjtcbmltcG9ydCB7IExvZ0dyb3VwLCBSZXRlbnRpb25EYXlzIH0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1sb2dzXCI7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xuXG5pbXBvcnQgeyBPU01MQWNjb3VudCB9IGZyb20gXCIuLi9vc21sL29zbWxfYWNjb3VudFwiO1xuaW1wb3J0IHsgT1NNTEVDUkNvbnRhaW5lciB9IGZyb20gXCIuLi9vc21sL29zbWxfY29udGFpbmVyXCI7XG5pbXBvcnQgeyBPU01MUXVldWUgfSBmcm9tIFwiLi4vb3NtbC9vc21sX3F1ZXVlXCI7XG5pbXBvcnQgeyBPU01MUmVwb3NpdG9yeSB9IGZyb20gXCIuLi9vc21sL29zbWxfcmVwb3NpdG9yeVwiO1xuaW1wb3J0IHsgT1NNTFRhYmxlIH0gZnJvbSBcIi4uL29zbWwvb3NtbF90YWJsZVwiO1xuaW1wb3J0IHsgT1NNTFRvcGljIH0gZnJvbSBcIi4uL29zbWwvb3NtbF90b3BpY1wiO1xuaW1wb3J0IHsgT1NNTFZwYyB9IGZyb20gXCIuLi9vc21sL29zbWxfdnBjXCI7XG5pbXBvcnQgeyBNUkF1dG9TY2FsaW5nIH0gZnJvbSBcIi4vbXJfYXV0b3NjYWxpbmdcIjtcbmltcG9ydCB7IE1SVGFza1JvbGUgfSBmcm9tIFwiLi9tcl90YXNrX3JvbGVcIjtcblxuLy8gbXV0YWJsZSBjb25maWd1cmF0aW9uIGRhdGFjbGFzcyBmb3IgbW9kZWwgcnVubmVyXG4vLyBmb3IgYSBtb3JlIGRldGFpbGVkIGJyZWFrZG93biBvZiB0aGUgY29uZmlndXJhdGlvbiBzZWU6IGNvbmZpZ3VyYXRpb25fZ3VpZGUubWQgaW4gdGhlIGRvY3VtZW50YXRpb24gZGlyZWN0b3J5LlxuZXhwb3J0IGNsYXNzIE1SRGF0YXBsYW5lQ29uZmlnIHtcbiAgY29uc3RydWN0b3IoXG4gICAgLy8gdnBjIG5hbWVzXG4gICAgcHVibGljIFZQQ19OQU1FID0gXCJPU01MVlBDXCIsXG4gICAgLy8gdG9waWMgbmFtZXNcbiAgICBwdWJsaWMgU05TX0lNQUdFX1NUQVRVU19UT1BJQyA9IFwiSW1hZ2VTdGF0dXNUb3BpY1wiLFxuICAgIHB1YmxpYyBTTlNfUkVHSU9OX1NUQVRVU19UT1BJQyA9IFwiUmVnaW9uU3RhdHVzVG9waWNcIixcbiAgICAvLyBxdWV1ZSBuYW1lc1xuICAgIHB1YmxpYyBTUVNfSU1BR0VfUkVRVUVTVF9RVUVVRSA9IFwiSW1hZ2VSZXF1ZXN0UXVldWVcIixcbiAgICBwdWJsaWMgU1FTX1JFR0lPTl9SRVFVRVNUX1FVRVVFID0gXCJSZWdpb25SZXF1ZXN0UXVldWVcIixcbiAgICAvLyB0YWJsZSBuYW1lc1xuICAgIHB1YmxpYyBEREJfSk9CX1NUQVRVU19UQUJMRSA9IFwiSW1hZ2VQcm9jZXNzaW5nSm9iU3RhdHVzXCIsXG4gICAgcHVibGljIEREQl9GRUFUVVJFU19UQUJMRSA9IFwiSW1hZ2VQcm9jZXNzaW5nRmVhdHVyZXNcIixcbiAgICBwdWJsaWMgRERCX0VORFBPSU5UX1BST0NFU1NJTkdfVEFCTEUgPSBcIkVuZHBvaW50UHJvY2Vzc2luZ1N0YXRpc3RpY3NcIixcbiAgICBwdWJsaWMgRERCX1JFR0lPTl9SRVFVRVNUX1RBQkxFID0gXCJSZWdpb25Qcm9jZXNzaW5nSm9iU3RhdHVzXCIsXG4gICAgLy8gdGltZSB0byBsaXZlIGF0dHJpYnV0ZSB0byBiZSB1c2VkIG9uIHRhYmxlc1xuICAgIHB1YmxpYyBEREJfVFRMX0FUVFJJQlVURSA9IFwiZXhwaXJlX3RpbWVcIixcbiAgICAvLyBtZXRyaWNzIGNvbnN0YW50c1xuICAgIHB1YmxpYyBNRVRSSUNTX05BTUVTUEFDRSA9IFwiT1NNTFwiLFxuICAgIC8vIGZhcmdhdGUgY29uZmlndXJhdGlvblxuICAgIC8vIGZvciB2YWxpZCB0YXNrIHJlc291cmNlIHZhbHVlcyBzZWU6XG4gICAgLy8gaHR0cHM6Ly9kb2NzLmF3cy5hbWF6b24uY29tL0FtYXpvbkVDUy9sYXRlc3QvZGV2ZWxvcGVyZ3VpZGUvdGFzay1jcHUtbWVtb3J5LWVycm9yLmh0bWxcbiAgICBwdWJsaWMgTVJfQ0xVU1RFUl9OQU1FID0gXCJPU01MQ2x1c3RlclwiLFxuICAgIHB1YmxpYyBNUl9UQVNLX1JPTEVfTkFNRSA9IFwiT1NNTFRhc2tFeGVjdXRpb25Sb2xlXCIsXG4gICAgcHVibGljIE1SX0NPTlRBSU5FUl9OQU1FID0gXCJPU01MTW9kZWxSdW5uZXJDb250YWluZXJcIixcbiAgICBwdWJsaWMgTVJfVEFTS19NRU1PUlkgPSA4MTkyLFxuICAgIHB1YmxpYyBNUl9UQVNLX0NQVSA9IDQwOTYsXG4gICAgcHVibGljIE1SX0NPTlRBSU5FUl9NRU1PUlkgPSA2MTQ0LFxuICAgIHB1YmxpYyBNUl9DT05UQUlORVJfQ1BVID0gMzA3MixcbiAgICBwdWJsaWMgTVJfTE9HR0lOR19NRU1PUlkgPSA1MTIsXG4gICAgcHVibGljIE1SX0xPR0dJTkdfQ1BVID0gNTEyLFxuICAgIHB1YmxpYyBNUl9XT1JLRVJTX1BFUl9DUFUgPSAxLFxuICAgIHB1YmxpYyBNUl9SRUdJT05fU0laRSA9IFwiKDIwNDgsIDIwNDgpXCIsXG4gICAgLy8gcmVwb3NpdG9yeSBuYW1lIGZvciB0aGUgbW9kZWwgcnVubmVyIGNvbnRhaW5lclxuICAgIHB1YmxpYyBFQ1JfTU9ERUxfUlVOTkVSX1JFUE9TSVRPUlkgPSBcIm1vZGVsLXJ1bm5lci1jb250YWluZXJcIixcbiAgICAvLyBwYXRoIHRvIHRoZSBsb2NhbCBzb3VyY2UgZm9yIG1vZGVsIHJ1bm5lciB0byBidWlsZCBhZ2FpbnN0XG4gICAgcHVibGljIEVDUl9NT0RFTF9SVU5ORVJfUEFUSCA9IFwibGliL21vZGVsX3J1bm5lclwiLFxuICAgIC8vIGJ1aWxkIHRhcmdldCBmb3IgbW9kZWwgcnVubmVyIGNvbnRhaW5lclxuICAgIHB1YmxpYyBFQ1JfTU9ERUxfUlVOTkVSX1RBUkdFVCA9IFwibW9kZWxfcnVubmVyXCJcbiAgKSB7fVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIE1SRGF0YXBsYW5lUHJvcHMge1xuICAvLyB0aGUgYWNjb3VudCB0aGF0IG93bnMgdGhlIGRhdGEgcGxhbmUgYXMgZGVmaW5lZCBieSB0aGUgT1NNTEFjY291bnQgaW50ZXJmYWNlXG4gIGFjY291bnQ6IE9TTUxBY2NvdW50O1xuICAvLyBhbiBvcHRpb25hbCBjb250YWluZXIgaW1hZ2UgdG8gYnVpbGQgbW9kZWwgcnVubmVyIHRhc2sgd2l0aFxuICBtckltYWdlPzogQ29udGFpbmVySW1hZ2U7XG4gIC8vIFVSSSBsaW5rIHRvIGEgczMgaG9zdGVkIHRlcnJhaW4gZGF0YXNldFxuICBtclRlcnJhaW5Vcmk/OiBzdHJpbmc7XG4gIC8vIG9wdGlvbmFsIHJvbGUgdG8gZ2l2ZSB0aGUgbW9kZWwgcnVubmVyIHRhc2sgZXhlY3V0aW9uIHBlcm1pc3Npb25zIC0gd2lsbCBiZSBjcmF0ZWQgaWYgbm90IHByb3ZpZGVkXG4gIHRhc2tSb2xlPzogSVJvbGU7XG4gIC8vIG9wdGlvbmFsIHNlcnZpY2UgbGV2ZWwgY29uZmlndXJhdGlvbiB0aGF0IGNhbiBiZSBwcm92aWRlZCBieSB0aGUgdXNlciBidXQgd2lsbCBiZSBkZWZhdWx0ZWQgaWYgbm90XG4gIGRhdGFwbGFuZUNvbmZpZz86IE1SRGF0YXBsYW5lQ29uZmlnO1xuICAvLyBlbmFibGUgYXV0b3NjYWxpbmcgZm9yIHRoZSBmYXJnYXRlIHNlcnZpY2VcbiAgZW5hYmxlQXV0b3NjYWxpbmc/OiBib29sZWFuO1xufVxuXG5leHBvcnQgY2xhc3MgTVJEYXRhcGxhbmUgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICBwdWJsaWMgbXJSb2xlOiBJUm9sZTtcbiAgcHVibGljIG1yRGF0YXBsYW5lQ29uZmlnOiBNUkRhdGFwbGFuZUNvbmZpZztcbiAgcHVibGljIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3k7XG4gIHB1YmxpYyByZWdpb25hbFMzRW5kcG9pbnQ6IHN0cmluZztcbiAgcHVibGljIHZwYzogT1NNTFZwYztcbiAgcHVibGljIGpvYlN0YXR1c1RhYmxlOiBPU01MVGFibGU7XG4gIHB1YmxpYyBmZWF0dXJlVGFibGU6IE9TTUxUYWJsZTtcbiAgcHVibGljIGVuZHBvaW50U3RhdGlzdGljc1RhYmxlOiBPU01MVGFibGU7XG4gIHB1YmxpYyByZWdpb25SZXF1ZXN0VGFibGU6IE9TTUxUYWJsZTtcbiAgcHVibGljIG1yUmVwb3NpdG9yeT86IE9TTUxSZXBvc2l0b3J5O1xuICBwdWJsaWMgbXJDb250YWluZXI6IENvbnRhaW5lckltYWdlO1xuICBwdWJsaWMgaW1hZ2VTdGF0dXNUb3BpYzogT1NNTFRvcGljO1xuICBwdWJsaWMgcmVnaW9uU3RhdHVzVG9waWM6IE9TTUxUb3BpYztcbiAgcHVibGljIGltYWdlUmVxdWVzdFF1ZXVlOiBPU01MUXVldWU7XG4gIHB1YmxpYyByZWdpb25SZXF1ZXN0UXVldWU6IE9TTUxRdWV1ZTtcbiAgcHVibGljIGxvZ0dyb3VwOiBMb2dHcm91cDtcbiAgcHVibGljIGNsdXN0ZXI6IENsdXN0ZXI7XG4gIHB1YmxpYyB0YXNrRGVmaW5pdGlvbjogVGFza0RlZmluaXRpb247XG4gIHB1YmxpYyB3b3JrZXJzOiBzdHJpbmc7XG4gIHB1YmxpYyBjb250YWluZXJEZWZpbml0aW9uOiBDb250YWluZXJEZWZpbml0aW9uO1xuICBwdWJsaWMgZmFyZ2F0ZVNlcnZpY2U6IEZhcmdhdGVTZXJ2aWNlO1xuICBwdWJsaWMgYXV0b1NjYWxpbmc/OiBNUkF1dG9TY2FsaW5nO1xuICBwdWJsaWMgbXJUZXJyYWluVXJpPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBUaGlzIGNvbnN0cnVjdCBpcyByZXNwb25zaWJsZSBmb3IgbWFuYWdpbmcgdGhlIGRhdGEgcGxhbmUgb2YgdGhlIG1vZGVsIHJ1bm5lciBhcHBsaWNhdGlvblxuICAgKiBJdCBpcyByZXNwb25zaWJsZSBmb3I6XG4gICAqIC0gY3JlYXRpbmcgdGhlIFZQQ1xuICAgKiAtIGNyZWF0aW5nIHRoZSBEREIgdGFibGVzXG4gICAqIC0gY3JlYXRlIHRoZSBTUVMgcXVldWVzXG4gICAqIC0gY3JlYXRpbmcgdGhlIFNOUyB0b3BpY3NcbiAgICogLSBjcmVhdGluZyB0aGUgRUNSIHJlcG9zaXRvcmllc1xuICAgKiAtIGNyZWF0aW5nIHRoZSBFQ1IgY29udGFpbmVyc1xuICAgKiAtIGNyZWF0aW5nIHRoZSBFQ1MgY2x1c3RlclxuICAgKiAtIGNyZWF0aW5nIHRoZSBFQ1MgdGFzayBkZWZpbml0aW9uXG4gICAqIC0gY3JlYXRpbmcgdGhlIEVDUyBjb250YWluZXJcbiAgICogLSBjcmVhdGluZyB0aGUgRUNTIHNlcnZpY2VcbiAgICogLSBjcmVhdGluZyB0aGUgRUNTIGF1dG8tc2NhbGluZyBncm91cFxuICAgKiAtIGNyZWF0aW5nIHRoZSBFQ1MgbW9uaXRvcmluZyBkYXNoYm9hcmRzXG4gICAqXG4gICAqIEBwYXJhbSBzY29wZSB0aGUgc2NvcGUvc3RhY2sgaW4gd2hpY2ggdG8gZGVmaW5lIHRoaXMgY29uc3RydWN0LlxuICAgKiBAcGFyYW0gaWQgdGhlIGlkIG9mIHRoaXMgY29uc3RydWN0IHdpdGhpbiB0aGUgY3VycmVudCBzY29wZS5cbiAgICogQHBhcmFtIHByb3BzIHRoZSBwcm9wZXJ0aWVzIG9mIHRoaXMgY29uc3RydWN0LlxuICAgKiBAcmV0dXJucyB0aGUgTVJEYXRhcGxhbmUgY29uc3RydWN0XG4gICAqL1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogTVJEYXRhcGxhbmVQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG5cbiAgICAvLyBjaGVjayBpZiBhIGN1c3RvbSBjb25maWd1cmF0aW9uIHdhcyBwcm92aWRlZFxuICAgIGlmIChwcm9wcy5kYXRhcGxhbmVDb25maWcgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBpbXBvcnQgZXhpc3RpbmcgcGFzcyBpbiBNUiBjb25maWd1cmF0aW9uXG4gICAgICB0aGlzLm1yRGF0YXBsYW5lQ29uZmlnID0gcHJvcHMuZGF0YXBsYW5lQ29uZmlnO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBjcmVhdGUgYSBuZXcgZGVmYXVsdCBjb25maWd1cmF0aW9uXG4gICAgICB0aGlzLm1yRGF0YXBsYW5lQ29uZmlnID0gbmV3IE1SRGF0YXBsYW5lQ29uZmlnKCk7XG4gICAgfVxuXG4gICAgLy8gY2hlY2sgaWYgYSByb2xlIHdhcyBwcm92aWRlZFxuICAgIGlmIChwcm9wcy50YXNrUm9sZSAhPSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIGltcG9ydCBwYXNzZWQgaW4gTVIgdGFzayByb2xlXG4gICAgICB0aGlzLm1yUm9sZSA9IHByb3BzLnRhc2tSb2xlO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBjcmVhdGUgYSBuZXcgcm9sZVxuICAgICAgdGhpcy5tclJvbGUgPSBuZXcgTVJUYXNrUm9sZSh0aGlzLCBcIk1SUm9sZVwiLCB7XG4gICAgICAgIGFjY291bnQ6IHByb3BzLmFjY291bnQsXG4gICAgICAgIHJvbGVOYW1lOiB0aGlzLm1yRGF0YXBsYW5lQ29uZmlnLk1SX1RBU0tfUk9MRV9OQU1FXG4gICAgICB9KS5yb2xlO1xuICAgIH1cblxuICAgIC8vIGNoZWNrIGlmIGEgY3VzdG9tIG1vZGVsIHJ1bm5lciBjb250YWluZXIgaW1hZ2Ugd2FzIHByb3ZpZGVkXG4gICAgaWYgKHByb3BzLm1ySW1hZ2UgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBpbXBvcnQgdGhlIHBhc3NlZCBpbWFnZVxuICAgICAgdGhpcy5tckNvbnRhaW5lciA9IHByb3BzLm1ySW1hZ2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGJ1aWxkIGFuIEVDUiByZXBvIGZvciB0aGUgbW9kZWwgcnVubmVyIGNvbnRhaW5lclxuICAgICAgdGhpcy5tclJlcG9zaXRvcnkgPSBuZXcgT1NNTFJlcG9zaXRvcnkodGhpcywgXCJNUk1vZGVsUnVubmVyUmVwb3NpdG9yeVwiLCB7XG4gICAgICAgIHJlcG9zaXRvcnlOYW1lOiB0aGlzLm1yRGF0YXBsYW5lQ29uZmlnLkVDUl9NT0RFTF9SVU5ORVJfUkVQT1NJVE9SWSxcbiAgICAgICAgcmVtb3ZhbFBvbGljeTogdGhpcy5yZW1vdmFsUG9saWN5XG4gICAgICB9KTtcblxuICAgICAgLy8gYnVpbGQgYW5kIGRlcGxveSBtb2RlbCBydW5uZXIgY29udGFpbmVyIHRvIHRhcmdldCByZXBvXG4gICAgICB0aGlzLm1yQ29udGFpbmVyID0gbmV3IE9TTUxFQ1JDb250YWluZXIodGhpcywgXCJNUk1vZGVsUnVubmVyQ29udGFpbmVyXCIsIHtcbiAgICAgICAgZGlyZWN0b3J5OiB0aGlzLm1yRGF0YXBsYW5lQ29uZmlnLkVDUl9NT0RFTF9SVU5ORVJfUEFUSCxcbiAgICAgICAgdGFyZ2V0OiB0aGlzLm1yRGF0YXBsYW5lQ29uZmlnLkVDUl9NT0RFTF9SVU5ORVJfVEFSR0VULFxuICAgICAgICByZXBvc2l0b3J5OiB0aGlzLm1yUmVwb3NpdG9yeS5yZXBvc2l0b3J5XG4gICAgICB9KS5jb250YWluZXJJbWFnZTtcbiAgICB9XG5cbiAgICAvLyBzZXQgdXAgYSByZWdpb25hbCBzMyBlbmRwb2ludCBmb3IgR0RBTCB0byB1c2VcbiAgICB0aGlzLnJlZ2lvbmFsUzNFbmRwb2ludCA9IHJlZ2lvbl9pbmZvLkZhY3QuZmluZChcbiAgICAgIHByb3BzLmFjY291bnQucmVnaW9uLFxuICAgICAgcmVnaW9uX2luZm8uRmFjdE5hbWUuc2VydmljZVByaW5jaXBhbChcInMzLmFtYXpvbmF3cy5jb21cIilcbiAgICApITtcblxuICAgIC8vIHNldHVwIGEgcmVtb3ZhbCBwb2xpY3lcbiAgICB0aGlzLnJlbW92YWxQb2xpY3kgPSBwcm9wcy5hY2NvdW50LnByb2RMaWtlXG4gICAgICA/IFJlbW92YWxQb2xpY3kuUkVUQUlOXG4gICAgICA6IFJlbW92YWxQb2xpY3kuREVTVFJPWTtcblxuICAgIC8vIGJ1aWxkIGEgVlBDIHRvIGhvdXNlIGNvbnRhaW5lcnMgYW5kIHNlcnZpY2VzXG4gICAgdGhpcy52cGMgPSBuZXcgT1NNTFZwYyh0aGlzLCBcIk1SVlBDXCIsIHtcbiAgICAgIHZwY05hbWU6IHRoaXMubXJEYXRhcGxhbmVDb25maWcuVlBDX05BTUVcbiAgICB9KTtcblxuICAgIC8vIGpvYiBzdGF0dXMgdGFibGUgdG8gc3RvcmUgd29ya2VyIHN0YXR1cyBpbmZvXG4gICAgdGhpcy5qb2JTdGF0dXNUYWJsZSA9IG5ldyBPU01MVGFibGUodGhpcywgXCJNUkpvYlN0YXR1c1RhYmxlXCIsIHtcbiAgICAgIHRhYmxlTmFtZTogdGhpcy5tckRhdGFwbGFuZUNvbmZpZy5EREJfSk9CX1NUQVRVU19UQUJMRSxcbiAgICAgIHBhcnRpdGlvbktleToge1xuICAgICAgICBuYW1lOiBcImltYWdlX2lkXCIsXG4gICAgICAgIHR5cGU6IEF0dHJpYnV0ZVR5cGUuU1RSSU5HXG4gICAgICB9LFxuICAgICAgcmVtb3ZhbFBvbGljeTogdGhpcy5yZW1vdmFsUG9saWN5LFxuICAgICAgdHRsQXR0cmlidXRlOiB0aGlzLm1yRGF0YXBsYW5lQ29uZmlnLkREQl9UVExfQVRUUklCVVRFXG4gICAgfSk7XG5cbiAgICAvLyBnZW9qc29uIGZlYXR1cmUgc3RvcmFnZSBmb3IgbWFwcGluZyBiYWNrIHRvIGltYWdlc1xuICAgIHRoaXMuZmVhdHVyZVRhYmxlID0gbmV3IE9TTUxUYWJsZSh0aGlzLCBcIk1SRmVhdHVyZXNUYWJsZVwiLCB7XG4gICAgICB0YWJsZU5hbWU6IHRoaXMubXJEYXRhcGxhbmVDb25maWcuRERCX0ZFQVRVUkVTX1RBQkxFLFxuICAgICAgcGFydGl0aW9uS2V5OiB7XG4gICAgICAgIG5hbWU6IFwiaGFzaF9rZXlcIixcbiAgICAgICAgdHlwZTogQXR0cmlidXRlVHlwZS5TVFJJTkdcbiAgICAgIH0sXG4gICAgICBzb3J0S2V5OiB7XG4gICAgICAgIG5hbWU6IFwicmFuZ2Vfa2V5XCIsXG4gICAgICAgIHR5cGU6IEF0dHJpYnV0ZVR5cGUuU1RSSU5HXG4gICAgICB9LFxuICAgICAgcmVtb3ZhbFBvbGljeTogdGhpcy5yZW1vdmFsUG9saWN5LFxuICAgICAgdHRsQXR0cmlidXRlOiB0aGlzLm1yRGF0YXBsYW5lQ29uZmlnLkREQl9UVExfQVRUUklCVVRFXG4gICAgfSk7XG5cbiAgICAvLyB1c2VkIHRvIHRyYWNrIGluLXByb2dyZXNzIHJlZ2lvbnMgYnkgbW9kZWwgZW5kcG9pbnRcbiAgICB0aGlzLmVuZHBvaW50U3RhdGlzdGljc1RhYmxlID0gbmV3IE9TTUxUYWJsZShcbiAgICAgIHRoaXMsXG4gICAgICBcIk1SRW5kcG9pbnRQcm9jZXNzaW5nVGFibGVcIixcbiAgICAgIHtcbiAgICAgICAgdGFibGVOYW1lOiB0aGlzLm1yRGF0YXBsYW5lQ29uZmlnLkREQl9FTkRQT0lOVF9QUk9DRVNTSU5HX1RBQkxFLFxuICAgICAgICBwYXJ0aXRpb25LZXk6IHtcbiAgICAgICAgICBuYW1lOiBcImhhc2hfa2V5XCIsXG4gICAgICAgICAgdHlwZTogQXR0cmlidXRlVHlwZS5TVFJJTkdcbiAgICAgICAgfSxcbiAgICAgICAgcmVtb3ZhbFBvbGljeTogdGhpcy5yZW1vdmFsUG9saWN5LFxuICAgICAgICB0dGxBdHRyaWJ1dGU6IHRoaXMubXJEYXRhcGxhbmVDb25maWcuRERCX1RUTF9BVFRSSUJVVEVcbiAgICAgIH1cbiAgICApO1xuXG4gICAgLy8gcmVnaW9uIHJlcXVlc3QgdGFibGUgdG8gc3RvcmUgcmVnaW9uIHN0YXR1cyBpbmZvXG4gICAgdGhpcy5yZWdpb25SZXF1ZXN0VGFibGUgPSBuZXcgT1NNTFRhYmxlKHRoaXMsIFwiTVJSZWdpb25SZXF1ZXN0VGFibGVcIiwge1xuICAgICAgdGFibGVOYW1lOiB0aGlzLm1yRGF0YXBsYW5lQ29uZmlnLkREQl9SRUdJT05fUkVRVUVTVF9UQUJMRSxcbiAgICAgIHBhcnRpdGlvbktleToge1xuICAgICAgICBuYW1lOiBcImltYWdlX2lkXCIsXG4gICAgICAgIHR5cGU6IEF0dHJpYnV0ZVR5cGUuU1RSSU5HXG4gICAgICB9LFxuICAgICAgc29ydEtleToge1xuICAgICAgICBuYW1lOiBcInJlZ2lvbl9pZFwiLFxuICAgICAgICB0eXBlOiBBdHRyaWJ1dGVUeXBlLlNUUklOR1xuICAgICAgfSxcbiAgICAgIHJlbW92YWxQb2xpY3k6IHRoaXMucmVtb3ZhbFBvbGljeSxcbiAgICAgIHR0bEF0dHJpYnV0ZTogdGhpcy5tckRhdGFwbGFuZUNvbmZpZy5EREJfVFRMX0FUVFJJQlVURVxuICAgIH0pO1xuXG4gICAgLy8gY3JlYXRlIHRvcGljIGZvciBpbWFnZSByZXF1ZXN0IHN0YXR1cyBub3RpZmljYXRpb25zXG4gICAgdGhpcy5pbWFnZVN0YXR1c1RvcGljID0gbmV3IE9TTUxUb3BpYyh0aGlzLCBcIk1SSW1hZ2VTdGF0dXNUb3BpY1wiLCB7XG4gICAgICB0b3BpY05hbWU6IHRoaXMubXJEYXRhcGxhbmVDb25maWcuU05TX0lNQUdFX1NUQVRVU19UT1BJQ1xuICAgIH0pO1xuXG4gICAgLy8gY3JlYXRlIHRvcGljIGZvciByZWdpb24gcmVxdWVzdCBzdGF0dXMgbm90aWZpY2F0aW9uc1xuICAgIHRoaXMucmVnaW9uU3RhdHVzVG9waWMgPSBuZXcgT1NNTFRvcGljKHRoaXMsIFwiTVJSZWdpb25TdGF0dXNUb3BpY1wiLCB7XG4gICAgICB0b3BpY05hbWU6IHRoaXMubXJEYXRhcGxhbmVDb25maWcuU05TX1JFR0lPTl9TVEFUVVNfVE9QSUNcbiAgICB9KTtcblxuICAgIC8vIGNyZWF0ZSBhIFNRUyBxdWV1ZSBmb3IgdGhlIGltYWdlIHByb2Nlc3Npbmcgam9icy4gVGhpcyBxdWV1ZSBpcyBzdWJzY3JpYmVkIHRvIHRoZSBTTlMgdG9waWMgZm9yIG5ld1xuICAgIC8vIGltYWdlIHByb2Nlc3NpbmcgdGFza3MgYW5kIHdpbGwgZXZlbnR1YWxseSBmaWx0ZXIgdGhvc2UgdGFza3MgdG8gbWFrZSBzdXJlIHRoZXkgYXJlIGRlc3RpbmVkIGZvciB0aGlzXG4gICAgLy8gcHJvY2Vzc2luZyBjZWxsLiBJZiBhIHRhc2sgZmFpbHMgbXVsdGlwbGUgdGltZXMgaXQgd2lsbCBiZSBzZW50IHRvIGEgRExRLlxuICAgIHRoaXMuaW1hZ2VSZXF1ZXN0UXVldWUgPSBuZXcgT1NNTFF1ZXVlKHRoaXMsIFwiTVJJbWFnZVJlcXVlc3RRdWV1ZVwiLCB7XG4gICAgICBxdWV1ZU5hbWU6IHRoaXMubXJEYXRhcGxhbmVDb25maWcuU1FTX0lNQUdFX1JFUVVFU1RfUVVFVUVcbiAgICB9KTtcblxuICAgIC8vIGNyZWF0ZSBhIFNRUyBxdWV1ZSBmb3IgdGhlIGltYWdlIHJlZ2lvbiBwcm9jZXNzaW5nIHRhc2tzLiBJZiBhbiBpbWFnZSBpcyB0b28gbGFyZ2UgdG8gYmUgaGFuZGxlZCBieSB0aGF0XG4gICAgLy8gYSBzaW5nbGUgaW5zdGFuY2UgaXQgd2lsbCBkaXZpZGUgdGhlIGltYWdlIGludG8gcmVnaW9ucyBhbmQgcGxhY2UgYSB0YXNrIGZvciBlYWNoIG9uIHRoaXMgcXVldWUuIFRoYXQgYWxsb3dzXG4gICAgLy8gb3RoZXIgbW9kZWwgcnVubmVyIGluc3RhbmNlcyB0byBwaWNrdXAgcGFydCBvZiB0aGUgb3ZlcmFsbCBwcm9jZXNzaW5nIGxvYWQgZm9yIHRoaXMgaW1hZ2UuXG4gICAgdGhpcy5yZWdpb25SZXF1ZXN0UXVldWUgPSBuZXcgT1NNTFF1ZXVlKHRoaXMsIFwiTVJSZWdpb25SZXF1ZXN0UXVldWVcIiwge1xuICAgICAgcXVldWVOYW1lOiB0aGlzLm1yRGF0YXBsYW5lQ29uZmlnLlNRU19SRUdJT05fUkVRVUVTVF9RVUVVRVxuICAgIH0pO1xuXG4gICAgLy8gbG9nIGdyb3VwIGZvciBNUiBjb250YWluZXJcbiAgICB0aGlzLmxvZ0dyb3VwID0gbmV3IExvZ0dyb3VwKHRoaXMsIFwiTVJTZXJ2aWNlTG9nR3JvdXBcIiwge1xuICAgICAgbG9nR3JvdXBOYW1lOiBcIi9hd3MvT1NNTC9NUlNlcnZpY2VcIixcbiAgICAgIHJldGVudGlvbjogUmV0ZW50aW9uRGF5cy5URU5fWUVBUlMsXG4gICAgICByZW1vdmFsUG9saWN5OiB0aGlzLnJlbW92YWxQb2xpY3lcbiAgICB9KTtcblxuICAgIC8vIGJ1aWxkIGNsdXN0ZXIgdG8gaG91c2Ugb3VyIGNvbnRhaW5lcnMgd2hlbiB0aGV5IHNwaW4gdXBcbiAgICB0aGlzLmNsdXN0ZXIgPSBuZXcgQ2x1c3Rlcih0aGlzLCBcIk1SQ2x1c3RlclwiLCB7XG4gICAgICBjbHVzdGVyTmFtZTogdGhpcy5tckRhdGFwbGFuZUNvbmZpZy5NUl9DTFVTVEVSX05BTUUsXG4gICAgICB2cGM6IHRoaXMudnBjLnZwY1xuICAgIH0pO1xuXG4gICAgLy8gZGVmaW5lIG91ciBlY3MgdGFza1xuICAgIHRoaXMudGFza0RlZmluaXRpb24gPSBuZXcgVGFza0RlZmluaXRpb24odGhpcywgXCJNUlRhc2tEZWZpbml0aW9uXCIsIHtcbiAgICAgIC8vIEd1ZXNzaW5nIHdoYXQgc3BlY3MgYXJlIG5lZWRlZFxuICAgICAgbWVtb3J5TWlCOiB0aGlzLm1yRGF0YXBsYW5lQ29uZmlnLk1SX1RBU0tfTUVNT1JZLnRvU3RyaW5nKCksXG4gICAgICBjcHU6IHRoaXMubXJEYXRhcGxhbmVDb25maWcuTVJfVEFTS19DUFUudG9TdHJpbmcoKSxcbiAgICAgIGNvbXBhdGliaWxpdHk6IENvbXBhdGliaWxpdHkuRkFSR0FURSxcbiAgICAgIHRhc2tSb2xlOiB0aGlzLm1yUm9sZVxuICAgIH0pO1xuXG4gICAgLy8gY2FsY3VsYXRlIHRoZSB3b3JrZXJzIHRvIGFzc2lnbiBwZXIgdGFzayBpbnN0YW5jZVxuICAgIHRoaXMud29ya2VycyA9IE1hdGguY2VpbChcbiAgICAgICh0aGlzLm1yRGF0YXBsYW5lQ29uZmlnLk1SX1RBU0tfQ1BVIC8gMTAyNCkgKlxuICAgICAgICB0aGlzLm1yRGF0YXBsYW5lQ29uZmlnLk1SX1dPUktFUlNfUEVSX0NQVVxuICAgICkudG9TdHJpbmcoKTtcblxuICAgIC8vIGJ1aWxkIG91ciBjb250YWluZXIgdG8gcnVuIG91ciBzZXJ2aWNlXG4gICAgbGV0IGNvbnRhaW5lckVudiA9IHtcbiAgICAgIEFXU19ERUZBVUxUX1JFR0lPTjogcHJvcHMuYWNjb3VudC5yZWdpb24sXG4gICAgICBKT0JfVEFCTEU6IHRoaXMuam9iU3RhdHVzVGFibGUudGFibGUudGFibGVOYW1lLFxuICAgICAgRkVBVFVSRV9UQUJMRTogdGhpcy5mZWF0dXJlVGFibGUudGFibGUudGFibGVOYW1lLFxuICAgICAgRU5EUE9JTlRfVEFCTEU6IHRoaXMuZW5kcG9pbnRTdGF0aXN0aWNzVGFibGUudGFibGUudGFibGVOYW1lLFxuICAgICAgUkVHSU9OX1JFUVVFU1RfVEFCTEU6IHRoaXMucmVnaW9uUmVxdWVzdFRhYmxlLnRhYmxlLnRhYmxlTmFtZSxcbiAgICAgIElNQUdFX1FVRVVFOiB0aGlzLmltYWdlUmVxdWVzdFF1ZXVlLnF1ZXVlLnF1ZXVlVXJsLFxuICAgICAgUkVHSU9OX1FVRVVFOiB0aGlzLnJlZ2lvblJlcXVlc3RRdWV1ZS5xdWV1ZS5xdWV1ZVVybCxcbiAgICAgIElNQUdFX1NUQVRVU19UT1BJQzogdGhpcy5pbWFnZVN0YXR1c1RvcGljLnRvcGljLnRvcGljQXJuLFxuICAgICAgUkVHSU9OX1NUQVRVU19UT1BJQzogdGhpcy5yZWdpb25TdGF0dXNUb3BpYy50b3BpYy50b3BpY0FybixcbiAgICAgIEFXU19TM19FTkRQT0lOVDogdGhpcy5yZWdpb25hbFMzRW5kcG9pbnQsXG4gICAgICBXT1JLRVJTX1BFUl9DUFU6IHRoaXMubXJEYXRhcGxhbmVDb25maWcuTVJfV09SS0VSU19QRVJfQ1BVLnRvU3RyaW5nKCksXG4gICAgICBXT1JLRVJTOiB0aGlzLndvcmtlcnMsXG4gICAgICBSRUdJT05fU0laRTogdGhpcy5tckRhdGFwbGFuZUNvbmZpZy5NUl9SRUdJT05fU0laRVxuICAgIH07XG5cbiAgICAvLyBjaGVjayBpZiBhIGN1c3RvbSBtb2RlbCBydW5uZXIgY29udGFpbmVyIGltYWdlIHdhcyBwcm92aWRlZFxuICAgIGlmIChwcm9wcy5tclRlcnJhaW5VcmkgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBpbXBvcnQgdGhlIHBhc3NlZCBpbWFnZVxuICAgICAgdGhpcy5tclRlcnJhaW5VcmkgPSBwcm9wcy5tclRlcnJhaW5Vcmk7XG4gICAgICBjb250YWluZXJFbnYgPSBPYmplY3QuYXNzaWduKGNvbnRhaW5lckVudiwge1xuICAgICAgICBFTEVWQVRJT05fREFUQV9MT0NBVElPTjogdGhpcy5tclRlcnJhaW5VcmlcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIGJ1aWxkIGEgY29udGFpbmVyIGRlZmluaXRpb24gdG8gcnVuIG91ciBzZXJ2aWNlXG4gICAgdGhpcy5jb250YWluZXJEZWZpbml0aW9uID0gdGhpcy50YXNrRGVmaW5pdGlvbi5hZGRDb250YWluZXIoXG4gICAgICBcIk1SQ29udGFpbmVyRGVmaW5pdGlvblwiLFxuICAgICAge1xuICAgICAgICBjb250YWluZXJOYW1lOiB0aGlzLm1yRGF0YXBsYW5lQ29uZmlnLk1SX0NPTlRBSU5FUl9OQU1FLFxuICAgICAgICBpbWFnZTogdGhpcy5tckNvbnRhaW5lcixcbiAgICAgICAgbWVtb3J5TGltaXRNaUI6IHRoaXMubXJEYXRhcGxhbmVDb25maWcuTVJfQ09OVEFJTkVSX01FTU9SWSxcbiAgICAgICAgY3B1OiB0aGlzLm1yRGF0YXBsYW5lQ29uZmlnLk1SX0NPTlRBSU5FUl9DUFUsXG4gICAgICAgIGVudmlyb25tZW50OiBjb250YWluZXJFbnYsXG4gICAgICAgIHN0YXJ0VGltZW91dDogRHVyYXRpb24ubWludXRlcygxKSxcbiAgICAgICAgc3RvcFRpbWVvdXQ6IER1cmF0aW9uLm1pbnV0ZXMoMSksXG4gICAgICAgIC8vIGNyZWF0ZSBsb2cgZ3JvdXAgZm9yIGNvbnNvbGUgb3V0cHV0IChTVERPVVQpXG4gICAgICAgIGxvZ2dpbmc6IG5ldyBGaXJlTGVuc0xvZ0RyaXZlcih7XG4gICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgTmFtZTogXCJjbG91ZHdhdGNoXCIsXG4gICAgICAgICAgICByZWdpb246IHByb3BzLmFjY291bnQucmVnaW9uLFxuICAgICAgICAgICAgbG9nX2tleTogXCJsb2dcIixcbiAgICAgICAgICAgIGxvZ19mb3JtYXQ6IFwianNvbi9lbWZcIixcbiAgICAgICAgICAgIGxvZ19ncm91cF9uYW1lOiB0aGlzLmxvZ0dyb3VwLmxvZ0dyb3VwTmFtZSxcbiAgICAgICAgICAgIGxvZ19zdHJlYW1fcHJlZml4OiBcIiR7VEFTS19JRH0vXCJcbiAgICAgICAgICB9XG4gICAgICAgIH0pLFxuICAgICAgICBkaXNhYmxlTmV0d29ya2luZzogZmFsc2VcbiAgICAgIH1cbiAgICApO1xuXG4gICAgLy8gYWRkIHBvcnQgbWFwcGluZyB0byBjb250YWluZXJcbiAgICB0aGlzLnRhc2tEZWZpbml0aW9uLmRlZmF1bHRDb250YWluZXI/LmFkZFBvcnRNYXBwaW5ncyh7XG4gICAgICBjb250YWluZXJQb3J0OiA4MCxcbiAgICAgIGhvc3RQb3J0OiA4MCxcbiAgICAgIHByb3RvY29sOiBQcm90b2NvbC5UQ1BcbiAgICB9KTtcblxuICAgIC8vIHNldCB1cCBmYXJnYXRlIHNlcnZpY2VcbiAgICB0aGlzLmZhcmdhdGVTZXJ2aWNlID0gbmV3IEZhcmdhdGVTZXJ2aWNlKHRoaXMsIFwiTVJTZXJ2aWNlXCIsIHtcbiAgICAgIHRhc2tEZWZpbml0aW9uOiB0aGlzLnRhc2tEZWZpbml0aW9uLFxuICAgICAgY2x1c3RlcjogdGhpcy5jbHVzdGVyLFxuICAgICAgbWluSGVhbHRoeVBlcmNlbnQ6IDEwMFxuICAgIH0pO1xuXG4gICAgLy8gYnVpbGQgYSBmbHVlbnQgYml0IGxvZyByb3V0ZXIgZm9yIHRoZSBNUiBjb250YWluZXJcbiAgICB0aGlzLnRhc2tEZWZpbml0aW9uLmFkZEZpcmVsZW5zTG9nUm91dGVyKFwiTVJGaXJlTGVuc0NvbnRhaW5lclwiLCB7XG4gICAgICBpbWFnZTogb2J0YWluRGVmYXVsdEZsdWVudEJpdEVDUkltYWdlKFxuICAgICAgICB0aGlzLnRhc2tEZWZpbml0aW9uLFxuICAgICAgICB0aGlzLnRhc2tEZWZpbml0aW9uLmRlZmF1bHRDb250YWluZXI/LmxvZ0RyaXZlckNvbmZpZ1xuICAgICAgKSxcbiAgICAgIGVzc2VudGlhbDogdHJ1ZSxcbiAgICAgIGZpcmVsZW5zQ29uZmlnOiB7XG4gICAgICAgIHR5cGU6IEZpcmVsZW5zTG9nUm91dGVyVHlwZS5GTFVFTlRCSVRcbiAgICAgIH0sXG4gICAgICBjcHU6IHRoaXMubXJEYXRhcGxhbmVDb25maWcuTVJfTE9HR0lOR19DUFUsXG4gICAgICBtZW1vcnlMaW1pdE1pQjogdGhpcy5tckRhdGFwbGFuZUNvbmZpZy5NUl9MT0dHSU5HX01FTU9SWSxcbiAgICAgIGVudmlyb25tZW50OiB7IExPR19SRUdJT046IHByb3BzLmFjY291bnQucmVnaW9uIH0sXG4gICAgICBsb2dnaW5nOiBMb2dEcml2ZXIuYXdzTG9ncyh7XG4gICAgICAgIGxvZ0dyb3VwOiBuZXcgTG9nR3JvdXAodGhpcywgXCJNUkZpcmVMZW5zXCIsIHtcbiAgICAgICAgICBsb2dHcm91cE5hbWU6IFwiL2F3cy9PU01ML01SRmlyZUxlbnNcIixcbiAgICAgICAgICByZXRlbnRpb246IFJldGVudGlvbkRheXMuVEVOX1lFQVJTLFxuICAgICAgICAgIHJlbW92YWxQb2xpY3k6IHRoaXMucmVtb3ZhbFBvbGljeVxuICAgICAgICB9KSxcbiAgICAgICAgc3RyZWFtUHJlZml4OiBcIk9TTUxcIlxuICAgICAgfSksXG4gICAgICByZWFkb25seVJvb3RGaWxlc3lzdGVtOiBmYWxzZSxcbiAgICAgIGhlYWx0aENoZWNrOiB7XG4gICAgICAgIGNvbW1hbmQ6IFtcbiAgICAgICAgICBcIkNNRC1TSEVMTFwiLFxuICAgICAgICAgICdlY2hvIFxcJ3tcImhlYWx0aFwiOiBcImNoZWNrXCJ9XFwnIHwgbmMgMTI3LjAuMC4xIDg4NzcgfHwgZXhpdCAxJ1xuICAgICAgICBdLFxuICAgICAgICByZXRyaWVzOiAzXG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBpZiAocHJvcHMuYWNjb3VudC5lbmFibGVBdXRvc2NhbGluZykge1xuICAgICAgLy8gYnVpbGQgc2VydmljZSBhdXRvc2NhbGluZyBncm91cCBmb3IgTVIgZmFyZ2F0ZSBzZXJ2aWNlXG4gICAgICB0aGlzLmF1dG9TY2FsaW5nID0gbmV3IE1SQXV0b1NjYWxpbmcodGhpcywgXCJNUkF1dG9TY2FsaW5nXCIsIHtcbiAgICAgICAgYWNjb3VudDogcHJvcHMuYWNjb3VudCxcbiAgICAgICAgcm9sZTogdGhpcy5tclJvbGUsXG4gICAgICAgIGltYWdlUmVxdWVzdFF1ZXVlOiB0aGlzLmltYWdlUmVxdWVzdFF1ZXVlLnF1ZXVlLFxuICAgICAgICByZWdpb25SZXF1ZXN0UXVldWU6IHRoaXMucmVnaW9uUmVxdWVzdFF1ZXVlLnF1ZXVlLFxuICAgICAgICBjbHVzdGVyOiB0aGlzLmNsdXN0ZXIsXG4gICAgICAgIHNlcnZpY2U6IHRoaXMuZmFyZ2F0ZVNlcnZpY2UsXG4gICAgICAgIG1yRGF0YXBsYW5lQ29uZmlnOiB0aGlzLm1yRGF0YXBsYW5lQ29uZmlnXG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==