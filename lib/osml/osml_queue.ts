/*
 * Copyright 2023 Amazon.com, Inc. or its affiliates.
 */

import { Duration } from "aws-cdk-lib";
import { Queue, QueueEncryption } from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";

export interface OSMLQueueProps {
  // the name of the queue to create
  queueName: string;
  // the maximum number of times a message can be received before being discarded.
  maxReceiveCount?: number;
  // the DLQ to use for this queue. If not provided, one will be created.
  dlQueue?: Queue;
}

export class OSMLQueue extends Construct {
  public queue: Queue;
  public dlQueue: Queue;

  /**
   * Creates an OSML Queue and Dead Letter Queue.
   * @param scope the scope/stack in which to define this construct.
   * @param id the id of this construct within the current scope.
   * @param props the properties of this construct.
   * @returns the OSMLQueue construct.
   */
  constructor(scope: Construct, id: string, props: OSMLQueueProps) {
    super(scope, id);
    // if user passed in a DLQueue to use
    if (props.dlQueue) {
      this.dlQueue = props.dlQueue;
    } else {
      // else make one
      this.dlQueue = new Queue(this, `${id}DLQ`, {
        queueName: `${props.queueName}DLQ`,
        retentionPeriod: Duration.days(1),
        encryption: QueueEncryption.SQS_MANAGED
      });
    }

    // build the target queue
    this.queue = new Queue(this, id, {
      queueName: props.queueName,
      visibilityTimeout: Duration.minutes(30),
      deadLetterQueue: {
        maxReceiveCount: props.maxReceiveCount || 1,
        queue: this.dlQueue
      },
      encryption: QueueEncryption.SQS_MANAGED
    });
  }
}
