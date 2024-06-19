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
import { Construct } from "constructs";

import { OSMLAccount } from "./osml_account";
import { OSMLAuthorizer } from "./osml_authorizer/osml_authorizer";

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
}

/**
 * Represents the construct that attach authorizer to RestApi
 */
export class OSMLRestApi extends Construct {
  public requestAuthorizer: RequestAuthorizer;
  public restApi: RestApi;
  public integration: Integration;

  /**
   * Creates an instance of OSML Rest APi
   * @param {Construct} scope - The scope/stack in which to define this construct.
   * @param {string} id - The unique id of the construct within current scope.
   * @param {OSMLRestApiProps} props - The properties of this construct.
   */
  constructor(scope: Construct, id: string, props: OSMLRestApiProps) {
    super(scope, id);

    const osmlAuthorizer = new OSMLAuthorizer(this, `Authorizer${id}`, {
      account: props.account,
      name: props.name
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
