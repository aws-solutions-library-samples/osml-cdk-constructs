/*
 * Copyright 2023 Amazon.com, Inc. or its affiliates.
 */
import { ManagedPolicy, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

import { OSMLAccount } from "../osml/osml_account";

export interface MRSMRoleProps {
  // the osml account interface
  account: OSMLAccount;
  // the name to give the role
  roleName: string;
}

export class MRSMRole extends Construct {
  public role: Role;

  /**
   * Creates a SageMaker execution role for hosting CV models at SM endpoint.
   * @param scope the scope/stack in which to define this construct.
   * @param id the id of this construct within the current scope.
   * @param props the properties of this construct.
   * @returns the MRSMRole construct.
   */
  constructor(scope: Construct, id: string, props: MRSMRoleProps) {
    super(scope, id);
    // sage maker execution role for hosting CV model at SM endpoint
    this.role = new Role(this, "MRSageMakerExecutionRole", {
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
