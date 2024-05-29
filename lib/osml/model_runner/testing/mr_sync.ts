/*
 * Copyright 2023-2024 Amazon.com, Inc. or its affiliates.
 */

import { RemovalPolicy } from "aws-cdk-lib";
import {
  CfnStream,
  Stream,
  StreamEncryption,
  StreamMode
} from "aws-cdk-lib/aws-kinesis";
import { Construct } from "constructs";

import { OSMLAccount } from "../../osml_account";
import { OSMLBucket } from "../../osml_bucket";

/**
 * Represents a configuration class for the MRSync Construct.
 */
export class MRSyncConfig {
  /**
   * Creates an instance of MRSyncConfig.
   * @param {string} S3_RESULTS_BUCKET - The name of the S3 bucket for storing results. Default is "mr-test-results".
   * @param {string} KINESIS_RESULTS_STREAM - The name of the Kinesis stream for publishing results. Default is "mr-test-stream".
   */
  constructor(
    public S3_RESULTS_BUCKET: string = "mr-test-results",
    public KINESIS_RESULTS_STREAM: string = "mr-test-stream"
  ) {}
}

/**
 * Interface for configuring the MRSync Construct.
 * @interface MRSyncProps
 */
export interface MRSyncProps {
  /**
   * The OSML deployment account.
   * @type {OSMLAccount}
   */
  account: OSMLAccount;

  /**
   * Optional custom configuration for testing resources. Will be defaulted if not provided.
   * @type {MRSyncConfig | undefined}
   */
  mrSyncConfig?: MRSyncConfig;

  /**
   * Whether to deploy results to an S3 bucket.
   * @type {boolean | undefined}
   */
  deploySyncBucket?: boolean;

  /**
   * Whether to deploy results to a Kinesis stream.
   * @type {boolean | undefined}
   */
  deploySyncStream?: boolean;

  /**
   * The security group ID(s) to apply to the VPC configuration for SM endpoints.
   * @type {string | undefined}
   */
  securityGroupId?: string;
}

/**
 * Represents an MRSync construct for managing MapReduce synchronization.
 */
export class MRSync extends Construct {
  /**
   * The bucket used to store MRSync results.
   */
  public resultsBucket: OSMLBucket;

  /**
   * The Kinesis stream used to store MRSync results.
   */
  public resultStream: Stream;

  /**
   * The removal policy for the MRSync construct.
   */
  public removalPolicy: RemovalPolicy;

  /**
   * The configuration for MRSync.
   */
  public mrSyncConfig: MRSyncConfig;

  /**
   * Creates an MRSync construct.
   * @param {Construct} scope - The scope/stack in which to define this construct.
   * @param {string} id - The ID of this construct within the current scope.
   * @param {MRSyncProps} props - The properties of this construct.
   */
  constructor(scope: Construct, id: string, props: MRSyncProps) {
    super(scope, id);

    // Check if a custom config was provided
    if (props.mrSyncConfig != undefined) {
      // Import existing MR configuration
      this.mrSyncConfig = props.mrSyncConfig;
    } else {
      // Create a new default configuration
      this.mrSyncConfig = new MRSyncConfig();
    }

    // Set up a removal policy based on whether it's a production-like environment
    this.removalPolicy = props.account.prodLike
      ? RemovalPolicy.RETAIN
      : RemovalPolicy.DESTROY;

    // Create a bucket to store results if deploySyncBucket is not explicitly set to false
    if (props.deploySyncBucket !== false) {
      this.resultsBucket = new OSMLBucket(this, `OSMLTestResultsBucket`, {
        bucketName: `${this.mrSyncConfig.S3_RESULTS_BUCKET}-${props.account.id}`,
        prodLike: props.account.prodLike,
        removalPolicy: this.removalPolicy
      });
    }

    // Create a Kinesis stream to store results if deploySyncStream is not explicitly set to false
    if (props.deploySyncStream !== false) {
      this.resultStream = new Stream(this, "OSMLTestResultsStream", {
        streamName: `${this.mrSyncConfig.KINESIS_RESULTS_STREAM}-${props.account.id}`,
        streamMode: StreamMode.PROVISIONED,
        shardCount: 1,
        encryption: StreamEncryption.MANAGED
      });

      // https://github.com/aws/aws-cdk/issues/19652
      if (props.account.isAdc) {
        const cfnStream = this.resultStream.node.defaultChild as CfnStream;
        cfnStream.addPropertyDeletionOverride("StreamModeDetails");
      }
    }
  }
}
