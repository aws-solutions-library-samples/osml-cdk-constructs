/*
 * Copyright 2023 Amazon.com, Inc. or its affiliates.
 */

import { ITopic } from "aws-cdk-lib/aws-sns";
import { SqsSubscription } from "aws-cdk-lib/aws-sns-subscriptions";
import { Construct } from "constructs";

import { OSMLAccount } from "../../osml_account";
import { OSMLQueue } from "../../osml_queue";

// mutable configuration dataclass for the model runner testing Construct
// for a more detailed breakdown of the configuration see: configuration_guide.md in the documentation directory.
export class MRStatusConfig {
  constructor(
    // queue names
    public SQS_IMAGE_STATUS_QUEUE = "ImageStatusQueue",
    public SQS_REGION_STATUS_QUEUE = "RegionStatusQueue"
  ) {}
}

export interface MRStatusProps {
  // the osml account interface
  account: OSMLAccount;
  imageStatusTopic: ITopic;
  regionStatusTopic: ITopic;
  // optional custom configuration for the testing resources - will be defaulted if not provided
  mrStatusConfig?: MRStatusConfig;
}

export class MRStatus extends Construct {
  public imageStatusQueue: OSMLQueue;
  public regionStatusQueue: OSMLQueue;
  public mrStatusConfig: MRStatusConfig;

  /**
   * Creates an MRTesting construct.
   * @param scope the scope/stack in which to define this construct.
   * @param id the id of this construct within the current scope.
   * @param props the properties of this construct.
   * @returns the MRTesting construct.
   */
  constructor(scope: Construct, id: string, props: MRStatusProps) {
    super(scope, id);

    // check if a custom config was provided
    if (props.mrStatusConfig != undefined) {
      // import existing pass in MR configuration
      this.mrStatusConfig = props.mrStatusConfig;
    } else {
      // create a new default configuration
      this.mrStatusConfig = new MRStatusConfig();
    }

    // create an SQS queue for region status processing updates
    this.regionStatusQueue = new OSMLQueue(this, "OSMLRegionStatusQueue", {
      queueName: this.mrStatusConfig.SQS_REGION_STATUS_QUEUE
    });

    // subscribe the region status topic to the queue
    props.regionStatusTopic.addSubscription(
      new SqsSubscription(this.regionStatusQueue.queue)
    );

    // create an SQS queue for image processing status updates
    this.imageStatusQueue = new OSMLQueue(this, "OSMLImageStatusQueue", {
      queueName: this.mrStatusConfig.SQS_IMAGE_STATUS_QUEUE
    });

    // subscribe the image status topic to the queue
    props.imageStatusTopic.addSubscription(
      new SqsSubscription(this.imageStatusQueue.queue)
    );
  }
}
