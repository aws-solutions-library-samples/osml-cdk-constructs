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
 * Represents the configuration for the DIContainer Construct.
 */
export class DIContainerConfig {
  /**
   * Creates an instance of DIContainerConfig.
   * @param {string} [DI_CONTAINER="awsosml/osml-data-intake:latest"] - Container image to use for the lambda container.
   * @param {string} [DI_BUILD_PATH="lib/osml-data-intake"] - The build path for the Data Intake source code.
   * @param {string} [DI_BUILD_TARGET="intake"] - The build target for the Data Intake Dockerfile.
   * @param {string} [DI_DOCKERFILE="docker/Dockerfile.intake"] - The Dockerfile to build the container.
   * @param {string} [DI_REPOSITORY="data-intake-container"] - The repository name for the Data Intake source repo.
   */
  constructor(
    public DI_CONTAINER: string = "awsosml/osml-data-intake:latest",
    public DI_BUILD_PATH: string = "lib/osml-data-intake",
    public DI_BUILD_TARGET: string = "intake",
    public DI_DOCKERFILE: string = "docker/Dockerfile.intake",
    public DI_REPOSITORY: string = "data-intake-container"
  ) {}
}

/**
 * Interface representing the properties for the DIContainer construct.
 */
export interface DIContainerProps {
  /**
   * The OSML deployment account.
   */
  account: OSMLAccount;

  /**
   * The OSML vpc to deploy into
   */
  osmlVpc: OSMLVpc;

  /**
   * Optional flag to instruct building Data Intake Lambda container from source.
   */
  buildFromSource?: boolean;

  /**
   * Optional configuration for the DIContainer Construct
   */
  config?: DIContainerConfig;
}

/**
 * Represents a construct responsible for deploying an ECR container image
 * for the Data Intake Lambda.
 */
export class DIContainer extends Construct {
  public removalPolicy: RemovalPolicy;
  public config: DIContainerConfig;
  public dockerImageCode: DockerImageCode;
  public ecrDeployment: OSMLECRDeployment;
  /**
   * Creates an instance of DIContainer.
   * @param {Construct} scope - The scope/stack in which to define this construct.
   * @param {string} id - The id of this construct within the current scope.
   * @param {DIContainerProps} props - The properties of this construct.
   * @returns DIContainer - The DIContainer instance.
   */
  constructor(scope: Construct, id: string, props: DIContainerProps) {
    super(scope, id);

    // Set the removal policy based on the provided properties
    this.removalPolicy = props.account.prodLike
      ? RemovalPolicy.RETAIN
      : RemovalPolicy.DESTROY;

    // Check if a custom configuration was provided: otherwise, create a new default configuration.
    if (props.config != undefined) {
      // Import the existing DIContainer configuration
      this.config = props.config;
    } else {
      // Create a new default configuration
      this.config = new DIContainerConfig();
    }

    if (props.buildFromSource == true) {
      // Create a container image from a Docker image asset for development environment.
      this.dockerImageCode = DockerImageCode.fromImageAsset(
        this.config.DI_BUILD_PATH,
        {
          file: this.config.DI_DOCKERFILE,
          followSymlinks: SymlinkFollowMode.ALWAYS,
          target: this.config.DI_BUILD_TARGET
        }
      );
    } else {
      // Create an ECR deployment for production environment.
      this.ecrDeployment = new OSMLECRDeployment(this, "DIECRDeployment", {
        account: props.account,
        sourceUri: this.config.DI_CONTAINER,
        repositoryName: this.config.DI_REPOSITORY,
        removalPolicy: this.removalPolicy,
        vpc: props.osmlVpc.vpc,
        vpcSubnets: props.osmlVpc.selectedSubnets
      });
      this.dockerImageCode = DockerImageCode.fromEcr(
        this.ecrDeployment.ecrRepository
      );
    }
  }
}
