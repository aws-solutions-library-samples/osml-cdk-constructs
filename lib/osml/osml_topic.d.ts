import { Key } from "aws-cdk-lib/aws-kms";
import { Topic } from "aws-cdk-lib/aws-sns";
import { Construct } from "constructs";
export interface OSMLTopicProps {
    topicName: string;
}
export declare class OSMLTopic extends Construct {
    topic: Topic;
    key: Key;
    /**
     * Creates an OSML Topic.
     * @param scope the scope/stack in which to define this construct.
     * @param id the id of this construct within the current scope.
     * @param props the properties of this construct.
     * @returns the OSMLTopic construct.
     */
    constructor(scope: Construct, id: string, props: OSMLTopicProps);
}
