/*
 * Copyright 2023-2024 Amazon.com, Inc. or its affiliates.
 */
import { region_info } from "aws-cdk-lib";
import {
  CompositePrincipal,
  Effect,
  IRole,
  ManagedPolicy,
  PolicyStatement,
  Role,
  ServicePrincipal
} from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

import { OSMLAccount } from "../../osml_account";
import { MRDataplaneConfig } from "../mr_dataplane";
import { MRSyncConfig } from "../testing/mr_sync";

/**
 * Represents the properties required to define a model runner ECS task role.
 *
 * @interface MRTaskRoleProps
 */
export interface MRTaskRoleProps {
  /**
   * The OSML (OversightML) deployment account associated with this role.
   *
   * @type {OSMLAccount}
   */
  account: OSMLAccount;

  /**
   * The name to give to the role.
   *
   * @type {string}
   */
  roleName: string;
}

/**
 * Represents an MRTaskRole construct.
 */
export class MRTaskRole extends Construct {
  /**
   * The AWS IAM role associated with this MRTaskRole.
   */
  public role: IRole;

  /**
   * The AWS partition to be used for this MRTaskRole.
   */
  public partition: string;

  /**
   * The Model Runner Dataplane Configuration values to be used for this MRTaskRole
   */
  public mrDataplaneConfig: MRDataplaneConfig = new MRDataplaneConfig();

  /**
   * The Model Runner Sync Configuration values to be used for this MRTaskRole
   */
  public mrSyncConfig: MRSyncConfig = new MRSyncConfig();

