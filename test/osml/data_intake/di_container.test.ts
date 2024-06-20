/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { App, Stack } from "aws-cdk-lib";
import { Runtime } from "aws-cdk-lib/aws-lambda";

import { DIContainer, OSMLVpc } from "../../../lib";
import { test_account } from "../../test_account";

describe("DIContainer", () => {
  let app: App;
  let stack: Stack;
  let osmlVpc: OSMLVpc;
  let diContainer: DIContainer;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, "TSContainerStack");

    osmlVpc = new OSMLVpc(stack, "OSMLVpc", {
      account: test_account
    });

    // Mock dependencies
    diContainer = new DIContainer(stack, "TSContainer", {
      account: test_account,
      buildFromSource: false,
      osmlVpc: osmlVpc,
      lambdaRuntime: Runtime.PROVIDED_AL2023
    });
  });

  it("sets removal policy", () => {
    expect(diContainer.removalPolicy).toBeDefined();
  });

  it("creates config if not provided", () => {
    expect(diContainer.config).toBeDefined();
  });

  it("sets container image", () => {
    expect(diContainer.dockerImageCode).toBeDefined();
  });
});
