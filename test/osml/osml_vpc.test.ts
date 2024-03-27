/*
 * Copyright 2023-2024 Amazon.com, Inc. or its affiliates.
 */

import { App, Stack } from "aws-cdk-lib";
import { Vpc } from "aws-cdk-lib/aws-ec2";

import { OSMLVpc } from "../../lib/osml/osml_vpc";
import { test_account } from "../test_account";

describe("OSMLVpc", () => {
  let osmlVpc: OSMLVpc;
  let app: App;
  let stack: Stack;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, "OSMLVpcStack");

    osmlVpc = new OSMLVpc(stack, "OSMLVpc", {
      account: test_account
    });
  });

  it("sets removal policy based on account type", () => {
    // Get the removal policy
    const removalPolicy = osmlVpc.removalPolicy;

    // Assert it is set correctly based on account type
    if (test_account.prodLike) {
      expect(removalPolicy).toBe("retain");
    } else {
      expect(removalPolicy).toBe("destroy");
    }
  });

  it("creates VPC resource", () => {
    expect(osmlVpc.vpc).toBeInstanceOf(Vpc);
  });

  it("selects private subnets", () => {
    // Get the subnets that were selected
    const selectedSubnets = osmlVpc.vpc.privateSubnets;

    // Assert the number of subnets matches expectations
    expect(selectedSubnets).toHaveLength(2);
  });
});
