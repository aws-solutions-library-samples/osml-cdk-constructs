/*
 * Copyright 2023 Amazon.com, Inc. or its affiliates.
 */

import { RemovalPolicy } from "aws-cdk-lib";
import { Repository, RepositoryEncryption } from "aws-cdk-lib/aws-ecr";
import { Construct } from "constructs";

export interface OSMLRepositoryProps {
  // the name of the repository to create
  repositoryName: string;
  // the removal policy to apply to the repository
  removalPolicy: RemovalPolicy;
}

export class OSMLRepository extends Construct {
  public repository: Repository;

  /**
   * Creates a new OSMLRepository (ECR).
   * @param scope the scope/stack in which to define this construct.
   * @param id the id of this construct within the current scope.
   * @param props the properties of this construct.
   * @returns the OSMLRepository construct.
   */
  constructor(scope: Construct, id: string, props: OSMLRepositoryProps) {
    super(scope, id);
    this.repository = new Repository(this, id, {
      repositoryName: props.repositoryName,
      removalPolicy: props.removalPolicy,
      imageScanOnPush: true,
      encryption: RepositoryEncryption.KMS
    });
  }
}
