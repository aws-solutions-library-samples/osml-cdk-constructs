/*
 * Copyright 2023-2024 Amazon.com, Inc. or its affiliates.
 */

import { RemovalPolicy, SymlinkFollowMode } from "aws-cdk-lib";
import { DockerImageAsset } from "aws-cdk-lib/aws-ecr-assets";
import { ContainerImage } from "aws-cdk-lib/aws-ecs";
import { IRole } from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

import { OSMLAccount } from "../osml_account";
import { OSMLECRDeployment } from "../osml_ecr_deployment";
import { OSMLVpc } from "../osml_vpc";

/**
 * Represents the configuration for the TSContainer Construct.
 */
export class TSContainerConfig {
  /**
   * Creates an instance of TSContainerConfig.
   * @param {string} [TS_CONTAINER="awsosml/osml-tile-server:latest"] - The container image to use for the TileServer.
   * @param {string} [TS_BUILD_PATH="lib/osml-tile-server"] - The build path for the TileServer.
   * @param {string} [TS_BUILD_TARGET="osml_tile_sever"] - The build target for the TileServer.
   * @param {string} [TS_REPOSITORY="tile-server-container"] - The repository name for the TileServer.
   */
  constructor(
    public TS_CONTAINER: string = "awsosml/osml-tile-server:latest",
    public TS_BUILD_PATH: string = "lib/osml-tile-server",
    public TS_BUILD_TARGET: string = "osml_tile_server",
    public TS_REPOSITORY: string = "tile-server-container"
  ) {}
}

/**
 * Interface representing the properties for the TSContainer construct.
 */
export interface TSContainerProps {
  /**
   * The OSML deployment account.
   */
  account: OSMLAccount;

  /**
   * The OSML VPC (Virtual Private Cloud) associated with the TSContainer.
   */
  osmlVpc: OSMLVpc;

  /**
   * The lambda runtime environment for copying Docker images to ECR.
   */
  lambdaRuntime: Runtime;

  /**
   * Optional task role to be used by the TSContainer.
   */
  taskRole?: IRole;

  /**
   * Optional flag to instruct building tile server container from source.
   */
  buildFromSource?: boolean;

  /**
   * Optional configuration settings specific to the TSContainer.
   */
  config?: TSContainerConfig;
}

/**
 * Represents a construct responsible for deploying the ECR container image
 * for the tile server service.
 */
export class TSContainer extends Construct {
  public removalPolicy: RemovalPolicy;
  public config: TSContainerConfig;
  public containerImage: ContainerImage;
  /**
   * Creates an instance of TSContainer.
   * @param {Construct} scope The scope/stack in which to define this construct.
   * @param {string} id The id of this construct within the current scope.
   * @param {TSContainerProps} props The properties of this construct.
   * @returns TSContainer - The TSContainer construct.
   */
  constructor(scope: Construct, id: string, props: TSContainerProps) {
    super(scope, id);

    // Determine the removal policy based on the provided properties.
    this.removalPolicy = props.account.prodLike
      ? RemovalPolicy.RETAIN
      : RemovalPolicy.DESTROY;

    // Check if a custom configuration was provided; otherwise, create a new default configuration.
    if (props.config != undefined) {
      // Import an existing TS configuration.
      this.config = props.config;
    } else {
      // Create a new default configuration.
      this.config = new TSContainerConfig();
    }

    if (props.buildFromSource == true) {
      // Create a container image from a Docker image asset for development environment.
      this.containerImage = ContainerImage.fromDockerImageAsset(
        new DockerImageAsset(this, id, {
          directory: this.config.TS_BUILD_PATH,
          file: "Dockerfile",
          followSymlinks: SymlinkFollowMode.ALWAYS,
          target: this.config.TS_BUILD_TARGET
        })
      );
    } else {
      // Create an ECR deployment for production environment.
      const ecrDeployment: OSMLECRDeployment = new OSMLECRDeployment(
        this,
        "TSContainerECRDeployment",
        {
          account: props.account,
          sourceUri: this.config.TS_CONTAINER,
          repositoryName: this.config.TS_REPOSITORY,
          removalPolicy: this.removalPolicy,
          vpc: props.osmlVpc.vpc,
          vpcSubnets: props.osmlVpc.selectedSubnets,
          lambdaRuntime: props.lambdaRuntime
        }
      );
      this.containerImage = ecrDeployment.containerImage;
    }
  }
}
