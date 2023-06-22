"use strict";
/*
 * Copyright 2023 Amazon.com, Inc. or its affiliates.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OSMLQueue = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_sqs_1 = require("aws-cdk-lib/aws-sqs");
const constructs_1 = require("constructs");
class OSMLQueue extends constructs_1.Construct {
    /**
     * Creates an OSML Queue and Dead Letter Queue.
     * @param scope the scope/stack in which to define this construct.
     * @param id the id of this construct within the current scope.
     * @param props the properties of this construct.
     * @returns the OSMLQueue construct.
     */
    constructor(scope, id, props) {
        super(scope, id);
        // if user passed in a DLQueue to use
        if (props.dlQueue) {
            this.dlQueue = props.dlQueue;
        }
        else {
            // else make one
            this.dlQueue = new aws_sqs_1.Queue(this, `${id}DLQ`, {
                queueName: `${props.queueName}DLQ`,
                retentionPeriod: aws_cdk_lib_1.Duration.days(1),
                encryption: aws_sqs_1.QueueEncryption.SQS_MANAGED
            });
        }
        // build the target queue
        this.queue = new aws_sqs_1.Queue(this, id, {
            queueName: props.queueName,
            visibilityTimeout: aws_cdk_lib_1.Duration.minutes(30),
            deadLetterQueue: {
                maxReceiveCount: props.maxReceiveCount || 1,
                queue: this.dlQueue
            },
            encryption: aws_sqs_1.QueueEncryption.SQS_MANAGED
        });
    }
}
exports.OSMLQueue = OSMLQueue;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3NtbF9xdWV1ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm9zbWxfcXVldWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOztHQUVHOzs7QUFFSCw2Q0FBdUM7QUFDdkMsaURBQTZEO0FBQzdELDJDQUF1QztBQVd2QyxNQUFhLFNBQVUsU0FBUSxzQkFBUztJQUl0Qzs7Ozs7O09BTUc7SUFDSCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXFCO1FBQzdELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDakIscUNBQXFDO1FBQ3JDLElBQUksS0FBSyxDQUFDLE9BQU8sRUFBRTtZQUNqQixJQUFJLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUM7U0FDOUI7YUFBTTtZQUNMLGdCQUFnQjtZQUNoQixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksZUFBSyxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFO2dCQUN6QyxTQUFTLEVBQUUsR0FBRyxLQUFLLENBQUMsU0FBUyxLQUFLO2dCQUNsQyxlQUFlLEVBQUUsc0JBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUNqQyxVQUFVLEVBQUUseUJBQWUsQ0FBQyxXQUFXO2FBQ3hDLENBQUMsQ0FBQztTQUNKO1FBRUQseUJBQXlCO1FBQ3pCLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxlQUFLLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRTtZQUMvQixTQUFTLEVBQUUsS0FBSyxDQUFDLFNBQVM7WUFDMUIsaUJBQWlCLEVBQUUsc0JBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ3ZDLGVBQWUsRUFBRTtnQkFDZixlQUFlLEVBQUUsS0FBSyxDQUFDLGVBQWUsSUFBSSxDQUFDO2dCQUMzQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE9BQU87YUFDcEI7WUFDRCxVQUFVLEVBQUUseUJBQWUsQ0FBQyxXQUFXO1NBQ3hDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQXBDRCw4QkFvQ0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IDIwMjMgQW1hem9uLmNvbSwgSW5jLiBvciBpdHMgYWZmaWxpYXRlcy5cbiAqL1xuXG5pbXBvcnQgeyBEdXJhdGlvbiB9IGZyb20gXCJhd3MtY2RrLWxpYlwiO1xuaW1wb3J0IHsgUXVldWUsIFF1ZXVlRW5jcnlwdGlvbiB9IGZyb20gXCJhd3MtY2RrLWxpYi9hd3Mtc3FzXCI7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIE9TTUxRdWV1ZVByb3BzIHtcbiAgLy8gdGhlIG5hbWUgb2YgdGhlIHF1ZXVlIHRvIGNyZWF0ZVxuICBxdWV1ZU5hbWU6IHN0cmluZztcbiAgLy8gdGhlIG1heGltdW0gbnVtYmVyIG9mIHRpbWVzIGEgbWVzc2FnZSBjYW4gYmUgcmVjZWl2ZWQgYmVmb3JlIGJlaW5nIGRpc2NhcmRlZC5cbiAgbWF4UmVjZWl2ZUNvdW50PzogbnVtYmVyO1xuICAvLyB0aGUgRExRIHRvIHVzZSBmb3IgdGhpcyBxdWV1ZS4gSWYgbm90IHByb3ZpZGVkLCBvbmUgd2lsbCBiZSBjcmVhdGVkLlxuICBkbFF1ZXVlPzogUXVldWU7XG59XG5cbmV4cG9ydCBjbGFzcyBPU01MUXVldWUgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICBwdWJsaWMgcXVldWU6IFF1ZXVlO1xuICBwdWJsaWMgZGxRdWV1ZTogUXVldWU7XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYW4gT1NNTCBRdWV1ZSBhbmQgRGVhZCBMZXR0ZXIgUXVldWUuXG4gICAqIEBwYXJhbSBzY29wZSB0aGUgc2NvcGUvc3RhY2sgaW4gd2hpY2ggdG8gZGVmaW5lIHRoaXMgY29uc3RydWN0LlxuICAgKiBAcGFyYW0gaWQgdGhlIGlkIG9mIHRoaXMgY29uc3RydWN0IHdpdGhpbiB0aGUgY3VycmVudCBzY29wZS5cbiAgICogQHBhcmFtIHByb3BzIHRoZSBwcm9wZXJ0aWVzIG9mIHRoaXMgY29uc3RydWN0LlxuICAgKiBAcmV0dXJucyB0aGUgT1NNTFF1ZXVlIGNvbnN0cnVjdC5cbiAgICovXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBPU01MUXVldWVQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG4gICAgLy8gaWYgdXNlciBwYXNzZWQgaW4gYSBETFF1ZXVlIHRvIHVzZVxuICAgIGlmIChwcm9wcy5kbFF1ZXVlKSB7XG4gICAgICB0aGlzLmRsUXVldWUgPSBwcm9wcy5kbFF1ZXVlO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBlbHNlIG1ha2Ugb25lXG4gICAgICB0aGlzLmRsUXVldWUgPSBuZXcgUXVldWUodGhpcywgYCR7aWR9RExRYCwge1xuICAgICAgICBxdWV1ZU5hbWU6IGAke3Byb3BzLnF1ZXVlTmFtZX1ETFFgLFxuICAgICAgICByZXRlbnRpb25QZXJpb2Q6IER1cmF0aW9uLmRheXMoMSksXG4gICAgICAgIGVuY3J5cHRpb246IFF1ZXVlRW5jcnlwdGlvbi5TUVNfTUFOQUdFRFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gYnVpbGQgdGhlIHRhcmdldCBxdWV1ZVxuICAgIHRoaXMucXVldWUgPSBuZXcgUXVldWUodGhpcywgaWQsIHtcbiAgICAgIHF1ZXVlTmFtZTogcHJvcHMucXVldWVOYW1lLFxuICAgICAgdmlzaWJpbGl0eVRpbWVvdXQ6IER1cmF0aW9uLm1pbnV0ZXMoMzApLFxuICAgICAgZGVhZExldHRlclF1ZXVlOiB7XG4gICAgICAgIG1heFJlY2VpdmVDb3VudDogcHJvcHMubWF4UmVjZWl2ZUNvdW50IHx8IDEsXG4gICAgICAgIHF1ZXVlOiB0aGlzLmRsUXVldWVcbiAgICAgIH0sXG4gICAgICBlbmNyeXB0aW9uOiBRdWV1ZUVuY3J5cHRpb24uU1FTX01BTkFHRURcbiAgICB9KTtcbiAgfVxufVxuIl19