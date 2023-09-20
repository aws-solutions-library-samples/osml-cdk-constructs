/*
 * Copyright 2023 Amazon.com, Inc. or its affiliates.
 */

import {
  Duration,
  region_info,
  RemovalPolicy,
  SymlinkFollowMode
} from "aws-cdk-lib";
import { AttributeType } from "aws-cdk-lib/aws-dynamodb";
import { ISecurityGroup, SecurityGroup } from "aws-cdk-lib/aws-ec2";
import { DockerImageAsset } from "aws-cdk-lib/aws-ecr-assets";
import {
  Cluster,
  Compatibility,
  ContainerDefinition,
  FargateService,
  FireLensLogDriver,
  FirelensLogRouterType,
  LogDriver,
  obtainDefaultFluentBitECRImage,
  Protocol,
  TaskDefinition
} from "aws-cdk-lib/aws-ecs";
import { IRole } from "aws-cdk-lib/aws-iam";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

import { OSMLAccount } from "../osml/osml_account";
import { OSMLECRDeployment } from "../osml/osml_ecr_deployment";
import { OSMLQueue } from "../osml/osml_queue";
import { OSMLTable } from "../osml/osml_table";
import { OSMLTopic } from "../osml/osml_topic";
import { OSMLVpc } from "../osml/osml_vpc";
import { MRAutoScaling } from "./mr_autoscaling";
import { MRTaskRole } from "./mr_task_role";

// mutable configuration dataclass for model runner
// for a more detailed breakdown of the configuration see: configuration_guide.md in the documentation directory.
export class MRDataplaneConfig {
  constructor(
    // osmlVpc names
    public VPC_NAME = "OSMLVPC",
    // topic names
    public SNS_IMAGE_STATUS_TOPIC = "ImageStatusTopic",
    public SNS_REGION_STATUS_TOPIC = "RegionStatusTopic",
    // queue names
    public SQS_IMAGE_REQUEST_QUEUE = "ImageRequestQueue",
    public SQS_REGION_REQUEST_QUEUE = "RegionRequestQueue",
    // table names
    public DDB_JOB_STATUS_TABLE = "ImageProcessingJobStatus",
    public DDB_FEATURES_TABLE = "ImageProcessingFeatures",
    public DDB_ENDPOINT_PROCESSING_TABLE = "EndpointProcessingStatistics",
    public DDB_REGION_REQUEST_TABLE = "RegionProcessingJobStatus",
    // time to live attribute to be used on tables
    public DDB_TTL_ATTRIBUTE = "expire_time",
    // metrics constants
    public METRICS_NAMESPACE = "OSML",
    // fargate configuration
    // for valid task resource values see:
    // https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-cpu-memory-error.html
    public MR_CLUSTER_NAME = "OSMLCluster",
    public MR_TASK_ROLE_NAME = "OSMLTaskExecutionRole",
    public MR_CONTAINER_NAME = "OSMLModelRunnerContainer",
    public MR_TASK_MEMORY = 8192,
    public MR_TASK_CPU = 4096,
    public MR_CONTAINER_MEMORY = 6144,
    public MR_CONTAINER_CPU = 3072,
    public MR_LOGGING_MEMORY = 512,
    public MR_LOGGING_CPU = 512,
    public MR_WORKERS_PER_CPU = 1,
    public MR_REGION_SIZE = "(2048, 2048)",
    public MR_DEFAULT_CONTAINER = "awsosml/osml-model-runner:main",
    // repository name for the model runner container
    public ECR_MODEL_RUNNER_REPOSITORY = "model-runner-container",
    // path to the local source for model runner to build against
    public ECR_MODEL_RUNNER_BUILD_PATH = "lib/osml-model-runner",
    // build target for model runner container
    public ECR_MODEL_RUNNER_TARGET = "model_runner"
  ) {}
}

export interface MRDataplaneProps {
  // the account that owns the data plane as defined by the OSMLAccount interface
  account: OSMLAccount;
  // URI link to a s3 hosted terrain dataset
  mrTerrainUri?: string;
  // optional security group id to provide to the model runner Fargate service
  securityGroupId?: string;
  // optional role to give the model runner task execution permissions - will be crated if not provided
  taskRole?: IRole;
  // optional service level configuration that can be provided by the user but will be defaulted if not
  dataplaneConfig?: MRDataplaneConfig;
  // enable autoscaling for the fargate service
  enableAutoscaling?: boolean;
}

export class MRDataplane extends Construct {
  public mrRole: IRole;
  public mrDataplaneConfig: MRDataplaneConfig;
  public removalPolicy: RemovalPolicy;
  public regionalS3Endpoint: string;
  public osmlVpc: OSMLVpc;
  public jobStatusTable: OSMLTable;
  public featureTable: OSMLTable;
  public endpointStatisticsTable: OSMLTable;
  public regionRequestTable: OSMLTable;
  public mrContainerSourceUri: string;
  public mrEcrDeployment: OSMLECRDeployment;
  public imageStatusTopic: OSMLTopic;
  public regionStatusTopic: OSMLTopic;
  public imageRequestQueue: OSMLQueue;
  public regionRequestQueue: OSMLQueue;
  public logGroup: LogGroup;
  public cluster: Cluster;
  public taskDefinition: TaskDefinition;
  public workers: string;
  public containerDefinition: ContainerDefinition;
  public fargateService: FargateService;
  public securityGroups?: [ISecurityGroup];
  public autoScaling?: MRAutoScaling;
  public mrTerrainUri?: string;

