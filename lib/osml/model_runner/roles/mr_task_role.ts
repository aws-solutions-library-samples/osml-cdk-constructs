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
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName("AmazonSQSFullAccess"),
        ManagedPolicy.fromAwsManagedPolicyName("AmazonS3FullAccess"),
        ManagedPolicy.fromAwsManagedPolicyName("AmazonDynamoDBFullAccess"),
        ManagedPolicy.fromAwsManagedPolicyName("AmazonSageMakerFullAccess"),
        ManagedPolicy.fromAwsManagedPolicyName("CloudWatchFullAccess"),
        ManagedPolicy.fromAwsManagedPolicyName("SecretsManagerReadWrite"),
        ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonElasticContainerRegistryPublicFullAccess"
        )
      ],
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

    // Add permissions for AWS Events
    mrTaskRole.addToPolicy(
      new PolicyStatement({
        actions: ["events:PutRule", "events:PutTargets", "events:DescribeRule"],
        resources: [
          `arn:${this.partition}:events:${props.account.region}:${props.account.id}:*`
        ],
        effect: Effect.ALLOW
      })
    );

    // Add permissions for Amazon Kinesis
    mrTaskRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["kinesis:PutRecord", "kinesis:PutRecords"],
        resources: [
          `arn:${this.partition}:kinesis:${props.account.region}:${props.account.id}:stream/*`
        ]
      })
    );

    // Add permissions to describe EC2 instance types
    mrTaskRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["ec2:DescribeInstanceTypes"],
        resources: ["*"]
      })
    );

    // Set the MRTaskRole property to the created role
    this.role = mrTaskRole;
  }
}
