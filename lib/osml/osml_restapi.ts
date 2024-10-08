/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */
import { Duration } from "aws-cdk-lib";
import {
  AuthorizationType,
  Cors,
  EndpointType,
  IdentitySource,
  Integration,
  RequestAuthorizer,
  RestApi
} from "aws-cdk-lib/aws-apigateway";
import { IRole } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

import { OSMLAuthorizer } from "./authorizer/authorizor_function";
import { OSMLAccount } from "./osml_account";
import { OSMLAuth } from "./osml_auth";
import { OSMLVpc } from "./osml_vpc";

/**
 * Represents the properties required to configure the OSMLRestApi Construct.
 * @interface
 */
export interface OSMLRestApiProps {
  /**
   * The configuration for the authentication.
   *
   * @type {OSMLAuth}
   */
  account: OSMLAccount;

  /**
   * The name of the service
   *
   * @type {string}
   */
  name: string;

  /**
   * The name of the stage deployment for RestApi
   *
   * @type {string}
   */
  apiStageName: string;

  /**
   * The integration for the handler of the RestApi
   *
   * @type {Integration}
   */
  integration: Integration;

  /**
   * The configuration for the authentication.
   *
   * @type {OSMLAuth}
   */
  auth: OSMLAuth;

  /**
   * The OSML VPC (Virtual Private Cloud) configuration for the Dataplane.
   * @type {OSMLVpc}
   */
  osmlVpc: OSMLVpc;

  /**
   * The IAM role for the Lambda function.
   */
  lambdaRole?: IRole;
}

/**
 * Represents the construct that attach authorizer to RestApi
 */
export class OSMLRestApi extends Construct {
  public requestAuthorizer: RequestAuthorizer;
  public restApi: RestApi;

  /**
   * Creates an instance of OSML Rest APi
   * @param {Construct} scope - The scope/stack in which to define this construct.
   * @param {string} id - The unique id of the construct within current scope.
   * @param {OSMLRestApiProps} props - The properties of this construct.
   */
  constructor(scope: Construct, id: string, props: OSMLRestApiProps) {
    super(scope, id);

    const osmlAuthorizer = new OSMLAuthorizer(this, `Authorizer${id}`, {
      auth: props.auth,
      name: props.name,
      osmlVpc: props.osmlVpc,
      lambdaRole: props.lambdaRole
    });

    this.requestAuthorizer = new RequestAuthorizer(
      this,
      `RequestAuthorizer${id}`,
      {
        authorizerName: `${props.name}-Authorizer`,
        handler: osmlAuthorizer.authorizerFunction,
        identitySources: [IdentitySource.header("Authorization")],
        resultsCacheTtl: Duration.minutes(0)
      }
    );

    this.restApi = new RestApi(this, `RestApi${id}`, {
      restApiName: `${props.name}-RestApi`,
      deployOptions: {
        stageName: props.apiStageName
      },
      endpointTypes: [EndpointType.REGIONAL],
      defaultIntegration: props.integration,
      defaultMethodOptions: {
        requestParameters: {
          "method.request.path.proxy": true,
          "method.request.header.Accept": true
        },
        authorizer: this.requestAuthorizer,
        authorizationType: AuthorizationType.CUSTOM
      },
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowHeaders: Cors.DEFAULT_HEADERS,
        allowMethods: Cors.ALL_METHODS
      }
    });

    this.restApi.root.addProxy({
      anyMethod: true
    });
  }
}
