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

import { OSMLAccount } from "./osml_account";
import { OSMLBucket } from "./osml_bucket";
import { BaseConfig, ConfigType } from "./utils/base_config";

/**
 * Configuration class for OSMLTestImagery Construct.
 */
export class OSMLTestImageryConfig extends BaseConfig {
  /**
   * The name of the S3 bucket where images will be stored.
   * @default "osml-test-images"
   */
  public S3_IMAGE_BUCKET_PREFIX: string;

  /**
   * The local path to the test images to deploy.
   * @default "assets/images/"
   */
  public S3_TEST_IMAGES_PATH: string;

  /**
   * Creates an instance of OSMLTestImageryConfig.
   * @param config - The configuration object for OSMLTestImagery.
   */
  constructor(config: ConfigType = {}) {
    super({
      S3_IMAGE_BUCKET_PREFIX: "osml-test-images",
      S3_TEST_IMAGES_PATH: "assets/images/",
      ...config
    });
  }
}

/**
 * Represents the properties for configuring the OSMLTestImagery Construct.
 *
 * @interface OSMLTestImageryProps
 * @property {OSMLAccount} account - The OSML account to use.
 * @property {IVpc} vpc - The Model Runner VPC configuration.
 * @property {OSMLTestImageryConfig|undefined} [config] - Optional custom resource configuration.
 * @property {string|undefined} [securityGroupId] - Optional security group ID to apply to the VPC config for SM endpoints.
 */
export interface OSMLTestImageryProps {
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
   * Optional custom configuration for OSMLTestImagery.
   *
   * @type {OSMLTestImageryConfig|undefined}
   */
  config?: OSMLTestImageryConfig;

  /**
   * Optional security group ID to apply to the VPC config for SM endpoints.
   *
   * @type {string|undefined}
   */
  securityGroupId?: string;
}

/**
 * Represents an OSMLTestImagery construct for managing test imagery resources.
 */
export class OSMLTestImagery extends Construct {
  /**
   * The image bucket where OSML imagery data is stored.
   */
  public imageBucket: OSMLBucket;

  /**
   * The removal policy for this resource.
   * @default RemovalPolicy.DESTROY
   */
  public removalPolicy: RemovalPolicy;

  /**
   * Configuration options for MRImagery.
   */
  public config: OSMLTestImageryConfig;

  /**
   * Creates an OSMLTestImagery cdk construct.
   * @param scope The scope/stack in which to define this construct.
   * @param id The id of this construct within the current scope.
   * @param props The properties of this construct.
   */
  constructor(scope: Construct, id: string, props: OSMLTestImageryProps) {
    super(scope, id);

    // Check if a custom configuration was provided
    if (props.config != undefined) {
      this.config = props.config;
    } else {
      // Create a new default configuration
      this.config = new OSMLTestImageryConfig();
    }

    // Set up a removal policy based on the 'prodLike' property
    this.removalPolicy = props.account.prodLike
      ? RemovalPolicy.RETAIN
      : RemovalPolicy.DESTROY;

    // Create an image bucket to store OSML test imagery
    this.imageBucket = new OSMLBucket(this, `OSMLTestImageBucket`, {
      bucketName: `${this.config.S3_IMAGE_BUCKET_PREFIX}-${props.account.id}`,
      prodLike: props.account.prodLike,
      removalPolicy: this.removalPolicy
    });

    // Deploy test images into the bucket
    new BucketDeployment(this, "OSMLTestImageDeployment", {
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