  /**
   * This construct is responsible for managing the data plane of the model runner application
   * It is responsible for:
   * - creating the VPC
   * - creating the DDB tables
   * - creating the SQS queues
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
  constructor(scope: Construct, id: string, props: MRDataplaneProps) {
    super(scope, id);
    // setup a removal policy
    this.removalPolicy = props.account.prodLike
      ? RemovalPolicy.RETAIN
      : RemovalPolicy.DESTROY;

    // check if a custom configuration was provided
    if (props.dataplaneConfig != undefined) {
      // import existing pass in MR configuration
      this.mrDataplaneConfig = props.dataplaneConfig;
    } else {
      // create a new default configuration
      this.mrDataplaneConfig = new MRDataplaneConfig();
    }

    // check if a role was provided
    if (props.taskRole != undefined) {
      // import passed in an MR task role
      this.mrRole = props.taskRole;
    } else {
      // create a new role
      this.mrRole = new MRTaskRole(this, "MRRole", {
        account: props.account,
        roleName: this.mrDataplaneConfig.MR_TASK_ROLE_NAME
      }).role;
    }

    // set up a regional s3 endpoint for GDAL to use
    this.regionalS3Endpoint = region_info.Fact.find(
      props.account.region,
      region_info.FactName.servicePrincipal("s3.amazonaws.com")
    )!;

    // build a VPC to house containers and services
    this.osmlVpc = new OSMLVpc(this, "MRVPC", {
      vpcId: props.account.vpcId,
      account: props.account,
      vpcName: this.mrDataplaneConfig.VPC_NAME
    });

    if (props.account.isDev == true) {
      this.mrContainerSourceUri = new DockerImageAsset(this, id, {
        directory: this.mrDataplaneConfig.ECR_MODEL_RUNNER_BUILD_PATH,
        file: "Dockerfile",
        followSymlinks: SymlinkFollowMode.ALWAYS,
        target: this.mrDataplaneConfig.ECR_MODEL_RUNNER_TARGET
      }).imageUri;
    } else {
      this.mrContainerSourceUri = this.mrDataplaneConfig.MR_DEFAULT_CONTAINER;
    }

    // build and deploy model runner container to target repo
    this.mrEcrDeployment = new OSMLECRDeployment(
      this,
      "MRModelRunnerContainer",
      {
        sourceUri: this.mrContainerSourceUri,
        repositoryName: this.mrDataplaneConfig.ECR_MODEL_RUNNER_REPOSITORY,
        removalPolicy: this.removalPolicy,
        osmlVpc: this.osmlVpc
      }
    );

    // job status table to store worker status info
    this.jobStatusTable = new OSMLTable(this, "MRJobStatusTable", {
      tableName: this.mrDataplaneConfig.DDB_JOB_STATUS_TABLE,
      partitionKey: {
        name: "image_id",
        type: AttributeType.STRING
      },
      removalPolicy: this.removalPolicy,
      ttlAttribute: this.mrDataplaneConfig.DDB_TTL_ATTRIBUTE
    });

    // geojson feature storage for mapping back to images
    this.featureTable = new OSMLTable(this, "MRFeaturesTable", {
      tableName: this.mrDataplaneConfig.DDB_FEATURES_TABLE,
      partitionKey: {
        name: "hash_key",
        type: AttributeType.STRING
      },
      sortKey: {
        name: "range_key",
        type: AttributeType.STRING
      },
      removalPolicy: this.removalPolicy,
      ttlAttribute: this.mrDataplaneConfig.DDB_TTL_ATTRIBUTE
    });

    // used to track in-progress regions by model endpoint
    this.endpointStatisticsTable = new OSMLTable(
      this,
      "MREndpointProcessingTable",
      {
        tableName: this.mrDataplaneConfig.DDB_ENDPOINT_PROCESSING_TABLE,
        partitionKey: {
          name: "hash_key",
          type: AttributeType.STRING
        },
        removalPolicy: this.removalPolicy,
        ttlAttribute: this.mrDataplaneConfig.DDB_TTL_ATTRIBUTE
      }
    );

    // region request table to store region status info
    this.regionRequestTable = new OSMLTable(this, "MRRegionRequestTable", {
      tableName: this.mrDataplaneConfig.DDB_REGION_REQUEST_TABLE,
      partitionKey: {
        name: "image_id",
        type: AttributeType.STRING
      },
      sortKey: {
        name: "region_id",
        type: AttributeType.STRING
      },
      removalPolicy: this.removalPolicy,
      ttlAttribute: this.mrDataplaneConfig.DDB_TTL_ATTRIBUTE
    });

    // create a topic for image request status notifications
    this.imageStatusTopic = new OSMLTopic(this, "MRImageStatusTopic", {
      topicName: this.mrDataplaneConfig.SNS_IMAGE_STATUS_TOPIC
    });

    // create a topic for region request status notifications
    this.regionStatusTopic = new OSMLTopic(this, "MRRegionStatusTopic", {
      topicName: this.mrDataplaneConfig.SNS_REGION_STATUS_TOPIC
    });

    /**
     * Create a SQS queue for the image processing jobs.
     * This queue is subscribed to the SNS topic for new
     * image processing tasks and will eventually filter those tasks to make
     * sure they are destined for this processing cell.
     * If a task fails multiple times, it will be sent to a DLQ.
     **/
    this.imageRequestQueue = new OSMLQueue(this, "MRImageRequestQueue", {
      queueName: this.mrDataplaneConfig.SQS_IMAGE_REQUEST_QUEUE
    });

