/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { Duration, RemovalPolicy, SymlinkFollowMode } from "aws-cdk-lib";
import { IRole } from "aws-cdk-lib/aws-iam";
import { DockerImageCode, DockerImageFunction } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

import { OSMLAccount } from "../../osml_account";
import { OSMLECRDeployment } from "../../osml_ecr_deployment";
import { OSMLVpc } from "../../osml_vpc";

/**
 * Represents the configuration for the TSTestContainer Construct.
 */
export class TSTestRunnerConfig {
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
 * Interface representing the properties for the TSTestRunner construct.
 */
export interface TSTestRunnerProps {
  /**
   * The OSML deployment account.
   */
  account: OSMLAccount;

  /**
   * The OSML vpc to deploy into
   */
  osmlVpc: OSMLVpc;

  /**
   * The DNS name of the Tile Server load balancer endpoint
   */
  tsEndpoint: string;

  /**
   * The S3 bucket name that contains test images for Tile Server
   */
  tsTestImageBucket: string;

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
  config?: TSTestRunnerConfig;
}

/**
 * Represents a construct responsible for deploying an ECR container image
 * for the tile server test.
 */
export class TSTestRunner extends Construct {
  public removalPolicy: RemovalPolicy;
  public config: TSTestRunnerConfig;
  public lambdaIntegRunner: DockerImageFunction;
  /**
   * Creates an instance of TSTestRunner.
   * @param {Construct} scope - The scope/stack in which to define this construct.
   * @param {string} id - The id of this construct within the current scope.
   * @param {TSTestRunnerProps} props - The properties of this construct.
   * @returns TSTestRunner - The TSTestContainer instance.
   */
  constructor(scope: Construct, id: string, props: TSTestRunnerProps) {
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
      this.config = new TSTestRunnerConfig();
    }

    let dockerImageCode: DockerImageCode | undefined = undefined;
    const testEntrypoint: string[] = [
      "python",
      "src/aws/osml/run_test.py",
      "--endpoint",
      props.tsEndpoint,
      "--source_image_bucket",
      props.tsTestImageBucket,
      "-v"
    ];

    if (props.buildFromSource == true) {
      // Create a container image from a Docker image asset for development environment.
      dockerImageCode = DockerImageCode.fromImageAsset(
        this.config.TS_TEST_BUILD_PATH,
        {
          file: "Dockerfile",
          followSymlinks: SymlinkFollowMode.ALWAYS,
          target: this.config.TS_TEST_BUILD_TARGET,
          entrypoint: testEntrypoint
        }
      );
    } else {
      // Create an ECR deployment for production environment.
      const ecrDeployment: OSMLECRDeployment = new OSMLECRDeployment(
        this,
        "TSTestContainerECRDeployment",
        {
          account: props.account,
          sourceUri: this.config.TS_TEST_CONTAINER,
          repositoryName: this.config.TS_TEST_REPOSITORY,
          removalPolicy: this.removalPolicy,
          vpc: props.osmlVpc.vpc,
          vpcSubnets: props.osmlVpc.selectedSubnets
        }
      );
      dockerImageCode = DockerImageCode.fromEcr(ecrDeployment.ecrRepository, {
        entrypoint: testEntrypoint
      });
    }
    this.lambdaIntegRunner = new DockerImageFunction(this, "TSTestRunner", {
      code: dockerImageCode,
      vpc: props.osmlVpc.vpc,
      role: props.taskRole,
      timeout: Duration.minutes(10),
      memorySize: 1024,
      functionName: "TSTestRunner"
    });
  }
}
