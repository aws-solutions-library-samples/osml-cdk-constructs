/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { App, Stack } from "aws-cdk-lib";

import {
  MRDataplaneConfig,
  MRImagery,
  OSMLAccount,
  OSMLVpc,
  TSContainer,
  TSDataplane,
  TSDataplaneProps
} from "../../../lib";

describe("TSDataplane constructor", () => {
  let dataplane: TSDataplane;
  let app: App;
  let account: OSMLAccount;
  let stack: Stack;
  let osmlVpc: OSMLVpc;
  let tsContainer: TSContainer;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, "TSDataplaneStack");

    account = {
      id: "123456789012",
      name: "test",
      prodLike: true,
      region: "us-west-2"
    } as OSMLAccount;

    osmlVpc = new OSMLVpc(stack, "OSMLVpc", {
      account: account
    });

    tsContainer = new TSContainer(stack, "TSContainer", {
      account: account,
      buildFromSource: false,
      osmlVpc: osmlVpc
    });

    // dataplane = new TSDataplane(stack, "TSDataplane", {
    //   account: account,
    //   taskRole: undefined,
    //   osmlVpc: osmlVpc,
    //   containerImage: tsContainer.containerImage
    // });
  });

  it("sets the removal policy correctly based on prodLike flag", () => {
    // assert removal policy
  });

  it("calls this.setup() with props", () => {
    // spy on setup method
    // assert it was called
  });

  it("creates OSMLTable instance", () => {
    // assert jobTable property was set
  });

  // additional tests for other constructor logic
});
