/*
 * Copyright 2023-2024 Amazon.com, Inc. or its affiliates.
 */

import { region_info } from "aws-cdk-lib";
import {
  CompositePrincipal,
  Effect,
  ManagedPolicy,
  PolicyStatement,
  Role,
  ServicePrincipal
} from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

import { MRDataplaneConfig } from "../../model_runner/mr_dataplane";
import { OSMLAccount } from "../../osml_account";

/**
 * Represents the properties required for a HTTP model task role.
 * @interface MEHTTPRoleProps
 */
export interface MEHTTPRoleProps {
  /**
   * The OSML deployment account
   * @type {OSMLAccount}
   * @readonly
   */
  readonly account: OSMLAccount;

  /**
   * The name to assign the role.
   * @type {string}
   * @readonly
   */
  readonly roleName: string;
}
/**
 * Represents an AWS CDK construct for creating an OSML HTTP Endpoint Role.
 */
export class MEHTTPRole extends Construct {
  /**
   * The IAM role associated with the OSML HTTP endpoint.
   */
  public role: Role;

  /**
   * The AWS partition in which the resources are located.
   */
  public partition: string;

  /**
   * The Model Runner Dataplane Configuration values to be used for this MRTaskRole
   */
  public mrDataplaneConfig: MRDataplaneConfig = new MRDataplaneConfig();

  /**
   * Creates an OSMLHTTPEndpointRole construct.
   *
   * @param {Construct} scope - The scope/stack in which to define this construct.
   * @param {string} id - The id of this construct within the current scope.
   * @param {MEHTTPRoleProps} props - The properties of this construct.
   * @returns MEHTTPRole - The OSMLHTTPEndpointRole construct.
   */
  constructor(scope: Construct, id: string, props: MEHTTPRoleProps) {
    super(scope, id);

    /**
     * Retrieves the AWS partition based on the region provided.
     *
     * @type {string}
     */
    this.partition = region_info.Fact.find(
      props.account.region,
      region_info.FactName.PARTITION
    )!;

    // Defining constants for better readability
    const MR_FIRELENS_LOG_GROUP_NAME = `/aws/${this.mrDataplaneConfig.METRICS_NAMESPACE}/MRFireLens`;
    const MR_SERVICE_LOG_GROUP_NAME = `/aws/${this.mrDataplaneConfig.METRICS_NAMESPACE}/MRService`;
    const MR_HTTPENDPOINT_LOG_GROUP_NAME = `/aws/${this.mrDataplaneConfig.METRICS_NAMESPACE}/HTTPEndpoint`;

    // Create the IAM role for the OSML HTTP endpoint.
    const meHttpRole = new Role(this, "MEHTTPEndpointRole", {
      roleName: props.roleName,
      assumedBy: new CompositePrincipal(
        new ServicePrincipal("ecs-tasks.amazonaws.com"),
        new ServicePrincipal("lambda.amazonaws.com")
      ),
      description:
        "Allows the OversightML HTTP model endpoint to access necessary resources."
    });

    const meHttpPolicy = new ManagedPolicy(this, "MEHttpPolicy", {
      managedPolicyName: "MEHttpPolicy"
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
        `arn:${this.partition}:logs:${props.account.region}:${props.account.id}:log-group:${MR_FIRELENS_LOG_GROUP_NAME}:*`,
        `arn:${this.partition}:logs:${props.account.region}:${props.account.id}:log-group:${MR_SERVICE_LOG_GROUP_NAME}:*`,
        `arn:${this.partition}:logs:${props.account.region}:${props.account.id}:log-group:${MR_HTTPENDPOINT_LOG_GROUP_NAME}:*`,
        `arn:${this.partition}:logs:${props.account.region}:${props.account.id}:log-group:/aws/sagemaker/Endpoints/*`
      ]
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

    meHttpPolicy.addStatements(
      cwPolicyStatement,
      ecrAuthPolicyStatement,
      ecrPolicyStatement
    );

    meHttpRole.addManagedPolicy(meHttpPolicy);

    this.role = meHttpRole;
  }
}
