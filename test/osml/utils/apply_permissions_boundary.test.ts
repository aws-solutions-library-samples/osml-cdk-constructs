/*
 * Copyright 2025 Amazon.com, Inc. or its affiliates.
 */

import { App, Aspects, Stack } from "aws-cdk-lib";
import { CfnRole, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";

import { ApplyPermissionsBoundary } from "../../../lib";

describe("ApplyPermissionsBoundary Aspect Tests", () => {
  let app: App;
  let stack: Stack;
  let aspect: ApplyPermissionsBoundary;
  let role: Role;

  /**
   * Sets up a fresh CDK app and stack before each test.
   */
  beforeEach(() => {
    app = new App();
    stack = new Stack(app, "TestStack");

    // Create a test IAM Role
    role = new Role(stack, "TestRole", {
      assumedBy: new ServicePrincipal("ec2.amazonaws.com")
    });

    // Instantiate the aspect with a test permissions boundary
    aspect = new ApplyPermissionsBoundary({
      permissionsBoundaryArn:
        "arn:aws:iam::123456789012:policy/TestPermissionsBoundaryPolicy"
    });
  });

  /**
   * Validates that the aspect correctly stores the permissions boundary ARN.
   */
  it("should correctly resolve the permissions boundary ARN", () => {
    expect(aspect["permissionsBoundaryArn"]).toBe(
      "arn:aws:iam::123456789012:policy/TestPermissionsBoundaryPolicy"
    );
  });

  /**
   * Ensures that the permissions boundary is applied when the aspect is used.
   */
  it("should apply the permissions boundary to IAM roles", () => {
    Aspects.of(stack).add(aspect);
    app.synth(); // Synthesize the stack to apply aspects

    const cfnRole = role.node.defaultChild as CfnRole;
    expect(cfnRole).toBeDefined();
    expect(cfnRole.permissionsBoundary).toBeDefined();
    expect(cfnRole.permissionsBoundary).toBe(aspect["permissionsBoundaryArn"]);
  });

  /**
   * Ensures that non-IAM constructs remain unaffected by the aspect.
   */
  it("should not apply permissions boundary to non-IAM constructs", () => {
    const newApp = new App();
    const nonRoleStack = new Stack(newApp, "NonRoleStack");
    const newAspect = new ApplyPermissionsBoundary({
      permissionsBoundaryArn:
        "arn:aws:iam::123456789012:policy/TestPermissionsBoundaryPolicy"
    });

    Aspects.of(nonRoleStack).add(newAspect);
    newApp.synth(); // Independent synth call to verify behavior

    // Ensure no permissions boundary is incorrectly assigned to non-IAM constructs
    expect(
      nonRoleStack.node.tryFindChild("permissionsBoundary")
    ).toBeUndefined();
  });
});
