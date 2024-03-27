/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { App, RemovalPolicy, Stack } from "aws-cdk-lib";

import {
  OSMLVpc,
  TSImagery,
  TSImageryConfig,
  TSTestRunner
} from "../../../../lib";
import { test_account } from "../../../test_account";

describe("TSDataplane constructor", () => {
  let app: App;
  let stack: Stack;
  let osmlVpc: OSMLVpc;
  let tsTestRunner: TSTestRunner;
  let config: TSImageryConfig;
  let tsImagery: TSImagery;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, "TSDataplaneStack");

    osmlVpc = new OSMLVpc(stack, "OSMLVpc", {
      account: test_account
    });

    config = new TSImageryConfig();
    config.S3_IMAGE_BUCKET = "jest-buckets";
    config.S3_TEST_IMAGES_PATH = "lib/";

    tsImagery = new TSImagery(stack, "TSImagery", {
      account: test_account,
      vpc: osmlVpc.vpc,
      tsImageryConfig: config
    });

    tsTestRunner = new TSTestRunner(stack, "TSDataplane", {
      account: test_account,
      osmlVpc: osmlVpc,
      tsEndpoint: "https://localhost/latest",
      tsTestImageBucket: tsImagery.imageBucket.bucket.bucketName,
      buildFromSource: false
    });
  });

  it("sets removal policy based on prodLike flag", () => {
    expect(tsImagery.removalPolicy).toEqual(RemovalPolicy.RETAIN);
  });

  it("check of the ts integ runner is defined", () => {
    expect(tsTestRunner.lambdaIntegRunner.functionArn).toBeDefined();
  });
});
