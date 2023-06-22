import { Queue } from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
export interface OSMLQueueProps {
    queueName: string;
    maxReceiveCount?: number;
    dlQueue?: Queue;
}
export declare class OSMLQueue extends Construct {
    queue: Queue;
    dlQueue: Queue;
    /**
     * Creates an OSML Queue and Dead Letter Queue.
     * @param scope the scope/stack in which to define this construct.
     * @param id the id of this construct within the current scope.
     * @param props the properties of this construct.
     * @returns the OSMLQueue construct.
     */
    constructor(scope: Construct, id: string, props: OSMLQueueProps);
}
