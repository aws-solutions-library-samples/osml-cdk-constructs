/*
 * Copyright 2023-2024 Amazon.com, Inc. or its affiliates.
 */

import { Duration, region_info, RemovalPolicy } from "aws-cdk-lib";
import {
  BackupPlan,
  BackupPlanRule,
  BackupResource,
  BackupVault
} from "aws-cdk-lib/aws-backup";
import { AttributeType } from "aws-cdk-lib/aws-dynamodb";
import { ISecurityGroup, SecurityGroup } from "aws-cdk-lib/aws-ec2";
import {
  Cluster,
  Compatibility,
  ContainerDefinition,
  ContainerImage,
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
import { SqsSubscription } from "aws-cdk-lib/aws-sns-subscriptions";
import { NagSuppressions } from "cdk-nag/lib/nag-suppressions";
import { Construct } from "constructs";

import { OSMLAccount } from "../osml_account";
import { OSMLQueue } from "../osml_queue";
import { OSMLTable } from "../osml_table";
import { OSMLTopic } from "../osml_topic";
import { OSMLVpc } from "../osml_vpc";
import { MRExecutionRole } from "./roles/mr_execution_role";
import { MRTaskRole } from "./roles/mr_task_role";

/**
 * Configuration class for MRDataplane Construct.
 */
export class MRDataplaneConfig {
  /**
   * Constructor for MRDataplaneConfig.
   * @param {string} SNS_IMAGE_STATUS_TOPIC - The name of the SNS topic for image status.
   * @param {string} SNS_REGION_STATUS_TOPIC - The name of the SNS topic for region status.
   * @param {string} SQS_IMAGE_STATUS_QUEUE - The name of the SQS queue for image status.
   * @param {string} SQS_REGION_STATUS_QUEUE -  - The name of the SQS queue for region status.
   * @param {string} SQS_IMAGE_REQUEST_QUEUE - The name of the SQS queue for image requests.
   * @param {string} SQS_REGION_REQUEST_QUEUE - The name of the SQS queue for region requests.
   * @param {string} DDB_JOB_STATUS_TABLE - The name of the DynamoDB table for job status.
   * @param {string} DDB_FEATURES_TABLE - The name of the DynamoDB table for image processing features.
   * @param {string} DDB_ENDPOINT_PROCESSING_TABLE - The name of the DynamoDB table for endpoint processing statistics.
   * @param {string} DDB_REGION_REQUEST_TABLE - The name of the DynamoDB table for region request status.
   * @param {string} DDB_TTL_ATTRIBUTE - The attribute name for expiration time in DynamoDB.
   * @param {string} METRICS_NAMESPACE - The namespace for metrics.
   * @param {string} MR_CLUSTER_NAME - The name of the MR cluster.
   * @param {string} MR_TASK_ROLE_NAME - The name of the MR task execution role.
   * @param {string} MR_CONTAINER_NAME - The name of the MR container.
   * @param {number} MR_TASK_MEMORY - The memory configuration for MR tasks.
   * @param {number} MR_TASK_CPU - The CPU configuration for MR tasks.
   * @param {number} MR_CONTAINER_MEMORY - The memory configuration for MR containers.
   * @param {number} MR_CONTAINER_CPU - The CPU configuration for MR containers.
   * @param {number} MR_LOGGING_MEMORY - The memory configuration for logging.
   * @param {number} MR_LOGGING_CPU - The CPU configuration for logging.
   * @param {number} MR_WORKERS_PER_CPU - The number of workers per CPU.
   * @param {string} MR_REGION_SIZE - The size of MR regions in the format "(width, height)".
   * @param {boolean} MR_ENABLE_IMAGE_STATUS - Whether to deploy image status messages.
   * @param {boolean} MR_ENABLE_REGION_STATUS - Whether to deploy region status messages.
   */
  constructor(
    public SNS_IMAGE_STATUS_TOPIC: string = "ImageStatusTopic",
    public SNS_REGION_STATUS_TOPIC: string = "RegionStatusTopic",
    public SQS_IMAGE_STATUS_QUEUE: string = "ImageStatusQueue",
    public SQS_REGION_STATUS_QUEUE: string = "RegionStatusQueue",
    public SQS_IMAGE_REQUEST_QUEUE: string = "ImageRequestQueue",
    public SQS_REGION_REQUEST_QUEUE: string = "RegionRequestQueue",
    public DDB_JOB_STATUS_TABLE: string = "ImageProcessingJobStatus",
    public DDB_FEATURES_TABLE: string = "ImageProcessingFeatures",
    public DDB_ENDPOINT_PROCESSING_TABLE: string = "EndpointProcessingStatistics",
    public DDB_REGION_REQUEST_TABLE: string = "RegionProcessingJobStatus",
    public DDB_TTL_ATTRIBUTE: string = "expire_time",
    public METRICS_NAMESPACE: string = "OSML",
    public MR_CLUSTER_NAME: string = "OSMLCluster",
    public MR_TASK_ROLE_NAME: string = "OSMLTaskRole",
    public MR_TASK_EXECUTION_ROLE_NAME: string = "OSMLTaskExecutionRole",
    public MR_CONTAINER_NAME: string = "OSMLModelRunnerContainer",
    public MR_TASK_MEMORY: number = 16384,
    public MR_TASK_CPU: number = 8192,
    public MR_CONTAINER_MEMORY: number = 15360,
    public MR_CONTAINER_CPU: number = 7168,
    public MR_LOGGING_MEMORY: number = 1024,
    public MR_LOGGING_CPU: number = 1024,
    public MR_WORKERS_PER_CPU: number = 2,
    public MR_REGION_SIZE: string = "(8192, 8192)",
    public MR_ENABLE_IMAGE_STATUS: boolean = true,
    public MR_ENABLE_REGION_STATUS: boolean = false
  ) {}
}

/**
 * Interface representing properties for configuring the MRDataplane Construct.
 */
export interface MRDataplaneProps {
  /**
   * The OSML deployment account.
   * @type {OSMLAccount}
   */
  account: OSMLAccount;

  /**
   * The OSML VPC (Virtual Private Cloud) configuration for the Dataplane.
   * @type {OSMLVpc}
   */
  osmlVpc: OSMLVpc;

  /**
   * The URI for the terrain to use for geolocation (optional).
   * @type {string | undefined}
   */
  mrTerrainUri?: string;

  /**
   * The security group ID to use for the Dataplane (optional).
   * @type {string | undefined}
   */
  securityGroupId?: string;

  /**
   * The IAM (Identity and Access Management) role to be used for MR tasks (optional).
   * @type {IRole | undefined}
   */
  taskRole?: IRole;

  /**
   * The IAM (Identity and Access Management) role to be used for MR execution (optional).
   * @type {IRole | undefined}
   */
  executionRole?: IRole;

  /**
   * Custom configuration for the MRDataplane Construct (optional).
   * @type {MRDataplaneConfig | undefined}
   */
  dataplaneConfig?: MRDataplaneConfig;

  /**
   * The container image to be used for the model runner ecs tasks.
   * @type {ContainerImage}
   */
  mrContainerImage: ContainerImage;
}

/**
 * Represents the MRDataplane construct responsible for managing the data plane
 * of the model runner application. It handles various AWS resources and configurations
 * required for the application's operation.
 *
 * @param {Construct} scope - The scope/stack in which to define this construct.
 * @param {string} id - The id of this construct within the current scope.
 * @param {MRDataplaneProps} props - The properties of this construct.
 * @returns {MRDataplane} - The MRDataplane construct.
 */
export class MRDataplane extends Construct {
  // Public properties
  public taskRole: IRole;
  public executionRole: IRole;
  public mrDataplaneConfig: MRDataplaneConfig;
  public removalPolicy: RemovalPolicy;
  public regionalS3Endpoint: string;
  public jobStatusTable: OSMLTable;
  public featureTable: OSMLTable;
  public endpointStatisticsTable: OSMLTable;
  public regionRequestTable: OSMLTable;
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
  public mrTerrainUri?: string;
  public imageStatusQueue?: OSMLQueue;
  public regionStatusQueue?: OSMLQueue;

  /**
   * Constructs an instance of MRDataplane.
   *
   * @constructor
   * @param {Construct} scope - The scope/stack in which to define this construct.
   * @param {string} id - The id of this construct within the current scope.
   * @param {MRDataplaneProps} props - The properties of this construct.
   */
  constructor(scope: Construct, id: string, props: MRDataplaneProps) {
    super(scope, id);

    // Setup a removal policy
    this.removalPolicy = props.account.prodLike
      ? RemovalPolicy.RETAIN
      : RemovalPolicy.DESTROY;

    // Check if a custom configuration was provided
    if (props.dataplaneConfig) {
      // Import existing passed-in MR configuration
      this.mrDataplaneConfig = props.dataplaneConfig;
    } else {
      // Create a new default configuration
      this.mrDataplaneConfig = new MRDataplaneConfig();
    }

    // Check if a role was provided
    if (props.taskRole != undefined) {
      // Import passed-in MR task role
      this.taskRole = props.taskRole;
    } else {
      // Create a new role
      this.taskRole = new MRTaskRole(this, "MRRole", {
        account: props.account,
        roleName: this.mrDataplaneConfig.MR_TASK_ROLE_NAME
      }).role;
    }

    // check if a execution role was provided
    if (props.executionRole != undefined) {
      // Import passed-in MR execution role
      this.executionRole = props.executionRole;
    } else {
      // Create a new role for the ECS task
      this.executionRole = new MRExecutionRole(this, "MRExecutionRole", {
        account: props.account,
        roleName: this.mrDataplaneConfig.MR_TASK_EXECUTION_ROLE_NAME
      }).role;
    }

    // Set up a regional S3 endpoint for GDAL to use
    this.regionalS3Endpoint = region_info.Fact.find(
      props.account.region,
      region_info.FactName.servicePrincipal("s3.amazonaws.com")
    )!;

    // Job status table to store worker status info
    this.jobStatusTable = new OSMLTable(this, "MRJobStatusTable", {
      tableName: this.mrDataplaneConfig.DDB_JOB_STATUS_TABLE,
      partitionKey: {
        name: "image_id",
        type: AttributeType.STRING
      },
      removalPolicy: this.removalPolicy,
      ttlAttribute: this.mrDataplaneConfig.DDB_TTL_ATTRIBUTE
    });

    // GeoJSON feature storage for mapping back to images
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

    // Used to track in-progress regions by model endpoint
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

    // Region request table to store region status info
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

    // AWS Backup solution is not currently available in ADC regions
    if (props.account.prodLike && !props.account.isAdc) {
      const backupVault = new BackupVault(this, `MRBackupVault`, {
        backupVaultName: `MRBackupVault`
      });
      const plan = new BackupPlan(this, `MRBackupPlan`);
      plan.addRule(BackupPlanRule.weekly(backupVault));
      plan.addRule(BackupPlanRule.monthly5Year(backupVault));
      plan.addSelection(`MRBackupSelection`, {
        resources: [
          BackupResource.fromDynamoDbTable(this.featureTable.table),
          BackupResource.fromDynamoDbTable(this.regionRequestTable.table),
          BackupResource.fromDynamoDbTable(this.endpointStatisticsTable.table),
          BackupResource.fromDynamoDbTable(this.jobStatusTable.table)
        ]
      });
    }

    if (this.mrDataplaneConfig.MR_ENABLE_REGION_STATUS) {
      // Create a topic for region request status notifications
      this.regionStatusTopic = new OSMLTopic(this, "MRRegionStatusTopic", {
        topicName: this.mrDataplaneConfig.SNS_REGION_STATUS_TOPIC
      });

      // Create an SQS queue for region status processing updates
      this.regionStatusQueue = new OSMLQueue(this, "MRRegionStatusQueue", {
        queueName: this.mrDataplaneConfig.SQS_REGION_STATUS_QUEUE
      });

      // Subscribe the region status topic to the queue
      this.regionStatusTopic.topic.addSubscription(
        new SqsSubscription(this.regionStatusQueue.queue)
      );
    }

    if (this.mrDataplaneConfig.MR_ENABLE_IMAGE_STATUS) {
      // Create a topic for image request status notifications
      this.imageStatusTopic = new OSMLTopic(this, "MRImageStatusTopic", {
        topicName: this.mrDataplaneConfig.SNS_IMAGE_STATUS_TOPIC
      });

      // Create an SQS queue for image processing status updates
      this.imageStatusQueue = new OSMLQueue(this, "MRImageStatusQueue", {
        queueName: this.mrDataplaneConfig.SQS_IMAGE_STATUS_QUEUE
      });

      // Subscribe the image status topic to the queue
      this.imageStatusTopic.topic.addSubscription(
        new SqsSubscription(this.imageStatusQueue.queue)
      );
    }

    // Create a SQS queue for the image processing jobs
    this.imageRequestQueue = new OSMLQueue(this, "MRImageRequestQueue", {
      queueName: this.mrDataplaneConfig.SQS_IMAGE_REQUEST_QUEUE
    });

    // Create a SQS queue for the image region processing tasks
    this.regionRequestQueue = new OSMLQueue(this, "MRRegionRequestQueue", {
      queueName: this.mrDataplaneConfig.SQS_REGION_REQUEST_QUEUE
    });

    // Log group for MR container
    this.logGroup = new LogGroup(this, "MRServiceLogGroup", {
      logGroupName: "/aws/OSML/MRService",
      retention: RetentionDays.TEN_YEARS,
      removalPolicy: this.removalPolicy
    });

    // Build cluster to house our containers when they spin up
    this.cluster = new Cluster(this, "MRCluster", {
      clusterName: this.mrDataplaneConfig.MR_CLUSTER_NAME,
      vpc: props.osmlVpc.vpc,
      containerInsights: true
    });

    // Define our ECS task
    this.taskDefinition = new TaskDefinition(this, "MRTaskDefinition", {
      memoryMiB: this.mrDataplaneConfig.MR_TASK_MEMORY.toString(),
      cpu: this.mrDataplaneConfig.MR_TASK_CPU.toString(),
      compatibility: Compatibility.FARGATE,
      taskRole: this.taskRole,
      executionRole: this.executionRole
    });

    // Calculate the workers to assign per task instance
    this.workers = Math.ceil(
      (this.mrDataplaneConfig.MR_CONTAINER_CPU / 1024) *
        this.mrDataplaneConfig.MR_WORKERS_PER_CPU
    ).toString();

    // Build our container to run our service
    const containerEnv = this.buildContainerEnv(props);

    // Build a container definition to run our service
    this.containerDefinition = this.taskDefinition.addContainer(
      "MRContainerDefinition",
      {
        containerName: this.mrDataplaneConfig.MR_CONTAINER_NAME,
        image: props.mrContainerImage,
        memoryLimitMiB: this.mrDataplaneConfig.MR_CONTAINER_MEMORY,
        cpu: this.mrDataplaneConfig.MR_CONTAINER_CPU,
        environment: containerEnv,
        startTimeout: Duration.minutes(1),
        stopTimeout: Duration.minutes(1),
        // Create a log group for console output (STDOUT)
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

    // Add port mapping to container
    this.taskDefinition.defaultContainer?.addPortMappings({
      containerPort: 80,
      hostPort: 80,
      protocol: Protocol.TCP
    });

    // If a custom security group was provided
    if (props.securityGroupId) {
      this.securityGroups = [
        SecurityGroup.fromSecurityGroupId(
          this,
          "MRImportSecurityGroup",
          props.securityGroupId
        )
      ];
    }

    // Set up Fargate service
    this.fargateService = new FargateService(this, "MRService", {
      taskDefinition: this.taskDefinition,
      cluster: this.cluster,
      minHealthyPercent: 100,
      securityGroups: this.securityGroups,
      vpcSubnets: props.osmlVpc.selectedSubnets
    });

    // Build a fluent bit log router for the MR container
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

    NagSuppressions.addResourceSuppressions(
      this,
      [
        {
          id: "NIST.800.53.R5-CloudWatchLogGroupEncrypted",
          reason:
            "By default log group is using Server-side encrpytion managed by the CloudWatch Logs service. Can change to use KMS CMK when needed."
        }
      ],
      true
    );
  }

  buildContainerEnv(props: MRDataplaneProps) {
    // Build our container to run our service
    let containerEnv = {
      AWS_DEFAULT_REGION: props.account.region,
      JOB_TABLE: this.jobStatusTable.table.tableName,
      FEATURE_TABLE: this.featureTable.table.tableName,
      ENDPOINT_TABLE: this.endpointStatisticsTable.table.tableName,
      REGION_REQUEST_TABLE: this.regionRequestTable.table.tableName,
      IMAGE_QUEUE: this.imageRequestQueue.queue.queueUrl,
      REGION_QUEUE: this.regionRequestQueue.queue.queueUrl,
      AWS_S3_ENDPOINT: this.regionalS3Endpoint,
      WORKERS_PER_CPU: this.mrDataplaneConfig.MR_WORKERS_PER_CPU.toString(),
      WORKERS: this.workers,
      REGION_SIZE: this.mrDataplaneConfig.MR_REGION_SIZE
    };

    // Check if a custom model runner container image was provided
    if (props.mrTerrainUri != undefined) {
      // Import the passed image
      this.mrTerrainUri = props.mrTerrainUri;
      containerEnv = Object.assign(containerEnv, {
        ELEVATION_DATA_LOCATION: this.mrTerrainUri
      });
    }

    // Check if a custom model runner container image was provided
    if (this.imageStatusTopic != undefined) {
      containerEnv = Object.assign(containerEnv, {
        IMAGE_STATUS_TOPIC: this.imageStatusTopic.topic.topicArn
      });
    }

    // Check if we are deploying a regin status message
    if (this.regionStatusTopic != undefined) {
      containerEnv = Object.assign(containerEnv, {
        REGION_STATUS_TOPIC: this.regionStatusTopic.topic.topicArn
      });
    }

    return containerEnv;
  }
}
