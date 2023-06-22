"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OSMLBucket = void 0;
const aws_s3_1 = require("aws-cdk-lib/aws-s3");
const constructs_1 = require("constructs");
class OSMLBucket extends constructs_1.Construct {
    /**
     * Creates an OSML Bucket and Access Logging Bucket.
     * @param scope the scope/stack in which to define this construct.
     * @param id the id of this construct within the current scope.
     * @param props the properties of this construct.
     * @returns the OSMLBucket construct.
     */
    constructor(scope, id, props) {
        super(scope, id);
        // set up shared properties for our bucket and access logging bucket
        const bucketProps = {
            autoDeleteObjects: !props.prodLike,
            enforceSSL: true,
            encryption: aws_s3_1.BucketEncryption.S3_MANAGED,
            blockPublicAccess: aws_s3_1.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: props.removalPolicy,
            objectOwnership: aws_s3_1.ObjectOwnership.OBJECT_WRITER
        };
        // check if an access logging bucket is provided
        if (props.accessLogsBucket == undefined) {
            // create an accessing logging bucket for the core bucket
            this.accessLogsBucket = new aws_s3_1.Bucket(this, `${id}AccessLogs`, Object.assign(bucketProps, {
                bucketName: `${props.bucketName}-access-logs`,
                accessControl: aws_s3_1.BucketAccessControl.LOG_DELIVERY_WRITE
            }));
        }
        else {
            // import the existing access logging bucket
            this.accessLogsBucket = props.accessLogsBucket;
        }
        // create the bucket and w/ access logging bucket
        this.bucket = new aws_s3_1.Bucket(this, id, Object.assign(bucketProps, {
            bucketName: props.bucketName,
            versioned: true,
            accessControl: aws_s3_1.BucketAccessControl.BUCKET_OWNER_FULL_CONTROL,
            serverAccessLogsBucket: this.accessLogsBucket
        }));
    }
}
exports.OSMLBucket = OSMLBucket;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3NtbF9idWNrZXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJvc21sX2J1Y2tldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSwrQ0FPNEI7QUFDNUIsMkNBQXVDO0FBU3ZDLE1BQWEsVUFBVyxTQUFRLHNCQUFTO0lBSXZDOzs7Ozs7T0FNRztJQUNILFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBc0I7UUFDOUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNqQixvRUFBb0U7UUFDcEUsTUFBTSxXQUFXLEdBQUc7WUFDbEIsaUJBQWlCLEVBQUUsQ0FBQyxLQUFLLENBQUMsUUFBUTtZQUNsQyxVQUFVLEVBQUUsSUFBSTtZQUNoQixVQUFVLEVBQUUseUJBQWdCLENBQUMsVUFBVTtZQUN2QyxpQkFBaUIsRUFBRSwwQkFBaUIsQ0FBQyxTQUFTO1lBQzlDLGFBQWEsRUFBRSxLQUFLLENBQUMsYUFBYTtZQUNsQyxlQUFlLEVBQUUsd0JBQWUsQ0FBQyxhQUFhO1NBQy9DLENBQUM7UUFFRixnREFBZ0Q7UUFDaEQsSUFBSSxLQUFLLENBQUMsZ0JBQWdCLElBQUksU0FBUyxFQUFFO1lBQ3ZDLHlEQUF5RDtZQUN6RCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxlQUFNLENBQ2hDLElBQUksRUFDSixHQUFHLEVBQUUsWUFBWSxFQUNqQixNQUFNLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRTtnQkFDekIsVUFBVSxFQUFFLEdBQUcsS0FBSyxDQUFDLFVBQVUsY0FBYztnQkFDN0MsYUFBYSxFQUFFLDRCQUFtQixDQUFDLGtCQUFrQjthQUN0RCxDQUFDLENBQ0gsQ0FBQztTQUNIO2FBQU07WUFDTCw0Q0FBNEM7WUFDNUMsSUFBSSxDQUFDLGdCQUFnQixHQUFHLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQztTQUNoRDtRQUVELGlEQUFpRDtRQUNqRCxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksZUFBTSxDQUN0QixJQUFJLEVBQ0osRUFBRSxFQUNGLE1BQU0sQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFO1lBQ3pCLFVBQVUsRUFBRSxLQUFLLENBQUMsVUFBVTtZQUM1QixTQUFTLEVBQUUsSUFBSTtZQUNmLGFBQWEsRUFBRSw0QkFBbUIsQ0FBQyx5QkFBeUI7WUFDNUQsc0JBQXNCLEVBQUUsSUFBSSxDQUFDLGdCQUFnQjtTQUM5QyxDQUFDLENBQ0gsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQW5ERCxnQ0FtREMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBSZW1vdmFsUG9saWN5IH0gZnJvbSBcImF3cy1jZGstbGliXCI7XG5pbXBvcnQge1xuICBCbG9ja1B1YmxpY0FjY2VzcyxcbiAgQnVja2V0LFxuICBCdWNrZXRBY2Nlc3NDb250cm9sLFxuICBCdWNrZXRFbmNyeXB0aW9uLFxuICBJQnVja2V0LFxuICBPYmplY3RPd25lcnNoaXBcbn0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1zM1wiO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSBcImNvbnN0cnVjdHNcIjtcblxuZXhwb3J0IGludGVyZmFjZSBPU01MQnVja2V0UHJvcHMge1xuICBidWNrZXROYW1lOiBzdHJpbmc7XG4gIHByb2RMaWtlOiBib29sZWFuO1xuICByZW1vdmFsUG9saWN5OiBSZW1vdmFsUG9saWN5O1xuICBhY2Nlc3NMb2dzQnVja2V0PzogSUJ1Y2tldDtcbn1cblxuZXhwb3J0IGNsYXNzIE9TTUxCdWNrZXQgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICBwdWJsaWMgYnVja2V0OiBCdWNrZXQ7XG4gIHB1YmxpYyBhY2Nlc3NMb2dzQnVja2V0OiBJQnVja2V0O1xuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGFuIE9TTUwgQnVja2V0IGFuZCBBY2Nlc3MgTG9nZ2luZyBCdWNrZXQuXG4gICAqIEBwYXJhbSBzY29wZSB0aGUgc2NvcGUvc3RhY2sgaW4gd2hpY2ggdG8gZGVmaW5lIHRoaXMgY29uc3RydWN0LlxuICAgKiBAcGFyYW0gaWQgdGhlIGlkIG9mIHRoaXMgY29uc3RydWN0IHdpdGhpbiB0aGUgY3VycmVudCBzY29wZS5cbiAgICogQHBhcmFtIHByb3BzIHRoZSBwcm9wZXJ0aWVzIG9mIHRoaXMgY29uc3RydWN0LlxuICAgKiBAcmV0dXJucyB0aGUgT1NNTEJ1Y2tldCBjb25zdHJ1Y3QuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogT1NNTEJ1Y2tldFByb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcbiAgICAvLyBzZXQgdXAgc2hhcmVkIHByb3BlcnRpZXMgZm9yIG91ciBidWNrZXQgYW5kIGFjY2VzcyBsb2dnaW5nIGJ1Y2tldFxuICAgIGNvbnN0IGJ1Y2tldFByb3BzID0ge1xuICAgICAgYXV0b0RlbGV0ZU9iamVjdHM6ICFwcm9wcy5wcm9kTGlrZSxcbiAgICAgIGVuZm9yY2VTU0w6IHRydWUsXG4gICAgICBlbmNyeXB0aW9uOiBCdWNrZXRFbmNyeXB0aW9uLlMzX01BTkFHRUQsXG4gICAgICBibG9ja1B1YmxpY0FjY2VzczogQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxuICAgICAgcmVtb3ZhbFBvbGljeTogcHJvcHMucmVtb3ZhbFBvbGljeSxcbiAgICAgIG9iamVjdE93bmVyc2hpcDogT2JqZWN0T3duZXJzaGlwLk9CSkVDVF9XUklURVJcbiAgICB9O1xuXG4gICAgLy8gY2hlY2sgaWYgYW4gYWNjZXNzIGxvZ2dpbmcgYnVja2V0IGlzIHByb3ZpZGVkXG4gICAgaWYgKHByb3BzLmFjY2Vzc0xvZ3NCdWNrZXQgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBjcmVhdGUgYW4gYWNjZXNzaW5nIGxvZ2dpbmcgYnVja2V0IGZvciB0aGUgY29yZSBidWNrZXRcbiAgICAgIHRoaXMuYWNjZXNzTG9nc0J1Y2tldCA9IG5ldyBCdWNrZXQoXG4gICAgICAgIHRoaXMsXG4gICAgICAgIGAke2lkfUFjY2Vzc0xvZ3NgLFxuICAgICAgICBPYmplY3QuYXNzaWduKGJ1Y2tldFByb3BzLCB7XG4gICAgICAgICAgYnVja2V0TmFtZTogYCR7cHJvcHMuYnVja2V0TmFtZX0tYWNjZXNzLWxvZ3NgLFxuICAgICAgICAgIGFjY2Vzc0NvbnRyb2w6IEJ1Y2tldEFjY2Vzc0NvbnRyb2wuTE9HX0RFTElWRVJZX1dSSVRFXG4gICAgICAgIH0pXG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBpbXBvcnQgdGhlIGV4aXN0aW5nIGFjY2VzcyBsb2dnaW5nIGJ1Y2tldFxuICAgICAgdGhpcy5hY2Nlc3NMb2dzQnVja2V0ID0gcHJvcHMuYWNjZXNzTG9nc0J1Y2tldDtcbiAgICB9XG5cbiAgICAvLyBjcmVhdGUgdGhlIGJ1Y2tldCBhbmQgdy8gYWNjZXNzIGxvZ2dpbmcgYnVja2V0XG4gICAgdGhpcy5idWNrZXQgPSBuZXcgQnVja2V0KFxuICAgICAgdGhpcyxcbiAgICAgIGlkLFxuICAgICAgT2JqZWN0LmFzc2lnbihidWNrZXRQcm9wcywge1xuICAgICAgICBidWNrZXROYW1lOiBwcm9wcy5idWNrZXROYW1lLFxuICAgICAgICB2ZXJzaW9uZWQ6IHRydWUsXG4gICAgICAgIGFjY2Vzc0NvbnRyb2w6IEJ1Y2tldEFjY2Vzc0NvbnRyb2wuQlVDS0VUX09XTkVSX0ZVTExfQ09OVFJPTCxcbiAgICAgICAgc2VydmVyQWNjZXNzTG9nc0J1Y2tldDogdGhpcy5hY2Nlc3NMb2dzQnVja2V0XG4gICAgICB9KVxuICAgICk7XG4gIH1cbn1cbiJdfQ==