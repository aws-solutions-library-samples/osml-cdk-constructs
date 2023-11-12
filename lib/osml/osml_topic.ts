/*
 * Copyright 2023 Amazon.com, Inc. or its affiliates.
 */

import { Key } from "aws-cdk-lib/aws-kms";
import { Topic } from "aws-cdk-lib/aws-sns";
import { Construct } from "constructs";

/**
 * Represents the properties for an OSML (OpenStreetMap Location) topic.
 * @interface
 */
export interface OSMLTopicProps {
  /**
   * The name to give the topic.
   * @type {string}
   */
  topicName: string;
}

/**
 * Represents an OSML (Open Source Messaging Library) Topic.
 *
 * This class provides an abstraction for creating and managing topics for secure messaging
 * using AWS Key Management Service (KMS) encryption.
 *
 * @class
 */
export class OSMLTopic extends Construct {
  public key: Key;
  public topic: Topic;
  /**
   * Creates an OSML Topic.
   *
   * @constructor
   * @param {Construct} scope - The scope/stack in which to define this construct.
   * @param {string} id - The id of this construct within the current scope.
   * @param {OSMLTopicProps} props - The properties of this construct.
   * @returns OSMLTopic - The OSMLTopic construct.
   */
  constructor(scope: Construct, id: string, props: OSMLTopicProps) {
    super(scope, id);

    // Create a KMS key for topic encryption
    this.key = new Key(this, `${props.topicName}Key`, {
      enableKeyRotation: true,
      alias: `${props.topicName}Key`
    });

    // Build the topic and add the key to it
    this.topic = new Topic(this, id, {
      topicName: props.topicName,
      masterKey: this.key
    });
  }
}
