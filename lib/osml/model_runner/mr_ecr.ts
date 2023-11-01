/*
 * Copyright 2023 Amazon.com, Inc. or its affiliates.
 */

import { RemovalPolicy, SymlinkFollowMode } from "aws-cdk-lib";
import { DockerImageAsset } from "aws-cdk-lib/aws-ecr-assets";
import { ContainerImage } from "aws-cdk-lib/aws-ecs";
import { IRole } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

import { OSMLAccount } from "../osml_account";
import { OSMLECRDeployment } from "../osml_ecr_deployment";
import { OSMLVpc } from "../osml_vpc";

// mutable configuration dataclass for model runner
// for a more detailed breakdown of the configuration see: configuration_guide.md in the documentation directory.
export class MRRepoConfig {
  constructor(
    public MR_DEFAULT_CONTAINER = "awsosml/osml-model-runner:main",
    // repository name for the model runner container
    public ECR_MODEL_RUNNER_REPOSITORY = "model-runner-container",
    // path to the local source for model runner to build against
    public ECR_MODEL_RUNNER_BUILD_PATH = "lib/osml-model-runner",
    // build target for model runner container
    public ECR_MODEL_RUNNER_TARGET = "model_runner"
  ) {}
}

export interface MRRepoProps {
  // the account that owns the data plane as defined by the OSMLAccount interface
  account: OSMLAccount;
  // the vpc to deploy into
  osmlVpc: OSMLVpc;
  // optional role to give the model runner task execution permissions - will be crated if not provided
  taskRole?: IRole;
  // optional service level configuration that can be provided by the user but will be defaulted if not
  mrRepoConfig?: MRRepoConfig;
}

export class MREcr extends Construct {
  public mrRepoConfig: MRRepoConfig;
  public removalPolicy: RemovalPolicy;
  public mrContainerSourceUri: string;
  public mrContainerImage: ContainerImage;

  /**
   * This construct is responsible deploying the ECR container image for
   * the model runner service.
   * @param scope the scope/stack in which to define this construct.
   * @param id the id of this construct within the current scope.
   * @param props the properties of this construct.
   * @returns the MRDataplane construct
   */
  constructor(scope: Construct, id: string, props: MRRepoProps) {
    super(scope, id);
    // setup a removal policy
    this.removalPolicy = props.account.prodLike
      ? RemovalPolicy.RETAIN
      : RemovalPolicy.DESTROY;

    // check if a custom configuration was provided
    if (props.mrRepoConfig != undefined) {
      // import existing pass in MR configuration
      this.mrRepoConfig = props.mrRepoConfig;
    } else {
      // create a new default configuration
      this.mrRepoConfig = new MRRepoConfig();
    }

    if (props.account.isDev == true) {
      const dockerImageAsset = new DockerImageAsset(this, id, {
        directory: this.mrRepoConfig.ECR_MODEL_RUNNER_BUILD_PATH,
        file: "Dockerfile",
        followSymlinks: SymlinkFollowMode.ALWAYS,
        target: this.mrRepoConfig.ECR_MODEL_RUNNER_TARGET
      });
      this.mrContainerImage =
        ContainerImage.fromDockerImageAsset(dockerImageAsset);
      this.mrContainerSourceUri = dockerImageAsset.imageUri;
    } else {
      const osmlEcrDeployment = new OSMLECRDeployment(
        this,
        "MRModelRunnerContainer",
        {
          sourceUri: this.mrRepoConfig.MR_DEFAULT_CONTAINER,
          repositoryName: this.mrRepoConfig.ECR_MODEL_RUNNER_REPOSITORY,
          removalPolicy: this.removalPolicy,
          vpc: props.osmlVpc.vpc
        }
      );
      this.mrContainerImage = osmlEcrDeployment.containerImage;
      this.mrContainerSourceUri = osmlEcrDeployment.ecrContainerUri;
    }
  }
}
