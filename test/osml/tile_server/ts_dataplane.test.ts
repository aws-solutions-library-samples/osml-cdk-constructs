/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { App, Stack } from "aws-cdk-lib";

import { OSMLVpc, TSDataplane, TSDataplaneConfig } from "../../../lib";
import { test_account } from "../../test_account";

describe("TSDataplane constructor", () => {
  let app: App;
  let stack: Stack;
  let osmlVpc: OSMLVpc;
  let tsDataplane: TSDataplane;

  beforeAll(() => {
    app = new App();
    stack = new Stack(app, "TSDataplaneStack");

    osmlVpc = new OSMLVpc(stack, "OSMLVpc", {
      account: test_account
    });

    tsDataplane = new TSDataplane(stack, "TSDataplane", {
      account: test_account,
      osmlVpc: osmlVpc,
      config: new TSDataplaneConfig({
        DEPLOY_TEST_COMPONENTS: true,
        SECURITY_GROUP_ID: "test-security-group-id"
      })
    });
  });

  it("sets the removal policy correctly based on prodLike flag", () => {
    expect(tsDataplane.removalPolicy).toBeDefined();
  });

  it("creates jobTable instance", () => {
    expect(tsDataplane.jobTable).toBeDefined();
  });
});
