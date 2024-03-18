/*
 * Copyright 2023-2024 Amazon.com, Inc. or its affiliates.
 */

import { region_info } from "aws-cdk-lib";
import {
  CompositePrincipal,
  Effect,
  PolicyStatement,
  Role,
  ServicePrincipal
} from "aws-cdk-lib/aws-iam";
import { NagSuppressions } from "cdk-nag/lib/nag-suppressions";
import { Construct } from "constructs";

import { MRDataplaneConfig } from "../../model_runner/mr_dataplane";
import { MRModelEndpointsConfig } from "../../model_runner/testing/mr_endpoints";
import { OSMLAccount } from "../../osml_account";
import { MEContainerConfig } from "../me_container";

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
   * The Model Runner Model Endpoints Configuration values to be used for this MRTaskRole
   */
  public mrModelEndpointsConfig: MRModelEndpointsConfig =
    new MRModelEndpointsConfig();

  /**
   * The Model Endpoint Container Configuration values to be used for this MRTaskRole
   */
  public meContainerConfig: MEContainerConfig = new MEContainerConfig();
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

    // Create the IAM role for the OSML HTTP endpoint.
    this.role = new Role(this, "MEHTTPEndpointRole", {
      roleName: props.roleName,
      assumedBy: new CompositePrincipal(
        new ServicePrincipal("ecs-tasks.amazonaws.com"),
        new ServicePrincipal("lambda.amazonaws.com")
      ),
      description:
        "Allows the OversightML HTTP model endpoint to access necessary resources."
    });

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
          `arn:${this.partition}:ecr:${props.account.region}:${props.account.id}:repository/${this.meContainerConfig.ME_CONTAINER_REPOSITORY}`
        ]
      })
    );

    NagSuppressions.addResourceSuppressions(
      this.role,
      [
        {
          id: "AwsSolutions-IAM5",
          reason:
            "Only suppress AwsSolutions-IAM5 ECR GetAuthorizationToken finding on * Wildcard.",
          appliesTo: [`Resource::*`]
        }
      ],
      true
    );
  }
}
