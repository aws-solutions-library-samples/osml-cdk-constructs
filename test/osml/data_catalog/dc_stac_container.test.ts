/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { App, Stack } from "aws-cdk-lib";

import { DCStacContainer, OSMLVpc } from "../../../lib";
import { test_account } from "../../test_account";

describe("DCStacContainer", () => {
  let app: App;
  let stack: Stack;
  let osmlVpc: OSMLVpc;
  let dcStacContainer: DCStacContainer;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, "DCStacContainerStack");

    osmlVpc = new OSMLVpc(stack, "OSMLVpc", {
      account: test_account
    });

    // Mock dependencies
    dcStacContainer = new DCStacContainer(stack, "DCStacContainer", {
      account: test_account,
      osmlVpc: osmlVpc
    });
  });

  it("sets removal policy", () => {
    expect(dcStacContainer.removalPolicy).toBeDefined();
  });

  it("creates config if not provided", () => {
    expect(dcStacContainer.config).toBeDefined();
  });

  it("sets container image", () => {
    expect(dcStacContainer.dockerImageCode).toBeDefined();
  });
});
