"use strict";
/*
 * Copyright 2023 Amazon.com, Inc. or its affiliates.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OSMLTopic = void 0;
const aws_kms_1 = require("aws-cdk-lib/aws-kms");
const aws_sns_1 = require("aws-cdk-lib/aws-sns");
const constructs_1 = require("constructs");
class OSMLTopic extends constructs_1.Construct {
    /**
     * Creates an OSML Topic.
     * @param scope the scope/stack in which to define this construct.
     * @param id the id of this construct within the current scope.
     * @param props the properties of this construct.
     * @returns the OSMLTopic construct.
     */
    constructor(scope, id, props) {
        super(scope, id);
        // create KMS key for topic encryption
        this.key = new aws_kms_1.Key(this, `${props.topicName}Key`, {
            enableKeyRotation: true,
            alias: `${props.topicName}Key`
        });
        // build the topic and add the key to it
        this.topic = new aws_sns_1.Topic(this, id, {
            topicName: props.topicName,
            masterKey: this.key
        });
    }
}
exports.OSMLTopic = OSMLTopic;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3NtbF90b3BpYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm9zbWxfdG9waWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOztHQUVHOzs7QUFFSCxpREFBMEM7QUFDMUMsaURBQTRDO0FBQzVDLDJDQUF1QztBQU92QyxNQUFhLFNBQVUsU0FBUSxzQkFBUztJQUl0Qzs7Ozs7O09BTUc7SUFDSCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXFCO1FBQzdELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsc0NBQXNDO1FBQ3RDLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxhQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsS0FBSyxDQUFDLFNBQVMsS0FBSyxFQUFFO1lBQ2hELGlCQUFpQixFQUFFLElBQUk7WUFDdkIsS0FBSyxFQUFFLEdBQUcsS0FBSyxDQUFDLFNBQVMsS0FBSztTQUMvQixDQUFDLENBQUM7UUFFSCx3Q0FBd0M7UUFDeEMsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLGVBQUssQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFO1lBQy9CLFNBQVMsRUFBRSxLQUFLLENBQUMsU0FBUztZQUMxQixTQUFTLEVBQUUsSUFBSSxDQUFDLEdBQUc7U0FDcEIsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBMUJELDhCQTBCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgMjAyMyBBbWF6b24uY29tLCBJbmMuIG9yIGl0cyBhZmZpbGlhdGVzLlxuICovXG5cbmltcG9ydCB7IEtleSB9IGZyb20gXCJhd3MtY2RrLWxpYi9hd3Mta21zXCI7XG5pbXBvcnQgeyBUb3BpYyB9IGZyb20gXCJhd3MtY2RrLWxpYi9hd3Mtc25zXCI7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIE9TTUxUb3BpY1Byb3BzIHtcbiAgLy8gdGhlIG5hbWUgb2YgdGhlIHRvcGljIHRvIGNyZWF0ZVxuICB0b3BpY05hbWU6IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIE9TTUxUb3BpYyBleHRlbmRzIENvbnN0cnVjdCB7XG4gIHB1YmxpYyB0b3BpYzogVG9waWM7XG4gIHB1YmxpYyBrZXk6IEtleTtcblxuICAvKipcbiAgICogQ3JlYXRlcyBhbiBPU01MIFRvcGljLlxuICAgKiBAcGFyYW0gc2NvcGUgdGhlIHNjb3BlL3N0YWNrIGluIHdoaWNoIHRvIGRlZmluZSB0aGlzIGNvbnN0cnVjdC5cbiAgICogQHBhcmFtIGlkIHRoZSBpZCBvZiB0aGlzIGNvbnN0cnVjdCB3aXRoaW4gdGhlIGN1cnJlbnQgc2NvcGUuXG4gICAqIEBwYXJhbSBwcm9wcyB0aGUgcHJvcGVydGllcyBvZiB0aGlzIGNvbnN0cnVjdC5cbiAgICogQHJldHVybnMgdGhlIE9TTUxUb3BpYyBjb25zdHJ1Y3QuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogT1NNTFRvcGljUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpO1xuXG4gICAgLy8gY3JlYXRlIEtNUyBrZXkgZm9yIHRvcGljIGVuY3J5cHRpb25cbiAgICB0aGlzLmtleSA9IG5ldyBLZXkodGhpcywgYCR7cHJvcHMudG9waWNOYW1lfUtleWAsIHtcbiAgICAgIGVuYWJsZUtleVJvdGF0aW9uOiB0cnVlLFxuICAgICAgYWxpYXM6IGAke3Byb3BzLnRvcGljTmFtZX1LZXlgXG4gICAgfSk7XG5cbiAgICAvLyBidWlsZCB0aGUgdG9waWMgYW5kIGFkZCB0aGUga2V5IHRvIGl0XG4gICAgdGhpcy50b3BpYyA9IG5ldyBUb3BpYyh0aGlzLCBpZCwge1xuICAgICAgdG9waWNOYW1lOiBwcm9wcy50b3BpY05hbWUsXG4gICAgICBtYXN0ZXJLZXk6IHRoaXMua2V5XG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==