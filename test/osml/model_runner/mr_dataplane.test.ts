/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { App, Stack } from "aws-cdk-lib";

import { MRContainer, MRDataplane, OSMLVpc } from "../../../lib";
import { test_account } from "../../test_account";

describe("MRDataplane constructor", () => {
  let app: App;
  let stack: Stack;
  let osmlVpc: OSMLVpc;
  let mrContainer: MRContainer;
  let mrDataplane: MRDataplane;

  describe("MRDataplane", () => {
    beforeEach(() => {
      app = new App();
      stack = new Stack(app, "MRDataplaneStack");

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
    });

    it("sets the removal policy correctly based on prodLike flag", () => {
      expect(mrDataplane.removalPolicy).toBeDefined();
    });

    it("check if OSMLTable(s) are created", () => {
      expect(mrDataplane.featureTable).toBeDefined();
      expect(mrDataplane.jobStatusTable).toBeDefined();
      expect(mrDataplane.regionRequestTable).toBeDefined();
      expect(mrDataplane.endpointStatisticsTable).toBeDefined();
    });
  });
});
