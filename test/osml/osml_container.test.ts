/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { App, Stack } from "aws-cdk-lib";

import { OSMLContainer, OSMLVpc } from "../../lib";
import { test_account } from "../test_account";

describe("MEContainer", () => {
  let app: App;
  let stack: Stack;
  let osmlVpc: OSMLVpc;
  let container: OSMLContainer;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, "MEContainerStack");

    osmlVpc = new OSMLVpc(stack, "OSMLVpc", {
      account: test_account
    });

    // Mock dependencies
    container = new OSMLContainer(stack, "OSMLContainer", {
      account: test_account,
      buildFromSource: false,
      osmlVpc: osmlVpc,
      config: {
        CONTAINER_REPOSITORY: "test-repository",
        CONTAINER_URI: "test-uri"
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
    expect(container.containerUri).toContain("ecr");
    expect(container.containerImage).toBeDefined();
  });
});
