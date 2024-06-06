/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { RemovalPolicy, SymlinkFollowMode } from "aws-cdk-lib";
import { DockerImageCode } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

import { OSMLAccount } from "../osml_account";
import { OSMLECRDeployment } from "../osml_ecr_deployment";
import { OSMLVpc } from "../osml_vpc";

/**
 * Represents the configuration for the DCContainer Construct.
 */
export class DCContainerConfig {
  /**
   * Creates an instance of DCContainerConfig.
   * @param {string} [DC_CONTAINER="awsosml/osml-data-catalog:latest"] - Container image to use for the lambda container.
   * @param {string} [DC_BUILD_PATH="lib/osml-data-catalog"] - The build path for the data catalog source code.
   * @param {string} [DC_BUILD_TARGET="osml_data_catalog"] - The build target for the data catalog Dockerfile.
   * @param {string} [DC_REPOSITORY="data-catalog-container"] - The repository name for the data catalog source repo.
   */
  constructor(
    public DC_CONTAINER: string = "awsosml/osml-data-catalog:latest",
    public DC_BUILD_PATH: string = "lib/osml-cdk-constructs/lib/osml/data_catalog",
    public DC_BUILD_TARGET: string = "osml_data_catalog",
    public DC_REPOSITORY: string = "data-catalog-container"
  ) {}
}

/**
 * Interface representing the properties for the DCContainer construct.
 */
export interface DCContainerProps {
  /**
   * The OSML deployment account.
   */
  account: OSMLAccount;

  /**
   * The OSML vpc to deploy into
   */
  osmlVpc: OSMLVpc;

  /**
   * Optional configuration for the DCContainer Construct
   */
  config?: DCContainerConfig;
}

/**
 * Represents a construct responsible for deploying an ECR container image
 * for the data catalog Lambda.
 */
export class DCContainer extends Construct {
  public removalPolicy: RemovalPolicy;
  public config: DCContainerConfig;
  public dockerImageCode: DockerImageCode;
  public ecrDeployment: OSMLECRDeployment;
  /**
   * Creates an instance of DCContainer.
   * @param {Construct} scope - The scope/stack in which to define this construct.
   * @param {string} id - The id of this construct within the current scope.
   * @param {DCContainerProps} props - The properties of this construct.
   * @returns DCContainer - The DCContainer instance.
   */
  constructor(scope: Construct, id: string, props: DCContainerProps) {
    super(scope, id);

    // Set the removal policy based on the provided properties
    this.removalPolicy = props.account.prodLike
      ? RemovalPolicy.RETAIN
      : RemovalPolicy.DESTROY;

    // Check if a custom configuration was provided: otherwise, create a new default configuration.
    if (props.config != undefined) {
      // Import the existing DCContainer configuration
      this.config = props.config;
    } else {
      // Create a new default configuration
      this.config = new DCContainerConfig();
    }

    this.dockerImageCode = DockerImageCode.fromImageAsset(
      this.config.DC_BUILD_PATH,
      {
        file: "Dockerfile",
        followSymlinks: SymlinkFollowMode.ALWAYS,
        target: this.config.DC_BUILD_TARGET
      }
    );
  }
}
