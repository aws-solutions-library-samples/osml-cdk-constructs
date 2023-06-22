"use strict";
/*
 * Copyright 2023 Amazon.com, Inc. or its affiliates.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OSMLRepository = void 0;
const aws_ecr_1 = require("aws-cdk-lib/aws-ecr");
const constructs_1 = require("constructs");
class OSMLRepository extends constructs_1.Construct {
    /**
     * Creates a new OSMLRepository (ECR).
     * @param scope the scope/stack in which to define this construct.
     * @param id the id of this construct within the current scope.
     * @param props the properties of this construct.
     * @returns the OSMLRepository construct.
     */
    constructor(scope, id, props) {
        super(scope, id);
        this.repository = new aws_ecr_1.Repository(this, id, {
            repositoryName: props.repositoryName,
            removalPolicy: props.removalPolicy,
            imageScanOnPush: true,
            encryption: aws_ecr_1.RepositoryEncryption.KMS
        });
    }
}
exports.OSMLRepository = OSMLRepository;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3NtbF9yZXBvc2l0b3J5LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsib3NtbF9yZXBvc2l0b3J5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7R0FFRzs7O0FBR0gsaURBQXVFO0FBQ3ZFLDJDQUF1QztBQVN2QyxNQUFhLGNBQWUsU0FBUSxzQkFBUztJQUczQzs7Ozs7O09BTUc7SUFDSCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQTBCO1FBQ2xFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDakIsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLG9CQUFVLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRTtZQUN6QyxjQUFjLEVBQUUsS0FBSyxDQUFDLGNBQWM7WUFDcEMsYUFBYSxFQUFFLEtBQUssQ0FBQyxhQUFhO1lBQ2xDLGVBQWUsRUFBRSxJQUFJO1lBQ3JCLFVBQVUsRUFBRSw4QkFBb0IsQ0FBQyxHQUFHO1NBQ3JDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQW5CRCx3Q0FtQkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IDIwMjMgQW1hem9uLmNvbSwgSW5jLiBvciBpdHMgYWZmaWxpYXRlcy5cbiAqL1xuXG5pbXBvcnQgeyBSZW1vdmFsUG9saWN5IH0gZnJvbSBcImF3cy1jZGstbGliXCI7XG5pbXBvcnQgeyBSZXBvc2l0b3J5LCBSZXBvc2l0b3J5RW5jcnlwdGlvbiB9IGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtZWNyXCI7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIE9TTUxSZXBvc2l0b3J5UHJvcHMge1xuICAvLyB0aGUgbmFtZSBvZiB0aGUgcmVwb3NpdG9yeSB0byBjcmVhdGVcbiAgcmVwb3NpdG9yeU5hbWU6IHN0cmluZztcbiAgLy8gdGhlIHJlbW92YWwgcG9saWN5IHRvIGFwcGx5IHRvIHRoZSByZXBvc2l0b3J5XG4gIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3k7XG59XG5cbmV4cG9ydCBjbGFzcyBPU01MUmVwb3NpdG9yeSBleHRlbmRzIENvbnN0cnVjdCB7XG4gIHB1YmxpYyByZXBvc2l0b3J5OiBSZXBvc2l0b3J5O1xuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IE9TTUxSZXBvc2l0b3J5IChFQ1IpLlxuICAgKiBAcGFyYW0gc2NvcGUgdGhlIHNjb3BlL3N0YWNrIGluIHdoaWNoIHRvIGRlZmluZSB0aGlzIGNvbnN0cnVjdC5cbiAgICogQHBhcmFtIGlkIHRoZSBpZCBvZiB0aGlzIGNvbnN0cnVjdCB3aXRoaW4gdGhlIGN1cnJlbnQgc2NvcGUuXG4gICAqIEBwYXJhbSBwcm9wcyB0aGUgcHJvcGVydGllcyBvZiB0aGlzIGNvbnN0cnVjdC5cbiAgICogQHJldHVybnMgdGhlIE9TTUxSZXBvc2l0b3J5IGNvbnN0cnVjdC5cbiAgICovXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBPU01MUmVwb3NpdG9yeVByb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcbiAgICB0aGlzLnJlcG9zaXRvcnkgPSBuZXcgUmVwb3NpdG9yeSh0aGlzLCBpZCwge1xuICAgICAgcmVwb3NpdG9yeU5hbWU6IHByb3BzLnJlcG9zaXRvcnlOYW1lLFxuICAgICAgcmVtb3ZhbFBvbGljeTogcHJvcHMucmVtb3ZhbFBvbGljeSxcbiAgICAgIGltYWdlU2Nhbk9uUHVzaDogdHJ1ZSxcbiAgICAgIGVuY3J5cHRpb246IFJlcG9zaXRvcnlFbmNyeXB0aW9uLktNU1xuICAgIH0pO1xuICB9XG59XG4iXX0=