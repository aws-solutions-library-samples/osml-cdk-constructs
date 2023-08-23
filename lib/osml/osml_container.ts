/*
 * Copyright 2023 Amazon.com, Inc. or its affiliates.
 */

import { Repository } from "aws-cdk-lib/aws-ecr";
import { ContainerImage, EcrImage } from "aws-cdk-lib/aws-ecs";
import { DockerImageName, ECRDeployment } from "cdk-ecr-deployment";
import { Construct } from "constructs";

export interface OSMLECRContainerProps {
  // URI to image to build into an ECR container
  sourceUri: string;
  // the repository to deploy the container image into
  repository: Repository;
}

export class OSMLECRContainer extends Construct {
  public ecrDeployment: ECRDeployment;
  public imageUri: string;
  public containerImage: ContainerImage;

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
    // store the container image into the construct for vending
    this.containerImage = ContainerImage.fromRegistry(props.sourceUri);

    // copy from cdk docker image asset to the given repository
    this.ecrDeployment = new ECRDeployment(this, `ECRDeploy${id}`, {
      src: new DockerImageName(props.sourceUri),
      dest: new DockerImageName(
        new EcrImage(props.repository, "latest").imageName
      )
    });
    // set the image URI to the latest repository image
    this.imageUri = props.repository.repositoryUriForTag("latest");
  }
}
