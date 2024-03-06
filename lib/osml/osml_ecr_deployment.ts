/*
 * Copyright 2023-2024 Amazon.com, Inc. or its affiliates.
 */

import { RemovalPolicy } from "aws-cdk-lib";
import { IVpc, SubnetSelection } from "aws-cdk-lib/aws-ec2";
import { Repository } from "aws-cdk-lib/aws-ecr";
import { ContainerImage, EcrImage } from "aws-cdk-lib/aws-ecs";
import { DockerImageName, ECRDeployment } from "cdk-ecr-deployment";
import { Construct } from "constructs";

import { OSMLRepository } from "./osml_repository";

/**
 * Interface representing the properties for the OSMLECRDeployment Construct.
 *
 * @interface OSMLECRDeploymentProps
 */
export interface OSMLECRDeploymentProps {
  /**
   * The URI of the source for the container image.
   *
   * @type {string}
   */
  sourceUri: string;

  /**
   * The name of the repository where the container image is stored.
   *
   * @type {string}
   */
  repositoryName: string;

  /**
   * The removal policy for the container. Specifies what happens when the resource is deleted.
   *
   * @type {RemovalPolicy}
   */
  removalPolicy: RemovalPolicy;

  /**
   * An optional VPC (Virtual Private Cloud) configuration for the container.
   *
   * @type {IVpc | undefined}
   */
  vpc?: IVpc;

  /**
   * An optional selection of VPC subnets for the container deployment.
   *
   * @type {SubnetSelection | undefined}
   */
  vpcSubnets?: SubnetSelection;

  /**
   * An optional tag for identifying the container.
   *
   * @type {string | undefined}
   */
  tag?: string;
}

/**
 * Represents an AWS CDK construct for deploying a Docker container to Amazon Elastic Container Registry (ECR).
 */
export class OSMLECRDeployment extends Construct {
  public tag: string;
  public ecrRepository: Repository;
  public ecrImage: EcrImage;
  public ecrDeployment: ECRDeployment;
  public containerImage: EcrImage;
  public ecrContainerUri: string;
  /**
   * Creates a new OSMLECRDeployment construct.
   * This construct takes a docker repositories and copies it to a Docker image asset
   * and deploys it to an ECR repository with the specified tag if a repository is provided.
   *
   * @param {Construct} scope - The scope/stack in which to define this construct.
   * @param {string} id - The ID of this construct within the current scope.
   * @param {OSMLECRDeploymentProps} props - The properties of this construct.
   * @returns OSMLECRDeployment The OSMLECRDeployment construct.
   */
  constructor(scope: Construct, id: string, props: OSMLECRDeploymentProps) {
    super(scope, id);

    // Check if a tag is provided, otherwise set it to "latest".
    this.tag = props.tag ? props.tag : "latest";

    // Build an ECR repository for the model runner container.
    this.ecrRepository = new OSMLRepository(this, `ECRRepository${id}`, {
      repositoryName: props.repositoryName,
      removalPolicy: props.removalPolicy
    }).repository;

    // Get the latest image associated with the repository.
    this.ecrImage = new EcrImage(this.ecrRepository, this.tag);

    // Copy from CDK Docker image asset to the given repository.
    this.ecrDeployment = new ECRDeployment(this, `ECRDeploy${id}`, {
      src: new DockerImageName(props.sourceUri),
      dest: new DockerImageName(this.ecrImage.imageName),
      memoryLimit: 10240,
      vpc: props.vpc,
      vpcSubnets: props.vpcSubnets
    });

    // Build a container image object to vend.
    this.containerImage = ContainerImage.fromEcrRepository(
      this.ecrRepository,
      this.tag
    );

    // Set the tag for the latest URI.
    this.ecrContainerUri = this.ecrRepository.repositoryUriForTag(this.tag);
  }
}
