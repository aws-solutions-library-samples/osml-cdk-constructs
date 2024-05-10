/*
 * Copyright 2023-2024 Amazon.com, Inc. or its affiliates.
 */

import { RemovalPolicy } from "aws-cdk-lib";
import { IVpc } from "aws-cdk-lib/aws-ec2";
import { BucketAccessControl } from "aws-cdk-lib/aws-s3";
import {
  BucketDeployment,
  ServerSideEncryption,
  Source
} from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";

import { OSMLAccount } from "../../osml_account";
import { OSMLBucket } from "../../osml_bucket";

/**
 * Configuration class for DIImagery Construct.
 */
export class DIImageryConfig {
  /**
   * Creates an instance of DIImageryConfig.
   * @param {string} S3_IMAGE_BUCKET - The name of the S3 bucket where images will be stored.
   * @param {string} S3_TEST_IMAGES_PATH - The local path to the test imager to deploy.
   */
  constructor(
    public S3_IMAGE_BUCKET: string = "di-test-images",
    public S3_TEST_IMAGES_PATH: string = "assets/images/data-intake"
  ) {}
}

/**
 * Represents the properties for configuring the DIImagery Construct.
 *
 * @interface DIImageryProps
 * @property {OSMLAccount} account - The OSML account to use.
 * @property {IVpc} vpc - The Model Runner VPC configuration.
 * @property {DIImageryConfig|undefined} [config] - Optional configuration for DIImagery.
 * @property {string|undefined} [securityGroupId] - Optional security group ID to apply to the VPC config for SM endpoints.
 */
export interface DIImageryProps {
  /**
   * The OSML account to use.
   *
   * @type {OSMLAccount}
   */
  account: OSMLAccount;

  /**
   * The target vpc for the s3 bucket deployment.
   *
   * @type {IVpc}
   */
  vpc: IVpc;

  /**
   * Optional custom configuration for DIImagery.
   *
   * @type {DIImageryConfig|undefined}
   */
  config?: DIImageryConfig;

  /**
   * Optional security group ID to apply to the VPC config for SM endpoints.
   *
   * @type {string|undefined}
   */
  securityGroupId?: string;
}

/**
 * Represents a DIImagery construct for managing data intake imagery resources.
 */
export class DIImagery extends Construct {
  /**
   * The image bucket where Data Intake imagery data is stored.
   */
  public imageBucket: OSMLBucket;

  /**
   * The removal policy for this DIImagery resource.
   * @default RemovalPolicy.DESTROY
   */
  public removalPolicy: RemovalPolicy;

  /**
   * Configuration options for DIImagery.
   */
  public config: DIImageryConfig;

  /**
   * Creates a DIImagery cdk construct.
   * @param scope The scope/stack in which to define this construct.
   * @param id The id of this construct within the current scope.
   * @param props The properties of this construct.
   */
  constructor(scope: Construct, id: string, props: DIImageryProps) {
    super(scope, id);

    // Check if a custom configuration was provided
    if (props.config != undefined) {
      // Import existing DIImagery configuration
      this.config = props.config;
    } else {
      // Create a new default configuration
      this.config = new DIImageryConfig();
    }

    // Set up a removal policy based on the 'prodLike' property
    this.removalPolicy = props.account.prodLike
      ? RemovalPolicy.RETAIN
      : RemovalPolicy.DESTROY;

    // Create an image bucket to store Data Intake imagery data
    this.imageBucket = new OSMLBucket(this, `DITestImageBucket`, {
      bucketName: `${this.config.S3_IMAGE_BUCKET}-${props.account.id}`,
      prodLike: props.account.prodLike,
      removalPolicy: this.removalPolicy
    });

    // Deploy test images into the bucket
    new BucketDeployment(this, "DITestImageDeployment", {
      sources: [Source.asset(this.config.S3_TEST_IMAGES_PATH)],
      destinationBucket: this.imageBucket.bucket,
      accessControl: BucketAccessControl.BUCKET_OWNER_FULL_CONTROL,
      memoryLimit: 10240,
      useEfs: true,
      vpc: props.vpc,
      retainOnDelete: props.account.prodLike,
      serverSideEncryption: ServerSideEncryption.AES_256
    });
  }
}
