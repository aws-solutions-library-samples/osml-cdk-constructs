/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { App, Stack } from "aws-cdk-lib";
import { Runtime } from "aws-cdk-lib/aws-lambda";

import { OSMLAccount, OSMLVpc, TSContainer } from "../../../lib";

describe("TSContainer", () => {
  let app: App;
  let account: OSMLAccount;
  let stack: Stack;
  let osmlVpc: OSMLVpc;

  let container: TSContainer;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, "TSContainerStack");

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
    container = new TSContainer(stack, "TSContainer", {
      account: account,
      buildFromSource: false,
      osmlVpc: osmlVpc,
      lambdaRuntime: Runtime.PROVIDED_AL2023
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
  });
});
