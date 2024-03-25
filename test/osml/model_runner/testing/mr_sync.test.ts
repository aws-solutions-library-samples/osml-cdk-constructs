/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { App, Stack } from "aws-cdk-lib";

import { MRSync, OSMLAccount } from "../../../../lib";

describe("MRSync", () => {
  let app: App;
  let account: OSMLAccount;
  let stack: Stack;
  let mrSync: MRSync;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, "MRSyncStack");

    account = {
      id: "123456789012",
      name: "test",
      prodLike: true,
      region: "us-west-2"
    } as OSMLAccount;
  });

  it("creates bucket with default config", () => {
    mrSync = new MRSync(stack, "MRSync", {
      account: account
    });

    expect(mrSync.resultsBucket).toBeDefined();
  });

  it("creates stream with default config", () => {
    mrSync = new MRSync(stack, "MRSync", {
      account: account
    });

    expect(mrSync.resultStream).toBeDefined();
  });

  it("does not create resources if disabled", () => {
    mrSync = new MRSync(stack, "Test", {
      account: account,
      deploySyncBucket: false
    });

    // assert no bucket
    expect(mrSync.resultsBucket).toBeUndefined();
  });
});
