/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { App, Stack } from "aws-cdk-lib";

import {
  MRAutoScaling,
  MRAutoscalingConfig,
  MRContainer,
  MRDataplane,
  OSMLAccount,
  OSMLVpc
} from "../../../../lib";

describe("MRAutoScaling constructor", () => {
  let app: App;
  let account: OSMLAccount;
  let stack: Stack;
  let osmlVpc: OSMLVpc;
  let mrContainer: MRContainer;
  let mrDataplane: MRDataplane;
  let mrAutoScaling: MRAutoScaling;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, "MRAutoScalingStack");

    account = {
      id: "123456789012",
      name: "test",
      prodLike: true,
      region: "us-west-2"
    } as OSMLAccount;

    osmlVpc = new OSMLVpc(stack, "OSMLVpc", {
      account: account
    });

    mrContainer = new MRContainer(stack, "MRContainer", {
      account: account,
      buildFromSource: false,
      osmlVpc: osmlVpc
    });

    mrDataplane = new MRDataplane(stack, "MRDataplane", {
      account: account,
      taskRole: undefined,
      osmlVpc: osmlVpc,
      mrContainerImage: mrContainer.containerImage
    });

    const config = new MRAutoscalingConfig();
    config.MR_AUTOSCALING_TASK_MIN_COUNT = 5;
    config.MR_AUTOSCALING_TASK_MAX_COUNT = 5;
    (config.MR_AUTOSCALING_TASK_OUT_COOLDOWN = 3),
      (config.MR_AUTOSCALING_TASK_IN_COOLDOWN = 1),
      (config.MR_AUTOSCALING_TASK_IN_INCREMENT = 8),
      (config.MR_AUTOSCALING_TASK_OUT_INCREMENT = 8);

    mrAutoScaling = new MRAutoScaling(stack, "MRAutoScaling", {
      account: account,
      mrDataplane: mrDataplane,
      mrAutoscalingConfig: config
    });
  });

  it("check autoscaling config task max count", () => {
    expect(
      mrAutoScaling.mrAutoscalingConfig.MR_AUTOSCALING_TASK_MAX_COUNT
    ).toBe(5);
  });
});
