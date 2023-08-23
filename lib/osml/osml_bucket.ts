import { RemovalPolicy } from "aws-cdk-lib";
import {
  BlockPublicAccess,
  Bucket,
  BucketAccessControl,
  BucketEncryption,
  IBucket,
  ObjectOwnership
} from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export interface OSMLBucketProps {
  bucketName: string;
  prodLike: boolean;
  removalPolicy: RemovalPolicy;
  accessLogsBucket?: IBucket;
}

export class OSMLBucket extends Construct {
  public bucket: Bucket;
  public accessLogsBucket?: IBucket;

  /**
   * Creates an OSML Bucket and Access Logging Bucket.
   * @param scope the scope/stack in which to define this construct.
   * @param id the id of this construct within the current scope.
   * @param props the properties of this construct.
   * @returns the OSMLBucket construct.
   */
  constructor(scope: Construct, id: string, props: OSMLBucketProps) {
    super(scope, id);
    // set up shared properties for our bucket and access logging bucket
    const bucketProps = {
      autoDeleteObjects: !props.prodLike,
      enforceSSL: true,
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: props.removalPolicy,
      objectOwnership: ObjectOwnership.OBJECT_WRITER
    };

    // check if an access logging bucket is provided
    if (props.accessLogsBucket == undefined && props.prodLike) {
      // create an accessing logging bucket for the core bucket
      this.accessLogsBucket = new Bucket(
        this,
        `${id}AccessLogs`,
        Object.assign(bucketProps, {
          bucketName: `${props.bucketName}-access-logs`,
          accessControl: BucketAccessControl.LOG_DELIVERY_WRITE
        })
      );
    } else if (props.prodLike) {
      // import the existing access logging bucket
      this.accessLogsBucket = props.accessLogsBucket;
    }

    // create the bucket and w/ access logging bucket
    this.bucket = new Bucket(
      this,
      id,
      Object.assign(bucketProps, {
        bucketName: props.bucketName,
        versioned: props.prodLike,
        accessControl: BucketAccessControl.BUCKET_OWNER_FULL_CONTROL,
        serverAccessLogsBucket: this.accessLogsBucket
      })
    );
  }
}
