/*
 * Copyright 2023 Amazon.com, Inc. or its affiliates.
 */
import { RemovalPolicy, SymlinkFollowMode } from "aws-cdk-lib";
import { DockerImageAsset } from "aws-cdk-lib/aws-ecr-assets";
import { ContainerImage } from "aws-cdk-lib/aws-ecs";
import { Construct } from "constructs";

import { OSMLAccount } from "../../osml_account";
import { OSMLECRDeployment } from "../../osml_ecr_deployment";
import { OSMLVpc } from "../../osml_vpc";

// mutable configuration dataclass for the model runner testing Construct
// for a more detailed breakdown of the configuration see: configuration_guide.md in the documentation directory.
export class MRModelRepoConfig {
  constructor(
    public MODEL_DEFAULT_CONTAINER = "awsosml/osml-models:main",
    // ecr repo names
    public ECR_MODEL_REPOSITORY = "model-container",
    // path to the control model source
    public ECR_MODELS_PATH = "lib/osml-models",
    // build target for control model container
    public ECR_MODEL_TARGET = "osml_model"
  ) {}
}

export interface MRModelRepoProps {
  // the osml account interface
  account: OSMLAccount;
  // the model runner vpc
  osmlVpc: OSMLVpc;
  // optional custom configuration for the testing resources - will be defaulted if not provided
  mrModelRepoConfig?: MRModelRepoConfig;
}

export class MRModelEcr extends Construct {
  public modelContainerEcrDeployment: OSMLECRDeployment;
  public mrModelRepoConfig: MRModelRepoConfig;
  public modelContainerImage: ContainerImage;
  public modelContainerUri: string;
  public removalPolicy: RemovalPolicy;

  /**
   * This construct is responsible deploying the ECR container image for
   * the model to be used with model runner.
   * @param scope the scope/stack in which to define this construct.
   * @param id the id of this construct within the current scope.
   * @param props the properties of this construct.
   * @returns MRModelRepo Construct
   */
  constructor(scope: Construct, id: string, props: MRModelRepoProps) {
    super(scope, id);

    // setup a removal policy
    this.removalPolicy = props.account.prodLike
      ? RemovalPolicy.RETAIN
      : RemovalPolicy.DESTROY;

    // check if a custom config was provided
    if (props.mrModelRepoConfig != undefined) {
      // import existing pass in MR configuration
      this.mrModelRepoConfig = props.mrModelRepoConfig;
    } else {
      // create a new default configuration
      this.mrModelRepoConfig = new MRModelRepoConfig();
    }

    if (props.account.isDev == true) {
      const dockerImageAsset = new DockerImageAsset(this, id, {
        directory: this.mrModelRepoConfig.ECR_MODELS_PATH,
        file: "Dockerfile",
        followSymlinks: SymlinkFollowMode.ALWAYS,
        target: this.mrModelRepoConfig.ECR_MODEL_TARGET
      });

      this.modelContainerImage =
        ContainerImage.fromDockerImageAsset(dockerImageAsset);

      this.modelContainerUri = dockerImageAsset.imageUri;
    } else {
      this.modelContainerEcrDeployment = new OSMLECRDeployment(
        this,
        "OSMLModelContainer",
        {
          sourceUri: this.mrModelRepoConfig.MODEL_DEFAULT_CONTAINER,
          repositoryName: this.mrModelRepoConfig.ECR_MODEL_REPOSITORY,
          removalPolicy: this.removalPolicy,
          vpc: props.osmlVpc.vpc,
          vpcSubnets: props.osmlVpc.selectedSubnets
        }
      );
      this.modelContainerImage =
        this.modelContainerEcrDeployment.containerImage;
      this.modelContainerUri = this.modelContainerEcrDeployment.ecrContainerUri;
    }
  }
}
