/*
 * Copyright 2023-2024 Amazon.com, Inc. or its affiliates.
 */

import { region_info } from "aws-cdk-lib";
import {
  Effect,
  ManagedPolicy,
  PolicyStatement,
  Role,
  ServicePrincipal
} from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

import { OSMLAccount } from "../../osml_account";

/**
 * Represents the properties required to create a new SageMaker role.
 * @interface MESMRoleProps
 */
export interface MESMRoleProps {
  /**
   * The OSML account associated with the role.
   * @type {OSMLAccount}
   */
  account: OSMLAccount;

  /**
   * The name to give to the role.
   * @type {string}
   */
  roleName: string;
}

/**
 * Represents a SageMaker execution role for hosting Computer Vision (CV) models at a SageMaker endpoint.
 * @class
 */
export class MESMRole extends Construct {
  public role: Role;
  public partition: string;

  /**
   * Creates a SageMaker execution role for hosting CV models at a SageMaker endpoint.
   * @constructor
   * @param {Construct} scope - The scope/stack in which to define this construct.
   * @param {string} id - The ID of this construct within the current scope.
   * @param {MESMRoleProps} props - The properties of this construct.
   */
  constructor(scope: Construct, id: string, props: MESMRoleProps) {
    super(scope, id);

    // Determine the AWS partition based on the provided AWS region
    this.partition = region_info.Fact.find(
      props.account.region,
      region_info.FactName.PARTITION
    )!;

    /**
     * The IAM Role associated with the SageMaker execution role.
     * @member {Role}
     */
    const role = new Role(this, "MESageMakerExecutionRole", {
      roleName: props.roleName,
      assumedBy: new ServicePrincipal("sagemaker.amazonaws.com"),
      description:
        "Allows SageMaker to access necessary AWS services (S3, SQS, DynamoDB, ...)"
    });

    const smExecutionPolicy = new ManagedPolicy(
      this,
      "MESageMakerExecutionPolicy",
      {
        managedPolicyName: "MESageMakerExecutionPolicy"
      }
    );

    // Add permissions to describe EC2 instance types
    const ec2NetworkPolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        "ec2:DescribeInstanceTypes",
        "ec2:DescribeVpcEndpoints",
        "ec2:DescribeDhcpOptions",
        "ec2:DescribeVpcs",
        "ec2:DescribeSubnets",
        "ec2:DescribeSecurityGroups",
        "ec2:DescribeNetworkInterfaces",
        "ec2:DeleteNetworkInterfacePermission",
        "ec2:DeleteNetworkInterface",
        "ec2:CreateNetworkInterfacePermission",
        "ec2:CreateNetworkInterface"
      ],
      resources: ["*"]
    });

    // Add permissions for ECR permissions
    const ecrAuthPolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["ecr:GetAuthorizationToken"],
      resources: ["*"]
    });

    const ecrPolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:DescribeImages",
        "ecr:BatchCheckLayerAvailability",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:PutImage",
        "ecr:DescribeRepositories"
      ],
      resources: [
        `arn:${this.partition}:ecr:${props.account.region}:${props.account.id}:repository/*`
      ]
    });

    // Add permissions for cloudwatch permissions
    const cwLogsPolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        "logs:CreateLogDelivery",
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:DeleteLogDelivery",
        "logs:Describe*",
        "logs:GetLogEvents",
        "logs:GetLogDelivery",
        "logs:ListLogDeliveries",
        "logs:PutLogEvents",
        "logs:PutResourcePolicy",
        "logs:UpdateLogDelivery"
      ],
      resources: [
        `arn:${this.partition}:logs:${props.account.region}:${props.account.id}:log-group:*`
      ]
    });

    // Add permissions to assume roles
    const stsPolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["sts:AssumeRole"],
      resources: ["*"]
    });

    smExecutionPolicy.addStatements(
      cwLogsPolicyStatement,
      ecrAuthPolicyStatement,
      ecrPolicyStatement,
      ec2NetworkPolicyStatement,
      stsPolicyStatement
    );

    role.addManagedPolicy(smExecutionPolicy);

    this.role = role;
  }
}
