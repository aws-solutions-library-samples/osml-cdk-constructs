/*
 * Copyright 2023 Amazon.com, Inc. or its affiliates.
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

import { OSMLAccount } from "../osml/osml_account";

export interface MRTaskRoleProps {
  // the osml account interface
  account: OSMLAccount;
  // the name to give the role
  roleName: string;
}

export class MRTaskRole extends Construct {
  public role: Role;
  public partition: string;

  /**
   * Creates an MRTaskRole construct.
   * @param scope the scope/stack in which to define this construct.
   * @param id the id of this construct within the current scope.
   * @param props the properties of this construct.
   * @returns the MRTaskRole construct.
   */
  constructor(scope: Construct, id: string, props: MRTaskRoleProps) {
    super(scope, id);
    this.partition = region_info.Fact.find(
      props.account.region,
      region_info.FactName.PARTITION
    )!;

    // model runner Fargate ECS task role
    this.role = new Role(this, "MRTaskRole", {
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

    // needs the ability to assume roles to read from/write to remote account S3 buckets,
    // kinesis streams, and invoke SM endpoints
    this.role.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["sts:AssumeRole"],
        resources: ["*"]
      })
    );

    // kms permissions
    this.role.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["kms:Decrypt", "kms:GenerateDataKey", "kms:Encrypt"],
        resources: [
          `arn:${this.partition}:kms:${props.account.region}:${props.account.id}:key/*`
        ]
      })
    );

    // api permissions
    this.role.addToPolicy(
      new PolicyStatement({
        actions: ["oversightml:*"],
        resources: ["*"],
        effect: Effect.ALLOW
      })
    );

    // events permissions
    this.role.addToPolicy(
      new PolicyStatement({
        actions: ["events:PutRule", "events:PutTargets", "events:DescribeRule"],
        resources: [
          `arn:${this.partition}:events:${props.account.region}:${props.account.id}:*`
        ],
        effect: Effect.ALLOW
      })
    );

    // kinesis permissions
    this.role.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["kinesis:PutRecord", "kinesis:PutRecords"],
        resources: [
          `arn:${this.partition}:kinesis:${props.account.region}:${props.account.id}:stream/*`
        ]
      })
    );

    // need to describe ec2 instance types in order to perform max in-progress
    // region calculations
    this.role.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["ec2:DescribeInstanceTypes"],
        resources: ["*"]
      })
    );
  }
}
