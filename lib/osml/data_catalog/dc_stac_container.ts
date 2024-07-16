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
 * Represents the configuration for the DCStacContainer Construct.
 */
export class DCStacContainerConfig {
  /**
   * Creates an instance of DCStacContainerConfig.
   * @param {string} [DC_STAC_CONTAINER="awsosml/awsosml/osml-data-intake-stac:latest"] - Container image pull.
   * @param {string} [DC_STAC_BUILD_PATH="lib/osml-data-intake"] - The build path for the source code.
   * @param {string} [DC_STAC_BUILD_TARGET="stac"] - The build target within the Dockerfile.
   * @param {string} [DC_STAC_REPOSITORY="data-intake-stac-container"] - The name to give the ECR repo.
   * @param {string} [DC_STAC_DOCKERFILE="docker/Dockerfile.stac"] - The dockerfile to build with.
   */
  constructor(
    public DC_STAC_BUILD_PATH: string = "lib/osml-data-intake/",
    public DC_STAC_CONTAINER: string = "awsosml/osml-data-intake-stac:latest",
    public DC_STAC_BUILD_TARGET: string = "stac",
    public DC_STAC_REPOSITORY: string = "data-intake-stac-container",
    public DC_STAC_DOCKERFILE: string = "docker/Dockerfile.stac"
  ) {}
}

/**
 * Interface representing the properties for the DCStacContainerContainer construct.
 */
export interface DCStacContainerProps {
  /**
   * The OSML deployment account.
   */
  account: OSMLAccount;

  /**
   * Optional flag to instruct building STAC container from source.
   */
  buildFromSource?: boolean;

  /**
   * The OSML vpc to deploy into
   */
  osmlVpc: OSMLVpc;

  /**
   * Optional configuration for the data-intake-stac-container Construct
   */
  config?: DCStacContainerConfig;
}

/**
 * Represents a construct responsible for deploying an ECR container image
 * for the data catalog STAC FastAPI Lambda.
 */
export class DCStacContainer extends Construct {
  public removalPolicy: RemovalPolicy;
  public config: DCStacContainerConfig;
  public dockerImageCode: DockerImageCode;
  public ecrDeployment: OSMLECRDeployment;

  /**
   * Creates an instance of DCStacContainer.
   * @param {Construct} scope - The scope/stack in which to define this construct.
   * @param {string} id - The id of this construct within the current scope.
   * @param {DCStacContainerProps} props - The properties of this construct.
   * @returns DCContainer - The DCContainer instance.
   */
  constructor(scope: Construct, id: string, props: DCStacContainerProps) {
    super(scope, id);

    // Set the removal policy based on the provided properties
    this.removalPolicy = props.account.prodLike
      ? RemovalPolicy.RETAIN
      : RemovalPolicy.DESTROY;

    // Check if a custom configuration was provided: otherwise, create a new default configuration.
    if (props.config != undefined) {
      // Import the existing DCStacContainer configuration
      this.config = props.config;
    } else {
      // Create a new default configuration
      this.config = new DCStacContainerConfig();
    }

    if (props.buildFromSource == true) {
      // Create a container image from a Docker image asset for development environment.
      this.dockerImageCode = DockerImageCode.fromImageAsset(
        this.config.DC_STAC_BUILD_PATH,
        {
          file: this.config.DC_STAC_DOCKERFILE,
          followSymlinks: SymlinkFollowMode.ALWAYS,
          target: this.config.DC_STAC_BUILD_TARGET
        }
      );
    } else {
      // Create an ECR deployment for production environment.
      this.ecrDeployment = new OSMLECRDeployment(
        this,
        "DCSStacContainerDeployment",
        {
          account: props.account,
          sourceUri: this.config.DC_STAC_CONTAINER,
          repositoryName: this.config.DC_STAC_REPOSITORY,
          removalPolicy: this.removalPolicy,
          vpc: props.osmlVpc.vpc,
          vpcSubnets: props.osmlVpc.selectedSubnets
        }
      );
      this.dockerImageCode = DockerImageCode.fromEcr(
        this.ecrDeployment.ecrRepository
      );
    }
  }
}
