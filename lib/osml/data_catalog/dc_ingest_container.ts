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
 * Represents the configuration for the DCIngestContainer Construct.
 */
export class DCIngestContainerConfig {
  /**
   * Creates an instance of DCIngestContainerConfig.
   * @param {string} [DC_INGEST_CONTAINER="awsosml/awsosml/osml-data-intake-ingest:latest"] - Container image pull.
   * @param {string} [DC_INGEST_BUILD_PATH="lib/osml-data-intake"] - The build path for the source code.
   * @param {string} [DC_INGEST_BUILD_TARGET="ingest"] - The build target within the Dockerfile.
   * @param {string} [DC_INGEST_REPOSITORY="data-intake-ingest"] - The name to give the ECR repo.
   * @param {string} [DC_INGEST_DOCKERFILE="docker/Dockerfile.ingest"] - The dockerfile to build with.
   */
  constructor(
    public DC_INGEST_BUILD_PATH: string = "lib/osml-data-intake/",
    public DC_INGEST_CONTAINER: string = "awsosml/osml-data-intake-ingest:latest",
    public DC_INGEST_BUILD_TARGET: string = "ingest",
    public DC_INGEST_REPOSITORY: string = "data-intake-ingest",
    public DC_INGEST_DOCKERFILE: string = "docker/Dockerfile.ingest"
  ) {}
}

/**
 * Interface representing the properties for the DCIngestContainer construct.
 */
export interface DCIngestContainerProps {
  /**
   * The OSML deployment account.
   */
  account: OSMLAccount;

  /**
   * Optional flag to instruct building ingest container from source.
   */
  buildFromSource?: boolean;

  /**
   * The OSML vpc to deploy into
   */
  osmlVpc: OSMLVpc;

  /**
   * Optional configuration for the DCIngestContainer Construct
   */
  config?: DCIngestContainerConfig;
}

/**
 * Represents a construct responsible for deploying an ECR container image
 * for the data catalog ingest Lambda.
 */
export class DCIngestContainer extends Construct {
  public removalPolicy: RemovalPolicy;
  public config: DCIngestContainerConfig;
  public dockerImageCode: DockerImageCode;
  public ecrDeployment: OSMLECRDeployment;

  /**
   * Creates an instance of DCIngestContainer.
   * @param {Construct} scope - The scope/stack in which to define this construct.
   * @param {string} id - The id of this construct within the current scope.
   * @param {DCIngestContainerProps} props - The properties of this construct.
   * @returns DCIngestContainer - The DCContainer instance.
   */
  constructor(scope: Construct, id: string, props: DCIngestContainerProps) {
    super(scope, id);

    // Set the removal policy based on the provided properties
    this.removalPolicy = props.account.prodLike
      ? RemovalPolicy.RETAIN
      : RemovalPolicy.DESTROY;

    // Check if a custom configuration was provided: otherwise, create a new default configuration.
    if (props.config != undefined) {
      // Import the existing DCIngestContainer configuration
      this.config = props.config;
    } else {
      // Create a new default configuration
      this.config = new DCIngestContainerConfig();
    }

    if (props.buildFromSource == true) {
      // Create a container image from a Docker image asset for development environment.
      this.dockerImageCode = DockerImageCode.fromImageAsset(
        this.config.DC_INGEST_BUILD_PATH,
        {
          file: this.config.DC_INGEST_DOCKERFILE,
          followSymlinks: SymlinkFollowMode.ALWAYS,
          target: this.config.DC_INGEST_BUILD_TARGET
        }
      );
    } else {
      // Create an ECR deployment for production environment.
      this.ecrDeployment = new OSMLECRDeployment(
        this,
        "DCIngestContainerDeployment",
        {
          account: props.account,
          sourceUri: this.config.DC_INGEST_CONTAINER,
          repositoryName: this.config.DC_INGEST_REPOSITORY,
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
