/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */
import { SecurityGroup } from "aws-cdk-lib/aws-ec2";
import { IRole } from "aws-cdk-lib/aws-iam";
import { Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

import { OSMLAuth } from "../osml_auth";
import { OSMLVpc } from "../osml_vpc";

/**
 * Represents the properties required to configure the OSMLAuthorizer Construct.
 * @interface
 */
export interface OSMLAuthorizerProps {
  /**
   * The configuration for the authentication.
   *
   * @type {OSMLAuth}
   */
  auth: OSMLAuth;

  /**
   * The name of the service
   *
   * @type {string}
   */
  name: string;

  /**
   * The OSML VPC (Virtual Private Cloud) configuration for the Dataplane.
   * @type {OSMLVpc}
   */
  osmlVpc: OSMLVpc;

  /**
   * The optional security group ID to use for this resource.
   * @type {string}
   */
  securityGroup?: string;

  /**
   * The optional IAM role for the Lambda function.
   */
  lambdaRole?: IRole;
}

/**
 * Represents the construct that creates Authorizer Lambda function
 */
export class OSMLAuthorizer extends Construct {
  /**
   * The Lambda function used as the Authorizer.
   * @type {Function}
   */
  public authorizerFunction: Function;

  /**
   * The ID of the security group associated with the Authorizer function.
   * @type {string}
   */
  public securityGroupId: string;

  /**
   * Creates an instance of OSMLAuthorizer Lambda Function
   * @param {Construct} scope - The scope/stack in which to define this construct.
   * @param {string} id - The unique id of the construct within current scope.
   * @param {OSMLAuthorizerProps} props - The properties of this construct.
   */
  constructor(scope: Construct, id: string, props: OSMLAuthorizerProps) {
    super(scope, id);

    this.securityGroupId =
      props.securityGroup ?? props.osmlVpc.vpcDefaultSecurityGroup;
    this.authorizerFunction = new Function(this, `AuthorizerFunction${id}`, {
      functionName: `${props.name}-AuthorizerFunction`,
      runtime: Runtime.PYTHON_3_11,
      vpc: props.osmlVpc.vpc,
      securityGroups: [
        SecurityGroup.fromSecurityGroupId(
          this,
          "AuthorizorImportSecurityGroup",
          this.securityGroupId
        )
      ],
      vpcSubnets: props.osmlVpc.selectedSubnets,
      role: props.lambdaRole,
      code: Code.fromAsset(
        "lib/osml-cdk-constructs/lib/osml/authorizer/lambda",
        {
          bundling: {
            image: Runtime.PYTHON_3_11.bundlingImage,
            command: [
              "/bin/bash",
              "-c",
              "pip install pyjwt requests cryptography -t /asset-output && cp -au . /asset-output"
            ]
          }
        }
      ),
      handler: "lambda_function.lambda_handler",
      environment: {
        AUTHORITY: props.auth ? props.auth.authority : "",
        AUDIENCE: props.auth ? props.auth.audience : ""
      }
    });
  }
}
