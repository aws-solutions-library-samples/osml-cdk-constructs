/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { RemovalPolicy, SymlinkFollowMode } from "aws-cdk-lib";
import { DockerImageAsset } from "aws-cdk-lib/aws-ecr-assets";
import { ContainerImage } from "aws-cdk-lib/aws-ecs";
import { IRole } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

import { OSMLAccount } from "../../osml_account";
import { OSMLECRDeployment } from "../../osml_ecr_deployment";
import { OSMLVpc } from "../../osml_vpc";

/**
 * Represents the configuration for the TSTestContainer Construct.
 */
export class TSTestContainerConfig {
  /**
   * Creates an instance of TSContainerConfig.
   * @param {string} [TS_TEST_CONTAINER="awsosml/osml-tile-server-test:main"] - The container image to use for the TileServer test.
   * @param {string} [TS_TEST_BUILD_PATH="lib/osml-tile-server-test"] - The build path for the TileServer test.
   * @param {string} [TS_TEST_BUILD_TARGET="osml_tile_sever_test"] - The build target for the TileServer test.
   * @param {string} [TS_TEST_REPOSITORY="tile-server-test-container"] - The repository name for the TileServer test.
   */
  constructor(
    public TS_TEST_CONTAINER: string = "awsosml/osml-tile-server-test:main",
    public TS_TEST_BUILD_PATH: string = "lib/osml-tile-server-test",
    public TS_TEST_BUILD_TARGET: string = "osml_tile_server_test",
    public TS_TEST_REPOSITORY: string = "tile-server-test-container"
  ) {}
}

/**
 * Interface representing the properties for the TSTestContainer construct.
 */
export interface TSTestContainerProps {
  /**
   * The OSML deployment account.
   */
  account: OSMLAccount;

  /**
   * The OSML vpc to deploy into
   */
  osmlVpc: OSMLVpc;

  /**
   * Optional task role to be used by the TSTestContainer.
   */
  taskRole?: IRole;

  /**
   * Optional flag to instruct building tile server test container from source.
   */
  buildFromSource?: boolean;

  /**
   * Optional configuration for the TSTestContainer Construct
   */
  config?: TSTestContainerConfig;
}

/**
 * Represents a construct responsible for deploying an ECR container image
 * for the tile server test.
 */
export class TSTestContainer extends Construct {
  public removalPolicy: RemovalPolicy;
  public config: TSTestContainerConfig;
  public containerImage: ContainerImage;
  /**
   * Creates an instance of TSTestContainer.
   * @param {Construct} scope - The scope/stack in which to define this construct.
   * @param {string} id - The id of this construct within the current scope.
   * @param {TSTestContainerProps} props - The properties of this construct.
   * @returns TSTestContainer - The TSTestContainer instance.
   */
  constructor(scope: Construct, id: string, props: TSTestContainerProps) {
    super(scope, id);

    // Set the removal policy based on the provided properties
    this.removalPolicy = props.account.prodLike
      ? RemovalPolicy.RETAIN
      : RemovalPolicy.DESTROY;

    // Check if a custom configuration was provided: otherwise, create a new default configuration.
    if (props.config != undefined) {
      // Import the existing TSTest configuration
      this.config = props.config;
    } else {
      // Create a new default configuration
      this.config = new TSTestContainerConfig();
    }

    if (props.buildFromSource == true) {
      // Create a container image from a Docker image asset for development environment.
      this.containerImage = ContainerImage.fromDockerImageAsset(
        new DockerImageAsset(this, id, {
          directory: this.config.TS_TEST_BUILD_PATH,
          file: "Dockerfile",
          followSymlinks: SymlinkFollowMode.ALWAYS,
          target: this.config.TS_TEST_BUILD_TARGET
        })
      );
    } else {
      // Create an ECR deployment for production environment.
      const ecrDeployment: OSMLECRDeployment = new OSMLECRDeployment(
        this,
        "TSTestContainerECRDeployment",
        {
          sourceUri: this.config.TS_TEST_CONTAINER,
          repositoryName: this.config.TS_TEST_REPOSITORY,
          removalPolicy: this.removalPolicy,
          vpc: props.osmlVpc.vpc,
          vpcSubnets: props.osmlVpc.selectedSubnets
        }
      );
      this.containerImage = ecrDeployment.containerImage;
    }
  }
}
