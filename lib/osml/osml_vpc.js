"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OSMLVpc = void 0;
/*
 * Copyright 2023 Amazon.com, Inc. or its affiliates.
 */
const aws_ec2_1 = require("aws-cdk-lib/aws-ec2");
const constructs_1 = require("constructs");
class OSMLVpc extends constructs_1.Construct {
    /**
     * Creates or imports a VPC for OSML.
     * @param scope the scope/stack in which to define this construct.
     * @param id the id of this construct within the current scope.
     * @param props the properties of this construct.
     * @returns the OSMLVpc construct.
     */
    constructor(scope, id, props) {
        super(scope, id);
        // if a vpc id is not explicitly given use the default vpc
        if (props.vpcId) {
            this.vpc = aws_ec2_1.Vpc.fromLookup(this, "OSMLImportVPC", {
                vpcId: props.vpcId,
                isDefault: false
            });
        }
        else {
            this.vpc = new aws_ec2_1.Vpc(this, "OSMLVPC", {
                vpcName: props.vpcName,
                subnetConfiguration: [
                    {
                        cidrMask: 23,
                        name: "OSML-Public",
                        subnetType: aws_ec2_1.SubnetType.PUBLIC
                    },
                    {
                        cidrMask: 23,
                        name: "OSML-Private",
                        subnetType: aws_ec2_1.SubnetType.PRIVATE_WITH_EGRESS
                    }
                ]
            });
        }
    }
}
exports.OSMLVpc = OSMLVpc;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3NtbF92cGMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJvc21sX3ZwYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQTs7R0FFRztBQUNILGlEQUE0RDtBQUM1RCwyQ0FBdUM7QUFTdkMsTUFBYSxPQUFRLFNBQVEsc0JBQVM7SUFHcEM7Ozs7OztPQU1HO0lBQ0gsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFtQjtRQUMzRCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2pCLDBEQUEwRDtRQUMxRCxJQUFJLEtBQUssQ0FBQyxLQUFLLEVBQUU7WUFDZixJQUFJLENBQUMsR0FBRyxHQUFHLGFBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtnQkFDL0MsS0FBSyxFQUFFLEtBQUssQ0FBQyxLQUFLO2dCQUNsQixTQUFTLEVBQUUsS0FBSzthQUNqQixDQUFDLENBQUM7U0FDSjthQUFNO1lBQ0wsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLGFBQUcsQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFO2dCQUNsQyxPQUFPLEVBQUUsS0FBSyxDQUFDLE9BQU87Z0JBQ3RCLG1CQUFtQixFQUFFO29CQUNuQjt3QkFDRSxRQUFRLEVBQUUsRUFBRTt3QkFDWixJQUFJLEVBQUUsYUFBYTt3QkFDbkIsVUFBVSxFQUFFLG9CQUFVLENBQUMsTUFBTTtxQkFDOUI7b0JBQ0Q7d0JBQ0UsUUFBUSxFQUFFLEVBQUU7d0JBQ1osSUFBSSxFQUFFLGNBQWM7d0JBQ3BCLFVBQVUsRUFBRSxvQkFBVSxDQUFDLG1CQUFtQjtxQkFDM0M7aUJBQ0Y7YUFDRixDQUFDLENBQUM7U0FDSjtJQUNILENBQUM7Q0FDRjtBQXBDRCwwQkFvQ0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IDIwMjMgQW1hem9uLmNvbSwgSW5jLiBvciBpdHMgYWZmaWxpYXRlcy5cbiAqL1xuaW1wb3J0IHsgSVZwYywgU3VibmV0VHlwZSwgVnBjIH0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1lYzJcIjtcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgT1NNTFZwY1Byb3BzIHtcbiAgLy8gbmFtZSBvZiB0aGUgVlBDIHRvIGNyZWF0ZVxuICB2cGNOYW1lPzogc3RyaW5nO1xuICAvLyB0aGUgdnBjaWQgdG8gaW1wb3J0XG4gIHZwY0lkPzogc3RyaW5nO1xufVxuXG5leHBvcnQgY2xhc3MgT1NNTFZwYyBleHRlbmRzIENvbnN0cnVjdCB7XG4gIHB1YmxpYyByZWFkb25seSB2cGM6IElWcGM7XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgb3IgaW1wb3J0cyBhIFZQQyBmb3IgT1NNTC5cbiAgICogQHBhcmFtIHNjb3BlIHRoZSBzY29wZS9zdGFjayBpbiB3aGljaCB0byBkZWZpbmUgdGhpcyBjb25zdHJ1Y3QuXG4gICAqIEBwYXJhbSBpZCB0aGUgaWQgb2YgdGhpcyBjb25zdHJ1Y3Qgd2l0aGluIHRoZSBjdXJyZW50IHNjb3BlLlxuICAgKiBAcGFyYW0gcHJvcHMgdGhlIHByb3BlcnRpZXMgb2YgdGhpcyBjb25zdHJ1Y3QuXG4gICAqIEByZXR1cm5zIHRoZSBPU01MVnBjIGNvbnN0cnVjdC5cbiAgICovXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBPU01MVnBjUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpO1xuICAgIC8vIGlmIGEgdnBjIGlkIGlzIG5vdCBleHBsaWNpdGx5IGdpdmVuIHVzZSB0aGUgZGVmYXVsdCB2cGNcbiAgICBpZiAocHJvcHMudnBjSWQpIHtcbiAgICAgIHRoaXMudnBjID0gVnBjLmZyb21Mb29rdXAodGhpcywgXCJPU01MSW1wb3J0VlBDXCIsIHtcbiAgICAgICAgdnBjSWQ6IHByb3BzLnZwY0lkLFxuICAgICAgICBpc0RlZmF1bHQ6IGZhbHNlXG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy52cGMgPSBuZXcgVnBjKHRoaXMsIFwiT1NNTFZQQ1wiLCB7XG4gICAgICAgIHZwY05hbWU6IHByb3BzLnZwY05hbWUsXG4gICAgICAgIHN1Ym5ldENvbmZpZ3VyYXRpb246IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBjaWRyTWFzazogMjMsXG4gICAgICAgICAgICBuYW1lOiBcIk9TTUwtUHVibGljXCIsXG4gICAgICAgICAgICBzdWJuZXRUeXBlOiBTdWJuZXRUeXBlLlBVQkxJQ1xuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgY2lkck1hc2s6IDIzLFxuICAgICAgICAgICAgbmFtZTogXCJPU01MLVByaXZhdGVcIixcbiAgICAgICAgICAgIHN1Ym5ldFR5cGU6IFN1Ym5ldFR5cGUuUFJJVkFURV9XSVRIX0VHUkVTU1xuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfSk7XG4gICAgfVxuICB9XG59XG4iXX0=