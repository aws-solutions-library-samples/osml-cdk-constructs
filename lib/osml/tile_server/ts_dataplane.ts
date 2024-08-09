/*
 * Copyright 2023-2024 Amazon.com, Inc. or its affiliates.
 */

import { Duration, RemovalPolicy } from "aws-cdk-lib";
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
import { DockerImageFunction } from "aws-cdk-lib/aws-lambda";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

import { OSMLAccount } from "../osml_account";
import { OSMLAuth } from "../osml_auth";
import { OSMLContainer } from "../osml_container";
import { OSMLQueue } from "../osml_queue";
import { OSMLRestApi } from "../osml_restapi";
import { OSMLTable } from "../osml_table";
import { OSMLVpc } from "../osml_vpc";
import { BaseConfig, ConfigType } from "../utils/base_config";
import { RegionalConfig } from "../utils/regional_config";
import { TSExecutionRole } from "./roles/ts_execution_role";
import { TSLambdaRole } from "./roles/ts_lambda_role";
import { TSTaskRole } from "./roles/ts_task_role";

/**
 * Configuration class for TSDataplane Construct.
 */
export class TSDataplaneConfig extends BaseConfig {
  /**
   * The name of the SQS queues for image status.
   * @default "TSJobQueue"
   */
  public SQS_JOB_QUEUE: string;

  /**
   * The name of the DynamoDB table for job status.
   * @default "TSJobTable"
   */
  public DDB_JOB_TABLE: string;

  /**
   * The attribute name for expiration time in DynamoDB.
   * @default "expire_time"
   */
  public DDB_TTL_ATTRIBUTE: string;

  /**
   * The namespace for metrics.
   * @default "OSML"
   */
  public ECS_METRICS_NAMESPACE: string;

  /**
   * The name of the TS cluster.
   * @default "TSCluster"
   */
  public ECS_CLUSTER_NAME: string;

  /**
   * The name of the TS task execution role.
   * @default "TSTaskRole"
   */
  public ECS_TASK_ROLE_NAME: string;

  /**
   * The name of the TS container.
   * @default "TSContainer"
   */
  public ECS_CONTAINER_NAME: string;

  /**
   * The memory configuration for TS tasks.
   * @default 16384
   */
  public ECS_TASK_MEMORY: number;

  /**
   * The CPU configuration for TS tasks.
   * @default 8192
   */
  public ECS_TASK_CPU: number;

  /**
   * The memory configuration for TS containers.
   * @default 10240
   */
  public ECS_CONTAINER_MEMORY: number;

  /**
   * The CPU configuration for TS containers.
   * @default 7168
   */
  public ECS_CONTAINER_CPU: number;

  /**
   * The port to use for the TS service.
   * @default 8080
   */
  public ECS_CONTAINER_PORT: number;

  /**
   * The name of the EFS volume to give tasks.
   * @default "ts-efs-volume"
   */
  public EFS_MOUNT_NAME: string;

  /**
   * The name of the TS Lambda execution role.
   * @default "TSLambdaRole"
   */
  public LAMBDA_ROLE_NAME: string;

  /**
   * The name of the TS ECS execution role.
   * @default "TSExecutionRole"
   */
  public EXECUTION_ROLE_NAME: string;

  /**
   * The name of the TS Log Group.
   * @default "TSService"
   */
  public CW_LOGGROUP_NAME: string;

  /**
   * The abbreviation of TS service.
   * @default "TS"
   */
  public SERVICE_NAME_ABBREVIATION: string;

  /**
   * The FastAPI root path for viewpoints.
   * @default "viewpoints"
   */
  public FASTAPI_ROOT_PATH: string;

  /**
   * The port to use in Network Load Balancer.
   * @default 80
   */
  public NETWORK_LOAD_BALANCER_PORT: number;

  /**
   * The container image to use for the TileServer.
   * @default "awsosml/osml-tile-server:latest"
   */
  public CONTAINER_URI: string;

  /**
   * The build path for the TileServer.
   * @default "lib/osml-tile-server"
   */
  public CONTAINER_BUILD_PATH: string;

  /**
   * The build target for the TileServer.
   * @default "tile_server"
   */
  public CONTAINER_BUILD_TARGET: string;

