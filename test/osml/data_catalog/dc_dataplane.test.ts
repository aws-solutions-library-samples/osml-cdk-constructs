/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { App, Stack } from "aws-cdk-lib";

import { DCDataplane, OSMLVpc } from "../../../lib";
import { test_account } from "../../test_account";

describe("DCDataplane constructor", () => {
  let app: App;
  let stack: Stack;
  let osmlVpc: OSMLVpc;
  let dcDataplane: DCDataplane;

  describe("DCDataplane", () => {
    beforeEach(() => {
      app = new App();
      stack = new Stack(app, "DCDataplaneStack");

      osmlVpc = new OSMLVpc(stack, "OSMLVpc", {
        account: test_account
      });

      dcDataplane = new DCDataplane(stack, "DCDataplane", {
        account: test_account,
        osmlVpc: osmlVpc,
        lambdaRole: undefined
      });
    });

    it("sets the removal policy correctly based on prodLike flag", () => {
      expect(dcDataplane.removalPolicy).toBeDefined();
    });

    it("check if resources are created", () => {
      expect(dcDataplane.stacFunction).toBeDefined();
      expect(dcDataplane.ingestFunction).toBeDefined();
      expect(dcDataplane.config).toBeDefined();
    });
  });
});
