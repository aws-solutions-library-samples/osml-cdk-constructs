/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { App, Stack } from "aws-cdk-lib";

import { DCContainer, OSMLVpc } from "../../../lib";
import { test_account } from "../../test_account";

describe("DIContainer", () => {
  let app: App;
  let stack: Stack;
  let osmlVpc: OSMLVpc;
  let dcContainer: DCContainer;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, "DCContainerStack");

    osmlVpc = new OSMLVpc(stack, "OSMLVpc", {
      account: test_account
    });

    // Mock dependencies
    dcContainer = new DCContainer(stack, "DCContainer", {
      account: test_account,
      osmlVpc: osmlVpc
    });
  });

  it("sets removal policy", () => {
    expect(dcContainer.removalPolicy).toBeDefined();
  });

  it("creates config if not provided", () => {
    expect(dcContainer.config).toBeDefined();
  });

  it("sets container image", () => {
    expect(dcContainer.dockerImageCode).toBeDefined();
  });
});
