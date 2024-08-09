/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { App, Stack } from "aws-cdk-lib";

import { OSMLContainer } from "../../lib";
import { test_account } from "../test_account";

describe("MEContainer", () => {
  let app: App;
  let stack: Stack;
  let container: OSMLContainer;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, "MEContainerStack");

    // Mock dependencies
    container = new OSMLContainer(stack, "OSMLContainer", {
      account: test_account,
      buildDockerImageCode: true,
      buildFromSource: false,
      config: {
        CONTAINER_URI: "awsosml/test-uri"
      }
    });
  });

  it("sets removal policy", () => {
    expect(container.removalPolicy).toBeDefined();
  });

  it("creates config if not provided", () => {
    expect(container.config).toBeDefined();
  });

  it("sets container image", () => {
    expect(container.containerImage).toBeDefined();
    expect(container.config).toBeDefined();
    expect(container.dockerImageCode).toBeDefined();
  });
});
