/*
 * Copyright 2023-2024 Amazon.com, Inc. or its affiliates.
 */

import { region_info } from "aws-cdk-lib";
import {
  CompositePrincipal,
  ManagedPolicy,
  Role,
  ServicePrincipal
} from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

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
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName("CloudWatchFullAccess"),
        ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonElasticContainerRegistryPublicFullAccess"
        ),
        ManagedPolicy.fromAwsManagedPolicyName("CloudWatchFullAccess")
      ],
      description:
        "Allows the OversightML HTTP model endpoint to access necessary resources."
    });
  }
}
