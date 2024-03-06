/*
 * Copyright 2023-2024 Amazon.com, Inc. or its affiliates.
 */

import { RemovalPolicy, SymlinkFollowMode } from "aws-cdk-lib";
import { DockerImageAsset } from "aws-cdk-lib/aws-ecr-assets";
import { ContainerImage } from "aws-cdk-lib/aws-ecs";
import { Construct } from "constructs";

import { OSMLAccount } from "../osml_account";
import { OSMLECRDeployment } from "../osml_ecr_deployment";
import { OSMLVpc } from "../osml_vpc";

export class MEContainerConfig {
  constructor(
    public ME_DEFAULT_CONTAINER = "awsosml/osml-models:main",
    public ME_CONTAINER_BUILD_PATH = "lib/osml-models",
    public ME_CONTAINER_BUILD_TARGET = "osml_model",
    public ME_CONTAINER_REPOSITORY = "model-container"
  ) {}
}

/**
 * Represents the properties required to configure an OSML (OversightML)
 * model endpoint container..
 *
 * @interface MEContainerProps
 */
export interface MEContainerProps {
  /**
   * The OSML (OversightML) account associated with the model endpoints.
   */
  account: OSMLAccount;

  /**
   * The OSML vpc to deploy into
   */
  osmlVpc: OSMLVpc;

  /**
   * Optional flag to instruct building model container from source.
   */
  buildFromSource?: boolean;

  /**
   * (Optional) Custom configuration for the MEContainer Construct
   */
  config?: MEContainerConfig;
}

/**
 * Represents a construct responsible for deploying an ECR container image
 * for the model to be used with the model runner.
 */
export class MEContainer extends Construct {
  /**
   * The container image used for Construct.
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
  public config?: MEContainerConfig;

  /**
   * Creates an instance of OMSLEndpointContainer.
   * @param {Construct} scope - The scope/stack in which to define this construct.
   * @param {string} id - The id of this construct within the current scope.
   * @param {MEContainerProps} props - The properties of this construct.
   * @returns MEContainer - The OMSLEndpointContainer instance.
   */
  constructor(scope: Construct, id: string, props: MEContainerProps) {
    super(scope, id);

    // Set the removal policy based on the account type
    this.removalPolicy = props.account.prodLike
      ? RemovalPolicy.RETAIN
      : RemovalPolicy.DESTROY;

    // Check if a custom configuration was provided for the MR model container
    if (props.config != undefined) {
      // Import the existing MR configuration
      this.config = props.config;
    } else {
      // Create a new default configuration
      this.config = new MEContainerConfig();
    }

    // Create the container image and URI based on the account type
    if (props.buildFromSource == true) {
      // Dev account: Create a Docker image asset
      const dockerImageAsset: DockerImageAsset = new DockerImageAsset(
        this,
        id,
        {
          directory: this.config.ME_CONTAINER_BUILD_PATH,
          file: "Dockerfile",
          followSymlinks: SymlinkFollowMode.ALWAYS,
          target: this.config.ME_CONTAINER_BUILD_TARGET
        }
      );

      this.containerImage =
        ContainerImage.fromDockerImageAsset(dockerImageAsset);
      this.containerUri = dockerImageAsset.imageUri;
    } else {
      // Non-dev account: Deploy to ECR using OSMLECRDeployment
      const ecrDeployment: OSMLECRDeployment = new OSMLECRDeployment(
        this,
        "MEContainerECRDeployment",
        {
          sourceUri: this.config.ME_DEFAULT_CONTAINER,
          repositoryName: this.config.ME_CONTAINER_REPOSITORY,
          removalPolicy: this.removalPolicy,
          vpc: props.osmlVpc.vpc,
          vpcSubnets: props.osmlVpc.selectedSubnets
        }
      );
      this.containerImage = ecrDeployment.containerImage;
      this.containerUri = ecrDeployment.ecrContainerUri;
    }
  }
}
