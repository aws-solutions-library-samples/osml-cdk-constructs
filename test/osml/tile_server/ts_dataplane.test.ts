/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { App, Stack } from "aws-cdk-lib";
import { Code, Runtime } from "aws-cdk-lib/aws-lambda";

import { OSMLVpc, TSContainer, TSDataplane } from "../../../lib";
import { test_account } from "../../test_account";

describe("TSDataplane constructor", () => {
  let app: App;
  let stack: Stack;
  let osmlVpc: OSMLVpc;
  let tsContainer: TSContainer;
  let tsDataplane: TSDataplane;

  beforeAll(() => {
    app = new App();
    stack = new Stack(app, "TSDataplaneStack");

    osmlVpc = new OSMLVpc(stack, "OSMLVpc", {
      account: test_account
    });

    tsContainer = new TSContainer(stack, "TSContainer", {
      account: test_account,
      buildFromSource: false,
      osmlVpc: osmlVpc,
      lambdaRuntime: Runtime.PROVIDED_AL2023
    });

    Object.defineProperty(Code, "fromAsset", {
      value: () => Code.fromInline("inline code")
    });

    tsDataplane = new TSDataplane(stack, "TSDataplane", {
      account: test_account,
      taskRole: undefined,
      osmlVpc: osmlVpc,
      containerImage: tsContainer.containerImage
    });
  });

  it("creates jobTable instance", () => {
    expect(tsDataplane.jobTable).toBeDefined();
  });
});
