/*
 * Copyright 2023 Amazon.com, Inc. or its affiliates.
 */

import { Key } from "aws-cdk-lib/aws-kms";
import { Topic } from "aws-cdk-lib/aws-sns";
import { Construct } from "constructs";

export interface OSMLTopicProps {
  // the name of the topic to create
  topicName: string;
}

export class OSMLTopic extends Construct {
  public topic: Topic;
  public key: Key;

  /**
   * Creates an OSML Topic.
   * @param scope the scope/stack in which to define this construct.
   * @param id the id of this construct within the current scope.
   * @param props the properties of this construct.
   * @returns the OSMLTopic construct.
   */
  constructor(scope: Construct, id: string, props: OSMLTopicProps) {
    super(scope, id);

    // create KMS key for topic encryption
    this.key = new Key(this, `${props.topicName}Key`, {
      enableKeyRotation: true,
      alias: `${props.topicName}Key`
    });

    // build the topic and add the key to it
    this.topic = new Topic(this, id, {
      topicName: props.topicName,
      masterKey: this.key
    });
  }
}
