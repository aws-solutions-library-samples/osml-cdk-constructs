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
import { NagSuppressions } from "cdk-nag/lib/nag-suppressions";
import { Construct } from "constructs";

import { MRContainerConfig } from "../../model_runner/mr_container";
import { MRDataplaneConfig } from "../../model_runner/mr_dataplane";
import { MRModelEndpointsConfig } from "../../model_runner/testing/mr_endpoints";
import { MRSyncConfig } from "../../model_runner/testing/mr_sync";
import { OSMLAccount } from "../../osml_account";
import { MEContainerConfig } from "../me_container";

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
  public mrDataplaneConfig: MRDataplaneConfig = new MRDataplaneConfig();
  public mrSyncConfig: MRSyncConfig = new MRSyncConfig();
  public mrModelEndpointsConfig: MRModelEndpointsConfig =
    new MRModelEndpointsConfig();
  public mrContainerConfig: MRContainerConfig = new MRContainerConfig();
  public meContainerConfig: MEContainerConfig = new MEContainerConfig();
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
    this.role = new Role(this, "MESageMakerExecutionRole", {
      roleName: props.roleName,
      assumedBy: new ServicePrincipal("sagemaker.amazonaws.com"),
      description:
        "Allows SageMaker to access necessary AWS services (S3, SQS, DynamoDB, ...)"
    });

    // Add permissions to describe EC2 instance types
    this.role.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["ec2:DescribeInstanceTypes"],
        resources: ["*"]
      })
    );

    this.role.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          "ec2:CreateNetworkInterfacePermission",
          "ec2:CreateNetworkInterface",
          "ec2:DescribeVpcs",
          "ec2:DescribeSubnets",
          "ec2:DescribeSecurityGroups",
          "ec2:DescribeDhcpOptions"
        ],
        resources: [
          `arn:${this.partition}:ec2:${props.account.region}:${props.account.id}:network-interface/*`,
          `arn:${this.partition}:ec2:${props.account.region}:${props.account.id}:security-group/*`
        ]
      })
    );

    // Add permissions for ECR permissions
    this.role.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["ecr:GetAuthorizationToken"],
        resources: ["*"]
      })
    );
    this.role.addToPolicy(
      new PolicyStatement({
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
          `arn:${this.partition}:ecr:${props.account.region}:${props.account.id}:repository/${this.mrContainerConfig.MR_CONTAINER_REPOSITORY}`,
          `arn:${this.partition}:ecr:${props.account.region}:${props.account.id}:repository/${this.meContainerConfig.ME_CONTAINER_REPOSITORY}`
        ]
      })
    );

    // Add permissions for cloudwatch permissions
    this.role.addToPolicy(
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

    NagSuppressions.addResourceSuppressions(
      this.role,
      [
        {
          id: "AwsSolutions-IAM5",
          reason:
            "Only suppress AwsSolutions-IAM5 ECR and EC2 finding on * Wildcard. However, it is restricted to a specific account id / region.",
          appliesTo: [
            `Resource::*`,
            `Resource::arn:${this.partition}:ecr:${props.account.region}:${props.account.id}:*`,
            `Resource::arn:${this.partition}:ec2:${props.account.region}:${props.account.id}:network-interface/*`,
            `Resource::arn:${this.partition}:ec2:${props.account.region}:${props.account.id}:security-group/*`
          ]
        }
      ],
      true
    );
  }
}
