/*
 * Copyright 2023-2024 Amazon.com, Inc. or its affiliates.
 */

import { region_info } from "aws-cdk-lib";
import {
  AccountPrincipal,
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

/**
 * Represents the properties required to define a model runner ECS task role.
 *
 * @interface TSTaskRoleProps
 */
export interface TSTaskRoleProps {
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
 * Represents an TSTaskRole construct.
 */
export class TSTaskRole extends Construct {
  /**
   * The AWS IAM role associated with this TSTaskRole.
   */
  public role: IRole;

  /**
   * The AWS partition to be used for this TSTaskRole.
   */
  public partition: string;

  /**
   * Creates an TSTaskRole construct.
   * @param {Construct} scope - The scope/stack in which to define this construct.
   * @param {string} id - The id of this construct within the current scope.
   * @param {TSTaskRoleProps} props - The properties of this construct.
   * @returns TSTaskRole - The TSTaskRole construct.
   */
  constructor(scope: Construct, id: string, props: TSTaskRoleProps) {
    super(scope, id);

    // Determine the AWS partition based on the provided AWS region
    this.partition = region_info.Fact.find(
      props.account.region,
      region_info.FactName.PARTITION
    )!;

    // Create an AWS IAM role for the Model Runner Fargate ECS task
    const tsTaskRole = new Role(this, "TSTaskRole", {
      roleName: props.roleName,
      assumedBy: new CompositePrincipal(
        new ServicePrincipal("ecs-tasks.amazonaws.com"),
        new ServicePrincipal("lambda.amazonaws.com")
      ),
      description:
        "Allows the OversightML Tile Server to access necessary AWS services (S3, SQS, DynamoDB, ...)"
    });

    const tsPolicy = new ManagedPolicy(this, "TSTaskPolicy", {
      managedPolicyName: "TSTaskPolicy"
    });

    // dynamodb permissions
    const ddbPolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:*GetItem",
        "dynamodb:*PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:DescribeTable"
      ],
      resources: [
        `arn:${this.partition}:dynamodb:${props.account.region}:${props.account.id}:*`
      ]
    });

    // sqs permissions
    const sqsPolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        "sqs:GetQueueUrl",
        "sqs:SendMessage",
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:ListQueues"
      ],
      resources: [
        `arn:${this.partition}:sqs:${props.account.region}:${props.account.id}:*`
      ]
    });

    // s3 permissions
    const s3PolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        "s3:GetBucketAcl",
        "s3:ListBucket",
        "s3:GetBucketLocation",
        "s3:GetObject",
        "s3:GetObjectAcl",
        "s3:PutObject"
      ],
      resources: [`arn:${this.partition}:s3:::*`]
    });

    // Add permissions to assume roles
    tsTaskRole.assumeRolePolicy?.addStatements(
      new PolicyStatement({
        actions: ["sts:AssumeRole"],
        principals: [new AccountPrincipal(props.account.id)]
      })
    );

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

    // Add permissions for AWS Events
    const eventsPolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["events:PutRule", "events:PutTargets", "events:DescribeRule"],
      resources: [
        `arn:${this.partition}:events:${props.account.region}:${props.account.id}:*`
      ]
    });

    tsPolicy.addStatements(
      s3PolicyStatement,
      kmsPolicyStatement,
      eventsPolicyStatement,
      sqsPolicyStatement,
      ddbPolicyStatement,
      stsPolicyStatement
    );

    tsTaskRole.addManagedPolicy(tsPolicy);

    // Set the TSTaskRole property to the created role
    this.role = tsTaskRole;
  }
}
