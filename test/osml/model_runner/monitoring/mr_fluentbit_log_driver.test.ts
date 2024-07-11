/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { App, Stack } from "aws-cdk-lib";

import {
  MRContainer,
  MRDataplane,
  MRFluentBitLogDriver,
  OSMLVpc
} from "../../../../lib";
import { test_special_account } from "../../../test_account";

describe("MRFluentBitLogDriver constructor", () => {
  let app: App;
  let stack: Stack;
  let osmlVpc: OSMLVpc;
  let mrContainer: MRContainer;
  let mrFluentBitLogDriver: MRFluentBitLogDriver;
  let mrDataplane: MRDataplane;

  describe("MRFluentBitLogDriver", () => {
    beforeEach(() => {
      app = new App();
      stack = new Stack(app, "MRFluentBitLogDriverStack");

      osmlVpc = new OSMLVpc(stack, "OSMLVpc", {
        account: test_special_account
      });

      mrContainer = new MRContainer(stack, "MRContainer", {
        account: test_special_account,
        buildFromSource: false,
        osmlVpc: osmlVpc
      });

      mrDataplane = new MRDataplane(stack, "MRDataplane", {
        account: test_special_account,
        taskRole: undefined,
        osmlVpc: osmlVpc,
        mrContainerImage: mrContainer.containerImage
      });

      mrFluentBitLogDriver = new MRFluentBitLogDriver(
        stack,
        "MRFluentBitLogDriver",
        {
          account: test_special_account,
          logGroup: mrDataplane.logGroup,
          taskDefinition: mrDataplane.taskDefinition
        }
      );
    });

    it("sets up logging with default options w/ special regions", () => {
      expect(mrFluentBitLogDriver.logging).toBeDefined();
      expect(mrFluentBitLogDriver.fluentBitImage).toBeDefined();
    });
  });
});
