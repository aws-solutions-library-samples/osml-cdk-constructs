/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { App, RemovalPolicy, Stack } from "aws-cdk-lib";

import {
  OSMLTestImagery,
  OSMLTestImageryConfig,
  OSMLVpc,
  TSTestRunnerContainer
} from "../../../../lib";
import { test_account } from "../../../test_account";

describe("TSDataplane constructor", () => {
  let app: App;
  let stack: Stack;
  let osmlVpc: OSMLVpc;
  let tsTestRunnerContainer: TSTestRunnerContainer;
  let config: OSMLTestImageryConfig;
  let tsImagery: OSMLTestImagery;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, "TSDataplaneStack");

    osmlVpc = new OSMLVpc(stack, "OSMLVpc", {
      account: test_account
    });

    config = new OSMLTestImageryConfig();
    config.S3_IMAGE_BUCKET_PREFIX = "jest-buckets";
    config.S3_TEST_IMAGES_PATH = "lib/";

    tsImagery = new OSMLTestImagery(stack, "TSImagery", {
      account: test_account,
      vpc: osmlVpc.vpc,
      config: config
    });

    tsTestRunnerContainer = new TSTestRunnerContainer(
      stack,
      "TSTestRunnerContainer",
      {
        account: test_account,
        osmlVpc: osmlVpc,
        tsEndpoint: "https://localhost/latest",
        tsTestImageBucket: tsImagery.imageBucket.bucket.bucketName,
        buildFromSource: false
      }
    );
  });

  it("sets removal policy based on prodLike flag", () => {
    expect(tsImagery.removalPolicy).toEqual(RemovalPolicy.RETAIN);
  });

  it("check of the ts test runner docker image code is defined", () => {
    expect(tsTestRunnerContainer.dockerImageCode).toBeDefined();
  });
});
