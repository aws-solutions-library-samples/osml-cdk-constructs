/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */
import { App, Stack } from "aws-cdk-lib";

import { MEContainer, OSMLAccount, OSMLVpc } from "../../../lib";

describe("MEContainer", () => {
  let app: App;
  let account: OSMLAccount;
  let stack: Stack;
  let osmlVpc: OSMLVpc;

  let container: MEContainer;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, "MEContainerStack");

    account = {
      id: "123456789012",
      name: "test",
      prodLike: true,
      region: "us-west-2"
    } as OSMLAccount;

    osmlVpc = new OSMLVpc(stack, "OSMLVpc", {
      account: account
    });

    // Mock dependencies
    container = new MEContainer(stack, "MEContainer", {
      account: account,
      buildFromSource: false,
      osmlVpc: osmlVpc
    });
  });

  it("sets removal policy", () => {
    expect(container.removalPolicy).toBeDefined();
  });

  it("creates config if not provided", () => {
    expect(container.config).toBeDefined();
  });

  it("creates container image from Docker asset if buildFromSource", () => {
    // empty suite since its impossible to create a Docker asset in a test environment
  });

  it("sets container image", () => {
    expect(container.containerUri).toContain("ecr");
    expect(container.containerImage).toBeDefined();
  });
});
