/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { App, Stack } from "aws-cdk-lib";
import { Integration, LambdaIntegration } from "aws-cdk-lib/aws-apigateway";
import { Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";

import { OSMLRestApi, OSMLVpc } from "../../lib";
import { test_account } from "../test_account";

describe("OSMLRestApi constructor", () => {
  let app: App;
  let stack: Stack;
  let mockIntegration: Integration;
  let mockHandler: Function;
  let restApi: OSMLRestApi;
  let osmlVpc: OSMLVpc;

  describe("OSMLRestApi", () => {
    beforeAll(() => {
      app = new App();
      stack = new Stack(app, "OSMLRestApiStack");
      osmlVpc = new OSMLVpc(stack, "OSMLVpc", {
        account: test_account
      });
      mockHandler = new Function(stack, "MockHandler", {
        runtime: Runtime.NODEJS_LATEST,
        handler: "index.handler",
        code: Code.fromInline("test")
      });

      mockIntegration = new LambdaIntegration(mockHandler);

      restApi = new OSMLRestApi(stack, "OSMLRestApi", {
        account: test_account,
        apiStageName: "test-api-stage",
        auth: {
          authority: "https://example.com/authority",
          audience: "example-audience"
        },
        integration: mockIntegration,
        name: "test-api",
        osmlVpc: osmlVpc
      });
    });

    Object.defineProperty(Code, "fromAsset", {
      value: () => Code.fromInline("inline code")
    });

    it("ensure an authorizer exists", () => {
      expect(restApi.restApi).toBeDefined();
      expect(restApi.requestAuthorizer).toBeDefined();
    });
  });
});
