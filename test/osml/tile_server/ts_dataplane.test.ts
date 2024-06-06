/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { App, Stack } from "aws-cdk-lib";
import {
  ApplicationListener,
  CfnListener
} from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Code } from "aws-cdk-lib/aws-lambda";

import { OSMLAuth, OSMLVpc, TSContainer, TSDataplane } from "../../../lib";
import { test_account } from "../../test_account";

describe("TSDataplane constructor", () => {
  let app: App;
  let stack: Stack;
  let osmlVpc: OSMLVpc;
  let tsContainer: TSContainer;
  let tsDataplane: TSDataplane;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, "TSDataplaneStack");

    osmlVpc = new OSMLVpc(stack, "OSMLVpc", {
      account: test_account
    });

    tsContainer = new TSContainer(stack, "TSContainer", {
      account: test_account,
      buildFromSource: false,
      osmlVpc: osmlVpc
    });

    Object.defineProperty(Code, "fromAsset", {
      value: () => Code.fromInline("test code")
    });

    const authConfig: OSMLAuth = {
      clientId: "CLIENT_ID_TEST",
      clientSecret: "CLIENT_SECRET_TEST",
      authority: "AUTHORITY_TEST",
      certificateArn: "CERTIFICATE_ARN_TEST",
      domainName: "DOMAIN_TEST"
    };

    tsDataplane = new TSDataplane(stack, "TSDataplane", {
      account: test_account,
      taskRole: undefined,
      osmlVpc: osmlVpc,
      containerImage: tsContainer.containerImage,
      authConfig: authConfig
    });
  });

  it("creates jobTable instance", () => {
    expect(tsDataplane.jobTable).toBeDefined();
  });

  it("check if HTTPS listener is created", () => {
    let httpsProtocolFound = false;
    for (const child of tsDataplane.fargateService.loadBalancer.node.children) {
      if (child instanceof ApplicationListener) {
        for (const cfnListenerChild of child.node.children) {
          if (cfnListenerChild instanceof CfnListener) {
            if (cfnListenerChild.protocol === "HTTPS") {
              httpsProtocolFound = true;
              break;
            }
          }
        }
      }
    }

    expect(httpsProtocolFound).toBe(true);
  });
});
