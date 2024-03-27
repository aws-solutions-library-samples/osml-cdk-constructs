/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { App, RemovalPolicy, Stack } from "aws-cdk-lib";

import { OSMLVpc, TSImagery, TSImageryConfig } from "../../../../lib";
import { test_account } from "../../../test_account";

describe("TSImagery constructor", () => {
  let app: App;
  let stack: Stack;
  let osmlVpc: OSMLVpc;
  let tsImagery: TSImagery;
  let config: TSImageryConfig;
  describe("TSImagery", () => {
    beforeEach(() => {
      app = new App();
      stack = new Stack(app, "TSImageryStack");

      osmlVpc = new OSMLVpc(stack, "OSMLVpc", {
        account: test_account
      });

      config = new TSImageryConfig();
      config.S3_IMAGE_BUCKET = "jest-buckets";
      config.S3_TEST_IMAGES_PATH = "lib/"; // just used for replicating object(s)

      tsImagery = new TSImagery(stack, "TSImagery", {
        account: test_account,
        vpc: osmlVpc.vpc,
        tsImageryConfig: config
      });
    });

    it("sets removal policy based on prodLike flag", () => {
      expect(tsImagery.removalPolicy).toEqual(RemovalPolicy.RETAIN);
    });

    it("uses config if provided", () => {
      expect(tsImagery.tsImageryConfig).toEqual(config);
    });
  });
});
