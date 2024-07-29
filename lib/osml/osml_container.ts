/*
 * Copyright 2023-2024 Amazon.com, Inc. or its affiliates.
 */

import { RemovalPolicy, SymlinkFollowMode } from "aws-cdk-lib";
import { Repository } from "aws-cdk-lib/aws-ecr";
import { DockerImageAsset } from "aws-cdk-lib/aws-ecr-assets";
import { ContainerImage, EcrImage } from "aws-cdk-lib/aws-ecs";
import { DockerImageCode } from "aws-cdk-lib/aws-lambda";
import { DockerImageName, ECRDeployment } from "cdk-ecr-deployment";
import { Construct } from "constructs";

import { OSMLAccount } from "./osml_account";
import { OSMLRepository } from "./osml_repository";
import { OSMLVpc } from "./osml_vpc";
import { BaseConfig, ConfigType } from "./utils/base_config";
import { RegionalConfig, RegionConfig } from "./utils/regional_config";

/**
 * Configuration class for the OSMLContainerProps Construct.
 */
export class OSMLContainerConfig extends BaseConfig {
  /**
   * The default container image tag.
   */
  public CONTAINER_TAG?: string;

  /**
   * The default container image.
   */
  public CONTAINER_URI?: string;

  /**
   * The build path for the container.
   */
  public CONTAINER_BUILD_PATH?: string;

  /**
   * The build target for the container.
   */
  public CONTAINER_BUILD_TARGET?: string;

  /**
   * The repository name for the container.
   */
  public CONTAINER_REPOSITORY?: string;

  /**
   * The Dockerfile to build the container.
   */
  public CONTAINER_DOCKERFILE?: string;

  /**
   * Creates an instance of OSMLContainerConfig.
   * @param config - The configuration object for OSMLContainer.
   */
  constructor(config: ConfigType = {}) {
    super({
      CONTAINER_DOCKERFILE: "Dockerfile",
      CONTAINER_TAG: "latest",
      ...config
    });
  }
}

/**
 * Represents the properties required to configure an OSML (OversightML)
 * model endpoint container.
 *
 * @interface OSMLContainerProps
 */
export interface OSMLContainerProps {
  /**
   * The OSML (OversightML) account associated with the model endpoints.
   */
  account: OSMLAccount;

  /**
   * The OSML VPC to deploy into.
   */
  osmlVpc: OSMLVpc;

  /**
   * Optional flag to instruct building the model container from source.
   */
  buildFromSource?: boolean;

  /**
   * (Optional) Custom configuration for the OSMLContainer Construct.
   */
  config?: OSMLContainerConfig;
}

/**
 * Represents a construct responsible for deploying an ECR container image
 * for the model to be used with the model runner.
 */
export class OSMLContainer extends Construct {
  /**
   * The container image used for the Construct.
   */
  public containerImage: ContainerImage;

  /**
   * The URI of the container image.
   */
  public containerUri: string;

  /**
   * The removal policy for the Construct resources.
   */
  public removalPolicy: RemovalPolicy;

  /**
   * Configuration for the Construct.
   */
  public config: OSMLContainerConfig;

  /**
   * The ECR repository for the container image.
   */
  public repository: Repository;

  /**
   * The ECR image for the container.
   */
  public ecrImage: EcrImage;

  /**
   * The ECR deployment for the container image.
   */
  public ecrDeployment: ECRDeployment;

  /**
   * The Docker image code for Lambda functions.
   */
  public dockerImageCode: DockerImageCode;

  /**
   * The Docker image asset for the container.
   */
  public dockerImageAsset: DockerImageAsset;

  /**
   * Regional config imputed for this resource.
   */
  public regionConfig: RegionConfig;

