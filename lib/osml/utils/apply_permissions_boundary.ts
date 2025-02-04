/*
 * Copyright 2025 Amazon.com, Inc. or its affiliates.
 */

/**
 * Example Usage:
 *
 * ```typescript
 * import { App, Aspects } from "aws-cdk-lib";
 * import { ApplyPermissionsBoundaryAspect } from "osml-cdk-constructs";
 *
 * const app = new App();
 *
 * // Define the IAM permissions boundary ARN
 * const permissionsBoundaryArn = `arn:aws:iam::${process.env.CDK_DEFAULT_ACCOUNT}:policy/MyPermissionsBoundary`;
 *
 * // Apply the aspect to enforce permissions boundaries on all IAM roles
 * Aspects.of(app).add(new ApplyPermissionsBoundaryAspect({ permissionsBoundaryArn }));
 *
 * // Define your CDK stacks here
 * // new MyStack(app, "MyStack");
 *
 * app.synth();
 * ```
 *
 * This ensures that all IAM roles created in the CDK application
 * will inherit the specified permissions boundary automatically.
 */

import { IAspect } from "aws-cdk-lib";
import { CfnRole, Role } from "aws-cdk-lib/aws-iam";
import { IConstruct } from "constructs";

/**
 * Represents the properties required to define the ApplyPermissionsBoundary.
 *
 * @interface ApplyPermissionsBoundaryProps
 */
export interface ApplyPermissionsBoundaryProps {
  /**
   * The ARN of the IAM permissions boundary policy to apply.
   *
   * @type {string}
   */
  permissionsBoundaryArn: string;
}

/**
 * Represents an aspect that enforces an IAM permissions boundary on all IAM roles
 * created within the CDK application.
 *
 * This ensures that every role explicitly inherits the permissions boundary,
 * maintaining compliance with security policies and governance frameworks.
 */
export class ApplyPermissionsBoundary implements IAspect {
  /**
   * The ARN of the permissions boundary policy to be applied.
   */
  private readonly permissionsBoundaryArn: string;

  /**
   * Creates an instance of ApplyPermissionsBoundary.
   *
   * @param {ApplyPermissionsBoundaryProps} props - The properties required to configure this aspect.
   * @returns {ApplyPermissionsBoundary} - The ApplyPermissionsBoundary instance.
   */
  constructor(props: ApplyPermissionsBoundaryProps) {
    this.permissionsBoundaryArn = props.permissionsBoundaryArn;
  }

  /**
   * Visits constructs in the CDK tree and applies the IAM permissions boundary
   * to all IAM roles.
   *
   * This method checks if the construct is an instance of Role, retrieves its
   * CloudFormation resource (CfnRole), and explicitly sets the permissions boundary.
   *
   * @param {IConstruct} node - The construct node being visited.
   */
  visit(node: IConstruct): void {
    if (node instanceof Role) {
      const cfnRole = node.node.defaultChild as CfnRole;
      if (cfnRole) {
        cfnRole.permissionsBoundary = this.permissionsBoundaryArn;
      }
    }
  }
}
