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
import { MEContainerConfig } from "../me_container";
import { MRDataplaneConfig } from "../../model_runner/mr_dataplane";

/**
 * Represents the properties required to define a model runner ECS task role.
 *
 * @interface MEExecutionRoleProps
 */
export interface MEExecutionRoleProps {
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
export class MEExecutionRole extends Construct {
  /**
   * The AWS IAM role associated with this MRTaskRole.
   */
  public role: IRole;

  /**
   * The AWS partition to be used for this MRTaskRole.
   */
  public partition: string;
  public mrDataplaneConfig: MRDataplaneConfig = new MRDataplaneConfig();
  public meContainerConfig: MEContainerConfig = new MEContainerConfig();

  /**
   * Creates an MRTaskRole construct.
   * @param {Construct} scope - The scope/stack in which to define this construct.
   * @param {string} id - The id of this construct within the current scope.
   * @param {MEExecutionRoleProps} props - The properties of this construct.
   * @returns MRTaskRole - The MRTaskRole construct.
   */
  constructor(scope: Construct, id: string, props: MEExecutionRoleProps) {
    super(scope, id);

    // Determine the AWS partition based on the provided AWS region
    this.partition = region_info.Fact.find(
      props.account.region,
      region_info.FactName.PARTITION
    )!;

    // Create an AWS IAM role for the Model Runner Fargate ECS task
    const meExecutionRole = new Role(this, "MEExecutionRole", {
      roleName: props.roleName,
      assumedBy: new CompositePrincipal(
        new ServicePrincipal("ecs-tasks.amazonaws.com")
      ),
      description:
        "Allows the HTTP Model Endpoints to access necessary AWS services (CW, ECR, ...)"
    });

    // Add permissions for ECR permissions
    meExecutionRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["ecr:GetAuthorizationToken"],
        resources: ["*"]
      })
    );

    meExecutionRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
            "ecr:BatchCheckLayerAvailability",
            "ecr:GetDownloadUrlForLayer",
            "ecr:BatchGetImage"
        ],
        resources: [
          `arn:${this.partition}:ecr:${props.account.region}:${props.account.id}:repository/${this.meContainerConfig.ME_CONTAINER_REPOSITORY}`
        ]
      })
    );

    // Add permissions for cloudwatch permissions
    meExecutionRole.addToPolicy(
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
          `arn:${this.partition}:logs:${props.account.region}:${props.account.id}:log-group:/aws/${this.mrDataplaneConfig.METRICS_NAMESPACE}/MRFireLens:*`,
        ]
      })
    );

    // Set the MRTaskRole property to the created role
    this.role = meExecutionRole;

    NagSuppressions.addResourceSuppressions(
      this.role,
      [
        {
          id: "AwsSolutions-IAM5",
          reason:
            "Only suppress AwsSolutions-IAM5 ECR and CW finding on * Wildcard. However, it is restricted to a specific account id / region.",
          appliesTo: [
            `Resource::*`,
            `Resource::arn:${this.partition}:logs:${props.account.region}:${props.account.id}:log-group:/aws/${this.mrDataplaneConfig.METRICS_NAMESPACE}/MRFireLens:*`
          ]
        }
      ],
      true
    );
  }
}
