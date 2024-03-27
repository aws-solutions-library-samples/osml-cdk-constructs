/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { App, Stack } from "aws-cdk-lib";

import { MEContainer, OSMLVpc } from "../../../lib";
import { test_account } from "../../test_account";

describe("MEContainer", () => {
  let app: App;
  let stack: Stack;
  let osmlVpc: OSMLVpc;
  let container: MEContainer;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, "MEContainerStack");

    osmlVpc = new OSMLVpc(stack, "OSMLVpc", {
      account: test_account
    });

    // Mock dependencies
    container = new MEContainer(stack, "MEContainer", {
      account: test_account,
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

  it("sets container image", () => {
    expect(container.containerUri).toContain("ecr");
    expect(container.containerImage).toBeDefined();
  });
});
