/*
 * Copyright 2023 Amazon.com, Inc. or its affiliates.
 */

import { ITopic } from "aws-cdk-lib/aws-sns";
import { SqsSubscription } from "aws-cdk-lib/aws-sns-subscriptions";
import { Construct } from "constructs";

import { OSMLAccount } from "../../osml_account";
import { OSMLQueue } from "../../osml_queue";

/**
 * Configuration class for MRStatus Construct.
 */
export class MRStatusConfig {
  /**
   * Creates a new instance of MRStatusConfig.
   * @param {string} SQS_IMAGE_STATUS_QUEUE - The name of the SQS queue for image status.
   * @param {string} SQS_REGION_STATUS_QUEUE - The name of the SQS queue for region status.
   */
  constructor(
    public SQS_IMAGE_STATUS_QUEUE: string = "ImageStatusQueue",
    public SQS_REGION_STATUS_QUEUE: string = "RegionStatusQueue"
  ) {}
}

/**
 * Represents the properties for the MRStatus Construct.
 * @interface MRStatusProps
 */
export interface MRStatusProps {
  /**
   * The OSML deployment account.
   * @type {OSMLAccount}
   */
  account: OSMLAccount;

  /**
   * The topic for image status to subscribe to.
   * @type {ITopic}
   */
  imageStatusTopic: ITopic;

  /**
   * The topic for region status to subscribe to.
   * @type {ITopic}
   */
  regionStatusTopic: ITopic;

  /**
   * Optional custom configuration for testing resources. Will be defaulted if not provided.
   * @type {MRStatusConfig | undefined}
   */
  mrStatusConfig?: MRStatusConfig;
}

/**
 * Represents the MR Status construct.
 */
export class MRStatus extends Construct {
  /**
   * Queue for processing image status updates.
   */
  public imageStatusQueue: OSMLQueue;

  /**
   * Queue for processing region status updates.
   */
  public regionStatusQueue: OSMLQueue;

  /**
   * Configuration options for MR Status.
   */
  public mrStatusConfig: MRStatusConfig;

  /**
   * Creates an MRStatus construct.
   * @param {Construct} scope - The scope/stack in which to define this construct.
   * @param {string} id - The ID of this construct within the current scope.
   * @param {MRStatusProps} props - The properties of this construct.
   * @returns MRStatus - The MRStatus construct.
   */
  constructor(scope: Construct, id: string, props: MRStatusProps) {
    super(scope, id);

    // Check if a custom config was provided
    if (props.mrStatusConfig !== undefined) {
      // Import existing pass-in MR configuration
      this.mrStatusConfig = props.mrStatusConfig;
    } else {
      // Create a new default configuration
      this.mrStatusConfig = new MRStatusConfig();
    }

    // Create an SQS queue for region status processing updates
    this.regionStatusQueue = new OSMLQueue(this, "OSMLRegionStatusQueue", {
      queueName: this.mrStatusConfig.SQS_REGION_STATUS_QUEUE
    });

    // Subscribe the region status topic to the queue
    props.regionStatusTopic.addSubscription(
      new SqsSubscription(this.regionStatusQueue.queue)
    );

    // Create an SQS queue for image processing status updates
    this.imageStatusQueue = new OSMLQueue(this, "OSMLImageStatusQueue", {
      queueName: this.mrStatusConfig.SQS_IMAGE_STATUS_QUEUE
    });

    // Subscribe the image status topic to the queue
    props.imageStatusTopic.addSubscription(
      new SqsSubscription(this.imageStatusQueue.queue)
    );
  }
}
