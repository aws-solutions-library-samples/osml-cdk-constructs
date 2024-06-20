/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { App, Stack } from "aws-cdk-lib";
import { Runtime } from "aws-cdk-lib/aws-lambda";

import { MEContainer, MREndpoints, OSMLVpc } from "../../../../lib";
import { test_account } from "../../../test_account";

describe("MREndpoints constructor", () => {
  let app: App;
  let stack: Stack;
  let osmlVpc: OSMLVpc;
  let meContainer: MEContainer;
  let mrEndpoints: MREndpoints;

  describe("MREndpoints", () => {
    beforeEach(() => {
      app = new App();
      stack = new Stack(app, "MREndpointsStack");

      osmlVpc = new OSMLVpc(stack, "OSMLVpc", {
        account: test_account
      });

      meContainer = new MEContainer(stack, "MEContainer", {
        account: test_account,
        buildFromSource: false,
        osmlVpc: osmlVpc,
        lambdaRuntime: Runtime.PROVIDED_AL2023
      });

      mrEndpoints = new MREndpoints(stack, "MREndpoints", {
        account: test_account,
        osmlVpc: osmlVpc,
        modelContainerUri: meContainer.containerUri,
        modelContainerImage: meContainer.containerImage
      });
    });

    it("sets the removal policy correctly based on prodLike flag", () => {
      expect(mrEndpoints.removalPolicy).toBeDefined();
    });

    it("check if the endpoints are being defined", () => {
      expect(mrEndpoints.mrModelEndpointsConfig).toBeDefined();
      expect(mrEndpoints.centerPointModelEndpoint).toBeDefined();
      expect(mrEndpoints.aircraftModelEndpoint).toBeDefined();
      expect(mrEndpoints.floodModelEndpoint).toBeDefined();
      expect(mrEndpoints.httpCenterpointModelEndpoint).toBeDefined();
    });
  });
});
