/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { App, Stack } from "aws-cdk-lib";

import { MRDataplane, MRMonitoring, OSMLVpc } from "../../../lib";
import { test_account } from "../../test_account";

describe("OSMLMonitoring constructor", () => {
  let app: App;
  let stack: Stack;
  let osmlVpc: OSMLVpc;
  let mrDataplane: MRDataplane;
  let mrMonitoring: MRMonitoring;

  describe("MRMonitoring", () => {
    beforeAll(() => {
      app = new App();
      stack = new Stack(app, "MRMonitoringStack");

      osmlVpc = new OSMLVpc(stack, "OSMLVpc", {
        account: test_account
      });

      mrDataplane = new MRDataplane(stack, "MRDataplane", {
        account: test_account,
        taskRole: undefined,
        osmlVpc: osmlVpc
      });

      mrMonitoring = new MRMonitoring(stack, "MRMonitoring", {
        account: test_account,
        imageRequestQueue: mrDataplane.imageRequestQueue.queue,
        regionRequestQueue: mrDataplane.regionRequestQueue.queue,
        imageRequestDlQueue: mrDataplane.imageRequestQueue.dlQueue,
        regionRequestDlQueue: mrDataplane.regionRequestQueue.dlQueue,
        service: mrDataplane.fargateService,
        mrDataplaneConfig: mrDataplane.config
      });
    });

    it("is dashboard with default widgets defined", () => {
      expect(mrMonitoring.mrDashboard).toBeDefined();
    });
  });
});
