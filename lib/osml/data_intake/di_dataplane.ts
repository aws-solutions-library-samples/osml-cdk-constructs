/*
 * Copyright 2023-2024 Amazon.com, Inc. or its affiliates.
 */

import { Duration, RemovalPolicy, Size } from "aws-cdk-lib";
import { ISecurityGroup, SecurityGroup } from "aws-cdk-lib/aws-ec2";
import { IRole } from "aws-cdk-lib/aws-iam";
import { DockerImageFunction } from "aws-cdk-lib/aws-lambda";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { ITopic, Topic } from "aws-cdk-lib/aws-sns";
import { LambdaSubscription } from "aws-cdk-lib/aws-sns-subscriptions";
import { Construct } from "constructs";

import { OSMLAccount } from "../osml_account";
import { OSMLBucket } from "../osml_bucket";
import { OSMLContainer } from "../osml_container";
import { OSMLVpc } from "../osml_vpc";
import { BaseConfig, ConfigType } from "../utils/base_config";
import { DILambdaRole } from "./roles/di_lambda_role";

/**
 * Configuration class for DIDataplane Construct.
 */
export class DIDataplaneConfig extends BaseConfig {
  /**
   * The name of the DI Lambda execution role.
   * @default "DILambdaRole"
   */
  public LAMBDA_ROLE_NAME: string;

  /**
   * The name of the Lambda for the Data Intake.
   * @default "DILambda"
   */
  public LAMBDA_FUNCTION_NAME: string;

  /**
   * The memory in MB to give the lambda runtime.
   * @default 1024
   */
  public LAMBDA_MEMORY_SIZE: number;

  /**
   * The size of the storage to assign lambda runtime in GB.
   * @default 10
   */
  public LAMBDA_STORAGE_SIZE: number;

  /**
   * The timeout, in seconds, for the Lambda function.
   * @default 900
   */
  public LAMBDA_TIMEOUT: number;

  /**
   * The name to give the input SNS topic.
   * @default "osml-data-intake"
   */
  public SNS_INPUT_TOPIC_NAME: string;

  /**
   * The name to give the output SNS topic.
   * @default "osml-stac-ingest"
   */
  public SNS_STAC_TOPIC_NAME: string;

  /**
   * The name to give the output bucket.
   * @default "di-output-bucket"
   */
  public S3_OUTPUT_BUCKET_NAME: string;

  /**
   * The container image to use for the Data Intake lambda.
   * @default "awsosml/osml-tile-server:latest"
   */
  public CONTAINER_SOURCE_URI: string;

  /**
   * The build path for the Data Intake.
   * @default "lib/osml-data-intake"
   */
  public CONTAINER_BUILD_PATH: string;

  /**
   * The build target for the Data Intake.
   * @default "intake"
   */
  public CONTAINER_BUILD_TARGET: string;

  /**
   * The relative Dockerfile to use to build the container.
   * @default "docker/Dockerfile.intake"
   */
  public CONTAINER_DOCKERFILE: string;

  /**
   * The repository name for the TileServer.
   * @default "data-intake"
   */
  public CONTAINER_REPOSITORY: string;

  /**
   * Constructor for DIDataplane Construct.
   * @param config - The configuration object for DIDataplane.
   */
  constructor(config: ConfigType = {}) {
    super({
      LAMBDA_ROLE_NAME: "DILambdaRole",
      LAMBDA_FUNCTION_NAME: "DILambda",
      LAMBDA_MEMORY_SIZE: 1024,
      LAMBDA_RETRY_ATTEMPTS: 3,
      LAMBDA_STORAGE_SIZE: 10,
      LAMBDA_TIMEOUT: 900,
      SNS_INPUT_TOPIC_NAME: "osml-data-intake",
      SNS_STAC_TOPIC_NAME: "osml-stac-ingest",
      S3_INPUT_BUCKET_NAME: "di-input-bucket",
      S3_OUTPUT_BUCKET_NAME: "di-output-bucket",
      CONTAINER_SOURCE_URI: "awsosml/osml-data-intake-intake:latest",
      CONTAINER_BUILD_PATH: "lib/osml-data-intake",
      CONTAINER_BUILD_TARGET: "intake",
      CONTAINER_DOCKERFILE: "docker/Dockerfile.intake",
      CONTAINER_REPOSITORY: "data-intake",
      ...config
    });
  }
}

/**
 * Interface representing properties for configuring the DIDataplane Construct.
 */
export interface DIDataplaneProps {
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
   * The IAM (Identity and Access Management) role to be used for Lambda (optional).
   * @type {IRole | undefined}
   */
  lambdaRole?: IRole;

  /**
   * The input topic to receive Data Intake requests (optional).
   * @type {Topic | undefined}
   */
  inputTopic?: ITopic;

  /**
   * The output topic to send generated STAC items (optional).
   * @type {Topic | undefined}
   */
  stacTopic?: ITopic;

  /**
   * Optional flag to instruct building data intake container from source.
   */
  buildFromSource?: boolean;

  /**
   * Custom configuration for the DIDataplane Construct (optional).
   * @type {DIDataplaneConfig | undefined}
   */
  config?: DIDataplaneConfig;
}

/**
 * Represents the DIDataplane construct responsible for managing the data plane
 * of the model runner application. It handles various AWS resources and configurations
 * required for the application's operation.
 *
 * @param {Construct} scope - The scope/stack in which to define this construct.
 * @param {string} id - The id of this construct within the current scope.
 * @param {DIDataplaneProps} props - The properties of this construct.
 * @returns {DIDataplane} - The DIDataplane construct.
 */
