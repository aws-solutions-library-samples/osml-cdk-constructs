/*
 * Copyright 2023 Amazon.com, Inc. or its affiliates.
 */

import { SymlinkFollowMode } from "aws-cdk-lib";
import { Repository } from "aws-cdk-lib/aws-ecr";
import { DockerImageAsset } from "aws-cdk-lib/aws-ecr-assets";
import { ContainerImage, EcrImage } from "aws-cdk-lib/aws-ecs";
import { DockerImageName, ECRDeployment } from "cdk-ecr-deployment";
import { Construct } from "constructs";

export interface OSMLECRContainerProps {
  // the directory containing the docker image asset to deploy w/ Dockerfile present
  directory: string;
  // the stage/target of the Dockerbuild file
  target: string;
  // custom docker image asset to build
  imageAsset?: DockerImageAsset;
  // the repository to deploy the container image into
  repository?: Repository;
  buildArgs?: {
    [key: string]: string;
  };
}

export class OSMLECRContainer extends Construct {
  public repository: Repository;
  public imageAsset: DockerImageAsset;
  public containerImage: ContainerImage;
  public ecrDeployment: ECRDeployment;

  /**
   * Create a new OSMLECRContainer. This construct takes a local directory and copies it to a docker image asset
   * and deploys it to an ECR repository with the "latest" tag if a repository is provided.
   * @param scope the scope/stack in which to define this construct.
   * @param id the id of this construct within the current scope.
   * @param props the properties of this construct.
   * @returns the OSMLECRContainer construct.
   */
  constructor(scope: Construct, id: string, props: OSMLECRContainerProps) {
    super(scope, id);

    // if a custom image asset was provided
    if (props.imageAsset) {
      this.imageAsset = props.imageAsset;
    } else {
      // build the docker image assets
      this.imageAsset = new DockerImageAsset(this, id, {
        directory: props.directory,
        followSymlinks: SymlinkFollowMode.ALWAYS,
        target: props.target,
        buildArgs: props.buildArgs
      });
    }

    // build the image for the model runner container to put in fargate
    this.containerImage = ContainerImage.fromDockerImageAsset(this.imageAsset);

    // if a repository is provided, copy container asset to it
    if (props.repository) {
      this.repository = props.repository;

      // copy from cdk docker image asset to the given repository
      this.ecrDeployment = new ECRDeployment(this, `ECRDeploy${id}`, {
        src: new DockerImageName(this.imageAsset.imageUri),
        dest: new DockerImageName(
          new EcrImage(this.repository, "latest").imageName
        )
      });
    }
  }
}
