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

// mutable configuration dataclass for the model runner testing Construct
// for a more detailed breakdown of the configuration see: configuration_guide.md in the documentation directory.
export class MRImageryConfig {
  constructor(
    // bucket names
    public S3_RESULTS_BUCKET = "test-results",
    public S3_IMAGE_BUCKET = "test-images",
    // path to test images
    public S3_TEST_IMAGES_PATH = "assets/images"
  ) {}
}

export interface MRImageryProps {
  // the osml account interface
  account: OSMLAccount;
  // the model runner vpc
  vpc: IVpc;
  mrImageryConfig?: MRImageryConfig;

  // security groups to apply to the vpc config for SM endpoints
  securityGroupId?: string;
}

export class MRImagery extends Construct {
  public imageBucket: OSMLBucket;
  public removalPolicy: RemovalPolicy;
  public mrImageryConfig: MRImageryConfig;

  /**
   * Creates an MRTesting construct.
   * @param scope the scope/stack in which to define this construct.
   * @param id the id of this construct within the current scope.
   * @param props the properties of this construct.
   * @returns the MRTesting construct.
   */
  constructor(scope: Construct, id: string, props: MRImageryProps) {
    super(scope, id);

    // check if a custom config was provided
    if (props.mrImageryConfig != undefined) {
      // import existing pass in MR configuration
      this.mrImageryConfig = props.mrImageryConfig;
    } else {
      // create a new default configuration
      this.mrImageryConfig = new MRImageryConfig();
    }

    // setup a removal policy
    this.removalPolicy = props.account.prodLike
      ? RemovalPolicy.RETAIN
      : RemovalPolicy.DESTROY;

    // bucket to store images in
    this.imageBucket = new OSMLBucket(this, `OSMLTestImageBucket`, {
      bucketName: `${this.mrImageryConfig.S3_IMAGE_BUCKET}-${props.account.id}`,
      prodLike: props.account.prodLike,
      removalPolicy: this.removalPolicy
    });

    // deploy test images into bucket
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
