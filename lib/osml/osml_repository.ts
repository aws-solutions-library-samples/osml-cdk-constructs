/*
 * Copyright 2023-2024 Amazon.com, Inc. or its affiliates.
 */

import { RemovalPolicy } from "aws-cdk-lib";
import { Repository, RepositoryEncryption } from "aws-cdk-lib/aws-ecr";
import { Construct } from "constructs";

/**
 * Represents the properties required to configure the OSMLRepository Construct.
 * @interface
 */
export interface OSMLRepositoryProps {
  /**
   * The name of the repository.
   * @type {string}
   */
  repositoryName: string;

  /**
   * The removal policy for the repository.
   * @type {RemovalPolicy}
   */
  removalPolicy: RemovalPolicy;

  /**
   * Check to see if its region is ADC
   * @type {RemovalPolicy}
   */
  isAdc?: boolean;
}

/**
 * Represents an OSML (Open Source Machine Learning) Repository in AWS Elastic Container Registry (ECR).
 */
export class OSMLRepository extends Construct {
  public repository: Repository;
  /**
   * Creates a new OSMLRepository (ECR).
   * @param {Construct} scope - The scope/stack in which to define this construct.
   * @param {string} id - The id of this construct within the current scope.
   * @param {OSMLRepositoryProps} props - The properties of this construct.
   * @returns OSMLRepository - The OSMLRepository construct.
   */
  constructor(scope: Construct, id: string, props: OSMLRepositoryProps) {
    super(scope, id);

    /**
     * The AWS ECR Repository associated with this OSMLRepository.
     * @type {Repository}
     */
    this.repository = new Repository(this, id, {
      repositoryName: props.repositoryName,
      removalPolicy: props.removalPolicy,
      imageScanOnPush: true,
      encryption: RepositoryEncryption.KMS,
      autoDeleteImages: props.removalPolicy == RemovalPolicy.DESTROY
    });
  }
}
