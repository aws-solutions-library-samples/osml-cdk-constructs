/*
 * Copyright 2023 Amazon.com, Inc. or its affiliates.
 */

import { RemovalPolicy } from "aws-cdk-lib";
import { Stream, StreamMode } from "aws-cdk-lib/aws-kinesis";
import { Construct } from "constructs";

import { OSMLAccount } from "../../osml_account";
import { OSMLBucket } from "../../osml_bucket";

// mutable configuration dataclass for the model runner testing Construct
// for a more detailed breakdown of the configuration see: configuration_guide.md in the documentation directory.
export class MRSyncConfig {
  constructor(
    // bucket names
    public S3_RESULTS_BUCKET = "test-results",
    public KINESIS_RESULTS_STREAM = "test-stream"
  ) {}
}

export interface MRSyncProps {
  // the osml account interface
  account: OSMLAccount;
  // optional custom configuration for the testing resources - will be defaulted if not provided
  mrSyncConfig?: MRSyncConfig;
  // deploy results s3 bucket
  deploySyncBucket?: boolean;
  // deploy results kinesis stream
  deploySyncStream?: boolean;
  // security groups to apply to the vpc config for SM endpoints
  securityGroupId?: string;
}

export class MRSync extends Construct {
  public resultsBucket: OSMLBucket;
  public resultStream: Stream;
  public removalPolicy: RemovalPolicy;
  public mrSyncConfig: MRSyncConfig;

  /**
   * Creates an MRTesting construct.
   * @param scope the scope/stack in which to define this construct.
   * @param id the id of this construct within the current scope.
   * @param props the properties of this construct.
   * @returns the MRTesting construct.
   */
  constructor(scope: Construct, id: string, props: MRSyncProps) {
    super(scope, id);

    // check if a custom config was provided
    if (props.mrSyncConfig != undefined) {
      // import existing pass in MR configuration
      this.mrSyncConfig = props.mrSyncConfig;
    } else {
      // create a new default configuration
      this.mrSyncConfig = new MRSyncConfig();
    }

    // setup a removal policy
    this.removalPolicy = props.account.prodLike
      ? RemovalPolicy.RETAIN
      : RemovalPolicy.DESTROY;

    if (props.deploySyncBucket != false) {
      // create a bucket to store results in
      this.resultsBucket = new OSMLBucket(this, `OSMLTestResultsBucket`, {
        bucketName: `${this.mrSyncConfig.S3_RESULTS_BUCKET}-${props.account.id}`,
        prodLike: props.account.prodLike,
        removalPolicy: this.removalPolicy
      });
    }

    if (props.deploySyncStream != false) {
      // create a kinesis stream to store results in
      this.resultStream = new Stream(this, "OSMLTestResultsStream", {
        streamName: `${this.mrSyncConfig.KINESIS_RESULTS_STREAM}-${props.account.id}`,
        streamMode: StreamMode.PROVISIONED,
        shardCount: 1
      });
    }
  }
}
