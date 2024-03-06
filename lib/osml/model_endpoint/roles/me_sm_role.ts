/*
 * Copyright 2023-2024 Amazon.com, Inc. or its affiliates.
 */

import { ManagedPolicy, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
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
  /**
   * Creates a SageMaker execution role for hosting CV models at a SageMaker endpoint.
   * @constructor
   * @param {Construct} scope - The scope/stack in which to define this construct.
   * @param {string} id - The ID of this construct within the current scope.
   * @param {MESMRoleProps} props - The properties of this construct.
   */
  constructor(scope: Construct, id: string, props: MESMRoleProps) {
    super(scope, id);

    /**
     * The IAM Role associated with the SageMaker execution role.
     * @member {Role}
     */
    this.role = new Role(this, "MESageMakerExecutionRole", {
      roleName: props.roleName,
      assumedBy: new ServicePrincipal("sagemaker.amazonaws.com"),
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
        "Allows SageMaker to access necessary AWS services (S3, SQS, DynamoDB, ...)"
    });
  }
}
