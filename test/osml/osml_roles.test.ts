/*
 * Copyright 2023-2024 Amazon.com, Inc. or its affiliates.
 */

import { App, Stack } from "aws-cdk-lib";

import { MESMRole, MRTaskRole, OSMLAccount, OSMLVpc } from "../../lib";
import { MEHTTPRole } from "../../lib/osml/model_endpoint/roles/me_http_role";

describe("OSMLRolesStack", () => {
  let app: App;
  let account: OSMLAccount;
  let stack: Stack;
  let mrTaskRole: MRTaskRole;
  let meSMRole: MESMRole;
  let meHTTPRole: MEHTTPRole;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, "OSMLRolesStack");

    account = {
      id: "123456789012",
      name: "test",
      prodLike: true,
      region: "us-west-2"
    } as OSMLAccount;

    mrTaskRole = new MRTaskRole(stack, "MRTaskRole", {
      account: account,
      roleName: "test"
    });

    meSMRole = new MESMRole(stack, "MESMRole", {
      account: account,
      roleName: "test"
    });

    meHTTPRole = new MEHTTPRole(stack, "HTTPEndpointTaskRole", {
      account: account,
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