  /**
   * The path to Dockerfile.tile_server to use to build the container.
   * @default "docker/Dockerfile.tile_server"
   */
  public CONTAINER_DOCKERFILE: string;

  /**
   * The default API path to use if auth was configured.
   * @default "latest/viewpoints"
   */
  public API_DEFAULT_PATH: string;

  /**
   * Flag to determine whether to deploy the test-related components.
   * @default false
   */
  public DEPLOY_TEST_COMPONENTS: boolean;

  /**
   * The Docker image to use for the test container.
   * @default "awsosml/osml-tile-server-test:latest"
   */
  public TEST_CONTAINER_URI: string;

  /**
   * The build path for the test container.
   * @default "lib/osml-tile-server-test"
   */
  public TEST_CONTAINER_BUILD_PATH: string;

  /**
   * The build target for the test container.
   * @default "osml_tile_server_test"
   */
  public TEST_CONTAINER_BUILD_TARGET: string;

  /**
   * The repository name for the test container.
   * @default "tile-server-test-container"
   */
  public TEST_CONTAINER_REPOSITORY: string;

  /**
   * The path to Dockerfile.ts to use to build the container.
   * @default "docker/Dockerfile.integ"
   */
  public TEST_CONTAINER_DOCKERFILE: string;

  /**
   * Whether to build container resources from source.
   * @default "false"
   */
  public BUILD_FROM_SOURCE: boolean;

  /**
   * Constructor for TSDataplaneConfig.
   * @param config - The configuration object for TSDataplane.
   */
  constructor(config: ConfigType = {}) {
    super({
      SQS_JOB_QUEUE: "TSJobQueue",
      DDB_JOB_TABLE: "TSJobTable",
      ECS_METRICS_NAMESPACE: "OSML",
      ECS_CLUSTER_NAME: "TSCluster",
      ECS_TASK_ROLE_NAME: "TSTaskRole",
      ECS_CONTAINER_NAME: "TSContainer",
      ECS_TASK_MEMORY: 16384,
      ECS_TASK_CPU: 8192,
      ECS_CONTAINER_MEMORY: 10240,
      ECS_CONTAINER_CPU: 7168,
      ECS_CONTAINER_PORT: 8080,
      EFS_MOUNT_NAME: "ts-efs-volume",
      LAMBDA_ROLE_NAME: "TSLambdaRole",
      EXECUTION_ROLE_NAME: "TSExecutionRole",
      CW_LOGGROUP_NAME: "TSService",
      SERVICE_NAME_ABBREVIATION: "TS",
      FASTAPI_ROOT_PATH: "viewpoints",
      NETWORK_LOAD_BALANCER_PORT: 80,
      CONTAINER_URI: "awsosml/osml-tile-server:latest",
      CONTAINER_BUILD_PATH: "lib/osml-tile-server",
      CONTAINER_BUILD_TARGET: "tile_server",
      CONTAINER_REPOSITORY: "tile-server-container",
      CONTAINER_DOCKERFILE: "docker/Dockerfile.tile_server",
      API_DEFAULT_PATH: "latest/viewpoints",
      DEPLOY_TEST_COMPONENTS: false,
      TEST_CONTAINER_URI: "awsosml/osml-tile-server-test:latest",
      TEST_CONTAINER_BUILD_PATH: "lib/osml-tile-server-test",
      TEST_CONTAINER_BUILD_TARGET: "integ",
      TEST_CONTAINER_REPOSITORY: "tile-server-test",
      TEST_CONTAINER_DOCKERFILE: "docker/Dockerfile.integ",
      BUILD_FROM_SOURCE: false,
      ...config
    });
  }
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
   * The configuration for the authentication.
   *
   * @type {OSMLAuth}
   */
  auth?: OSMLAuth;
}

/**
 * Represents the TSDataplane construct responsible for managing the data plane
 * of the model runner application. It handles various AWS resources and configurations
 * required for the application's operation.
 *
 * @param {Construct} scope - The scope/stack in which to define this construct.
 * @param {string} id - The id of this construct within the current scope.
 * @param {TSDataplaneProps} props - The properties of this construct.
 * @returns {TSDataplane} - The TSDataplane construct.
 */
