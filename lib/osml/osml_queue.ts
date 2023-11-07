/*
 * Copyright 2023 Amazon.com, Inc. or its affiliates.
 */

import { Duration } from "aws-cdk-lib";
import { Queue, QueueEncryption } from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";

/**
 * Represents the properties required to define an OSMLQueue Construct.
 *
 * @interface OSMLQueueProps
 */
export interface OSMLQueueProps {
  /**
   * The name to give the queue.
   *
   * @type {string}
   */
  queueName: string;

  /**
   * The maximum number of times a message can be received (default is unlimited).
   * If set, the message will be moved to the dead-letter queue after reaching
   * this maximum receive count.
   *
   * @type {number}
   * @default undefined (unlimited)
   */
  maxReceiveCount?: number;

  /**
   * The dead-letter queue (DLQ) associated with this queue.
   * Messages that fail to be processed can be moved to the DLQ.
   *
   * @type {Queue}
   * @default undefined (no DLQ)
   */
  dlQueue?: Queue;
}

/**
 * Represents an OSML (OversightML) Queue and its associated Dead Letter Queue (DLQ).
 */
export class OSMLQueue extends Construct {
  /**
   * The primary queue used for storing messages.
   */
  public queue: Queue;

  /**
   * The Dead Letter Queue (DLQ) associated with the primary queue.
   */
  public dlQueue: Queue;

  /**
   * Creates an instance of OSMLQueue.
   * @param {Construct} scope - The scope or stack in which to define this construct.
   * @param {string} id - The ID of this construct within the current scope.
   * @param {OSMLQueueProps} props - The properties of this construct.
   * @returns OSMLQueue - The OSMLQueue construct.
   */
  constructor(scope: Construct, id: string, props: OSMLQueueProps) {
    super(scope, id);

    // Initialize the Dead Letter Queue (DLQ)
    if (props.dlQueue) {
      // If a DLQueue is provided, use it
      this.dlQueue = props.dlQueue;
    } else {
      // Otherwise, create a new DLQ
      this.dlQueue = new Queue(this, `${id}DLQ`, {
        queueName: `${props.queueName}DLQ`,
        retentionPeriod: Duration.days(1),
        encryption: QueueEncryption.SQS_MANAGED
      });
    }

    // Build the primary queue
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
