/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { App, RemovalPolicy, Stack } from "aws-cdk-lib";

import { MRImagery, MRImageryConfig, OSMLVpc } from "../../../../lib";
import { test_account } from "../../../test_account";

describe("MRImagery constructor", () => {
  let app: App;
  let stack: Stack;
  let osmlVpc: OSMLVpc;
  let mrImagery: MRImagery;
  let config: MRImageryConfig;
  describe("MRImagery", () => {
    beforeEach(() => {
      app = new App();
      stack = new Stack(app, "MRImageryStack");

      osmlVpc = new OSMLVpc(stack, "OSMLVpc", {
        account: test_account
      });

      config = new MRImageryConfig();
      config.S3_IMAGE_BUCKET = "jest-buckets";
      config.S3_TEST_IMAGES_PATH = "lib/"; // just used for replicating object(s)

      mrImagery = new MRImagery(stack, "MRImagery", {
        account: test_account,
        vpc: osmlVpc.vpc,
        mrImageryConfig: config
      });
    });

    it("sets removal policy based on prodLike flag", () => {
      expect(mrImagery.removalPolicy).toEqual(RemovalPolicy.RETAIN);
    });

    it("uses config if provided", () => {
      expect(mrImagery.mrImageryConfig).toEqual(config);
    });
  });
});
