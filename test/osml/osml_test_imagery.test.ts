/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { App, RemovalPolicy, Stack } from "aws-cdk-lib";

import { OSMLTestImagery, OSMLTestImageryConfig, OSMLVpc } from "../../lib";
import { test_account } from "../test_account";

describe("OSMLTestImagery constructor", () => {
  let app: App;
  let stack: Stack;
  let osmlVpc: OSMLVpc;
  let mrImagery: OSMLTestImagery;
  let config: OSMLTestImageryConfig;
  describe("OSMLTestImagery", () => {
    beforeEach(() => {
      app = new App();
      stack = new Stack(app, "TestImageryStack");

      osmlVpc = new OSMLVpc(stack, "OSMLVpc", {
        account: test_account
      });

      config = new OSMLTestImageryConfig();
      config.S3_IMAGE_BUCKET_PREFIX = "jest-buckets";
      config.S3_TEST_IMAGES_PATH = "lib/"; // just used for replicating object(s)

      mrImagery = new OSMLTestImagery(stack, "TestImagery", {
        account: test_account,
        vpc: osmlVpc.vpc,
        config: config
      });
    });

    it("sets removal policy based on prodLike flag", () => {
      expect(mrImagery.removalPolicy).toEqual(RemovalPolicy.RETAIN);
    });

    it("uses config if provided", () => {
      expect(mrImagery.config).toEqual(config);
    });
  });
});
