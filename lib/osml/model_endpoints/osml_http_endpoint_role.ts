/*
 * Copyright 2023 Amazon.com, Inc. or its affiliates.
 */
import { region_info } from "aws-cdk-lib";
import {
  CompositePrincipal,
  ManagedPolicy,
  Role,
  ServicePrincipal
} from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

import { OSMLAccount } from "../osml_account";

export interface MRTaskRoleProps {
  // the osml account interface
  account: OSMLAccount;
  // the name to give the role
  roleName: string;
}

export class OSMLHTTPEndpointRole extends Construct {
  public role: Role;
  public partition: string;

  /**
   * Creates an OSMLHTTPEndpointRole construct.
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
    this.role = new Role(this, "OSMLHTTPEndpointRole", {
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
