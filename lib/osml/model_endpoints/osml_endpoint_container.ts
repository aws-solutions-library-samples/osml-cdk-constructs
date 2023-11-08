/*
 * Copyright 2023 Amazon.com, Inc. or its affiliates.
 */
import { RemovalPolicy, SymlinkFollowMode } from "aws-cdk-lib";
import { DockerImageAsset } from "aws-cdk-lib/aws-ecr-assets";
import { ContainerImage } from "aws-cdk-lib/aws-ecs";
import { Construct } from "constructs";

import { OSMLAccount } from "../osml_account";
import { OSMLECRDeployment } from "../osml_ecr_deployment";
import { OSMLVpc } from "../osml_vpc";

export class OSMLEndpointContainerConfig {
  constructor(
    public OSML_MODEL_CONTAINER = "awsosml/osml-models:main",
    public OSML_MODEL_BUILD_PATH = "lib/osml-models",
    public OSML_MODEL_BUILD_TARGET = "osml_model",
    public OSML_MODEL_REPOSITORY = "model-container"
  ) {}
}

/**
 * Represents the properties for an OSMLEndpointContainer construct.
 */
export interface OSMLEndpointContainerProps {
  /**
   * The OSML (OversightML) account associated with the model endpoints.
   */
  account: OSMLAccount;

  /**
   * The OSML vpc to deploy into
   */
  osmlVpc: OSMLVpc;

  /**
   * (Optional) Custom configuration for the OSMLEndpointContainer Construct
   */
  mrModelContainerConfig?: OSMLEndpointContainerConfig;
}

/**
 * Represents a construct responsible for deploying an ECR container image
 * for the model to be used with the model runner.
 */
export class OSMLEndpointContainer extends Construct {
  /**
   * Configuration for the OSMLEndpointContainer.
   */
  public mrModelContainerConfig: OSMLEndpointContainerConfig;

  /**
   * The container image used for this OSMLEndpointContainer.
   */
  public containerImage: ContainerImage;

  /**
   * The URI of the container image.
   */
  public containerUri: string;

  /**
   * The removal policy for the OSMLEndpointContainer.
   */
  public removalPolicy: RemovalPolicy;

  /**
   * Creates an instance of OMSLEndpointContainer.
   * @param {Construct} scope - The scope/stack in which to define this construct.
   * @param {string} id - The id of this construct within the current scope.
   * @param {OSMLEndpointContainerProps} props - The properties of this construct.
   * @returns OSMLEndpointContainer - The OMSLEndpointContainer instance.
   */
  constructor(scope: Construct, id: string, props: OSMLEndpointContainerProps) {
    super(scope, id);

    // Set the removal policy based on the account type
    this.removalPolicy = props.account.prodLike
      ? RemovalPolicy.RETAIN
      : RemovalPolicy.DESTROY;

    // Check if a custom configuration was provided for the MR model container
    if (props.mrModelContainerConfig != undefined) {
      // Import the existing MR configuration
      this.mrModelContainerConfig = props.mrModelContainerConfig;
    } else {
      // Create a new default configuration
      this.mrModelContainerConfig = new OSMLEndpointContainerConfig();
    }

    // Create the container image and URI based on the account type
    if (props.account.buildModelContainer == true) {
      // Dev account: Create a Docker image asset
      const dockerImageAsset = new DockerImageAsset(this, id, {
        directory: this.mrModelContainerConfig.OSML_MODEL_BUILD_PATH,
        file: "Dockerfile",
        followSymlinks: SymlinkFollowMode.ALWAYS,
        target: this.mrModelContainerConfig.OSML_MODEL_BUILD_TARGET
      });

      this.containerImage =
        ContainerImage.fromDockerImageAsset(dockerImageAsset);
      this.containerUri = dockerImageAsset.imageUri;
    } else {
      // Non-dev account: Deploy to ECR using OSMLECRDeployment
      const ecrDeployment = new OSMLECRDeployment(
        this,
        "OSMLModelECRDeployment",
        {
          sourceUri: this.mrModelContainerConfig.OSML_MODEL_CONTAINER,
          repositoryName: this.mrModelContainerConfig.OSML_MODEL_REPOSITORY,
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
