/*
 * Copyright 2023 Amazon.com, Inc. or its affiliates.
 */

import { RemovalPolicy } from "aws-cdk-lib";
import { IRepository } from "aws-cdk-lib/aws-ecr";
import { ContainerImage, EcrImage } from "aws-cdk-lib/aws-ecs";
import { DockerImageName, ECRDeployment } from "cdk-ecr-deployment";
import { Construct } from "constructs";

import { OSMLRepository } from "./osml_repository";

export interface OSMLECRContainerProps {
  // URI to image to build into an ECR container
  sourceUri: string;
  // the repository to deploy the container image into
  repositoryName: string;
  // removal policy for repository
  removalPolicy: RemovalPolicy;
  // tag to use when deploying the container
  tag?: string;
}

export class OSMLECRDeployment extends Construct {
  public ecrDeployment: ECRDeployment;
  public ecrRepository: IRepository;
  public ecrImage: EcrImage;
  public ecrContainerUri: string;
  public containerImage: ContainerImage;
  public tag: string;

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
    if (props.tag) {
      this.tag = props.tag;
    } else {
      this.tag = "latest";
    }

    // build an ECR repo for the model runner container
    this.ecrRepository = new OSMLRepository(this, `ECRRepository${id}`, {
      repositoryName: props.repositoryName,
      removalPolicy: props.removalPolicy
    }).repository;

    // get the latest image associated with the repository
    this.ecrImage = new EcrImage(this.ecrRepository, this.tag);

    // copy from cdk docker image asset to the given repository
    this.ecrDeployment = new ECRDeployment(this, `ECRDeploy${id}`, {
      src: new DockerImageName(props.sourceUri),
      dest: new DockerImageName(this.ecrImage.imageName)
    });

    // build a container image object to vend
    this.containerImage = ContainerImage.fromEcrRepository(
      this.ecrRepository,
      this.tag
    );

    // set the tag for the latest uri
    this.ecrContainerUri = this.ecrRepository.repositoryUriForTag(this.tag);
  }
}
