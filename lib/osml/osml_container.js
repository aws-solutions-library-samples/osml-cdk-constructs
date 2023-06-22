"use strict";
/*
 * Copyright 2023 Amazon.com, Inc. or its affiliates.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OSMLECRContainer = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_ecr_assets_1 = require("aws-cdk-lib/aws-ecr-assets");
const aws_ecs_1 = require("aws-cdk-lib/aws-ecs");
const cdk_ecr_deployment_1 = require("cdk-ecr-deployment");
const constructs_1 = require("constructs");
class OSMLECRContainer extends constructs_1.Construct {
    /**
     * Create a new OSMLECRContainer. This construct takes a local directory and copies it to a docker image asset
     * and deploys it to an ECR repository with the "latest" tag if a repository is provided.
     * @param scope the scope/stack in which to define this construct.
     * @param id the id of this construct within the current scope.
     * @param props the properties of this construct.
     * @returns the OSMLECRContainer construct.
     */
    constructor(scope, id, props) {
        super(scope, id);
        // if a custom image asset was provided
        if (props.imageAsset) {
            this.imageAsset = props.imageAsset;
        }
        else {
            // build the docker image assets
            this.imageAsset = new aws_ecr_assets_1.DockerImageAsset(this, id, {
                directory: props.directory,
                followSymlinks: aws_cdk_lib_1.SymlinkFollowMode.ALWAYS,
                target: props.target,
                buildArgs: props.buildArgs
            });
        }
        // build the image for the model runner container to put in fargate
        this.containerImage = aws_ecs_1.ContainerImage.fromDockerImageAsset(this.imageAsset);
        // if a repository is provided, copy container asset to it
        if (props.repository) {
            this.repository = props.repository;
            // copy from cdk docker image asset to the given repository
            this.ecrDeployment = new cdk_ecr_deployment_1.ECRDeployment(this, `ECRDeploy${id}`, {
                src: new cdk_ecr_deployment_1.DockerImageName(this.imageAsset.imageUri),
                dest: new cdk_ecr_deployment_1.DockerImageName(new aws_ecs_1.EcrImage(this.repository, "latest").imageName)
            });
        }
    }
}
exports.OSMLECRContainer = OSMLECRContainer;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3NtbF9jb250YWluZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJvc21sX2NvbnRhaW5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7O0dBRUc7OztBQUVILDZDQUFnRDtBQUVoRCwrREFBOEQ7QUFDOUQsaURBQStEO0FBQy9ELDJEQUFvRTtBQUNwRSwyQ0FBdUM7QUFnQnZDLE1BQWEsZ0JBQWlCLFNBQVEsc0JBQVM7SUFNN0M7Ozs7Ozs7T0FPRztJQUNILFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBNEI7UUFDcEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQix1Q0FBdUM7UUFDdkMsSUFBSSxLQUFLLENBQUMsVUFBVSxFQUFFO1lBQ3BCLElBQUksQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQztTQUNwQzthQUFNO1lBQ0wsZ0NBQWdDO1lBQ2hDLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxpQ0FBZ0IsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFO2dCQUMvQyxTQUFTLEVBQUUsS0FBSyxDQUFDLFNBQVM7Z0JBQzFCLGNBQWMsRUFBRSwrQkFBaUIsQ0FBQyxNQUFNO2dCQUN4QyxNQUFNLEVBQUUsS0FBSyxDQUFDLE1BQU07Z0JBQ3BCLFNBQVMsRUFBRSxLQUFLLENBQUMsU0FBUzthQUMzQixDQUFDLENBQUM7U0FDSjtRQUVELG1FQUFtRTtRQUNuRSxJQUFJLENBQUMsY0FBYyxHQUFHLHdCQUFjLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRTNFLDBEQUEwRDtRQUMxRCxJQUFJLEtBQUssQ0FBQyxVQUFVLEVBQUU7WUFDcEIsSUFBSSxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFDO1lBRW5DLDJEQUEyRDtZQUMzRCxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksa0NBQWEsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFLEVBQUUsRUFBRTtnQkFDN0QsR0FBRyxFQUFFLElBQUksb0NBQWUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQztnQkFDbEQsSUFBSSxFQUFFLElBQUksb0NBQWUsQ0FDdkIsSUFBSSxrQkFBUSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUNsRDthQUNGLENBQUMsQ0FBQztTQUNKO0lBQ0gsQ0FBQztDQUNGO0FBOUNELDRDQThDQyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgMjAyMyBBbWF6b24uY29tLCBJbmMuIG9yIGl0cyBhZmZpbGlhdGVzLlxuICovXG5cbmltcG9ydCB7IFN5bWxpbmtGb2xsb3dNb2RlIH0gZnJvbSBcImF3cy1jZGstbGliXCI7XG5pbXBvcnQgeyBSZXBvc2l0b3J5IH0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1lY3JcIjtcbmltcG9ydCB7IERvY2tlckltYWdlQXNzZXQgfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWVjci1hc3NldHNcIjtcbmltcG9ydCB7IENvbnRhaW5lckltYWdlLCBFY3JJbWFnZSB9IGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtZWNzXCI7XG5pbXBvcnQgeyBEb2NrZXJJbWFnZU5hbWUsIEVDUkRlcGxveW1lbnQgfSBmcm9tIFwiY2RrLWVjci1kZXBsb3ltZW50XCI7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIE9TTUxFQ1JDb250YWluZXJQcm9wcyB7XG4gIC8vIHRoZSBkaXJlY3RvcnkgY29udGFpbmluZyB0aGUgZG9ja2VyIGltYWdlIGFzc2V0IHRvIGRlcGxveSB3LyBEb2NrZXJmaWxlIHByZXNlbnRcbiAgZGlyZWN0b3J5OiBzdHJpbmc7XG4gIC8vIHRoZSBzdGFnZS90YXJnZXQgb2YgdGhlIERvY2tlcmJ1aWxkIGZpbGVcbiAgdGFyZ2V0OiBzdHJpbmc7XG4gIC8vIGN1c3RvbSBkb2NrZXIgaW1hZ2UgYXNzZXQgdG8gYnVpbGRcbiAgaW1hZ2VBc3NldD86IERvY2tlckltYWdlQXNzZXQ7XG4gIC8vIHRoZSByZXBvc2l0b3J5IHRvIGRlcGxveSB0aGUgY29udGFpbmVyIGltYWdlIGludG9cbiAgcmVwb3NpdG9yeT86IFJlcG9zaXRvcnk7XG4gIGJ1aWxkQXJncz86IHtcbiAgICBba2V5OiBzdHJpbmddOiBzdHJpbmc7XG4gIH07XG59XG5cbmV4cG9ydCBjbGFzcyBPU01MRUNSQ29udGFpbmVyIGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgcHVibGljIHJlcG9zaXRvcnk6IFJlcG9zaXRvcnk7XG4gIHB1YmxpYyBpbWFnZUFzc2V0OiBEb2NrZXJJbWFnZUFzc2V0O1xuICBwdWJsaWMgY29udGFpbmVySW1hZ2U6IENvbnRhaW5lckltYWdlO1xuICBwdWJsaWMgZWNyRGVwbG95bWVudDogRUNSRGVwbG95bWVudDtcblxuICAvKipcbiAgICogQ3JlYXRlIGEgbmV3IE9TTUxFQ1JDb250YWluZXIuIFRoaXMgY29uc3RydWN0IHRha2VzIGEgbG9jYWwgZGlyZWN0b3J5IGFuZCBjb3BpZXMgaXQgdG8gYSBkb2NrZXIgaW1hZ2UgYXNzZXRcbiAgICogYW5kIGRlcGxveXMgaXQgdG8gYW4gRUNSIHJlcG9zaXRvcnkgd2l0aCB0aGUgXCJsYXRlc3RcIiB0YWcgaWYgYSByZXBvc2l0b3J5IGlzIHByb3ZpZGVkLlxuICAgKiBAcGFyYW0gc2NvcGUgdGhlIHNjb3BlL3N0YWNrIGluIHdoaWNoIHRvIGRlZmluZSB0aGlzIGNvbnN0cnVjdC5cbiAgICogQHBhcmFtIGlkIHRoZSBpZCBvZiB0aGlzIGNvbnN0cnVjdCB3aXRoaW4gdGhlIGN1cnJlbnQgc2NvcGUuXG4gICAqIEBwYXJhbSBwcm9wcyB0aGUgcHJvcGVydGllcyBvZiB0aGlzIGNvbnN0cnVjdC5cbiAgICogQHJldHVybnMgdGhlIE9TTUxFQ1JDb250YWluZXIgY29uc3RydWN0LlxuICAgKi9cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IE9TTUxFQ1JDb250YWluZXJQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG5cbiAgICAvLyBpZiBhIGN1c3RvbSBpbWFnZSBhc3NldCB3YXMgcHJvdmlkZWRcbiAgICBpZiAocHJvcHMuaW1hZ2VBc3NldCkge1xuICAgICAgdGhpcy5pbWFnZUFzc2V0ID0gcHJvcHMuaW1hZ2VBc3NldDtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gYnVpbGQgdGhlIGRvY2tlciBpbWFnZSBhc3NldHNcbiAgICAgIHRoaXMuaW1hZ2VBc3NldCA9IG5ldyBEb2NrZXJJbWFnZUFzc2V0KHRoaXMsIGlkLCB7XG4gICAgICAgIGRpcmVjdG9yeTogcHJvcHMuZGlyZWN0b3J5LFxuICAgICAgICBmb2xsb3dTeW1saW5rczogU3ltbGlua0ZvbGxvd01vZGUuQUxXQVlTLFxuICAgICAgICB0YXJnZXQ6IHByb3BzLnRhcmdldCxcbiAgICAgICAgYnVpbGRBcmdzOiBwcm9wcy5idWlsZEFyZ3NcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIGJ1aWxkIHRoZSBpbWFnZSBmb3IgdGhlIG1vZGVsIHJ1bm5lciBjb250YWluZXIgdG8gcHV0IGluIGZhcmdhdGVcbiAgICB0aGlzLmNvbnRhaW5lckltYWdlID0gQ29udGFpbmVySW1hZ2UuZnJvbURvY2tlckltYWdlQXNzZXQodGhpcy5pbWFnZUFzc2V0KTtcblxuICAgIC8vIGlmIGEgcmVwb3NpdG9yeSBpcyBwcm92aWRlZCwgY29weSBjb250YWluZXIgYXNzZXQgdG8gaXRcbiAgICBpZiAocHJvcHMucmVwb3NpdG9yeSkge1xuICAgICAgdGhpcy5yZXBvc2l0b3J5ID0gcHJvcHMucmVwb3NpdG9yeTtcblxuICAgICAgLy8gY29weSBmcm9tIGNkayBkb2NrZXIgaW1hZ2UgYXNzZXQgdG8gdGhlIGdpdmVuIHJlcG9zaXRvcnlcbiAgICAgIHRoaXMuZWNyRGVwbG95bWVudCA9IG5ldyBFQ1JEZXBsb3ltZW50KHRoaXMsIGBFQ1JEZXBsb3kke2lkfWAsIHtcbiAgICAgICAgc3JjOiBuZXcgRG9ja2VySW1hZ2VOYW1lKHRoaXMuaW1hZ2VBc3NldC5pbWFnZVVyaSksXG4gICAgICAgIGRlc3Q6IG5ldyBEb2NrZXJJbWFnZU5hbWUoXG4gICAgICAgICAgbmV3IEVjckltYWdlKHRoaXMucmVwb3NpdG9yeSwgXCJsYXRlc3RcIikuaW1hZ2VOYW1lXG4gICAgICAgIClcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufVxuIl19