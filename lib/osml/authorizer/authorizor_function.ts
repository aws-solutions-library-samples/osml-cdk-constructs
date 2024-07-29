/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */
import { Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

import { OSMLAuth } from "../osml_auth";

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
}

/**
 * Represents the construct that creates Authorizer Lambda function
 */
export class OSMLAuthorizer extends Construct {
  // eslint-disable-next-line @typescript-eslint/ban-types
  public authorizerFunction: Function;

  /**
   * Creates an instance of OSMLAuthorizer Lambda Function
   * @param {Construct} scope - The scope/stack in which to define this construct.
   * @param {string} id - The unique id of the construct within current scope.
   * @param {OSMLAuthorizerProps} props - The properties of this construct.
   */
  constructor(scope: Construct, id: string, props: OSMLAuthorizerProps) {
    super(scope, id);

    this.authorizerFunction = new Function(this, `AuthorizerFunction${id}`, {
      functionName: `${props.name}-AuthorizerFunction`,
      runtime: Runtime.PYTHON_3_11,
      code: Code.fromAsset(
        "lib/osml-cdk-constructs/lib/osml/osml_authorizer/lambda",
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
