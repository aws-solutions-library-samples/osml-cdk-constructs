/*
 * Copyright 2023-2024 Amazon.com, Inc. or its affiliates.
 */

import { RemovalPolicy, SymlinkFollowMode } from "aws-cdk-lib";
import { DockerImageAsset } from "aws-cdk-lib/aws-ecr-assets";
import { ContainerImage } from "aws-cdk-lib/aws-ecs";
import { IRole } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

import { OSMLAccount } from "../osml_account";
import { OSMLECRDeployment } from "../osml_ecr_deployment";
import { OSMLVpc } from "../osml_vpc";

/**
 * Represents the configuration for the MRAppContainer Construct.
 */
export class MRContainerConfig {
  /**
   * Creates an instance of MRAppContainerConfig.
   * @param {string} [MR_DEFAULT_CONTAINER="awsosml/osml-model-runner:main"] - The container image to use for the MRApp.
   * @param {string} [MR_CONTAINER_BUILD_PATH="lib/osml-model-runner"] - The build path for the MRApp.
   * @param {string} [MR_CONTAINER_BUILD_TARGET="model_runner"] - The build target for the MRApp.
   * @param {string} [MR_CONTAINER_REPOSITORY="model-runner-container"] - The repository name for the MRApp.
   */
  constructor(
    public MR_DEFAULT_CONTAINER: string = "awsosml/osml-model-runner:main",
    public MR_CONTAINER_BUILD_PATH: string = "lib/osml-model-runner",
    public MR_CONTAINER_BUILD_TARGET: string = "model_runner",
    public MR_CONTAINER_REPOSITORY: string = "model-runner-container"
  ) {}
}

/**
 * Interface representing the properties for the MRAppContainer component.
 */
export interface MRAppContainerProps {
  /**
   * The OSML deployment account.
   */
  account: OSMLAccount;

  /**
   * The OSML VPC (Virtual Private Cloud) associated with the MRAppContainer.
   */
  osmlVpc: OSMLVpc;

  /**
   * Optional task role to be used by the MRAppContainer.
   */
  taskRole?: IRole;

  /**
   * Optional flag to instruct building model runner container from source.
   */
  buildFromSource?: boolean;

  /**
   * Optional configuration settings specific to the MRAppContainer.
   */
  mrAppContainerConfig?: MRContainerConfig;
}

/**
 * Represents a construct responsible for deploying the ECR container image
 * for the model runner service.
 */
export class MRContainer extends Construct {
  public removalPolicy: RemovalPolicy;
  public mrAppContainerConfig: MRContainerConfig;
  public containerImage: ContainerImage;
  /**
   * Creates an instance of MRAppContainer.
   * @param {Construct} scope The scope/stack in which to define this construct.
   * @param {string} id The id of this construct within the current scope.
   * @param {MRAppContainerProps} props The properties of this construct.
   * @returns MRAppContainer The MRAppContainer construct.
   */
  constructor(scope: Construct, id: string, props: MRAppContainerProps) {
    super(scope, id);

    // Determine the removal policy based on the provided properties.
    this.removalPolicy = props.account.prodLike
      ? RemovalPolicy.RETAIN
      : RemovalPolicy.DESTROY;

    // Check if a custom configuration was provided; otherwise, create a new default configuration.
    if (props.mrAppContainerConfig != undefined) {
      // Import an existing MR configuration.
      this.mrAppContainerConfig = props.mrAppContainerConfig;
    } else {
      // Create a new default configuration.
      this.mrAppContainerConfig = new MRContainerConfig();
    }

    if (props.buildFromSource == true) {
      // Create a container image from a Docker image asset for development environment.
      this.containerImage = ContainerImage.fromDockerImageAsset(
        new DockerImageAsset(this, id, {
          directory: this.mrAppContainerConfig.MR_CONTAINER_BUILD_PATH,
          file: "Dockerfile",
          followSymlinks: SymlinkFollowMode.ALWAYS,
          target: this.mrAppContainerConfig.MR_CONTAINER_BUILD_TARGET
        })
      );
    } else {
      // Create an ECR deployment for production environment.
      const ecrDeployment = new OSMLECRDeployment(
        this,
        "MRContainerECRDeployment",
        {
          account: props.account,
          sourceUri: this.mrAppContainerConfig.MR_DEFAULT_CONTAINER,
          repositoryName: this.mrAppContainerConfig.MR_CONTAINER_REPOSITORY,
          removalPolicy: this.removalPolicy,
          vpc: props.osmlVpc.vpc,
          vpcSubnets: props.osmlVpc.selectedSubnets
        }
      );
      this.containerImage = ecrDeployment.containerImage;
    }
  }
}
