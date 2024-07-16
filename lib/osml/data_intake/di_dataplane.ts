/*
 * Copyright 2023-2024 Amazon.com, Inc. or its affiliates.
 */

import { Duration, RemovalPolicy, Size } from "aws-cdk-lib";
import { ISecurityGroup, SecurityGroup } from "aws-cdk-lib/aws-ec2";
import { IRole } from "aws-cdk-lib/aws-iam";
import { DockerImageCode, DockerImageFunction } from "aws-cdk-lib/aws-lambda";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { ITopic, Topic } from "aws-cdk-lib/aws-sns";
import { LambdaSubscription } from "aws-cdk-lib/aws-sns-subscriptions";
import { Construct } from "constructs";

import { OSMLAccount } from "../osml_account";
import { OSMLBucket } from "../osml_bucket";
import { OSMLVpc } from "../osml_vpc";
import { DILambdaRole } from "./roles/di_lambda_role";

/**
 * Configuration class for DIDataplane Construct.
 */
export class DIDataplaneConfig {
  /**
   * Constructor for DIDataplane Construct.
   * @param {string} LAMBDA_ROLE_NAME - The name of the DI Lambda execution role.
   * @param {string} LAMBDA_FUNCTION_NAME - The name of the Lambda for the Data Intake.
   * @param {number} LAMBDA_MEMORY_SIZE - The memory in Mb to give the lambda runtime.
   * @param {number} LAMBDA_RETRY_ATTEMPTS - The number of times to retry a failed function call.
   * @param {number} LAMBDA_STORAGE_SIZE - The size of the storage to assign lambda runtime in GB.
   * @param {number} LAMBDA_TIMEOUT - The timeout, in seconds, for the Lambda function.
   * @param {string} SNS_INPUT_TOPIC_NAME - The name to give the input SNS topic.
   * @param {string} SNS_STAC_TOPIC_NAME - The name to give the output SNS topic.
   * @param {string} S3_INPUT_BUCKET_NAME - The name to give the input bucket.
   * @param {string} S3_OUTPUT_BUCKET_NAME - The name to give the output bucket.
   */
  constructor(
    public LAMBDA_ROLE_NAME: string = "DILambdaRole",
    public LAMBDA_FUNCTION_NAME: string = "DILambda",
    public LAMBDA_MEMORY_SIZE: number = 1024,
    public LAMBDA_RETRY_ATTEMPTS: number = 3,
    public LAMBDA_STORAGE_SIZE: number = 10,
    public LAMBDA_TIMEOUT: number = 120,
    public SNS_INPUT_TOPIC_NAME: string = "osml-data-intake",
    public SNS_STAC_TOPIC_NAME: string = "osml-stac-ingest",
    public S3_INPUT_BUCKET_NAME: string = "di-input-bucket",
    public S3_OUTPUT_BUCKET_NAME: string = "di-output-bucket"
  ) {}
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
   * The Docker image code to use for the lambda function
   */
  intakeCode: DockerImageCode;

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
  // Public properties
  public config: DIDataplaneConfig;
  public lambdaFunction: DockerImageFunction;
  public inputTopic: ITopic;
  public stacTopic: ITopic;
  public outputBucket: Bucket;
  public removalPolicy: RemovalPolicy;
  public lambdaRole: IRole;
  public securityGroup?: ISecurityGroup;
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

    // Define a Lambda function with a container image
    this.lambdaFunction = new DockerImageFunction(this, "DataIntakeFunction", {
      code: props.intakeCode,
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
  setup(props: DIDataplaneProps): void {
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