export class TSDataplane extends Construct {
  /**
   * The IAM role for the ECS task.
   */
  public taskRole: IRole;

  /**
   * The IAM role for the Lambda function.
   */
  public lambdaRole: IRole;

  /**
   * The IAM role for the ECS task execution.
   */
  public executionRole: IRole;

  /**
   * The configuration for the TSDataplane.
   */
  public config: TSDataplaneConfig;

  /**
   * The removal policy for resources created by this construct.
   */
  public removalPolicy: RemovalPolicy;

  /**
   * The regional S3 endpoint.
   */
  public regionalS3Endpoint: string;

  /**
   * The DynamoDB table for job status.
   */
  public jobTable: OSMLTable;

  /**
   * The SQS queue for job processing.
   */
  public jobQueue: OSMLQueue;

  /**
   * The log group for the TSDataplane service.
   */
  public logGroup: LogGroup;

  /**
   * The ECS cluster for running tasks.
   */
  public cluster: Cluster;

  /**
   * The ECS task definition.
   */
  public taskDefinition: TaskDefinition;

  /**
   * The container definition for the TSDataplane service.
   */
  public containerDefinition: ContainerDefinition;

  /**
   * The Fargate service for the TSDataplane container.
   */
  public fargateService: ApplicationLoadBalancedFargateService;

  /**
   * The EFS file system for the TSDataplane.
   */
  public fileSystem: FileSystem;

  /**
   * The security group for the TSDataplane.
   */
  public securityGroup?: ISecurityGroup;

  /**
   * The EFS access point for the TSDataplane.
   */
  public accessPoint: AccessPoint;

  /**
   * Container built to power the service.
   */
  public tsContainer: OSMLContainer;

  /**
   * The Rest API constructed if auth was provided for this construct.
   */
  public api: OSMLRestApi;

  /**
   * The Network load balancer constructed if auth was provided for this construct.
   */
  public nlb: NetworkLoadBalancer;

  /**
   * The container to use for integration tests for this component.
   */
  public testContainer: OSMLContainer;

  /**
   * The Docker Lamda image to run the integration tests for this component.
   */
  public lambdaIntegRunner: DockerImageFunction;

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

