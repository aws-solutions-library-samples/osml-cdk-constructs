/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { App, Stack } from "aws-cdk-lib";

import {
  MRAutoScaling,
  MRAutoscalingConfig,
  MRContainer,
  MRDataplane,
  OSMLVpc
} from "../../../../lib";
import { test_account } from "../../../test_account";

describe("MRAutoScaling constructor", () => {
  let app: App;
  let stack: Stack;
  let osmlVpc: OSMLVpc;
  let mrContainer: MRContainer;
  let mrDataplane: MRDataplane;
  let mrAutoScaling: MRAutoScaling;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, "MRAutoScalingStack");

    osmlVpc = new OSMLVpc(stack, "OSMLVpc", {
      account: test_account
    });

    mrContainer = new MRContainer(stack, "MRContainer", {
      account: test_account,
      buildFromSource: false,
      osmlVpc: osmlVpc
    });

    mrDataplane = new MRDataplane(stack, "MRDataplane", {
      account: test_account,
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
      account: test_account,
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
