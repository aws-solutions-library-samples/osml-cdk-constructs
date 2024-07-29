/*
 * Copyright 2023-2024 Amazon.com, Inc. or its affiliates.
 */

import { App, Stack } from "aws-cdk-lib";

import { MEHTTPRole, MESMRole, MRTaskRole } from "../../lib";
import { test_account } from "../test_account";

describe("OSMLRolesStack", () => {
  let app: App;
  let stack: Stack;
  let mrTaskRole: MRTaskRole;
  let meSMRole: MESMRole;
  let meHTTPRole: MEHTTPRole;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, "OSMLRolesStack");

    mrTaskRole = new MRTaskRole(stack, "MRTaskRole", {
      account: test_account,
      roleName: "test"
    });

    meSMRole = new MESMRole(stack, "MESMRole", {
      account: test_account,
      roleName: "test"
    });

    meHTTPRole = new MEHTTPRole(stack, "HTTPEndpointTaskRole", {
      account: test_account,
      roleName: "test"
    });
  });

  it("creates an MRTaskRole", () => {
    expect(mrTaskRole.role).toBeDefined();
  });

  it("creates a MESMRole", () => {
    expect(meSMRole.role).toBeDefined();
  });

  it("creates a MEHTTPRole", () => {
    expect(meHTTPRole.role).toBeDefined();
  });
});
