/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { App, Stack } from "aws-cdk-lib";
import { Code } from "aws-cdk-lib/aws-lambda";

import { OSMLAuthorizer } from "../../../lib";

describe("OSMLAuthorizer constructor", () => {
  let app: App;
  let stack: Stack;
  let authorizer: OSMLAuthorizer;

  describe("OSMLAuthorizer", () => {
    beforeAll(() => {
      app = new App();
      stack = new Stack(app, "OSMLAuthorizerStack");

      authorizer = new OSMLAuthorizer(stack, "TestOSMLAuthorizer", {
        auth: {
          authority: "https://example.com/authority",
          audience: "example-audience"
        },
        name: "example-authorizer"
      });
    });

    Object.defineProperty(Code, "fromAsset", {
      value: () => Code.fromInline("inline code")
    });

    it("ensure an authorizer exists", () => {
      expect(authorizer.authorizerFunction).toBeDefined();
    });
  });
});