    // Build the container for the tile server component
    this.tsContainer = new OSMLContainer(this, "TSContainer", {
      account: props.account,
      buildFromSource: this.config.BUILD_FROM_SOURCE,
      config: {
        CONTAINER_URI: this.config.CONTAINER_URI,
        CONTAINER_BUILD_PATH: this.config.CONTAINER_BUILD_PATH,
        CONTAINER_BUILD_TARGET: this.config.CONTAINER_BUILD_TARGET,
        CONTAINER_DOCKERFILE: this.config.CONTAINER_DOCKERFILE
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
        image: this.tsContainer.containerImage,
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
    this.fargateService.node.addDependency(this.tsContainer);

    // Allow access to EFS from Fargate ECS
    this.fileSystem.grantRootAccess(
      this.fargateService.taskDefinition.taskRole
    );

    // Allow connections to the file system from the ECS cluster
    this.fileSystem.connections.allowDefaultPortFrom(
      this.fargateService.service.connections
    );

    // If we have auth enabled, deploy it
    this.buildApi(props);

    // If we have testing enabled, deploy it
    this.buildTesting(props);
  }

  /**
   * Builds the environment variables for the container deployment.
   *
   * @param {TSDataplaneProps} props - The properties required to configure the environment variables.
   * @returns {Object} An object containing the environment variables for the container.
   */
  private buildContainerEnv(props: TSDataplaneProps): {
    [key: string]: string;
  } {
    return {
      AWS_DEFAULT_REGION: props.account.region,
      JOB_TABLE: this.jobTable.table.tableName,
      JOB_QUEUE: this.jobQueue.queue.queueName,
      AWS_S3_ENDPOINT: this.regionalS3Endpoint,
      EFS_MOUNT_NAME: this.config.EFS_MOUNT_NAME,
      STS_ARN: this.taskRole.roleArn
    };
  }

  /**
   * Builds and configures the API for the service, including setting up a load balancer,
   * network load balancer, and API Gateway integration.
   *
   * @param {TSDataplaneProps} props - The properties required to configure the API.
   */
  private buildApi(props: TSDataplaneProps) {
    if (props.auth) {
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

      this.nlb = new NetworkLoadBalancer(this, "TSNetworkLoadBalancer", {
        vpc: props.osmlVpc.vpc,
        internetFacing: false
      });

      const nlbListener = this.nlb.addListener("TSNlbListener", {
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

      const vpcLink = new VpcLink(this, "TSVpcLink", {
        targets: [this.nlb]
      });

      const proxyIntegration = new HttpIntegration(
        `http://${this.nlb.loadBalancerDnsName}/${this.config.API_DEFAULT_PATH}/{proxy}`,
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

      this.api = new OSMLRestApi(this, "TileServerRestApi", {
        account: props.account,
        name: this.config.SERVICE_NAME_ABBREVIATION,
        apiStageName: this.config.FASTAPI_ROOT_PATH,
        integration: proxyIntegration,
        auth: props.auth,
        osmlVpc: props.osmlVpc,
        lambdaRole: this.lambdaRole
      });
    }
  }

  /**
   * Builds the configured integration testing resources the tile server.
   *
   * @param {TSDataplaneProps} props - The properties for configuring the MRDataplane Construct.
   */
  private buildTesting(props: TSDataplaneProps): void {
    if (this.config.DEPLOY_TEST_COMPONENTS) {
      this.testContainer = new OSMLContainer(this, "TSTestContainer", {
        account: props.account,
        buildDockerImageCode: true,
        buildFromSource: this.config.BUILD_FROM_SOURCE,
        config: {
          CONTAINER_URI: this.config.TEST_CONTAINER_URI,
          CONTAINER_BUILD_PATH: this.config.TEST_CONTAINER_BUILD_PATH,
          CONTAINER_BUILD_TARGET: this.config.TEST_CONTAINER_BUILD_TARGET,
          CONTAINER_DOCKERFILE: this.config.TEST_CONTAINER_DOCKERFILE
        }
      });

      this.lambdaIntegRunner = new DockerImageFunction(this, "TSTestRunner", {
        code: this.testContainer.dockerImageCode,
        vpc: props.osmlVpc.vpc,
        role: props.taskRole,
        timeout: Duration.minutes(10),
        memorySize: 1024,
        functionName: "TSTestRunner",
        environment: {
          TS_ENDPOINT: `http://${this.fargateService.loadBalancer.loadBalancerDnsName}/latest`
        }
      });
      this.lambdaIntegRunner.node.addDependency(this.testContainer);
    }
  }

  /**
   * Sets up the initial configuration for the construct, including security groups, roles,
   * and regional S3 endpoints.
   *
   * @param {TSDataplaneProps} props - The properties required to set up the configuration.
   */
  private setup(props: TSDataplaneProps): void {
    this.config = props.config ?? new TSDataplaneConfig();

    // Setup a removal policy
    this.removalPolicy = props.account.prodLike
      ? RemovalPolicy.RETAIN
      : RemovalPolicy.DESTROY;

    if (props.securityGroupId) {
      this.securityGroup = SecurityGroup.fromSecurityGroupId(
        this,
        "TSImportSecurityGroup",
        props.securityGroupId
      );
    }

    if (props.taskRole != undefined) {
      this.taskRole = props.taskRole;
    } else {
      this.taskRole = new TSTaskRole(this, "TSTaskRole", {
        account: props.account,
        roleName: this.config.ECS_TASK_ROLE_NAME
      }).role;
    }

    if (props.lambdaRole != undefined) {
      this.lambdaRole = props.lambdaRole;
    } else {
      this.lambdaRole = new TSLambdaRole(this, "TSLambdaRole", {
        account: props.account,
        roleName: this.config.LAMBDA_ROLE_NAME
      }).role;
    }

    if (props.executionRole != undefined) {
      this.executionRole = props.executionRole;
    } else {
      this.executionRole = new TSExecutionRole(this, "TSExecutionRole", {
        account: props.account,
        roleName: this.config.EXECUTION_ROLE_NAME
      }).role;
    }

    this.regionalS3Endpoint = RegionalConfig.getConfig(
      props.account.region
    ).s3Endpoint;
  }
}
