/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { App, Stack } from "aws-cdk-lib";
import { Code } from "aws-cdk-lib/aws-lambda";

import {
  DCDataplane,
  DCIngestContainer,
  DCStacContainer,
  OSMLVpc
} from "../../../lib";
import { test_account } from "../../test_account";

describe("DCDataplane constructor", () => {
  let app: App;
  let stack: Stack;
  let osmlVpc: OSMLVpc;
  let dcDataplane: DCDataplane;
  let dcStacContainer: DCStacContainer;
  let dcIngestContainer: DCIngestContainer;

  describe("DCDataplane", () => {
    beforeAll(() => {
      app = new App();
      stack = new Stack(app, "DCDataplaneStack");

      osmlVpc = new OSMLVpc(stack, "OSMLVpc", {
        account: test_account
      });

      dcIngestContainer = new DCIngestContainer(stack, "DCIngestContainer", {
        account: test_account,
        buildFromSource: false,
        osmlVpc: osmlVpc
      });

      dcStacContainer = new DCStacContainer(stack, "DCStacContainer", {
        account: test_account,
        buildFromSource: false,
        osmlVpc: osmlVpc
      });

      Object.defineProperty(Code, "fromAsset", {
        value: () => Code.fromInline("inline code")
      });

      dcDataplane = new DCDataplane(stack, "DCDataplane", {
        account: test_account,
        lambdaRole: undefined,
        osmlVpc: osmlVpc,
        stacCode: dcStacContainer.dockerImageCode,
        ingestCode: dcIngestContainer.dockerImageCode
      });
    });

    it("sets the removal policy correctly based on prodLike flag", () => {
      expect(dcDataplane.removalPolicy).toBeDefined();
    });

    it("check if resources are created", () => {
      expect(dcDataplane.config).toBeDefined();
    });
  });
});
