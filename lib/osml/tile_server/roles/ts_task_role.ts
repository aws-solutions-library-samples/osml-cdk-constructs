/*
 * Copyright 2023 Amazon.com, Inc. or its affiliates.
 */
import { region_info } from "aws-cdk-lib";
import {
  AnyPrincipal,
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
    const role = new Role(this, "TSTaskRole", {
      roleName: props.roleName,
      assumedBy: new CompositePrincipal(
        new ServicePrincipal("ecs-tasks.amazonaws.com"),
        new ServicePrincipal("lambda.amazonaws.com")
      ),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName("AmazonSQSFullAccess"),
        ManagedPolicy.fromAwsManagedPolicyName("AmazonS3FullAccess"),
        ManagedPolicy.fromAwsManagedPolicyName("AmazonDynamoDBFullAccess"),
        ManagedPolicy.fromAwsManagedPolicyName("CloudWatchFullAccess"),
        ManagedPolicy.fromAwsManagedPolicyName("SecretsManagerReadWrite"),
        ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonElasticContainerRegistryPublicFullAccess"
        )
      ],
      description:
        "Allows the OversightML Tile Server to access necessary AWS services (S3, SQS, DynamoDB, ...)"
    });

    // Add permissions to assume roles
    role.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["sts:AssumeRole"],
        resources: ["*"]
      })
    );

    // Add permissions for AWS Key Management Service (KMS)
    role.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["kms:Decrypt", "kms:GenerateDataKey", "kms:Encrypt"],
        resources: [
          `arn:${this.partition}:kms:${props.account.region}:${props.account.id}:key/*`
        ]
      })
    );

    // Add permissions for AWS Events
    role.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["events:PutRule", "events:PutTargets", "events:DescribeRule"],
        resources: [
          `arn:${this.partition}:events:${props.account.region}:${props.account.id}:*`
        ]
      })
    );

    // Set the TSTaskRole property to the created role
    this.role = role;
  }
}
