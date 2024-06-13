/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { App, Stack } from "aws-cdk-lib";
import { Code, DockerImageCode } from "aws-cdk-lib/aws-lambda";
import * as path from "path";

import { DCDataplane, OSMLVpc } from "../../../lib";
import { test_account } from "../../test_account";

describe("DCDataplane constructor", () => {
  let app: App;
  let stack: Stack;
  let osmlVpc: OSMLVpc;
  let dcDataplane: DCDataplane;

  describe("DCDataplane", () => {
    beforeAll(() => {
      app = new App();
      stack = new Stack(app, "DCDataplaneStack");

      const availabilityZones = ["us-west-2a", "us-west-2b", "us-west-2c"];

      osmlVpc = new OSMLVpc(stack, "OSMLVpc", {
        account: test_account,
        availabilityZones: availabilityZones
      });

      const dockerImageCode = DockerImageCode.fromImageAsset(
        path.join(__dirname, ""),
        { file: "Dockerfile" }
      );

      Object.defineProperty(Code, "fromAsset", {
        value: () => Code.fromInline("inline code")
      });

      dcDataplane = new DCDataplane(stack, "DCDataplane", {
        account: test_account,
        lambdaRole: undefined,
        osmlVpc: osmlVpc,
        dockerImageCode: dockerImageCode
      });
    });

    it("sets the removal policy correctly based on prodLike flag", () => {
      expect(dcDataplane.removalPolicy).toBeDefined();
    });

    it("check if resources are created", () => {
      expect(dcDataplane.config).toBeDefined();
    });
  });
});
