/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { App, Stack } from "aws-cdk-lib";
import { Runtime } from "aws-cdk-lib/aws-lambda";

import { MRContainer, OSMLVpc } from "../../../lib";
import { test_account } from "../../test_account";

describe("MRContainer", () => {
  let app: App;
  let stack: Stack;
  let osmlVpc: OSMLVpc;

  let container: MRContainer;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, "MRContainerStack");

    osmlVpc = new OSMLVpc(stack, "OSMLVpc", {
      account: test_account
    });

    // Mock dependencies
    container = new MRContainer(stack, "MRContainer", {
      account: test_account,
      buildFromSource: false,
      osmlVpc: osmlVpc,
      lambdaRuntime: Runtime.PROVIDED_AL2023
    });
  });

  it("sets removal policy", () => {
    expect(container.removalPolicy).toBeDefined();
  });

  it("creates config if not provided", () => {
    expect(container.mrAppContainerConfig).toBeDefined();
  });

  it("sets container image", () => {
    expect(container.containerImage).toBeDefined();
  });
});
