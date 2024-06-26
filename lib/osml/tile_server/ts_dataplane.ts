/*
 * Copyright 2023-2024 Amazon.com, Inc. or its affiliates.
 */

import { Duration, region_info, RemovalPolicy } from "aws-cdk-lib";
import {
  ConnectionType,
  HttpIntegration,
  VpcLink
} from "aws-cdk-lib/aws-apigateway";
import {
  BackupPlan,
  BackupPlanRule,
  BackupResource,
  BackupVault
} from "aws-cdk-lib/aws-backup";
import { AttributeType } from "aws-cdk-lib/aws-dynamodb";
import { ISecurityGroup, Peer, Port, SecurityGroup } from "aws-cdk-lib/aws-ec2";
import {
  AwsLogDriver,
  AwsLogDriverMode,
  Cluster,
  Compatibility,
  ContainerDefinition,
  ContainerImage,
  Protocol as ecs_protocol,
  TaskDefinition
} from "aws-cdk-lib/aws-ecs";
import { ApplicationLoadBalancedFargateService } from "aws-cdk-lib/aws-ecs-patterns";
import {
  AccessPoint,
  FileSystem,
  LifecyclePolicy,
  PerformanceMode,
  ThroughputMode
} from "aws-cdk-lib/aws-efs";
import {
  NetworkLoadBalancer,
  Protocol as elbv2_protocol
} from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { AlbTarget } from "aws-cdk-lib/aws-elasticloadbalancingv2-targets";
import { AnyPrincipal, IRole, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

import { OSMLAccount } from "../osml_account";
import { OSMLQueue } from "../osml_queue";
import { OSMLRestApi } from "../osml_restapi";
import { OSMLTable } from "../osml_table";
import { OSMLVpc } from "../osml_vpc";
import { TSExecutionRole } from "./roles/ts_execution_role";
import { TSLambdaRole } from "./roles/ts_lambda_role";
import { TSTaskRole } from "./roles/ts_task_role";

/**
 * Configuration class for TSDataplane Construct.
 */
export class TSDataplaneConfig {
  /**
   * Constructor for MRDataplaneConfig.
   * @param {string} SQS_JOB_QUEUE - The name of the SQS queue for image status.
   * @param {string} DDB_JOB_TABLE - The name of the DynamoDB table for job status.
   * @param {string} DDB_TTL_ATTRIBUTE - The attribute name for expiration time in DynamoDB.
   * @param {string} ECS_METRICS_NAMESPACE - The namespace for metrics.
   * @param {string} ECS_CLUSTER_NAME - The name of the TS cluster.
   * @param {string} ECS_TASK_ROLE_NAME - The name of the TS task execution role.
   * @param {string} ECS_CONTAINER_NAME - The name of the TS container.
   * @param {number} ECS_TASK_MEMORY - The memory configuration for TS tasks.
   * @param {number} ECS_TASK_CPU - The CPU configuration for TS tasks.
   * @param {number} ECS_CONTAINER_MEMORY - The memory configuration for TS containers.
   * @param {number} ECS_CONTAINER_CPU - The CPU configuration for TS containers.
   * @param {number} ECS_CONTAINER_PORT - The port to use for the TS service.
   * @param {string} EFS_MOUNT_NAME - The name of the EFS volume to give tasks.
   * @param {string} LAMBDA_ROLE_NAME - The name of the TS Lambda execution role.
   * @param {string} EXECUTION_ROLE_NAME - The name of the TS ECS execution role.
   * @param {string} CW_LOGGROUP_NAME - The name of the TS Log Group name.
   * @param {string} SERVICE_NAME_ABBREVIATION - The abbreviation of TS service.
   * @param {string} FASTAPI_ROOT_PATH - The FastAPI root path for viewpoints.
   * @param {string} NETWORK_LOAD_BALANCER_PORT - The port to use in Network Load Balancer.
   */
  constructor(
    public SQS_JOB_QUEUE: string = "TSJobQueue",
    public DDB_JOB_TABLE: string = "TSJobTable",
    public DDB_TTL_ATTRIBUTE: string = "expire_time",
    public ECS_METRICS_NAMESPACE: string = "OSML",
    public ECS_CLUSTER_NAME: string = "TSCluster",
    public ECS_TASK_ROLE_NAME: string = "TSTaskRole",
    public ECS_CONTAINER_NAME: string = "TSContainer",
    public ECS_TASK_MEMORY: number = 16384,
    public ECS_TASK_CPU: number = 8192,
    public ECS_CONTAINER_MEMORY: number = 10240,
    public ECS_CONTAINER_CPU: number = 7168,
    public ECS_CONTAINER_PORT: number = 8080,
    public EFS_MOUNT_NAME: string = "ts-efs-volume",
    public LAMBDA_ROLE_NAME: string = "TSLambdaRole",
    public EXECUTION_ROLE_NAME: string = "TSExecutionRole",
    public CW_LOGGROUP_NAME: string = "TSService",
    public SERVICE_NAME_ABBREVIATION: string = "TS",
    public FASTAPI_ROOT_PATH: string = "viewpoints",
    public NETWORK_LOAD_BALANCER_PORT: number = 80
  ) {}
}

/**
 * Interface representing properties for configuring the TSDataplane Construct.
 */
export interface TSDataplaneProps {
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
   * The security group ID to use for the Dataplane (optional).
   * @type {string | undefined}
   */
  securityGroupId?: string;

  /**
   * The IAM (Identity and Access Management) role to be used for ECS tasks (optional).
   * @type {IRole | undefined}
   */
  taskRole?: IRole;

  /**
   * The IAM (Identity and Access Management) role to be used for Lambda (optional).
   * @type {IRole | undefined}
   */
  lambdaRole?: IRole;

  /**
   * The IAM (Identity and Access Management) role to be used for an ECS execution role (optional).
   * @type {IRole | undefined}
   */
  executionRole?: IRole;

  /**
   * Custom configuration for the TSDataplane Construct (optional).
   * @type {TSDataplaneConfig | undefined}
   */
  config?: TSDataplaneConfig;

  /**
   * An array of target subnets for the Dataplane.
   * @type {string[] | undefined}
   */
  targetSubnets?: string[];

  /**
   * The container image to be used for the model runner ecs tasks.
   * @type {ContainerImage}
   */
  containerImage: ContainerImage;

  /**
   * The location of the lambda function code to handle requests that end up in
   *  the dead letter queue (DLQ).
   * @type {string | undefined}
   */
  sourcePathDLQLambda?: string;
}

/**
 * Represents the MRDataplane construct responsible for managing the data plane
 * of the model runner application. It handles various AWS resources and configurations
 * required for the application's operation.
 *
 * @param {Construct} scope - The scope/stack in which to define this construct.
 * @param {string} id - The id of this construct within the current scope.
 * @param {TSDataplaneProps} props - The properties of this construct.
 * @returns {TSDataplane} - The TSDataplane construct.
 */
export class TSDataplane extends Construct {
  // Public properties
  public taskRole: IRole;
  public lambdaRole: IRole;
  public executionRole: IRole;
  public config: TSDataplaneConfig;
  public removalPolicy: RemovalPolicy;
  public regionalS3Endpoint: string;
  public jobTable: OSMLTable;
  public jobQueue: OSMLQueue;
  public logGroup: LogGroup;
  public cluster: Cluster;
  public taskDefinition: TaskDefinition;
  public containerDefinition: ContainerDefinition;
  public fargateService: ApplicationLoadBalancedFargateService;
  public fileSystem: FileSystem;
  public securityGroup?: ISecurityGroup;
  // eslint-disable-next-line @typescript-eslint/ban-types
  public lambdaSweeperFunction: Function;
  // eslint-disable-next-line @typescript-eslint/ban-types
  public lambdaIntegTest: Function;
  public sqsDlqEventSource: SqsEventSource;
  public accessPoint: AccessPoint;

  /**
   * Constructs an instance of TSDataplane.
   *
   * @constructor
   * @param {Construct} scope - The scope/stack in which to define this construct.
   * @param {string} id - The id of this construct within the current scope.
   * @param {TSDataplaneProps} props - The properties of this construct.
   */
  constructor(scope: Construct, id: string, props: TSDataplaneProps) {
    super(scope, id);

    // Setup a removal policy
    this.removalPolicy = props.account.prodLike
      ? RemovalPolicy.RETAIN
      : RemovalPolicy.DESTROY;

    // Setup class from base properties
    this.setup(props);

    // Job status table to store worker status info
    this.jobTable = new OSMLTable(this, "TSJobTable", {
      tableName: this.config.DDB_JOB_TABLE,
      partitionKey: {
        name: "viewpoint_id",
        type: AttributeType.STRING
      },
      removalPolicy: this.removalPolicy,
      ttlAttribute: this.config.DDB_TTL_ATTRIBUTE
    });

    // AWS Backup solution is available in most regions
    if (props.account.prodLike && !props.account.isAdc) {
      const backupVault = new BackupVault(this, `TSBackupVault`, {
        backupVaultName: `TSBackupVault`
      });
      const plan = new BackupPlan(this, `TSBackupPlan`);
      plan.addRule(BackupPlanRule.weekly(backupVault));
      plan.addRule(BackupPlanRule.monthly5Year(backupVault));
      plan.addSelection(`TSBackupSelection`, {
        resources: [BackupResource.fromDynamoDbTable(this.jobTable.table)]
      });
    }

    // Create an SQS queue for image processing status updates
    this.jobQueue = new OSMLQueue(this, "TSJobQueue", {
      queueName: this.config.SQS_JOB_QUEUE
    });

    // Create a Lambda function to clean up the TS DLQ
    this.lambdaSweeperFunction = new Function(this, "TSLambdaSweeperDLQ", {
      code: Code.fromAsset(
        props.sourcePathDLQLambda
          ? props.sourcePathDLQLambda
          : "lib/osml-tile-server/src/aws/osml/tile_server/lambda"
      ),
      handler: "cleanup_dlq.lambda_handler",
      functionName: "TSLambdaSweeperDLQ",
      runtime: Runtime.PYTHON_3_11,
      role: this.lambdaRole,
      environment: {
        JOB_TABLE: this.config.DDB_JOB_TABLE
      }
    });

    // Attach DLQ Queue to Lambda Sweeper Function
    this.sqsDlqEventSource = new SqsEventSource(this.jobQueue.dlQueue);
    this.lambdaSweeperFunction.addEventSource(this.sqsDlqEventSource);

    // Log group for MR container
    this.logGroup = new LogGroup(this, "TSServiceLogGroup", {
      logGroupName: "/aws/OSML/" + this.config.CW_LOGGROUP_NAME,
      retention: RetentionDays.TEN_YEARS,
      removalPolicy: this.removalPolicy
    });

    // EFS volume mounted file system
    this.fileSystem = new FileSystem(this, "TSEfsFileSystem", {
      vpc: props.osmlVpc.vpc,
      lifecyclePolicy: LifecyclePolicy.AFTER_14_DAYS,
      performanceMode: PerformanceMode.GENERAL_PURPOSE,
      throughputMode: ThroughputMode.BURSTING,
      removalPolicy: this.removalPolicy,
      vpcSubnets: props.osmlVpc.selectedSubnets,
      securityGroup: this.securityGroup
    });

    this.fileSystem.addToResourcePolicy(
      new PolicyStatement({
        actions: [
          "elasticfilesystem:ClientMount",
          "elasticfilesystem:ClientWrite",
          "elasticfilesystem:ClientRootAccess"
        ],
        principals: [new AnyPrincipal()],
        conditions: {
          Bool: {
            "elasticfilesystem:AccessedViaMountTarget": "true"
          }
        }
      })
    );

    // Create access point for TileServer (USER)
    this.accessPoint = this.fileSystem.addAccessPoint("TSAccessPoint", {
      path: "/" + this.config.EFS_MOUNT_NAME,
      createAcl: {
        ownerGid: "1000",
        ownerUid: "1000",
        permissions: "777"
      },
      posixUser: {
        uid: "1000",
        gid: "1000"
      }
    });

    // Build cluster to house our containers when they spin up
    this.cluster = new Cluster(this, "TSCluster", {
      clusterName: this.config.ECS_CLUSTER_NAME,
      vpc: props.osmlVpc.vpc,
      containerInsights: props.account.prodLike
    });

    // Define our ECS task
    this.taskDefinition = new TaskDefinition(this, "TSTaskDefinition", {
      memoryMiB: this.config.ECS_TASK_MEMORY.toString(),
      cpu: this.config.ECS_TASK_CPU.toString(),
      compatibility: Compatibility.FARGATE,
      taskRole: this.taskRole,
      executionRole: this.executionRole,
      ephemeralStorageGiB: 21,
      volumes: [
        {
          name: this.config.EFS_MOUNT_NAME,
          efsVolumeConfiguration: {
            fileSystemId: this.fileSystem.fileSystemId,
            transitEncryption: "ENABLED",
            authorizationConfig: {
              iam: "ENABLED",
              accessPointId: this.accessPoint.accessPointId
            }
          }
        }
      ]
    });

    // Build a container definition to run our service
    this.containerDefinition = this.taskDefinition.addContainer(
      "TSContainerDefinition",
      {
        containerName: this.config.ECS_CONTAINER_NAME,
        image: props.containerImage,
        memoryLimitMiB: this.config.ECS_CONTAINER_MEMORY,
        cpu: this.config.ECS_CONTAINER_CPU,
        environment: this.buildContainerEnv(props),
        startTimeout: Duration.minutes(1),
        stopTimeout: Duration.minutes(1),
        logging: new AwsLogDriver({
          streamPrefix: "TileServerContainer",
          logGroup: this.logGroup,
          mode: AwsLogDriverMode.NON_BLOCKING
        }),
        disableNetworking: false,
        healthCheck: {
          command: ["curl --fail http://localhost:8080/ping || exit 1"],
          interval: Duration.seconds(30),
          retries: 3,
          timeout: Duration.seconds(10)
        }
      }
    );

    // Mount EFS to container
    this.containerDefinition.addMountPoints({
      sourceVolume: this.config.EFS_MOUNT_NAME,
      containerPath: "/" + this.config.EFS_MOUNT_NAME,
      readOnly: false
    });

    // Add port mapping to container
    this.taskDefinition.defaultContainer?.addPortMappings({
      containerPort: this.config.ECS_CONTAINER_PORT,
      hostPort: this.config.ECS_CONTAINER_PORT,
      protocol: ecs_protocol.TCP
    });

    // Set up Fargate service
    this.fargateService = new ApplicationLoadBalancedFargateService(
      this,
      "TSService",
      {
        taskDefinition: this.taskDefinition,
        cluster: this.cluster,
        minHealthyPercent: 100,
        securityGroups: this.securityGroup ? [this.securityGroup] : [],
        taskSubnets: props.osmlVpc.selectedSubnets,
        assignPublicIp: false,
        publicLoadBalancer: false
      }
    );

    if (props.account.auth) {
      this.fargateService.loadBalancer.connections.allowFrom(
        Peer.ipv4(props.osmlVpc.vpc.vpcCidrBlock),
        Port.tcp(80),
        "Allow HTTP traffic from VPC"
      );

      this.fargateService.service.connections.allowFrom(
        this.fargateService.loadBalancer,
        Port.tcp(8080),
        "Allow traffic from ALB"
      );

      // Create Network Load Balancer (NLB) within the private VPC
      const nlb = new NetworkLoadBalancer(this, "TSNetworkLoadBalancer", {
        vpc: props.osmlVpc.vpc,
        internetFacing: false
      });

      const nlbListener = nlb.addListener("TSNlbListener", {
        port: this.config.NETWORK_LOAD_BALANCER_PORT,
        protocol: elbv2_protocol.TCP
      });

      nlbListener.addTargets("TSNlbTargetGroup", {
        targets: [
          new AlbTarget(
            this.fargateService.loadBalancer,
            this.config.NETWORK_LOAD_BALANCER_PORT
          )
        ],
        port: this.config.NETWORK_LOAD_BALANCER_PORT
      });

      // Create VPC Link to connect APIGW to NLB
      const vpcLink = new VpcLink(this, "TSVpcLink", {
        targets: [nlb]
      });

      const apiPath = "latest/viewpoints";
      const proxyIntegration = new HttpIntegration(
        `http://${nlb.loadBalancerDnsName}/${apiPath}/{proxy}`,
        {
          httpMethod: "ANY",
          proxy: true,
          options: {
            vpcLink: vpcLink,
            connectionType: ConnectionType.VPC_LINK,
            requestParameters: {
              "integration.request.path.proxy": "method.request.path.proxy",
              "integration.request.header.X-Forwarded-Path":
                "method.request.path.proxy",
              "integration.request.header.Accept":
                "method.request.header.Accept"
            }
          }
        }
      );

      // Create RestApi along with Proxy enabled, then attach Authorizer to the API-Gateway
      new OSMLRestApi(this, "TileServerRestApi", {
        account: props.account,
        name: this.config.SERVICE_NAME_ABBREVIATION,
        apiStageName: this.config.FASTAPI_ROOT_PATH,
        integration: proxyIntegration
      });
    }

    // Allow access to EFS from Fargate ECS
    this.fileSystem.grantRootAccess(
      this.fargateService.taskDefinition.taskRole
    );

    // Allow connections to the file system from the ECS cluster
    this.fileSystem.connections.allowDefaultPortFrom(
      this.fargateService.service.connections
    );
  }

  buildContainerEnv(props: TSDataplaneProps) {
    // Build an ENV for our container deployment
    return {
      AWS_DEFAULT_REGION: props.account.region,
      JOB_TABLE: this.jobTable.table.tableName,
      JOB_QUEUE: this.jobQueue.queue.queueName,
      AWS_S3_ENDPOINT: this.regionalS3Endpoint,
      EFS_MOUNT_NAME: this.config.EFS_MOUNT_NAME,
      STS_ARN: this.taskRole.roleArn
    };
  }

  setup(props: TSDataplaneProps): void {
    // Check if a custom configuration was provided
    if (props.config != undefined) {
      // Import existing passed-in MR configuration
      this.config = props.config;
    } else {
      // Create a new default configuration
      this.config = new TSDataplaneConfig();
    }

    // If a custom security group was provided
    if (props.securityGroupId) {
      this.securityGroup = SecurityGroup.fromSecurityGroupId(
        this,
        "TSImportSecurityGroup",
        props.securityGroupId
      );
    }

    // Check if a task role was provided
    if (props.taskRole != undefined) {
      // Import passed-in MR task role
      this.taskRole = props.taskRole;
    } else {
      // Create a new role
      this.taskRole = new TSTaskRole(this, "TSTaskRole", {
        account: props.account,
        roleName: this.config.ECS_TASK_ROLE_NAME
      }).role;
    }

    // Check if a lambda role was provided
    if (props.lambdaRole != undefined) {
      // Import passed-in TS lambda role
      this.lambdaRole = props.lambdaRole;
    } else {
      // Create a new role
      this.lambdaRole = new TSLambdaRole(this, "TSLambdaRole", {
        account: props.account,
        roleName: this.config.LAMBDA_ROLE_NAME
      }).role;
    }

    // Check if a lambda role was provided
    if (props.executionRole != undefined) {
      // Import passed-in TS lambda role
      this.executionRole = props.executionRole;
    } else {
      // Create a new role
      this.executionRole = new TSExecutionRole(this, "TSExecutionRole", {
        account: props.account,
        roleName: this.config.EXECUTION_ROLE_NAME
      }).role;
    }

    // Set up a few regional S3 endpoints for GDAL to use
    class S3FactISO implements region_info.IFact {
      public readonly region = "us-iso-east-1";
      public readonly name =
        region_info.FactName.servicePrincipal("s3.amazonaws.com");
      public readonly value = "s3.us-iso-east-1.c2s.ic.gov";
    }

    class S3FactISOB implements region_info.IFact {
      public readonly region = "us-isob-east-1";
      public readonly name =
        region_info.FactName.servicePrincipal("s3.amazonaws.com");
      public readonly value = "s3.us-isob-east-1.sc2s.sgov.gov";
    }

    region_info.Fact.register(new S3FactISO(), true);
    region_info.Fact.register(new S3FactISOB(), true);

    // Set up a regional S3 endpoint for GDAL to use
    this.regionalS3Endpoint = region_info.Fact.find(
      props.account.region,
      region_info.FactName.servicePrincipal("s3.amazonaws.com")
    )!;
  }
}
