/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { App, Stack } from "aws-cdk-lib";

import { MRSync } from "../../../../lib";
import { test_account } from "../../../test_account";

describe("MRSync", () => {
  let app: App;
  let stack: Stack;
  let mrSync: MRSync;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, "MRSyncStack");
  });

  it("creates bucket with default config", () => {
    mrSync = new MRSync(stack, "MRSync", {
      account: test_account
    });

    expect(mrSync.resultsBucket).toBeDefined();
  });

  it("creates stream with default config", () => {
    mrSync = new MRSync(stack, "MRSync", {
      account: test_account
    });

    expect(mrSync.resultStream).toBeDefined();
  });

  it("does not create resources if disabled", () => {
    mrSync = new MRSync(stack, "Test", {
      account: test_account,
      deploySyncBucket: false
    });

    // assert no bucket
    expect(mrSync.resultsBucket).toBeUndefined();
  });
});
