/*
 * Copyright 2023-2024 Amazon.com, Inc. or its affiliates.
 */

import { RemovalPolicy } from "aws-cdk-lib";
import {
  BlockPublicAccess,
  Bucket,
  BucketAccessControl,
  BucketEncryption,
  IBucket,
  ObjectOwnership
} from "aws-cdk-lib/aws-s3";
import { NagSuppressions } from "cdk-nag/lib/nag-suppressions";
import { S3BucketReplicationEnabled } from "cdk-nag/lib/rules/s3";
import { Construct } from "constructs";

/**
 * Represents the properties required to configure the OSMLBucket Construct.
 *
 * @interface OSMLBucketProps
 */
export interface OSMLBucketProps {
  /**
   * The name of the OSML bucket.
   *
   * @type {string}
   */
  bucketName: string;

  /**
   * Indicates whether the OSML bucket should be configured for production-like usage.
   *
   * @type {boolean}
   */
  prodLike: boolean;

  /**
   * The removal policy to apply to the OSML bucket when it is deleted or removed from the stack.
   * This defines how the bucket and its contents should be handled.
   *
   * @type {RemovalPolicy}
   */
  removalPolicy: RemovalPolicy;

  /**
   * (Optional) The access logs bucket where access logs for the OSML bucket should be stored.
   * If not provided, access logs may not be enabled or stored separately.
   *
   * @type {IBucket | undefined}
   */
  accessLogsBucket?: IBucket;
}

/**
 * Represents an OSML (Object Storage with Access Logging) Bucket construct.
 */
export class OSMLBucket extends Construct {
  /**
   * The core bucket for storing objects.
   */
  public bucket: Bucket;

  /**
   * An optional access logging bucket for storing access logs.
   */
  public accessLogsBucket?: IBucket;

  /**
   * Creates an OSML Bucket and optionally an Access Logging Bucket.
   * @param {Construct} scope - The scope/stack in which to define this construct.
   * @param {string} id - The id of this construct within the current scope.
   * @param {OSMLBucketProps} props - The properties of this construct.
   * @returns OSMLBucket - The OSMLBucket construct.
   */
  constructor(scope: Construct, id: string, props: OSMLBucketProps) {
    super(scope, id);

    // Set up shared properties for our bucket and access logging bucket
    const bucketProps = {
      autoDeleteObjects: !props.prodLike,
      enforceSSL: true,
      encryption: BucketEncryption.KMS_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: props.removalPolicy,
      objectOwnership: ObjectOwnership.OBJECT_WRITER
    };

    // Check if an access logging bucket is provided or needs to be created
    if (props.accessLogsBucket === undefined && props.prodLike) {
      // Create an accessing logging bucket for the core bucket
      this.accessLogsBucket = new Bucket(
        this,
        `${id}AccessLogs`,
        Object.assign(bucketProps, {
          bucketName: `${props.bucketName}-access-logs`,
          accessControl: BucketAccessControl.LOG_DELIVERY_WRITE,
          versioned: props.prodLike
        })
      );
    } else if (props.prodLike) {
      // Import the existing access logging bucket
      this.accessLogsBucket = props.accessLogsBucket;
    }

    // Create the core bucket with optional access logging
    this.bucket = new Bucket(
      this,
      id,
      Object.assign(bucketProps, {
        bucketName: props.bucketName,
        versioned: props.prodLike,
        accessControl: BucketAccessControl.BUCKET_OWNER_FULL_CONTROL,
        serverAccessLogsBucket: this.accessLogsBucket
      })
    );

    NagSuppressions.addResourceSuppressions(
      this,
      [
        {
          id: "NIST.800.53.R5-S3BucketReplicationEnabled",
          reason:
            "This rule is to Manage capacity, bandwidth, or other redundancy to limit the effects of information flooding denial-of-service attacks. This is not a requirement in ADC Regions."
        }
      ],
      true
    );
  }
}
