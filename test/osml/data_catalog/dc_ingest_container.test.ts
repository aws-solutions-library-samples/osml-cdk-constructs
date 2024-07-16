/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { App, Stack } from "aws-cdk-lib";

import { DCIngestContainer, OSMLVpc } from "../../../lib";
import { test_account } from "../../test_account";

describe("DCIngestContainer", () => {
  let app: App;
  let stack: Stack;
  let osmlVpc: OSMLVpc;
  let dcContainer: DCIngestContainer;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, "DCIngestContainerStack");

    osmlVpc = new OSMLVpc(stack, "OSMLVpc", {
      account: test_account
    });

    // Mock dependencies
    dcContainer = new DCIngestContainer(stack, "DCIngestContainer", {
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
