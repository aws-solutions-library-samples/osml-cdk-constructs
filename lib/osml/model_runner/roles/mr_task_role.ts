/*
 * Copyright 2023-2024 Amazon.com, Inc. or its affiliates.
 */
import { region_info } from "aws-cdk-lib";
import {
  CompositePrincipal,
  Effect,
  IRole,
  PolicyStatement,
  Role,
  ServicePrincipal
} from "aws-cdk-lib/aws-iam";
import { NagSuppressions } from "cdk-nag/lib/nag-suppressions";
import { Construct } from "constructs";

import { OSMLAccount } from "../../osml_account";
import { MRContainerConfig } from "../mr_container";
import { MRDataplaneConfig } from "../mr_dataplane";
import { MRModelEndpointsConfig } from "../testing/mr_endpoints";
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
   * The Model Runner Model Endpoints Configuration values to be used for this MRTaskRole
   */
  public mrModelEndpointsConfig: MRModelEndpointsConfig =
    new MRModelEndpointsConfig();

  /**
   * The Model Runner Container Configuration values to be used for this MRTaskRole
   */
  public mrContainerConfig: MRContainerConfig = new MRContainerConfig();

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

    // Add permissions to assume roles
    mrTaskRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["sts:AssumeRole"],
        resources: ["*"]
      })
    );

    // Add permissions for AWS Key Management Service (KMS)
    mrTaskRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["kms:Decrypt", "kms:GenerateDataKey", "kms:Encrypt"],
        resources: [
          `arn:${this.partition}:kms:${props.account.region}:${props.account.id}:key/*`
        ]
      })
    );

    // Add permissions for Amazon Kinesis
    mrTaskRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          "kinesis:PutRecord",
          "kinesis:PutRecords",
          "kinesis:DescribeStream"
        ],
        resources: [
          `arn:${this.partition}:kinesis:${props.account.region}:${props.account.id}:stream/${this.mrSyncConfig.KINESIS_RESULTS_STREAM}-${props.account.id}`
        ]
      })
    );

    // Add permissions to describe EC2 instance types
    mrTaskRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["ec2:DescribeInstanceTypes", "ec2:DescribeSubnets"],
        resources: ["*"]
      })
    );

    // Add permissions for SQS permissions
    mrTaskRole.addToPolicy(
      new PolicyStatement({
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
          `arn:${this.partition}:sqs:${props.account.region}:${props.account.id}:${this.mrDataplaneConfig.SQS_IMAGE_REQUEST_QUEUE}`,
          `arn:${this.partition}:sqs:${props.account.region}:${props.account.id}:${this.mrDataplaneConfig.SQS_REGION_REQUEST_QUEUE}`,
          `arn:${this.partition}:sqs:${props.account.region}:${props.account.id}:${this.mrDataplaneConfig.SQS_IMAGE_STATUS_QUEUE}`,
          `arn:${this.partition}:sqs:${props.account.region}:${props.account.id}:${this.mrDataplaneConfig.SQS_REGION_STATUS_QUEUE}`,
          `arn:${this.partition}:sqs:${props.account.region}:${props.account.id}:${this.mrDataplaneConfig.SQS_IMAGE_REQUEST_QUEUE}DLQ`,
          `arn:${this.partition}:sqs:${props.account.region}:${props.account.id}:${this.mrDataplaneConfig.SQS_REGION_REQUEST_QUEUE}DLQ`,
          `arn:${this.partition}:sqs:${props.account.region}:${props.account.id}:${this.mrDataplaneConfig.SQS_IMAGE_STATUS_QUEUE}DLQ`,
          `arn:${this.partition}:sqs:${props.account.region}:${props.account.id}:${this.mrDataplaneConfig.SQS_REGION_STATUS_QUEUE}DLQ`
        ]
      })
    );

    // Add permissions for S3 permissions
    mrTaskRole.addToPolicy(
      new PolicyStatement({
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
      })
    );

    // Add permissions for SNS permissions
    mrTaskRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["sns:Publish"],
        resources: [
          `arn:${this.partition}:sns:${props.account.region}:${props.account.id}:${this.mrDataplaneConfig.SNS_IMAGE_STATUS_TOPIC}`,
          `arn:${this.partition}:sns:${props.account.region}:${props.account.id}:${this.mrDataplaneConfig.SNS_REGION_STATUS_TOPIC}`
        ]
      })
    );

    // Add permissions for ECR permissions
    mrTaskRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["ecr:GetAuthorizationToken"],
        resources: ["*"]
      })
    );
    mrTaskRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:DescribeImages",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetAuthorizationToken",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage",
          "ecr:DescribeRepositories"
        ],
        resources: [
          `arn:${this.partition}:ecr:${props.account.region}:${props.account.id}:repository/${this.mrContainerConfig.MR_CONTAINER_REPOSITORY}`
        ]
      })
    );

    // Add permissions for dynamodb permissions
    mrTaskRole.addToPolicy(
      new PolicyStatement({
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
          `arn:${this.partition}:dynamodb:${props.account.region}:${props.account.id}:table/${this.mrDataplaneConfig.DDB_JOB_STATUS_TABLE}`,
          `arn:${this.partition}:dynamodb:${props.account.region}:${props.account.id}:table/${this.mrDataplaneConfig.DDB_FEATURES_TABLE}`,
          `arn:${this.partition}:dynamodb:${props.account.region}:${props.account.id}:table/${this.mrDataplaneConfig.DDB_ENDPOINT_PROCESSING_TABLE}`,
          `arn:${this.partition}:dynamodb:${props.account.region}:${props.account.id}:table/${this.mrDataplaneConfig.DDB_REGION_REQUEST_TABLE}`
        ]
      })
    );

    // Add permissions for cloudwatch permissions
    mrTaskRole.addToPolicy(
      new PolicyStatement({
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
          `arn:${this.partition}:logs:${props.account.region}:${props.account.id}:log-group:/aws/${this.mrDataplaneConfig.METRICS_NAMESPACE}/MRService`,
          `arn:${this.partition}:logs:${props.account.region}:${props.account.id}:log-group:/aws/${this.mrDataplaneConfig.METRICS_NAMESPACE}/MRFireLens`,
          `arn:${this.partition}:logs:${props.account.region}:${props.account.id}:log-group:/aws/${this.mrDataplaneConfig.METRICS_NAMESPACE}/HTTPEndpoint`,
          `arn:${this.partition}:logs:${props.account.region}:${props.account.id}:log-group:/aws/sagemaker/Endpoints/${this.mrModelEndpointsConfig.SM_AIRCRAFT_MODEL}`,
          `arn:${this.partition}:logs:${props.account.region}:${props.account.id}:log-group:/aws/sagemaker/Endpoints/${this.mrModelEndpointsConfig.SM_FLOOD_MODEL}`,
          `arn:${this.partition}:logs:${props.account.region}:${props.account.id}:log-group:/aws/sagemaker/Endpoints/${this.mrModelEndpointsConfig.SM_CENTER_POINT_MODEL}`
        ]
      })
    );

    // Add permissions for SageMaker permissions
    mrTaskRole.addToPolicy(
      new PolicyStatement({
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
      })
    );

    // Set the MRTaskRole property to the created role
    this.role = mrTaskRole;

    NagSuppressions.addResourceSuppressions(
      this.role,
      [
        {
          id: "AwsSolutions-IAM5",
          reason:
            "Only suppress AwsSolutions-IAM5 S3, KMS, Events, ECR, and SageMaker finding on * Wildcard. However, it is restricted to a specific account id / region.",
          appliesTo: [
            `Resource::*`,
            `Resource::arn:${this.partition}:s3:::*`,
            `Resource::arn:${this.partition}:kms:${props.account.region}:${props.account.id}:key/*`,
            `Resource::arn:${this.partition}:ecr:${props.account.region}:${props.account.id}:*`,
            `Resource::arn:${this.partition}:sagemaker:${props.account.region}:${props.account.id}:*`
          ]
        }
      ],
      true
    );
  }
}
