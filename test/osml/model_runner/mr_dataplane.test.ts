/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { App, Stack } from "aws-cdk-lib";

import { MRContainer, MRDataplane, OSMLAccount, OSMLVpc } from "../../../lib";

describe("MRDataplane constructor", () => {
  let app: App;
  let account: OSMLAccount;
  let stack: Stack;
  let osmlVpc: OSMLVpc;
  let mrContainer: MRContainer;
  let mrDataplane: MRDataplane;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, "MRDataplaneStack");

    account = {
      id: "123456789012",
      name: "test",
      prodLike: true,
      region: "us-west-2"
    } as OSMLAccount;

    osmlVpc = new OSMLVpc(stack, "OSMLVpc", {
      account: account
    });

    mrContainer = new MRContainer(stack, "MRContainer", {
      account: account,
      buildFromSource: false,
      osmlVpc: osmlVpc
    });

    mrDataplane = new MRDataplane(stack, "MRDataplane", {
      account: account,
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
