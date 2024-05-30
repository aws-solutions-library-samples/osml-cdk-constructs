/*
 * Copyright 2023-2024 Amazon.com, Inc. or iDI affiliates.
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
 * Represents the properties required to define a data intake Lambda role.
 *
 * @interface DILambdaRoleProps
 */
export interface DILambdaRoleProps {
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
 * Creates an DILambdaRole construct.
 * @param {Construct} scope - The scope/stack in which to define this construct.
 * @param {string} id - The id of this construct within the current scope.
 * @param {DILambdaRoleProps} props - The properties of this construct.
 * @returns DILambdaRole - The DILambdaRole construct.
 */
export class DILambdaRole extends Construct {
  /**
   * The AWS IAM role associated with this DILambdaRole.
   */
  public role: IRole;

  /**
   * The AWS partition to be used for this DILambdaRole.
   */
  public partition: string;

  /**
   * Creates an DILambdaRole construct.
   * @param {Construct} scope - The scope/stack in which to define this construct.
   * @param {string} id - The id of this construct within the current scope.
   * @param {DILambdaRoleProps} props - The properties of this construct.
   * @returns DILambdaRole - The DILambdaRole construct.
   */
  constructor(scope: Construct, id: string, props: DILambdaRoleProps) {
    super(scope, id);

    // Determine the AWS partition based on the provided AWS region
    this.partition = region_info.Fact.find(
      props.account.region,
      region_info.FactName.PARTITION
    )!;

    // Create an AWS IAM role for the Tile Server Lambda Sweeper Function
    const role = new Role(this, "DILambdaRole", {
      roleName: props.roleName,
      assumedBy: new CompositePrincipal(
        new ServicePrincipal("lambda.amazonaws.com")
      ),
      description:
        "Allows the OversightML Data Intake Lambda to access necessary AWS services (SNS, S3, ...)",
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole"
        ),
        ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaVPCAccessExecutionRole"
        )
      ]
    });

    // Create a managed policy to attach to the role
    const policy = new ManagedPolicy(this, "DILambdaPolicy", {
      managedPolicyName: "DILambdaPolicy"
    });

    // Add permissions for S3 permissions
    policy.addStatements(
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

    // Add permissions for SNS topics
    policy.addStatements(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["sns:Publish", "sns:Subscribe"],
        resources: [
          `arn:${this.partition}:sns:${props.account.region}:${props.account.id}:*`
        ]
      })
    );

    // Attach policy to the role
    role.addManagedPolicy(policy);

    // Set the role on class
    this.role = role;
  }
}
