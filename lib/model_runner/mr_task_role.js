"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MRTaskRole = void 0;
/*
 * Copyright 2023 Amazon.com, Inc. or its affiliates.
 */
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_iam_1 = require("aws-cdk-lib/aws-iam");
const constructs_1 = require("constructs");
class MRTaskRole extends constructs_1.Construct {
    /**
     * Creates an MRTaskRole construct.
     * @param scope the scope/stack in which to define this construct.
     * @param id the id of this construct within the current scope.
     * @param props the properties of this construct.
     * @returns the MRTaskRole construct.
     */
    constructor(scope, id, props) {
        super(scope, id);
        this.partition = aws_cdk_lib_1.region_info.Fact.find(props.account.region, aws_cdk_lib_1.region_info.FactName.PARTITION);
        // model runner Fargate ECS task role
        this.role = new aws_iam_1.Role(this, "MRTaskRole", {
            roleName: props.roleName,
            assumedBy: new aws_iam_1.CompositePrincipal(new aws_iam_1.ServicePrincipal("ecs-tasks.amazonaws.com"), new aws_iam_1.ServicePrincipal("lambda.amazonaws.com")),
            managedPolicies: [
                aws_iam_1.ManagedPolicy.fromAwsManagedPolicyName("AmazonSQSFullAccess"),
                aws_iam_1.ManagedPolicy.fromAwsManagedPolicyName("AmazonS3FullAccess"),
                aws_iam_1.ManagedPolicy.fromAwsManagedPolicyName("AmazonDynamoDBFullAccess"),
                aws_iam_1.ManagedPolicy.fromAwsManagedPolicyName("AmazonSageMakerFullAccess"),
                aws_iam_1.ManagedPolicy.fromAwsManagedPolicyName("CloudWatchFullAccess"),
                aws_iam_1.ManagedPolicy.fromAwsManagedPolicyName("SecretsManagerReadWrite"),
                aws_iam_1.ManagedPolicy.fromAwsManagedPolicyName("AmazonElasticContainerRegistryPublicFullAccess")
            ],
            description: "Allows the Oversight Model Runner to access necessary AWS services (S3, SQS, DynamoDB, ...)"
        });
        // needs the ability to assume roles to read from/write to remote account S3 buckets,
        // kinesis streams, and invoke SM endpoints
        this.role.addToPolicy(new aws_iam_1.PolicyStatement({
            effect: aws_iam_1.Effect.ALLOW,
            actions: ["sts:AssumeRole"],
            resources: ["*"]
        }));
        // kms permissions
        this.role.addToPolicy(new aws_iam_1.PolicyStatement({
            effect: aws_iam_1.Effect.ALLOW,
            actions: ["kms:Decrypt", "kms:GenerateDataKey", "kms:Encrypt"],
            resources: [
                `arn:${this.partition}:kms:${props.account.region}:${props.account.id}:key/*`
            ]
        }));
        // api permissions
        this.role.addToPolicy(new aws_iam_1.PolicyStatement({
            actions: ["oversightml:*"],
            resources: ["*"],
            effect: aws_iam_1.Effect.ALLOW
        }));
        // events permissions
        this.role.addToPolicy(new aws_iam_1.PolicyStatement({
            actions: ["events:PutRule", "events:PutTargets", "events:DescribeRule"],
            resources: [
                `arn:${this.partition}:events:${props.account.region}:${props.account.id}:*`
            ],
            effect: aws_iam_1.Effect.ALLOW
        }));
        // kinesis permissions
        this.role.addToPolicy(new aws_iam_1.PolicyStatement({
            effect: aws_iam_1.Effect.ALLOW,
            actions: ["kinesis:PutRecord", "kinesis:PutRecords"],
            resources: [
                `arn:${this.partition}:kinesis:${props.account.region}:${props.account.id}:stream/*`
            ]
        }));
        // need to describe ec2 instance types in order to perform max in-progress
        // region calculations
        this.role.addToPolicy(new aws_iam_1.PolicyStatement({
            effect: aws_iam_1.Effect.ALLOW,
            actions: ["ec2:DescribeInstanceTypes"],
            resources: ["*"]
        }));
    }
}
exports.MRTaskRole = MRTaskRole;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXJfdGFza19yb2xlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibXJfdGFza19yb2xlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBOztHQUVHO0FBQ0gsNkNBQTBDO0FBQzFDLGlEQU82QjtBQUM3QiwyQ0FBdUM7QUFXdkMsTUFBYSxVQUFXLFNBQVEsc0JBQVM7SUFJdkM7Ozs7OztPQU1HO0lBQ0gsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2pCLElBQUksQ0FBQyxTQUFTLEdBQUcseUJBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUNwQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFDcEIseUJBQVcsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUM5QixDQUFDO1FBRUgscUNBQXFDO1FBQ3JDLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxjQUFJLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRTtZQUN2QyxRQUFRLEVBQUUsS0FBSyxDQUFDLFFBQVE7WUFDeEIsU0FBUyxFQUFFLElBQUksNEJBQWtCLENBQy9CLElBQUksMEJBQWdCLENBQUMseUJBQXlCLENBQUMsRUFDL0MsSUFBSSwwQkFBZ0IsQ0FBQyxzQkFBc0IsQ0FBQyxDQUM3QztZQUNELGVBQWUsRUFBRTtnQkFDZix1QkFBYSxDQUFDLHdCQUF3QixDQUFDLHFCQUFxQixDQUFDO2dCQUM3RCx1QkFBYSxDQUFDLHdCQUF3QixDQUFDLG9CQUFvQixDQUFDO2dCQUM1RCx1QkFBYSxDQUFDLHdCQUF3QixDQUFDLDBCQUEwQixDQUFDO2dCQUNsRSx1QkFBYSxDQUFDLHdCQUF3QixDQUFDLDJCQUEyQixDQUFDO2dCQUNuRSx1QkFBYSxDQUFDLHdCQUF3QixDQUFDLHNCQUFzQixDQUFDO2dCQUM5RCx1QkFBYSxDQUFDLHdCQUF3QixDQUFDLHlCQUF5QixDQUFDO2dCQUNqRSx1QkFBYSxDQUFDLHdCQUF3QixDQUNwQyxnREFBZ0QsQ0FDakQ7YUFDRjtZQUNELFdBQVcsRUFDVCw2RkFBNkY7U0FDaEcsQ0FBQyxDQUFDO1FBRUgscUZBQXFGO1FBQ3JGLDJDQUEyQztRQUMzQyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FDbkIsSUFBSSx5QkFBZSxDQUFDO1lBQ2xCLE1BQU0sRUFBRSxnQkFBTSxDQUFDLEtBQUs7WUFDcEIsT0FBTyxFQUFFLENBQUMsZ0JBQWdCLENBQUM7WUFDM0IsU0FBUyxFQUFFLENBQUMsR0FBRyxDQUFDO1NBQ2pCLENBQUMsQ0FDSCxDQUFDO1FBRUYsa0JBQWtCO1FBQ2xCLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUNuQixJQUFJLHlCQUFlLENBQUM7WUFDbEIsTUFBTSxFQUFFLGdCQUFNLENBQUMsS0FBSztZQUNwQixPQUFPLEVBQUUsQ0FBQyxhQUFhLEVBQUUscUJBQXFCLEVBQUUsYUFBYSxDQUFDO1lBQzlELFNBQVMsRUFBRTtnQkFDVCxPQUFPLElBQUksQ0FBQyxTQUFTLFFBQVEsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxFQUFFLFFBQVE7YUFDOUU7U0FDRixDQUFDLENBQ0gsQ0FBQztRQUVGLGtCQUFrQjtRQUNsQixJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FDbkIsSUFBSSx5QkFBZSxDQUFDO1lBQ2xCLE9BQU8sRUFBRSxDQUFDLGVBQWUsQ0FBQztZQUMxQixTQUFTLEVBQUUsQ0FBQyxHQUFHLENBQUM7WUFDaEIsTUFBTSxFQUFFLGdCQUFNLENBQUMsS0FBSztTQUNyQixDQUFDLENBQ0gsQ0FBQztRQUVGLHFCQUFxQjtRQUNyQixJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FDbkIsSUFBSSx5QkFBZSxDQUFDO1lBQ2xCLE9BQU8sRUFBRSxDQUFDLGdCQUFnQixFQUFFLG1CQUFtQixFQUFFLHFCQUFxQixDQUFDO1lBQ3ZFLFNBQVMsRUFBRTtnQkFDVCxPQUFPLElBQUksQ0FBQyxTQUFTLFdBQVcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUk7YUFDN0U7WUFDRCxNQUFNLEVBQUUsZ0JBQU0sQ0FBQyxLQUFLO1NBQ3JCLENBQUMsQ0FDSCxDQUFDO1FBRUYsc0JBQXNCO1FBQ3RCLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUNuQixJQUFJLHlCQUFlLENBQUM7WUFDbEIsTUFBTSxFQUFFLGdCQUFNLENBQUMsS0FBSztZQUNwQixPQUFPLEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxvQkFBb0IsQ0FBQztZQUNwRCxTQUFTLEVBQUU7Z0JBQ1QsT0FBTyxJQUFJLENBQUMsU0FBUyxZQUFZLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsRUFBRSxXQUFXO2FBQ3JGO1NBQ0YsQ0FBQyxDQUNILENBQUM7UUFFRiwwRUFBMEU7UUFDMUUsc0JBQXNCO1FBQ3RCLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUNuQixJQUFJLHlCQUFlLENBQUM7WUFDbEIsTUFBTSxFQUFFLGdCQUFNLENBQUMsS0FBSztZQUNwQixPQUFPLEVBQUUsQ0FBQywyQkFBMkIsQ0FBQztZQUN0QyxTQUFTLEVBQUUsQ0FBQyxHQUFHLENBQUM7U0FDakIsQ0FBQyxDQUNILENBQUM7SUFDSixDQUFDO0NBQ0Y7QUF0R0QsZ0NBc0dDIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAyMDIzIEFtYXpvbi5jb20sIEluYy4gb3IgaXRzIGFmZmlsaWF0ZXMuXG4gKi9cbmltcG9ydCB7IHJlZ2lvbl9pbmZvIH0gZnJvbSBcImF3cy1jZGstbGliXCI7XG5pbXBvcnQge1xuICBDb21wb3NpdGVQcmluY2lwYWwsXG4gIEVmZmVjdCxcbiAgTWFuYWdlZFBvbGljeSxcbiAgUG9saWN5U3RhdGVtZW50LFxuICBSb2xlLFxuICBTZXJ2aWNlUHJpbmNpcGFsXG59IGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtaWFtXCI7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xuXG5pbXBvcnQgeyBPU01MQWNjb3VudCB9IGZyb20gXCIuLi9vc21sL29zbWxfYWNjb3VudFwiO1xuXG5leHBvcnQgaW50ZXJmYWNlIE1SVGFza1JvbGVQcm9wcyB7XG4gIC8vIHRoZSBvc21sIGFjY291bnQgaW50ZXJmYWNlXG4gIGFjY291bnQ6IE9TTUxBY2NvdW50O1xuICAvLyB0aGUgbmFtZSB0byBnaXZlIHRoZSByb2xlXG4gIHJvbGVOYW1lOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBNUlRhc2tSb2xlIGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgcHVibGljIHJvbGU6IFJvbGU7XG4gIHB1YmxpYyBwYXJ0aXRpb246IHN0cmluZztcblxuICAvKipcbiAgICogQ3JlYXRlcyBhbiBNUlRhc2tSb2xlIGNvbnN0cnVjdC5cbiAgICogQHBhcmFtIHNjb3BlIHRoZSBzY29wZS9zdGFjayBpbiB3aGljaCB0byBkZWZpbmUgdGhpcyBjb25zdHJ1Y3QuXG4gICAqIEBwYXJhbSBpZCB0aGUgaWQgb2YgdGhpcyBjb25zdHJ1Y3Qgd2l0aGluIHRoZSBjdXJyZW50IHNjb3BlLlxuICAgKiBAcGFyYW0gcHJvcHMgdGhlIHByb3BlcnRpZXMgb2YgdGhpcyBjb25zdHJ1Y3QuXG4gICAqIEByZXR1cm5zIHRoZSBNUlRhc2tSb2xlIGNvbnN0cnVjdC5cbiAgICovXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBNUlRhc2tSb2xlUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpO1xuICAgIHRoaXMucGFydGl0aW9uID0gcmVnaW9uX2luZm8uRmFjdC5maW5kKFxuICAgICAgcHJvcHMuYWNjb3VudC5yZWdpb24sXG4gICAgICByZWdpb25faW5mby5GYWN0TmFtZS5QQVJUSVRJT05cbiAgICApITtcblxuICAgIC8vIG1vZGVsIHJ1bm5lciBGYXJnYXRlIEVDUyB0YXNrIHJvbGVcbiAgICB0aGlzLnJvbGUgPSBuZXcgUm9sZSh0aGlzLCBcIk1SVGFza1JvbGVcIiwge1xuICAgICAgcm9sZU5hbWU6IHByb3BzLnJvbGVOYW1lLFxuICAgICAgYXNzdW1lZEJ5OiBuZXcgQ29tcG9zaXRlUHJpbmNpcGFsKFxuICAgICAgICBuZXcgU2VydmljZVByaW5jaXBhbChcImVjcy10YXNrcy5hbWF6b25hd3MuY29tXCIpLFxuICAgICAgICBuZXcgU2VydmljZVByaW5jaXBhbChcImxhbWJkYS5hbWF6b25hd3MuY29tXCIpXG4gICAgICApLFxuICAgICAgbWFuYWdlZFBvbGljaWVzOiBbXG4gICAgICAgIE1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKFwiQW1hem9uU1FTRnVsbEFjY2Vzc1wiKSxcbiAgICAgICAgTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoXCJBbWF6b25TM0Z1bGxBY2Nlc3NcIiksXG4gICAgICAgIE1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKFwiQW1hem9uRHluYW1vREJGdWxsQWNjZXNzXCIpLFxuICAgICAgICBNYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZShcIkFtYXpvblNhZ2VNYWtlckZ1bGxBY2Nlc3NcIiksXG4gICAgICAgIE1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKFwiQ2xvdWRXYXRjaEZ1bGxBY2Nlc3NcIiksXG4gICAgICAgIE1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKFwiU2VjcmV0c01hbmFnZXJSZWFkV3JpdGVcIiksXG4gICAgICAgIE1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKFxuICAgICAgICAgIFwiQW1hem9uRWxhc3RpY0NvbnRhaW5lclJlZ2lzdHJ5UHVibGljRnVsbEFjY2Vzc1wiXG4gICAgICAgIClcbiAgICAgIF0sXG4gICAgICBkZXNjcmlwdGlvbjpcbiAgICAgICAgXCJBbGxvd3MgdGhlIE92ZXJzaWdodCBNb2RlbCBSdW5uZXIgdG8gYWNjZXNzIG5lY2Vzc2FyeSBBV1Mgc2VydmljZXMgKFMzLCBTUVMsIER5bmFtb0RCLCAuLi4pXCJcbiAgICB9KTtcblxuICAgIC8vIG5lZWRzIHRoZSBhYmlsaXR5IHRvIGFzc3VtZSByb2xlcyB0byByZWFkIGZyb20vd3JpdGUgdG8gcmVtb3RlIGFjY291bnQgUzMgYnVja2V0cyxcbiAgICAvLyBraW5lc2lzIHN0cmVhbXMsIGFuZCBpbnZva2UgU00gZW5kcG9pbnRzXG4gICAgdGhpcy5yb2xlLmFkZFRvUG9saWN5KFxuICAgICAgbmV3IFBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgIGVmZmVjdDogRWZmZWN0LkFMTE9XLFxuICAgICAgICBhY3Rpb25zOiBbXCJzdHM6QXNzdW1lUm9sZVwiXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbXCIqXCJdXG4gICAgICB9KVxuICAgICk7XG5cbiAgICAvLyBrbXMgcGVybWlzc2lvbnNcbiAgICB0aGlzLnJvbGUuYWRkVG9Qb2xpY3koXG4gICAgICBuZXcgUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgZWZmZWN0OiBFZmZlY3QuQUxMT1csXG4gICAgICAgIGFjdGlvbnM6IFtcImttczpEZWNyeXB0XCIsIFwia21zOkdlbmVyYXRlRGF0YUtleVwiLCBcImttczpFbmNyeXB0XCJdLFxuICAgICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgICBgYXJuOiR7dGhpcy5wYXJ0aXRpb259Omttczoke3Byb3BzLmFjY291bnQucmVnaW9ufToke3Byb3BzLmFjY291bnQuaWR9OmtleS8qYFxuICAgICAgICBdXG4gICAgICB9KVxuICAgICk7XG5cbiAgICAvLyBhcGkgcGVybWlzc2lvbnNcbiAgICB0aGlzLnJvbGUuYWRkVG9Qb2xpY3koXG4gICAgICBuZXcgUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgYWN0aW9uczogW1wib3ZlcnNpZ2h0bWw6KlwiXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbXCIqXCJdLFxuICAgICAgICBlZmZlY3Q6IEVmZmVjdC5BTExPV1xuICAgICAgfSlcbiAgICApO1xuXG4gICAgLy8gZXZlbnRzIHBlcm1pc3Npb25zXG4gICAgdGhpcy5yb2xlLmFkZFRvUG9saWN5KFxuICAgICAgbmV3IFBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgIGFjdGlvbnM6IFtcImV2ZW50czpQdXRSdWxlXCIsIFwiZXZlbnRzOlB1dFRhcmdldHNcIiwgXCJldmVudHM6RGVzY3JpYmVSdWxlXCJdLFxuICAgICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgICBgYXJuOiR7dGhpcy5wYXJ0aXRpb259OmV2ZW50czoke3Byb3BzLmFjY291bnQucmVnaW9ufToke3Byb3BzLmFjY291bnQuaWR9OipgXG4gICAgICAgIF0sXG4gICAgICAgIGVmZmVjdDogRWZmZWN0LkFMTE9XXG4gICAgICB9KVxuICAgICk7XG5cbiAgICAvLyBraW5lc2lzIHBlcm1pc3Npb25zXG4gICAgdGhpcy5yb2xlLmFkZFRvUG9saWN5KFxuICAgICAgbmV3IFBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgIGVmZmVjdDogRWZmZWN0LkFMTE9XLFxuICAgICAgICBhY3Rpb25zOiBbXCJraW5lc2lzOlB1dFJlY29yZFwiLCBcImtpbmVzaXM6UHV0UmVjb3Jkc1wiXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbXG4gICAgICAgICAgYGFybjoke3RoaXMucGFydGl0aW9ufTpraW5lc2lzOiR7cHJvcHMuYWNjb3VudC5yZWdpb259OiR7cHJvcHMuYWNjb3VudC5pZH06c3RyZWFtLypgXG4gICAgICAgIF1cbiAgICAgIH0pXG4gICAgKTtcblxuICAgIC8vIG5lZWQgdG8gZGVzY3JpYmUgZWMyIGluc3RhbmNlIHR5cGVzIGluIG9yZGVyIHRvIHBlcmZvcm0gbWF4IGluLXByb2dyZXNzXG4gICAgLy8gcmVnaW9uIGNhbGN1bGF0aW9uc1xuICAgIHRoaXMucm9sZS5hZGRUb1BvbGljeShcbiAgICAgIG5ldyBQb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICBlZmZlY3Q6IEVmZmVjdC5BTExPVyxcbiAgICAgICAgYWN0aW9uczogW1wiZWMyOkRlc2NyaWJlSW5zdGFuY2VUeXBlc1wiXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbXCIqXCJdXG4gICAgICB9KVxuICAgICk7XG4gIH1cbn1cbiJdfQ==