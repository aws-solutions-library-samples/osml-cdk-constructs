/*
 * Copyright 2024-2025 Amazon.com, Inc. or its affiliates.
 */

import { App, RemovalPolicy, Stack } from "aws-cdk-lib";
import { ContainerImage } from "aws-cdk-lib/aws-ecs";

import { OSMLContainer } from "../../lib";
import { test_account } from "../test_account";

jest.mock("aws-cdk-lib/aws-ecr-assets", () => {
  return {
    DockerImageAsset: jest.fn().mockImplementation(() => ({
      imageUri: "mock-image-uri"
    }))
  };
});

describe("OSMLContainer", () => {
  let app: App;
  let stack: Stack;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, "OSMLContainerStack");
  });

  it("sets correct removal policy based on environment", () => {
    const container = new OSMLContainer(stack, "OSMLContainer", {
      account: test_account,
      config: { CONTAINER_URI: "awsosml/test-uri" }
    });

    expect(container.removalPolicy).toBe(
      test_account.prodLike ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY
    );
  });

  it("throws an error if neither ECR_REPOSITORY_ARN nor CONTAINER_URI is provided", () => {
    expect(() => {
      new OSMLContainer(stack, "OSMLContainer", {
        account: test_account
      });
    }).toThrow(
      "Either CONTAINER_URI or ECR_REPOSITORY_ARN must be set in the configuration."
    );
  });

  it("throws error when both CONTAINER_URI and REPOSITORY_ARN are set", () => {
    expect(() => {
      new OSMLContainer(stack, "OSMLContainer", {
        account: test_account,
        config: {
          CONTAINER_URI: "awsosml/test-uri",
          ECR_REPOSITORY_ARN:
            "arn:aws:ecr:us-east-1:123456789012:repository/my-repo"
        }
      });
    }).toThrow("Only one of CONTAINER_URI or ECR_REPOSITORY_ARN can be set.");
  });

  it("uses container image from CONTAINER_URI", () => {
    const container = new OSMLContainer(stack, "OSMLContainer", {
      account: test_account,
      config: { CONTAINER_URI: "awsosml/test-uri:latest" }
    });

    expect(container.containerImage).toBeDefined();
    expect(container.containerUri).toBe("awsosml/test-uri:latest");
  });

  it("uses container image from REPOSITORY_ARN", () => {
    const container = new OSMLContainer(stack, "OSMLContainer", {
      account: test_account,
      config: {
        ECR_REPOSITORY_ARN:
          "arn:aws:ecr:us-east-1:123456789012:repository/my-repo"
      }
    });

    expect(container.repository).toBeDefined();
    expect(container.containerImage).toBeDefined();
    expect(container.containerUri).toContain("123456789012.dkr.ecr.us-east-1");
    expect(container.containerUri).toContain("/my-repo");
  });

  it("builds Docker image when buildFromSource is enabled", () => {
    const container = new OSMLContainer(stack, "OSMLContainer", {
      account: test_account,
      buildFromSource: true,
      config: {
        CONTAINER_DOCKERFILE: "Dockerfile",
        CONTAINER_BUILD_PATH: "./path/to/build"
      }
    });

    expect(container.dockerImageAsset).toBeDefined();
    expect(container.containerImage).toBeDefined();
    expect(container.containerUri).toBe(container.dockerImageAsset.imageUri);
  });

  it("throws error when buildFromSource is enabled but missing required fields", () => {
    expect(() => {
      new OSMLContainer(stack, "OSMLContainer", {
        account: test_account,
        buildFromSource: true,
        config: {}
      });
    }).toThrow(
      "CONTAINER_DOCKERFILE and CONTAINER_BUILD_PATH must be set in the configuration to build from source."
    );
  });

  it("uses external registry image when given a non-ECR URI", () => {
    const container = new OSMLContainer(stack, "OSMLContainer", {
      account: test_account,
      config: { CONTAINER_URI: "docker.io/library/nginx:1.21" }
    });

    expect(container.containerImage).toBeInstanceOf(ContainerImage);
    expect(container.containerUri).toBe("docker.io/library/nginx:1.21");
  });

  it("creates Docker image code for Lambda when enabled", () => {
    const container = new OSMLContainer(stack, "OSMLContainer", {
      account: test_account,
      buildFromSource: true,
      buildDockerImageCode: true,
      config: {
        CONTAINER_DOCKERFILE: "Dockerfile",
        CONTAINER_BUILD_PATH: "./path/to/build"
      }
    });

    expect(container.dockerImageCode).toBeInstanceOf(Object);
  });

  it("does not create Docker image code when buildDockerImageCode is false", () => {
    const container = new OSMLContainer(stack, "OSMLContainer", {
      account: test_account,
      buildDockerImageCode: false,
      config: { CONTAINER_URI: "awsosml/test-uri:latest" }
    });

    expect(container.dockerImageCode).toBeUndefined();
  });
});