export class DIDataplane extends Construct {
  /**
   * The configuration for the DIDataplane.
   */
  public config: DIDataplaneConfig;

  /**
   * The Lambda function for data intake.
   */
  public lambdaFunction: DockerImageFunction;

  /**
   * The SNS topic for input data.
   */
  public inputTopic: ITopic;

  /**
   * The SNS topic for STAC item outputs.
   */
  public stacTopic: ITopic;

  /**
   * The S3 bucket for output data.
   */
  public outputBucket: Bucket;

  /**
   * The removal policy for resources created by this construct.
   */
  public removalPolicy: RemovalPolicy;

  /**
   * The IAM role for the Lambda function.
   */
  public lambdaRole: IRole;

  /**
   * The security group for the Lambda function.
   */
  public securityGroup?: ISecurityGroup;

  /**
   * The container for the data intake process.
   */
  private diContainer: OSMLContainer;

  /**
   * Constructs an instance of DIDataplane.
   *
   * @constructor
   * @param {Construct} scope - The scope/stack in which to define this construct.
   * @param {string} id - The id of this construct within the current scope.
   * @param {DIDataplaneProps} props - The properties of this construct.
   */
  constructor(scope: Construct, id: string, props: DIDataplaneProps) {
    super(scope, id);
    // Setup class from base properties
    this.setup(props);

    // Create a test output bucket
    this.outputBucket = new OSMLBucket(this, `DIInputBucket`, {
      bucketName: `${this.config.S3_OUTPUT_BUCKET_NAME}-${props.account.id}`,
      prodLike: props.account.prodLike,
      removalPolicy: this.removalPolicy
    }).bucket;

    // Build the lambda container image
    this.diContainer = new OSMLContainer(this, "DIContainer", {
      account: props.account,
      buildFromSource: props.buildFromSource,
      osmlVpc: props.osmlVpc,
      config: {
        CONTAINER_URI: this.config.CONTAINER_SOURCE_URI,
        CONTAINER_BUILD_PATH: this.config.CONTAINER_BUILD_PATH,
        CONTAINER_BUILD_TARGET: this.config.CONTAINER_BUILD_TARGET,
        CONTAINER_REPOSITORY: this.config.CONTAINER_REPOSITORY,
        CONTAINER_DOCKERFILE: this.config.CONTAINER_DOCKERFILE
      }
    });

    // Define a Lambda function with a container image
    this.lambdaFunction = new DockerImageFunction(this, "DataIntakeFunction", {
      code: this.diContainer.dockerImageCode,
      timeout: Duration.seconds(this.config.LAMBDA_TIMEOUT),
      functionName: this.config.LAMBDA_FUNCTION_NAME,
      environment: {
        OUTPUT_BUCKET: this.outputBucket.bucketName,
        OUTPUT_TOPIC: this.stacTopic.topicArn
      },
      memorySize: this.config.LAMBDA_MEMORY_SIZE,
      ephemeralStorageSize: Size.gibibytes(this.config.LAMBDA_STORAGE_SIZE),
      securityGroups: this.securityGroup ? [this.securityGroup] : [],
      vpc: props.osmlVpc.vpc,
      vpcSubnets: props.osmlVpc.selectedSubnets,
      role: this.lambdaRole
    });
    this.lambdaFunction.node.addDependency(this.diContainer);

    // Subscribe Lambda function to the SNS topic
    this.inputTopic.addSubscription(
      new LambdaSubscription(this.lambdaFunction)
    );
  }

  /**
   * Sets up the DIDataplane construct with the provided properties.
   * This method initializes the construct's configuration based on the input properties,
   * configures security groups and IAM roles, and applies any custom configuration provided.
   * If no custom configuration is supplied, a default configuration will be created.
   *
   * @param {DIDataplaneProps} props - The properties used to configure the Dataplane.
   *        Includes options for VPC configuration, IAM roles, security groups, and more.
   */
  private setup(props: DIDataplaneProps): void {
    // Check if a custom configuration was provided
    if (props.config != undefined) {
      // Import existing passed-in DIDataplane configuration
      this.config = props.config;
    } else {
      // Create a new default configuration
      this.config = new DIDataplaneConfig();
    }

    // Setup a removal policy
    this.removalPolicy = props.account.prodLike
      ? RemovalPolicy.RETAIN
      : RemovalPolicy.DESTROY;

    // Create an SNS topic for Data Intake requests if needed
    if (props.inputTopic) {
      this.inputTopic = props.inputTopic;
    } else {
      this.inputTopic = new Topic(this, "DIInputTopic", {
        topicName: this.config.SNS_INPUT_TOPIC_NAME
      });
    }

    // Create an SNS topic for STAC item outputs if needed
    if (props.stacTopic) {
      this.stacTopic = props.stacTopic;
    } else {
      this.stacTopic = new Topic(this, "DIOutputTopic", {
        topicName: this.config.SNS_STAC_TOPIC_NAME
      });
    }

    // If a custom security group was provided
    if (props.securityGroupId) {
      this.securityGroup = SecurityGroup.fromSecurityGroupId(
        this,
        "DIImportSecurityGroup",
        props.securityGroupId
      );
    }

    // Create a lambda role if needed
    if (props.lambdaRole != undefined) {
      this.lambdaRole = props.lambdaRole;
    } else {
      this.lambdaRole = new DILambdaRole(this, "DILambdaRole", {
        account: props.account,
        roleName: this.config.LAMBDA_ROLE_NAME
      }).role;
    }
  }
}
