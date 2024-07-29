/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { App, Stack } from "aws-cdk-lib";

import { DIDataplane, OSMLVpc } from "../../../lib";
import { test_account } from "../../test_account";

describe("DIDataplane constructor", () => {
  let app: App;
  let stack: Stack;
  let osmlVpc: OSMLVpc;
  let diDataplane: DIDataplane;

  describe("DIDataplane", () => {
    beforeAll(() => {
      app = new App();
      stack = new Stack(app, "DIDataplaneStack");

      osmlVpc = new OSMLVpc(stack, "OSMLVpc", {
        account: test_account
      });

      diDataplane = new DIDataplane(stack, "DIDataplane", {
        account: test_account,
        osmlVpc: osmlVpc,
        lambdaRole: undefined
      });
    });

    it("sets the removal policy correctly based on prodLike flag", () => {
      expect(diDataplane.removalPolicy).toBeDefined();
    });

    it("check if resources are created", () => {
      expect(diDataplane.lambdaFunction).toBeDefined();
      expect(diDataplane.inputTopic).toBeDefined();
      expect(diDataplane.stacTopic).toBeDefined();
      expect(diDataplane.config).toBeDefined();
    });
  });
});
