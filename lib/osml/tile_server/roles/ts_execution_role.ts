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
 * Represents the properties required to define a Tile Server ECS execution role.
 *
 * @interface TSExecutionRoleProps
 */
export interface TSExecutionRoleProps {
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
 * Represents an TSExecutionRole construct.
 */
export class TSExecutionRole extends Construct {
  /**
   * The AWS IAM role associated with this TSExecutionRole.
   */
  public role: IRole;

  /**
   * The AWS partition to be used for this TSExecutionRole.
   */
  public partition: string;

  /**
   * Creates an TSExecutionRole construct.
   * @param {Construct} scope - The scope/stack in which to define this construct.
   * @param {string} id - The id of this construct within the current scope.
   * @param {TSExecutionRoleProps} props - The properties of this construct.
   * @returns TSExecutionRole - The TSExecutionRole construct.
   */
  constructor(scope: Construct, id: string, props: TSExecutionRoleProps) {
    super(scope, id);

    // Determine the AWS partition based on the provided AWS region
    this.partition = region_info.Fact.find(
      props.account.region,
      region_info.FactName.PARTITION
    )!;

    // Create an AWS IAM role for the Tile Server Fargate ECS execution role
    const tsExecutionRole = new Role(this, "TSExecutionRole", {
      roleName: props.roleName,
      assumedBy: new CompositePrincipal(
        new ServicePrincipal("ecs-tasks.amazonaws.com")
      ),
      description:
        "Allows the Oversight Tile Server to access necessary AWS services to boot up the ECS task..."
    });

    const tsPolicy = new ManagedPolicy(this, "TSExecutionPolicy", {
      managedPolicyName: "TSExecutionPolicy"
    });

    // Add permissions for ECR permissions
    const ecrAuthPolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["ecr:GetAuthorizationToken"],
      resources: ["*"]
    });

    // Add permissions for ECR permissions
    const ecrPolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:DescribeRepositories"
      ],
      resources: [
        `arn:${this.partition}:ecr:${props.account.region}:${props.account.id}:repository/*`
      ]
    });

    // Add permissions for cloudwatch permissions
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
        `arn:${this.partition}:logs:${props.account.region}:${props.account.id}:*`
      ]
    });

    tsPolicy.addStatements(
      ecrAuthPolicyStatement,
      ecrPolicyStatement,
      cwPolicyStatement
    );

    tsExecutionRole.addManagedPolicy(tsPolicy);

    // Set the TSExecutionRole property to the created role
    this.role = tsExecutionRole;
  }
}