  /**
   * Creates an instance of OSMLContainer.
   * @param {Construct} scope - The scope/stack in which to define this construct.
   * @param {string} id - The id of this construct within the current scope.
   * @param {OSMLContainerProps} props - The properties of this construct.
   * @returns OSMLContainer - The OSMLContainer instance.
   */
  constructor(scope: Construct, id: string, props: OSMLContainerProps) {
    super(scope, id);

    // Set the removal policy based on the account type
    this.removalPolicy = props.account.prodLike
      ? RemovalPolicy.RETAIN
      : RemovalPolicy.DESTROY;

    // Check if a custom configuration was provided
    this.config = props.config ?? new OSMLContainerConfig();

    // Impute a regional config to use for the resources
    this.regionConfig = RegionalConfig.getConfig(props.account.region);

    // Build the container resources
    if (props.buildFromSource) {
      this.buildFromSource();
    } else {
      this.buildFromRepository(props.osmlVpc);
    }
  }

  /**
   * Builds the container from source using Dockerfile and build path specified in the config.
   * Validates the configuration to ensure that the necessary parameters are provided.
   *
   * @throws {Error} If CONTAINER_DOCKERFILE or CONTAINER_BUILD_PATH are not set in the configuration.
   */
  private buildFromSource(): void {
    if (
      !this.config.CONTAINER_DOCKERFILE ||
      !this.config.CONTAINER_BUILD_PATH
    ) {
      throw new Error(
        "CONTAINER_DOCKERFILE and CONTAINER_BUILD_PATH must be set in the configuration to build from source."
      );
    }

    this.dockerImageAsset = new DockerImageAsset(this, `DockerImageAsset`, {
      directory: this.config.CONTAINER_BUILD_PATH,
      file: this.config.CONTAINER_DOCKERFILE,
      followSymlinks: SymlinkFollowMode.ALWAYS,
      target: this.config.CONTAINER_BUILD_TARGET
    });

    this.containerImage = ContainerImage.fromDockerImageAsset(
      this.dockerImageAsset
    );

    this.dockerImageCode = DockerImageCode.fromImageAsset(
      this.config.CONTAINER_BUILD_PATH,
      {
        file: this.config.CONTAINER_DOCKERFILE,
        followSymlinks: SymlinkFollowMode.ALWAYS,
        target: this.config.CONTAINER_BUILD_TARGET
      }
    );

    this.containerUri = this.dockerImageAsset.imageUri;
  }

  /**
   * Builds the container from an existing repository using the specified repository name and URI in the config.
   * Validates the configuration to ensure that the necessary parameters are provided.
   *
   * @param {OSMLVpc} osmlVpc - The VPC to deploy the container in.
   * @throws {Error} If CONTAINER_REPOSITORY or CONTAINER_URI are not set in the configuration.
   */
  private buildFromRepository(osmlVpc: OSMLVpc): void {
    if (!this.config.CONTAINER_REPOSITORY || !this.config.CONTAINER_URI) {
      throw new Error(
        "CONTAINER_REPOSITORY and CONTAINER_URI must be set in the configuration to build from a repository."
      );
    }

    this.repository = new OSMLRepository(this, `ECRRepository`, {
      repositoryName: this.config.CONTAINER_REPOSITORY,
      removalPolicy: this.removalPolicy
    }).repository;

    this.ecrImage = new EcrImage(
      this.repository,
      <string>this.config.CONTAINER_TAG
    );

    this.ecrDeployment = new ECRDeployment(this, `ECRDeployment`, {
      src: new DockerImageName(this.config.CONTAINER_URI),
      dest: new DockerImageName(this.ecrImage.imageName),
      memoryLimit: 10240,
      vpc: osmlVpc.vpc,
      vpcSubnets: osmlVpc.selectedSubnets,
      lambdaRuntime: this.regionConfig.ecrCdkDeployRuntime
    });

    this.containerImage = ContainerImage.fromEcrRepository(
      this.repository,
      this.config.CONTAINER_TAG
    );

    this.containerUri = this.repository.repositoryUriForTag(
      this.config.CONTAINER_TAG
    );

    this.dockerImageCode = DockerImageCode.fromEcr(this.repository);
  }
}
