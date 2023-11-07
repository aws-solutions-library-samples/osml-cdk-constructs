/*
 * Copyright 2023 Amazon.com, Inc. or its affiliates.
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
 * Configuration class for MRImagery Construct.
 */
export class MRImageryConfig {
  /**
   * Creates an instance of MRImageryConfig.
   * @param {string} S3_IMAGE_BUCKET - The name of the S3 bucket where images will be stored.
   * @param {string} S3_TEST_IMAGES_PATH - The local path to the test imager to deploy.
   */
  constructor(
    public S3_IMAGE_BUCKET: string = "test-images",
    public S3_TEST_IMAGES_PATH: string = "assets/images"
  ) {}
}

/**
 * Represents the properties for configuring the MRImagery Construct.
 *
 * @interface MRImageryProps
 * @property {OSMLAccount} account - The OSML account to use.
 * @property {IVpc} vpc - The Model Runner VPC configuration.
 * @property {MRImageryConfig|undefined} [mrImageryConfig] - Optional configuration for MR Imagery.
 * @property {string|undefined} [securityGroupId] - Optional security group ID to apply to the VPC config for SM endpoints.
 */
export interface MRImageryProps {
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
   * Optional custom configuration for MRImagery.
   *
   * @type {MRImageryConfig|undefined}
   */
  mrImageryConfig?: MRImageryConfig;

  /**
   * Optional security group ID to apply to the VPC config for SM endpoints.
   *
   * @type {string|undefined}
   */
  securityGroupId?: string;
}

/**
 * Represents an MRImagery construct for managing MR (Machine Recognition) imagery resources.
 */
export class MRImagery extends Construct {
  /**
   * The image bucket where MR imagery data is stored.
   */
  public imageBucket: OSMLBucket;

  /**
   * The removal policy for this MRImagery resource.
   * @default RemovalPolicy.DESTROY
   */
  public removalPolicy: RemovalPolicy;

  /**
   * Configuration options for MRImagery.
   */
  public mrImageryConfig: MRImageryConfig;

  /**
   * Creates an MRImagery cdk construct.
   * @param scope The scope/stack in which to define this construct.
   * @param id The id of this construct within the current scope.
   * @param props The properties of this construct.
   */
  constructor(scope: Construct, id: string, props: MRImageryProps) {
    super(scope, id);

    // Check if a custom configuration was provided
    if (props.mrImageryConfig != undefined) {
      // Import existing MR configuration
      this.mrImageryConfig = props.mrImageryConfig;
    } else {
      // Create a new default configuration
      this.mrImageryConfig = new MRImageryConfig();
    }

    // Setup a removal policy based on the 'prodLike' property
    this.removalPolicy = props.account.prodLike
      ? RemovalPolicy.RETAIN
      : RemovalPolicy.DESTROY;

    // Create an image bucket to store MR imagery data
    this.imageBucket = new OSMLBucket(this, `OSMLTestImageBucket`, {
      bucketName: `${this.mrImageryConfig.S3_IMAGE_BUCKET}-${props.account.id}`,
      prodLike: props.account.prodLike,
      removalPolicy: this.removalPolicy
    });

    // Deploy test images into the bucket
    new BucketDeployment(this, "OSMLTestImageDeployment", {
      sources: [Source.asset(this.mrImageryConfig.S3_TEST_IMAGES_PATH)],
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
