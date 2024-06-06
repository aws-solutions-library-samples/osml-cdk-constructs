/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { App, Stack } from "aws-cdk-lib";

import { DCLambdaRole } from "../../../../lib";
import { test_account } from "../../../test_account";

describe("DCLambdaRole", () => {
  let app: App;
  let stack: Stack;
  let dcLambdaRole: DCLambdaRole;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, "DCLambdaRoleStack");

    // Mock dependencies
    dcLambdaRole = new DCLambdaRole(stack, "DCLambdaRole", {
      account: test_account,
      roleName: "DCLambdaRoleName"
    });
  });

  it("check if resources are created", () => {
    expect(dcLambdaRole.role).toBeDefined();
  });
});
