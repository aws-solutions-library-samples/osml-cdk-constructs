import { RemovalPolicy } from "aws-cdk-lib";
import { Bucket, IBucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
export interface OSMLBucketProps {
    bucketName: string;
    prodLike: boolean;
    removalPolicy: RemovalPolicy;
    accessLogsBucket?: IBucket;
}
export declare class OSMLBucket extends Construct {
    bucket: Bucket;
    accessLogsBucket: IBucket;
    /**
     * Creates an OSML Bucket and Access Logging Bucket.
     * @param scope the scope/stack in which to define this construct.
     * @param id the id of this construct within the current scope.
     * @param props the properties of this construct.
     * @returns the OSMLBucket construct.
     */
    constructor(scope: Construct, id: string, props: OSMLBucketProps);
}
