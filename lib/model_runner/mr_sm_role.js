"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MRSMRole = void 0;
/*
 * Copyright 2023 Amazon.com, Inc. or its affiliates.
 */
const aws_iam_1 = require("aws-cdk-lib/aws-iam");
const constructs_1 = require("constructs");
class MRSMRole extends constructs_1.Construct {
    /**
     * Creates a SageMaker execution role for hosting CV models at SM endpoint.
     * @param scope the scope/stack in which to define this construct.
     * @param id the id of this construct within the current scope.
     * @param props the properties of this construct.
     * @returns the MRSMRole construct.
     */
    constructor(scope, id, props) {
        super(scope, id);
        // sage maker execution role for hosting CV model at SM endpoint
        this.role = new aws_iam_1.Role(this, "MRSageMakerExecutionRole", {
            roleName: props.roleName,
            assumedBy: new aws_iam_1.ServicePrincipal("sagemaker.amazonaws.com"),
            managedPolicies: [
                aws_iam_1.ManagedPolicy.fromAwsManagedPolicyName("AmazonSQSFullAccess"),
                aws_iam_1.ManagedPolicy.fromAwsManagedPolicyName("AmazonS3FullAccess"),
                aws_iam_1.ManagedPolicy.fromAwsManagedPolicyName("AmazonDynamoDBFullAccess"),
                aws_iam_1.ManagedPolicy.fromAwsManagedPolicyName("AmazonSageMakerFullAccess"),
                aws_iam_1.ManagedPolicy.fromAwsManagedPolicyName("CloudWatchFullAccess"),
                aws_iam_1.ManagedPolicy.fromAwsManagedPolicyName("SecretsManagerReadWrite"),
                aws_iam_1.ManagedPolicy.fromAwsManagedPolicyName("AmazonElasticContainerRegistryPublicFullAccess")
            ],
            description: "Allows SageMaker to access necessary AWS services (S3, SQS, DynamoDB, ...)"
        });
    }
}
exports.MRSMRole = MRSMRole;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXJfc21fcm9sZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1yX3NtX3JvbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUE7O0dBRUc7QUFDSCxpREFBNEU7QUFDNUUsMkNBQXVDO0FBV3ZDLE1BQWEsUUFBUyxTQUFRLHNCQUFTO0lBR3JDOzs7Ozs7T0FNRztJQUNILFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBb0I7UUFDNUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNqQixnRUFBZ0U7UUFDaEUsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLGNBQUksQ0FBQyxJQUFJLEVBQUUsMEJBQTBCLEVBQUU7WUFDckQsUUFBUSxFQUFFLEtBQUssQ0FBQyxRQUFRO1lBQ3hCLFNBQVMsRUFBRSxJQUFJLDBCQUFnQixDQUFDLHlCQUF5QixDQUFDO1lBQzFELGVBQWUsRUFBRTtnQkFDZix1QkFBYSxDQUFDLHdCQUF3QixDQUFDLHFCQUFxQixDQUFDO2dCQUM3RCx1QkFBYSxDQUFDLHdCQUF3QixDQUFDLG9CQUFvQixDQUFDO2dCQUM1RCx1QkFBYSxDQUFDLHdCQUF3QixDQUFDLDBCQUEwQixDQUFDO2dCQUNsRSx1QkFBYSxDQUFDLHdCQUF3QixDQUFDLDJCQUEyQixDQUFDO2dCQUNuRSx1QkFBYSxDQUFDLHdCQUF3QixDQUFDLHNCQUFzQixDQUFDO2dCQUM5RCx1QkFBYSxDQUFDLHdCQUF3QixDQUFDLHlCQUF5QixDQUFDO2dCQUNqRSx1QkFBYSxDQUFDLHdCQUF3QixDQUNwQyxnREFBZ0QsQ0FDakQ7YUFDRjtZQUNELFdBQVcsRUFDVCw0RUFBNEU7U0FDL0UsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBL0JELDRCQStCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgMjAyMyBBbWF6b24uY29tLCBJbmMuIG9yIGl0cyBhZmZpbGlhdGVzLlxuICovXG5pbXBvcnQgeyBNYW5hZ2VkUG9saWN5LCBSb2xlLCBTZXJ2aWNlUHJpbmNpcGFsIH0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1pYW1cIjtcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XG5cbmltcG9ydCB7IE9TTUxBY2NvdW50IH0gZnJvbSBcIi4uL29zbWwvb3NtbF9hY2NvdW50XCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTVJTTVJvbGVQcm9wcyB7XG4gIC8vIHRoZSBvc21sIGFjY291bnQgaW50ZXJmYWNlXG4gIGFjY291bnQ6IE9TTUxBY2NvdW50O1xuICAvLyB0aGUgbmFtZSB0byBnaXZlIHRoZSByb2xlXG4gIHJvbGVOYW1lOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBNUlNNUm9sZSBleHRlbmRzIENvbnN0cnVjdCB7XG4gIHB1YmxpYyByb2xlOiBSb2xlO1xuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgU2FnZU1ha2VyIGV4ZWN1dGlvbiByb2xlIGZvciBob3N0aW5nIENWIG1vZGVscyBhdCBTTSBlbmRwb2ludC5cbiAgICogQHBhcmFtIHNjb3BlIHRoZSBzY29wZS9zdGFjayBpbiB3aGljaCB0byBkZWZpbmUgdGhpcyBjb25zdHJ1Y3QuXG4gICAqIEBwYXJhbSBpZCB0aGUgaWQgb2YgdGhpcyBjb25zdHJ1Y3Qgd2l0aGluIHRoZSBjdXJyZW50IHNjb3BlLlxuICAgKiBAcGFyYW0gcHJvcHMgdGhlIHByb3BlcnRpZXMgb2YgdGhpcyBjb25zdHJ1Y3QuXG4gICAqIEByZXR1cm5zIHRoZSBNUlNNUm9sZSBjb25zdHJ1Y3QuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogTVJTTVJvbGVQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG4gICAgLy8gc2FnZSBtYWtlciBleGVjdXRpb24gcm9sZSBmb3IgaG9zdGluZyBDViBtb2RlbCBhdCBTTSBlbmRwb2ludFxuICAgIHRoaXMucm9sZSA9IG5ldyBSb2xlKHRoaXMsIFwiTVJTYWdlTWFrZXJFeGVjdXRpb25Sb2xlXCIsIHtcbiAgICAgIHJvbGVOYW1lOiBwcm9wcy5yb2xlTmFtZSxcbiAgICAgIGFzc3VtZWRCeTogbmV3IFNlcnZpY2VQcmluY2lwYWwoXCJzYWdlbWFrZXIuYW1hem9uYXdzLmNvbVwiKSxcbiAgICAgIG1hbmFnZWRQb2xpY2llczogW1xuICAgICAgICBNYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZShcIkFtYXpvblNRU0Z1bGxBY2Nlc3NcIiksXG4gICAgICAgIE1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKFwiQW1hem9uUzNGdWxsQWNjZXNzXCIpLFxuICAgICAgICBNYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZShcIkFtYXpvbkR5bmFtb0RCRnVsbEFjY2Vzc1wiKSxcbiAgICAgICAgTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoXCJBbWF6b25TYWdlTWFrZXJGdWxsQWNjZXNzXCIpLFxuICAgICAgICBNYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZShcIkNsb3VkV2F0Y2hGdWxsQWNjZXNzXCIpLFxuICAgICAgICBNYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZShcIlNlY3JldHNNYW5hZ2VyUmVhZFdyaXRlXCIpLFxuICAgICAgICBNYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZShcbiAgICAgICAgICBcIkFtYXpvbkVsYXN0aWNDb250YWluZXJSZWdpc3RyeVB1YmxpY0Z1bGxBY2Nlc3NcIlxuICAgICAgICApXG4gICAgICBdLFxuICAgICAgZGVzY3JpcHRpb246XG4gICAgICAgIFwiQWxsb3dzIFNhZ2VNYWtlciB0byBhY2Nlc3MgbmVjZXNzYXJ5IEFXUyBzZXJ2aWNlcyAoUzMsIFNRUywgRHluYW1vREIsIC4uLilcIlxuICAgIH0pO1xuICB9XG59XG4iXX0=