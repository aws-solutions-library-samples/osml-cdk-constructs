/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { App, Stack } from "aws-cdk-lib";

import {
  MRContainer,
  MRDataplane,
  MRMonitoring,
  OSMLVpc
} from "../../../../lib";
import { test_account } from "../../../test_account";

describe("OSMLMonitoring constructor", () => {
  let app: App;
  let stack: Stack;
  let osmlVpc: OSMLVpc;
  let mrContainer: MRContainer;
  let mrDataplane: MRDataplane;
  let mrMonitoring: MRMonitoring;

  describe("MRMonitoring", () => {
    beforeEach(() => {
      app = new App();
      stack = new Stack(app, "MRMonitoringStack");

      osmlVpc = new OSMLVpc(stack, "OSMLVpc", {
        account: test_account
      });

      mrContainer = new MRContainer(stack, "MRContainer", {
        account: test_account,
        buildFromSource: false,
        osmlVpc: osmlVpc
      });

      mrDataplane = new MRDataplane(stack, "MRDataplane", {
        account: test_account,
        taskRole: undefined,
        osmlVpc: osmlVpc,
        mrContainerImage: mrContainer.containerImage
      });

      mrMonitoring = new MRMonitoring(stack, "MRMonitoring", {
        account: test_account,
        imageRequestQueue: mrDataplane.imageRequestQueue.queue,
        regionRequestQueue: mrDataplane.regionRequestQueue.queue,
        imageRequestDlQueue: mrDataplane.imageRequestQueue.dlQueue,
        regionRequestDlQueue: mrDataplane.regionRequestQueue.dlQueue,
        service: mrDataplane.fargateService,
        mrDataplaneConfig: mrDataplane.mrDataplaneConfig
      });
    });

    it("is dashboard with default widgets defined", () => {
      expect(mrMonitoring.mrDashboard).toBeDefined();
    });
  });
});
