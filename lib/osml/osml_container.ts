/*
 * Copyright 2023-2024 Amazon.com, Inc. or its affiliates.
 */

import { RemovalPolicy, SymlinkFollowMode } from "aws-cdk-lib";
import { IRepository, Repository } from "aws-cdk-lib/aws-ecr";
import { DockerImageAsset } from "aws-cdk-lib/aws-ecr-assets";
import { ContainerImage } from "aws-cdk-lib/aws-ecs";
import { DockerImageCode } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import * as fs from "fs";
import * as path from "path";

import { OSMLAccount } from "./osml_account";
import { BaseConfig, ConfigType } from "./utils/base_config";
import { RegionalConfig, RegionConfig } from "./utils/regional_config";

/**
 * Configuration class for the OSMLContainerProps Construct.
 */
export class OSMLContainerConfig extends BaseConfig {
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
   * The Dockerfile to build the container.
   */
  public CONTAINER_DOCKERFILE?: string;

  /**
   * Creates an instance of OSMLContainerConfig.
   * @param config - The configuration object for OSMLContainer.
   */
  constructor(config: ConfigType = {}) {
    super({
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
   * (Optional) Flag to instruct building the Docker image code for the container.
   */
  buildDockerImageCode?: boolean;

  /**
   * (Optional) Flag to instruct building the model container from source.
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
  public repository: IRepository;

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
   * The repository access mode to assign when building model containers for SageMaker.
   */
  public repositoryAccessMode: string = "Platform";

  /**
   * The repository access mode to assign when building model containers for SageMaker.
   */
  public buildDockerImageCode?: boolean | undefined;

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

    // Set whether to build Docker image code for this resource
    this.buildDockerImageCode = props.buildDockerImageCode;

    // Check if a custom configuration was provided
    this.config = props.config ?? new OSMLContainerConfig();

    // Impute a regional config to use for the resources
    this.regionConfig = RegionalConfig.getConfig(props.account.region);

    // Build the container resources
    if (props.buildFromSource) {
      this.buildFromSource();
    } else {
      this.buildFromRepository();
    }
  }

  /**
   * Builds the container from source using the Dockerfile and build path specified in the config.
   * Validates the configuration to ensure that the necessary parameters are provided.
   *
   * @throws {Error} If CONTAINER_DOCKERFILE or CONTAINER_BUILD_PATH are not set in the configuration.
   */
  private buildFromSource(): void {
    // Validate that both the Dockerfile and build path are provided in the configuration.
    if (
      !this.config.CONTAINER_DOCKERFILE ||
      !this.config.CONTAINER_BUILD_PATH
    ) {
      throw new Error(
        "CONTAINER_DOCKERFILE and CONTAINER_BUILD_PATH must be set in the configuration to build from source."
      );
    }

    // Create a DockerImageAsset, which builds a Docker image from the specified Dockerfile and build path.
    this.dockerImageAsset = new DockerImageAsset(this, `DockerImageAsset`, {
      directory: this.config.CONTAINER_BUILD_PATH,
      file: this.config.CONTAINER_DOCKERFILE,
      followSymlinks: SymlinkFollowMode.ALWAYS,
      target: this.config.CONTAINER_BUILD_TARGET
    });

    // Create a ContainerImage object from the DockerImageAsset, which will be used by ECS services.
    this.containerImage = ContainerImage.fromDockerImageAsset(
      this.dockerImageAsset
    );

    // Store the URI of the built Docker image in the containerUri property for later use.
    this.containerUri = this.dockerImageAsset.imageUri;

    if (this.buildDockerImageCode) {
      // Create a DockerImageCode object for Lambda using the same Docker image built from the source.
      this.dockerImageCode = DockerImageCode.fromImageAsset(
        this.config.CONTAINER_BUILD_PATH,
        {
          file: this.config.CONTAINER_DOCKERFILE,
          followSymlinks: SymlinkFollowMode.ALWAYS,
          target: this.config.CONTAINER_BUILD_TARGET
        }
      );
    }
  }

  /**
   * Builds the container from an existing repository using the specified repository URI in the config.
   * Validates the configuration to ensure that the necessary parameters are provided.
   *
   * @throws {Error} If CONTAINER_URI is not set in the configuration.
   */
  private buildFromRepository(): void {
    // Validate that the CONTAINER_URI is provided in the configuration.
    if (!this.config.CONTAINER_URI) {
      throw new Error(
        "CONTAINER_URI must be set in the configuration to use a pre-built container image."
      );
    }

    // Determine the tag to use for the container image, defaulting to "latest" if not provided.
    const tag = "latest";

    // Check if the CONTAINER_URI indicates an Amazon ECR repository by checking the ARN format.
    const ecrArnRegex =
      /^arn:([^:]+):ecr:([^:]+):[^:]+:repository\/[a-zA-Z0-9-._]+(:[a-zA-Z0-9-._]+)?$/;

    if (ecrArnRegex.test(this.config.CONTAINER_URI)) {
      let repositoryArn = this.config.CONTAINER_URI;
      let extractedTag = tag;

      // Extract tag if present
      const tagSeparatorIndex = this.config.CONTAINER_URI.lastIndexOf(":");
      if (
        tagSeparatorIndex > this.config.CONTAINER_URI.indexOf("repository/")
      ) {
        repositoryArn = this.config.CONTAINER_URI.substring(
          0,
          tagSeparatorIndex
        );
        extractedTag = this.config.CONTAINER_URI.substring(
          tagSeparatorIndex + 1
        );
      }

      // Import the existing ECR repository using the ARN provided in the CONTAINER_URI.
      this.repository = Repository.fromRepositoryArn(
        this,
        "ImportedECRRepo",
        repositoryArn
      );

      // Create a ContainerImage object from the imported ECR repository and specified tag.
      this.containerImage = ContainerImage.fromEcrRepository(
        this.repository,
        extractedTag
      );

      // Set the containerUri to the full URI of the container image in ECR.
      this.containerUri = this.repository.repositoryUriForTag(extractedTag);

      if (this.buildDockerImageCode) {
        // Create a DockerImageCode object for Lambda using the imported ECR repository.
        this.dockerImageCode = DockerImageCode.fromEcr(this.repository, {
          tagOrDigest: extractedTag
        });
      }
    } else {
      // If the CONTAINER_URI does not indicate an ECR repository, assume it is a public or private Docker registry.
      this.repositoryAccessMode = "Vpc";

      // Create a ContainerImage object from the provided Docker registry URI and tag.
      this.containerImage = ContainerImage.fromRegistry(
        this.config.CONTAINER_URI
      );

      // Set the containerUri to the full URI of the container image in the Docker registry.
      this.containerUri = this.config.CONTAINER_URI;

      if (this.buildDockerImageCode) {
        // Define the Dockerfile content dynamically based on containerUri
        const dockerfileContent = `FROM ${this.config.CONTAINER_URI}`;

        // Create a temporary Dockerfile to build the Docker image with
        const tmpDockerfile = "Dockerfile.tmp";

        // Write the temp Dockerfile to the build directory
        const dockerfilePath = path.join(__dirname, tmpDockerfile);
        fs.writeFileSync(dockerfilePath, dockerfileContent);

        // Create a DockerImageCode object for Lambda using the DockerImageAsset
        this.dockerImageCode = DockerImageCode.fromImageAsset(__dirname, {
          file: tmpDockerfile,
          followSymlinks: SymlinkFollowMode.ALWAYS
        });
      }
    }
  }
}
