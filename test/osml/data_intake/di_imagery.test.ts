/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { App, RemovalPolicy, Stack } from "aws-cdk-lib";

import { DIImagery, DIImageryConfig, OSMLVpc } from "../../../lib";
import { test_account } from "../../test_account";

describe("DIImagery constructor", () => {
  let app: App;
  let stack: Stack;
  let osmlVpc: OSMLVpc;
  let diImagery: DIImagery;
  let config: DIImageryConfig;
  describe("DIImagery", () => {
    beforeEach(() => {
      app = new App();
      stack = new Stack(app, "DIImageryStack");

      osmlVpc = new OSMLVpc(stack, "OSMLVpc", {
        account: test_account
      });

      config = new DIImageryConfig();
      config.S3_IMAGE_BUCKET = "jest-buckets";
      config.S3_TEST_IMAGES_PATH = "lib/"; // just used for replicating object(s)

      diImagery = new DIImagery(stack, "DIImagery", {
        account: test_account,
        vpc: osmlVpc.vpc,
        config: config
      });
    });

    it("sets removal policy based on prodLike flag", () => {
      expect(diImagery.removalPolicy).toEqual(RemovalPolicy.RETAIN);
    });

    it("uses config if provided", () => {
      expect(diImagery.config).toEqual(config);
    });
  });
});