    /**
     * Create a SQS queue for the image region processing tasks.
     * If an image is too large to be handled by that a single instance,
     * it will divide the image into regions and place a task for each in this queue.
     * That allows other model runner instances to pickup part of the overall
     * processing load for this image.
     **/
    this.regionRequestQueue = new OSMLQueue(this, "MRRegionRequestQueue", {
      queueName: this.mrDataplaneConfig.SQS_REGION_REQUEST_QUEUE
    });

    // log group for MR container
    this.logGroup = new LogGroup(this, "MRServiceLogGroup", {
      logGroupName: "/aws/OSML/MRService",
      retention: RetentionDays.TEN_YEARS,
      removalPolicy: this.removalPolicy
    });

    // build cluster to house our containers when they spin up
    this.cluster = new Cluster(this, "MRCluster", {
      clusterName: this.mrDataplaneConfig.MR_CLUSTER_NAME,
      vpc: this.osmlVpc.vpc
    });

    // define our ecs task
    this.taskDefinition = new TaskDefinition(this, "MRTaskDefinition", {
      // Guessing what specs are needed
      memoryMiB: this.mrDataplaneConfig.MR_TASK_MEMORY.toString(),
      cpu: this.mrDataplaneConfig.MR_TASK_CPU.toString(),
      compatibility: Compatibility.FARGATE,
      taskRole: this.mrRole
    });

    // calculate the workers to assign per task instance
    this.workers = Math.ceil(
      (this.mrDataplaneConfig.MR_TASK_CPU / 1024) *
        this.mrDataplaneConfig.MR_WORKERS_PER_CPU
    ).toString();

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
    this.containerDefinition = this.taskDefinition.addContainer(
      "MRContainerDefinition",
      {
        containerName: this.mrDataplaneConfig.MR_CONTAINER_NAME,
        image: this.mrEcrDeployment.containerImage,
        memoryLimitMiB: this.mrDataplaneConfig.MR_CONTAINER_MEMORY,
        cpu: this.mrDataplaneConfig.MR_CONTAINER_CPU,
        environment: containerEnv,
        startTimeout: Duration.minutes(1),
        stopTimeout: Duration.minutes(1),
        // create a log group for console output (STDOUT)
        logging: new FireLensLogDriver({
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
      }
    );

    this.containerDefinition.node.addDependency(this.mrEcrDeployment);

    // add port mapping to container
    this.taskDefinition.defaultContainer?.addPortMappings({
      containerPort: 80,
      hostPort: 80,
      protocol: Protocol.TCP
    });

    // if a custom security group was provided
    if (props.securityGroupId) {
      this.securityGroups = [
        SecurityGroup.fromSecurityGroupId(
          this,
          "MRImportSecurityGroup",
          props.securityGroupId
        )
      ];
    }

    // set up fargate service
    this.fargateService = new FargateService(this, "MRService", {
      taskDefinition: this.taskDefinition,
      cluster: this.cluster,
      minHealthyPercent: 100,
      securityGroups: this.securityGroups,
      vpcSubnets: this.osmlVpc.privateSubnets
    });

    // build a fluent bit log router for the MR container
    this.taskDefinition.addFirelensLogRouter("MRFireLensContainer", {
      image: obtainDefaultFluentBitECRImage(
        this.taskDefinition,
        this.taskDefinition.defaultContainer?.logDriverConfig
      ),
      essential: true,
      firelensConfig: {
        type: FirelensLogRouterType.FLUENTBIT
      },
      cpu: this.mrDataplaneConfig.MR_LOGGING_CPU,
      memoryLimitMiB: this.mrDataplaneConfig.MR_LOGGING_MEMORY,
      environment: { LOG_REGION: props.account.region },
      logging: LogDriver.awsLogs({
        logGroup: new LogGroup(this, "MRFireLens", {
          logGroupName: "/aws/OSML/MRFireLens",
          retention: RetentionDays.TEN_YEARS,
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
      // build a service autoscaling group for MR fargate service
      this.autoScaling = new MRAutoScaling(this, "MRAutoScaling", {
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
