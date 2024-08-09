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
import { MRDataplaneConfig } from "../mr_dataplane";

/**
 * Defines the properties required for creating an `MRExecutionRole`.
 * @interface MRExecutionRoleProps
 * @property {OSMLAccount} account - The OSML (OversightML) deployment account associated with this role.
 * @property {string} roleName - The name to assign to the IAM role.
 */
export interface MRExecutionRoleProps {
  account: OSMLAccount;
  roleName: string;
}

/**
 * Constructs a new IAM role designed for ECS tasks execution within AWS,
 * providing necessary permissions predefined for model runner operations.
 *
 * @class MRExecutionRole
 * @extends {Construct}
 * @property {IRole} role - The AWS IAM role associated with this construct.
 * @property {string} partition - The AWS partition in which the role will operate.
 */
export class MRExecutionRole extends Construct {
  /**
   * The AWS IAM role associated with this construct.
   */
  public role: IRole;

  /**
   * The AWS partition in which the role will operate.
   */
  public partition: string;

  /**
   * Initializes a new instance of the `MRExecutionRole` class.
   *
   * @constructor
   * @param {Construct} scope - The scope in which to define this construct, typically a CDK `Stack`.
   * @param {string} id - A unique identifier for this construct within the scope.
   * @param {MRExecutionRoleProps} props - The properties for configuring this role.
   */
  constructor(scope: Construct, id: string, props: MRExecutionRoleProps) {
    super(scope, id);

    const firelensLogGroupName = `/aws/${
      new MRDataplaneConfig().METRICS_NAMESPACE
    }/MRFireLens`;
    const serviceLogGroupName = `/aws/${
      new MRDataplaneConfig().METRICS_NAMESPACE
    }/MRService`;

    this.partition = region_info.Fact.find(
      props.account.region,
      region_info.FactName.PARTITION
    )!;

    const role = new Role(this, "MRExecutionRole", {
      roleName: props.roleName,
      assumedBy: new CompositePrincipal(
        new ServicePrincipal("ecs-tasks.amazonaws.com")
      ),
      description: "Allows ECS tasks to access necessary AWS services."
    });

    const policy = new ManagedPolicy(this, "MRExecutionPolicy", {
      managedPolicyName: "MRExecutionPolicy"
    });

    policy.addStatements(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["ecr:GetAuthorizationToken"],
        resources: ["*"]
      }),
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
          `arn:${this.partition}:logs:${props.account.region}:${props.account.id}:log-group:${firelensLogGroupName}:*`,
          `arn:${this.partition}:logs:${props.account.region}:${props.account.id}:log-group:${serviceLogGroupName}:*`
        ]
      })
    );

    role.addManagedPolicy(policy);
    this.role = role;
  }
}
