/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { App, Stack } from "aws-cdk-lib";

import { MRDataplane, MRDataplaneConfig, OSMLVpc } from "../../../lib";
import { test_account } from "../../test_account";

describe("MRDataplane constructor", () => {
  let app: App;
  let stack: Stack;
  let osmlVpc: OSMLVpc;
  let mrDataplane: MRDataplane;

  describe("MRDataplane", () => {
    beforeEach(() => {
      app = new App();
      stack = new Stack(app, "MRDataplaneStack");

      osmlVpc = new OSMLVpc(stack, "OSMLVpc", {
        account: test_account
      });

      mrDataplane = new MRDataplane(stack, "MRDataplane", {
        account: test_account,
        taskRole: undefined,
        osmlVpc: osmlVpc,
        config: new MRDataplaneConfig({
          ENABLE_REGION_STATUS: true
        })
      });
    });

    it("sets the removal policy correctly based on prodLike flag", () => {
      expect(mrDataplane.removalPolicy).toBeDefined();
    });

    it("check if OSMLTable(s) are created", () => {
      expect(mrDataplane.featureTable).toBeDefined();
      expect(mrDataplane.jobStatusTable).toBeDefined();
      expect(mrDataplane.regionRequestTable).toBeDefined();
      expect(mrDataplane.endpointStatisticsTable).toBeDefined();
      expect(mrDataplane.config).toBeDefined();
    });
  });
});