  /**
   * Creates an MRTaskRole construct.
   * @param {Construct} scope - The scope/stack in which to define this construct.
   * @param {string} id - The id of this construct within the current scope.
   * @param {MRTaskRoleProps} props - The properties of this construct.
   * @returns MRTaskRole - The MRTaskRole construct.
   */
  constructor(scope: Construct, id: string, props: MRTaskRoleProps) {
    super(scope, id);

    // Determine the AWS partition based on the provided AWS region
    this.partition = region_info.Fact.find(
      props.account.region,
      region_info.FactName.PARTITION
    )!;

    // Defining constants for better readability
    const SQS_IMAGE_REQUEST_QUEUE_NAME =
      this.mrDataplaneConfig.SQS_IMAGE_REQUEST_QUEUE;
    const SQS_REGION_REQUEST_QUEUE_NAME =
      this.mrDataplaneConfig.SQS_REGION_REQUEST_QUEUE;
    const SQS_IMAGE_STATUS_QUEUE_NAME =
      this.mrDataplaneConfig.SQS_IMAGE_STATUS_QUEUE;
    const SQS_REGION_STATUS_QUEUE_NAME =
      this.mrDataplaneConfig.SQS_REGION_STATUS_QUEUE;
    const SNS_TOPIC_IMAGE_NAME = this.mrDataplaneConfig.SNS_IMAGE_STATUS_TOPIC;
    const SNS_TOPIC_REGION_NAME =
      this.mrDataplaneConfig.SNS_REGION_STATUS_TOPIC;
    const ECS_CLUSTER_NAME = this.mrDataplaneConfig.MR_CLUSTER_NAME;
    const DDB_JOB_STATUS_TABLE_NAME =
      this.mrDataplaneConfig.DDB_JOB_STATUS_TABLE;
    const DDB_FEATURES_TABLE_NAME = this.mrDataplaneConfig.DDB_FEATURES_TABLE;
    const DDB_ENDPOINT_PROCESSING_TABLE_NAME =
      this.mrDataplaneConfig.DDB_ENDPOINT_PROCESSING_TABLE;
    const DDB_REGION_REQUEST_TABLE_NAME =
      this.mrDataplaneConfig.DDB_REGION_REQUEST_TABLE;
    const MR_FIRELENS_LOG_GROUP_NAME = `/aws/${this.mrDataplaneConfig.METRICS_NAMESPACE}/MRFireLens`;
    const MR_SERVICE_LOG_GROUP_NAME = `/aws/${this.mrDataplaneConfig.METRICS_NAMESPACE}/MRService`;
    const MR_HTTPENDPOINT_LOG_GROUP_NAME = `/aws/${this.mrDataplaneConfig.METRICS_NAMESPACE}/HTTPEndpoint`;

    // Create an AWS IAM role for the Model Runner Fargate ECS task
    const mrTaskRole = new Role(this, "MRTaskRole", {
      roleName: props.roleName,
      assumedBy: new CompositePrincipal(
        new ServicePrincipal("ecs-tasks.amazonaws.com"),
        new ServicePrincipal("lambda.amazonaws.com")
      ),
      description:
        "Allows the Oversight Model Runner to access necessary AWS services (S3, SQS, DynamoDB, ...)"
    });

    const mrPolicy = new ManagedPolicy(this, "MRTaskPolicy", {
      managedPolicyName: "MRTaskPolicy"
    });

    // Add permissions to assume roles
    const stsPolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["sts:AssumeRole"],
      resources: ["*"]
    });

    // Add permissions for AWS Key Management Service (KMS)
    const kmsPolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["kms:Decrypt", "kms:GenerateDataKey", "kms:Encrypt"],
      resources: [
        `arn:${this.partition}:kms:${props.account.region}:${props.account.id}:key/*`
      ]
    });

    // Add permissions for Amazon Kinesis
    const kinesisPolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        "kinesis:PutRecord",
        "kinesis:PutRecords",
        "kinesis:DescribeStream"
      ],
      resources: [
        `arn:${this.partition}:kinesis:${props.account.region}:${props.account.id}:stream/*`
      ]
    });

    // Add permissions to describe EC2 instance types
    const ec2PolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["ec2:DescribeInstanceTypes", "ec2:DescribeSubnets"],
      resources: ["*"]
    });

    // Add permissions for SQS permissions
    const sqsPolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        "sqs:DeleteMessage",
        "sqs:ListQueues",
        "sqs:GetQueueUrl",
        "sqs:ReceiveMessage",
        "sqs:SendMessage",
        "sqs:GetQueueAttributes"
      ],
      resources: [
        `arn:${this.partition}:sqs:${props.account.region}:${props.account.id}:${SQS_IMAGE_REQUEST_QUEUE_NAME}`,
        `arn:${this.partition}:sqs:${props.account.region}:${props.account.id}:${SQS_REGION_REQUEST_QUEUE_NAME}`,
        `arn:${this.partition}:sqs:${props.account.region}:${props.account.id}:${SQS_IMAGE_STATUS_QUEUE_NAME}`,
        `arn:${this.partition}:sqs:${props.account.region}:${props.account.id}:${SQS_REGION_STATUS_QUEUE_NAME}`,
        `arn:${this.partition}:sqs:${props.account.region}:${props.account.id}:${SQS_IMAGE_REQUEST_QUEUE_NAME}DLQ`,
        `arn:${this.partition}:sqs:${props.account.region}:${props.account.id}:${SQS_REGION_REQUEST_QUEUE_NAME}DLQ`,
        `arn:${this.partition}:sqs:${props.account.region}:${props.account.id}:${SQS_IMAGE_STATUS_QUEUE_NAME}DLQ`,
        `arn:${this.partition}:sqs:${props.account.region}:${props.account.id}:${SQS_REGION_STATUS_QUEUE_NAME}DLQ`
      ]
    });

    // Add permissions for S3 permissions
    const s3PolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        "s3:GetBucketAcl",
        "s3:ListBucket",
        "s3:GetBucketLocation",
        "s3:GetObject",
        "s3:GetObjectAcl",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      resources: [`arn:${this.partition}:s3:::*`]
    });

    // Add permissions for SNS permissions
    const snsPolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["sns:Publish"],
      resources: [
        `arn:${this.partition}:sns:${props.account.region}:${props.account.id}:${SNS_TOPIC_IMAGE_NAME}`,
        `arn:${this.partition}:sns:${props.account.region}:${props.account.id}:${SNS_TOPIC_REGION_NAME}`
      ]
    });

    // Add permissions for dynamodb permissions
    const ddbPolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        "dynamodb:BatchGetItem",
        "dynamodb:BatchWriteItem",
        "dynamodb:PutItem",
        "dynamodb:ListTables",
        "dynamodb:DeleteItem",
        "dynamodb:GetItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:UpdateItem",
        "dynamodb:UpdateTable"
      ],
      resources: [
        `arn:${this.partition}:dynamodb:${props.account.region}:${props.account.id}:table/${DDB_JOB_STATUS_TABLE_NAME}`,
        `arn:${this.partition}:dynamodb:${props.account.region}:${props.account.id}:table/${DDB_FEATURES_TABLE_NAME}`,
        `arn:${this.partition}:dynamodb:${props.account.region}:${props.account.id}:table/${DDB_ENDPOINT_PROCESSING_TABLE_NAME}`,
        `arn:${this.partition}:dynamodb:${props.account.region}:${props.account.id}:table/${DDB_REGION_REQUEST_TABLE_NAME}`
      ]
    });

    // Add permission for autoscaling ECS permissions
    const autoScalingEcsPolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["ecs:DescribeServices", "ecs:UpdateService"],
      resources: [
        `arn:${this.partition}:ecs:${props.account.region}:${props.account.id}:cluster/${ECS_CLUSTER_NAME}`,
        `arn:${this.partition}:ecs:${props.account.region}:${props.account.id}:service/${ECS_CLUSTER_NAME}/*`
      ]
    });

    // Add permission for CW ECS permissions
    const cwPolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        "logs:PutLogEvents",
        "logs:GetLogEvents",
        "logs:DescribeLogStreams",
        "logs:DescribeLogGroups",
        "logs:CreateLogStream",
        "logs:CreateLogGroup"
      ],
      resources: [
        `arn:${this.partition}:logs:${props.account.region}:${props.account.id}:log-group:${MR_FIRELENS_LOG_GROUP_NAME}:*`,
        `arn:${this.partition}:logs:${props.account.region}:${props.account.id}:log-group:${MR_SERVICE_LOG_GROUP_NAME}:*`,
        `arn:${this.partition}:logs:${props.account.region}:${props.account.id}:log-group:${MR_HTTPENDPOINT_LOG_GROUP_NAME}:*`,
        `arn:${this.partition}:logs:${props.account.region}:${props.account.id}:log-group:/aws/sagemaker/Endpoints/*`
      ]
    });

    // Add permission for autoscaling CW permissions
    const autoScalingCwPolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["cloudwatch:DescribeAlarms"],
      resources: [`*`]
    });

    // Add permissions for SageMaker permissions
    const sagemakerPolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        "sagemaker:ListEndpointConfigs",
        "sagemaker:DescribeEndpointConfig",
        "sagemaker:UpdateEndpoint",
        "sagemaker:InvokeEndpoint",
        "sagemaker:DescribeEndpoint",
        "sagemaker:ListEndpoints",
        "sagemaker:InvokeEndpointAsync",
        "sagemaker:DescribeModel",
        "sagemaker:ListModels",
        "sagemaker:DescribeModelPackage",
        "sagemaker:DescribeModelPackageGroup",
        "sagemaker:BatchDescribeModelPackage",
        "sagemaker:ListModelMetadata",
        "sagemaker:DeleteEndpoint",
        "sagemaker:CreateModel",
        "sagemaker:CreateEndpoint",
        "sagemaker:CreateEndpointConfig",
        "sagemaker:BatchGetRecord",
        "sagemaker:DeleteEndpointConfig",
        "sagemaker:UpdateEndpoint",
        "sagemaker:BatchGetMetrics",
        "sagemaker:BatchPutMetrics"
      ],
      resources: [
        `arn:${this.partition}:sagemaker:${props.account.region}:${props.account.id}:*`
      ]
    });

    mrPolicy.addStatements(
      stsPolicyStatement,
      kmsPolicyStatement,
      sagemakerPolicyStatement,
      s3PolicyStatement,
      ec2PolicyStatement,
      kinesisPolicyStatement,
      snsPolicyStatement,
      sqsPolicyStatement,
      ddbPolicyStatement,
      autoScalingEcsPolicyStatement,
      autoScalingCwPolicyStatement,
      cwPolicyStatement
    );

    mrTaskRole.addManagedPolicy(mrPolicy);

    // Set the MRTaskRole property to the created role
    this.role = mrTaskRole;
  }
}
