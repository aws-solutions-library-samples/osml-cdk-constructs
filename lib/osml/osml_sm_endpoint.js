"use strict";
/*
 * Copyright 2023 Amazon.com, Inc. or its affiliates.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OSMLSMEndpoint = void 0;
const aws_sagemaker_1 = require("aws-cdk-lib/aws-sagemaker");
const constructs_1 = require("constructs");
class OSMLSMEndpoint extends constructs_1.Construct {
    /**
     * Creates a SageMaker endpoint for the specified model.
     * @param scope the scope/stack in which to define this construct.
     * @param id the id of this construct within the current scope.
     * @param props the properties of this construct.
     * @returns the OSMLSMEndpoint construct.
     */
    constructor(scope, id, props) {
        super(scope, id);
        this.model = new aws_sagemaker_1.CfnModel(this, id, {
            executionRoleArn: props.roleArn,
            containers: [
                {
                    image: props.modelContainerUri,
                    environment: {
                        MODEL_SELECTION: props.modelName
                    }
                }
            ]
        });
        // configure our SageMaker endpoint
        this.endpointConfig = new aws_sagemaker_1.CfnEndpointConfig(this, `${id}-EndpointConfig`, {
            productionVariants: [
                {
                    initialInstanceCount: props.initialInstanceCount,
                    initialVariantWeight: props.initialVariantWeight,
                    instanceType: props.instanceType,
                    modelName: this.model.attrModelName,
                    variantName: props.variantName
                }
            ]
        });
        // host a SageMaker endpoint on top of the imported centerPointModel
        this.endpoint = new aws_sagemaker_1.CfnEndpoint(this, `${id}-Endpoint`, {
            endpointConfigName: this.endpointConfig.attrEndpointConfigName,
            endpointName: props.modelName
        });
    }
}
exports.OSMLSMEndpoint = OSMLSMEndpoint;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3NtbF9zbV9lbmRwb2ludC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm9zbWxfc21fZW5kcG9pbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOztHQUVHOzs7QUFFSCw2REFJbUM7QUFDbkMsMkNBQXVDO0FBb0J2QyxNQUFhLGNBQWUsU0FBUSxzQkFBUztJQUszQzs7Ozs7O09BTUc7SUFDSCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQTBCO1FBQ2xFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDakIsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLHdCQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRTtZQUNsQyxnQkFBZ0IsRUFBRSxLQUFLLENBQUMsT0FBTztZQUMvQixVQUFVLEVBQUU7Z0JBQ1Y7b0JBQ0UsS0FBSyxFQUFFLEtBQUssQ0FBQyxpQkFBaUI7b0JBQzlCLFdBQVcsRUFBRTt3QkFDWCxlQUFlLEVBQUUsS0FBSyxDQUFDLFNBQVM7cUJBQ2pDO2lCQUNGO2FBQ0Y7U0FDRixDQUFDLENBQUM7UUFFSCxtQ0FBbUM7UUFDbkMsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLGlDQUFpQixDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsaUJBQWlCLEVBQUU7WUFDeEUsa0JBQWtCLEVBQUU7Z0JBQ2xCO29CQUNFLG9CQUFvQixFQUFFLEtBQUssQ0FBQyxvQkFBb0I7b0JBQ2hELG9CQUFvQixFQUFFLEtBQUssQ0FBQyxvQkFBb0I7b0JBQ2hELFlBQVksRUFBRSxLQUFLLENBQUMsWUFBWTtvQkFDaEMsU0FBUyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYTtvQkFDbkMsV0FBVyxFQUFFLEtBQUssQ0FBQyxXQUFXO2lCQUMvQjthQUNGO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsb0VBQW9FO1FBQ3BFLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSwyQkFBVyxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsV0FBVyxFQUFFO1lBQ3RELGtCQUFrQixFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsc0JBQXNCO1lBQzlELFlBQVksRUFBRSxLQUFLLENBQUMsU0FBUztTQUM5QixDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUE3Q0Qsd0NBNkNDIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAyMDIzIEFtYXpvbi5jb20sIEluYy4gb3IgaXRzIGFmZmlsaWF0ZXMuXG4gKi9cblxuaW1wb3J0IHtcbiAgQ2ZuRW5kcG9pbnQsXG4gIENmbkVuZHBvaW50Q29uZmlnLFxuICBDZm5Nb2RlbFxufSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXNhZ2VtYWtlclwiO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSBcImNvbnN0cnVjdHNcIjtcblxuZXhwb3J0IGludGVyZmFjZSBPU01MU01FbmRwb2ludFByb3BzIHtcbiAgLy8gc2FnZW1ha2VyIGV4ZWN1dGlvbiByb2xlIGFybiB0byB1c2UgZm9yIHRoZSBtb2RlbCBlbmRwb2ludFxuICByb2xlQXJuOiBzdHJpbmc7XG4gIC8vIFVSSSB0byB0aGUgY29udGFpbmVyIGltYWdlIHRoYXQgY29udGFpbnMgdGhlIG1vZGVsXG4gIG1vZGVsQ29udGFpbmVyVXJpOiBzdHJpbmc7XG4gIC8vICBuYW1lIG9mIHRoZSBtb2RlbCB0byBob3N0IG9uIHRoZSBlbmRwb2ludCBvblxuICBtb2RlbE5hbWU6IHN0cmluZztcbiAgLy8gIG51bWJlciBvZiBpbnN0YW5jZXMgdG8gc3RhcnQgdGhlIGVuZHBvaW50IHdpdGhcbiAgaW5pdGlhbEluc3RhbmNlQ291bnQ6IG51bWJlcjtcbiAgLy8gIHdlaWdodCBvZiB0aGUgdmFyaWFudCB0byBzdGFydCB0aGUgZW5kcG9pbnQgd2l0aCAoMC0xKVxuICBpbml0aWFsVmFyaWFudFdlaWdodDogbnVtYmVyO1xuICAvLyAgaW5zdGFuY2UgdHlwZSB0byBzdGFydCB0aGUgZW5kcG9pbnQgd2l0aCAoZS5nLiBtbC50Mi5tZWRpdW0pXG4gIC8vICBzZWUgaHR0cHM6Ly9hd3MuYW1hem9uLmNvbS9zYWdlbWFrZXIvcHJpY2luZy8gZm9yIHByaWNpbmcgaW5mb3JtYXRpb25cbiAgaW5zdGFuY2VUeXBlOiBzdHJpbmc7XG4gIC8vICBuYW1lIG9mIHRoZSB2YXJpYW50IHRvIGhvc3QgdGhlIG1vZGVsIG9uIChlLmcuICdBbGxUcmFmZmljJylcbiAgdmFyaWFudE5hbWU6IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIE9TTUxTTUVuZHBvaW50IGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgcHVibGljIG1vZGVsOiBDZm5Nb2RlbDtcbiAgcHVibGljIGVuZHBvaW50Q29uZmlnOiBDZm5FbmRwb2ludENvbmZpZztcbiAgcHVibGljIGVuZHBvaW50OiBDZm5FbmRwb2ludDtcblxuICAvKipcbiAgICogQ3JlYXRlcyBhIFNhZ2VNYWtlciBlbmRwb2ludCBmb3IgdGhlIHNwZWNpZmllZCBtb2RlbC5cbiAgICogQHBhcmFtIHNjb3BlIHRoZSBzY29wZS9zdGFjayBpbiB3aGljaCB0byBkZWZpbmUgdGhpcyBjb25zdHJ1Y3QuXG4gICAqIEBwYXJhbSBpZCB0aGUgaWQgb2YgdGhpcyBjb25zdHJ1Y3Qgd2l0aGluIHRoZSBjdXJyZW50IHNjb3BlLlxuICAgKiBAcGFyYW0gcHJvcHMgdGhlIHByb3BlcnRpZXMgb2YgdGhpcyBjb25zdHJ1Y3QuXG4gICAqIEByZXR1cm5zIHRoZSBPU01MU01FbmRwb2ludCBjb25zdHJ1Y3QuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogT1NNTFNNRW5kcG9pbnRQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG4gICAgdGhpcy5tb2RlbCA9IG5ldyBDZm5Nb2RlbCh0aGlzLCBpZCwge1xuICAgICAgZXhlY3V0aW9uUm9sZUFybjogcHJvcHMucm9sZUFybixcbiAgICAgIGNvbnRhaW5lcnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGltYWdlOiBwcm9wcy5tb2RlbENvbnRhaW5lclVyaSxcbiAgICAgICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICAgICAgTU9ERUxfU0VMRUNUSU9OOiBwcm9wcy5tb2RlbE5hbWVcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9KTtcblxuICAgIC8vIGNvbmZpZ3VyZSBvdXIgU2FnZU1ha2VyIGVuZHBvaW50XG4gICAgdGhpcy5lbmRwb2ludENvbmZpZyA9IG5ldyBDZm5FbmRwb2ludENvbmZpZyh0aGlzLCBgJHtpZH0tRW5kcG9pbnRDb25maWdgLCB7XG4gICAgICBwcm9kdWN0aW9uVmFyaWFudHM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGluaXRpYWxJbnN0YW5jZUNvdW50OiBwcm9wcy5pbml0aWFsSW5zdGFuY2VDb3VudCxcbiAgICAgICAgICBpbml0aWFsVmFyaWFudFdlaWdodDogcHJvcHMuaW5pdGlhbFZhcmlhbnRXZWlnaHQsXG4gICAgICAgICAgaW5zdGFuY2VUeXBlOiBwcm9wcy5pbnN0YW5jZVR5cGUsXG4gICAgICAgICAgbW9kZWxOYW1lOiB0aGlzLm1vZGVsLmF0dHJNb2RlbE5hbWUsXG4gICAgICAgICAgdmFyaWFudE5hbWU6IHByb3BzLnZhcmlhbnROYW1lXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9KTtcblxuICAgIC8vIGhvc3QgYSBTYWdlTWFrZXIgZW5kcG9pbnQgb24gdG9wIG9mIHRoZSBpbXBvcnRlZCBjZW50ZXJQb2ludE1vZGVsXG4gICAgdGhpcy5lbmRwb2ludCA9IG5ldyBDZm5FbmRwb2ludCh0aGlzLCBgJHtpZH0tRW5kcG9pbnRgLCB7XG4gICAgICBlbmRwb2ludENvbmZpZ05hbWU6IHRoaXMuZW5kcG9pbnRDb25maWcuYXR0ckVuZHBvaW50Q29uZmlnTmFtZSxcbiAgICAgIGVuZHBvaW50TmFtZTogcHJvcHMubW9kZWxOYW1lXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==