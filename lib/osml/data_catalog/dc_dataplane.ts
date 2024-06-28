/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { IAMClient, ListRolesCommand } from "@aws-sdk/client-iam";
import { Duration, RemovalPolicy, Size } from "aws-cdk-lib";
import { LambdaIntegration } from "aws-cdk-lib/aws-apigateway";
import { ISecurityGroup, Port, SecurityGroup } from "aws-cdk-lib/aws-ec2";
import {
  AnyPrincipal,
  CfnServiceLinkedRole,
  PolicyStatement
} from "aws-cdk-lib/aws-iam";
import { IRole } from "aws-cdk-lib/aws-iam/lib/role";
import {
  ApplicationLogLevel,
  DockerImageCode,
  DockerImageFunction,
  LoggingFormat
} from "aws-cdk-lib/aws-lambda";
import { Domain, EngineVersion } from "aws-cdk-lib/aws-opensearchservice";
import { Construct } from "constructs";

import { OSMLAccount } from "../osml_account";
import { OSMLECRDeployment } from "../osml_ecr_deployment";
import { OSMLRestApi } from "../osml_restapi";
import { OSMLVpc } from "../osml_vpc";
import { DCLambdaRole } from "./roles/dc_lambda_role";

/**
 * Represents the configuration for the DCDataplane Construct.
 */
export class DCDataplaneConfig {
  /**
   * Creates an instance of DCDataplaneConfig.
   * @param {string} LAMBDA_ROLE_NAME The name of the Lambda role.
   * @param {string} LAMBDA_FUNCTION_NAME The name of the Lambda function.
   * @param {number} LAMBDA_MEMORY_SIZE The memory size of the Lambda function.
   * @param {number} LAMBDA_STORAGE_SIZE The storage size of the Lambda function.
   * @param {number} LAMBDA_TIMEOUT The timeout of the Lambda function.
   * @param {number} OS_DATA_NODES The number of data nodes in the OpenSearch cluster.
   * @param {number} OS_EBS_SIZE The EBS size of the OpenSearch cluster.
   * @param {string} STAC_FASTAPI_TITLE The title of the STAC FastAPI application.
   * @param {string} STAC_FASTAPI_DESCRIPTION The description of the STAC FastAPI application.
   * @param {string} STAC_FASTAPI_VERSION The version of the STAC FastAPI application.
   * @param {string} RELOAD A boolean indicating whether to reload the application.
   * @param {string} ENVIRONMENT The environment of the application.
   * @param {string} WEB_CONCURRENCY The web concurrency of the application.
   * @param {string} ES_PORT The port of the OpenSearch cluster.
   * @param {string} ES_USE_SSL A boolean to use SSL
   * @param {string} STAC_FASTAPI_ROOT_PATH The root path for FASTAPI that is set by APIGateway
   * @param {string} SERVICE_NAME_ABBREVIATION The name of the service in abbreviation.
   */
  constructor(
    public LAMBDA_ROLE_NAME: string = "DCLambdaRole",
    public LAMBDA_FUNCTION_NAME: string = "DCLambda",
    public LAMBDA_MEMORY_SIZE: number = 4096,
    public LAMBDA_STORAGE_SIZE: number = 10,
    public LAMBDA_TIMEOUT: number = 300, // 5 minutes
    public OS_DATA_NODES: number = 4,
    public OS_EBS_SIZE: number = 10,
    public STAC_FASTAPI_TITLE: string = "stac-fastapi-opensearch",
    public STAC_FASTAPI_DESCRIPTION: string = "A STAC FastAPI with an OpenSearch backend",
    public STAC_FASTAPI_VERSION: string = "2.4.1",
    public RELOAD: string = "true",
    public ENVIRONMENT: string = "local",
    public WEB_CONCURRENCY: string = "10",
    public ES_PORT: string = "443",
    public ES_USE_SSL: string = "true",
    public ES_VERIFY_CERTS: string = "true",
    public BACKEND: string = "opensearch",
    public STAC_FASTAPI_ROOT_PATH: string = "data-catalog",
    public SERVICE_NAME_ABBREVIATION: string = "DC"
  ) {}
}

/**
 * Interface representing the properties for the DCDataplane construct.
 */
export interface DCDataplaneProps {
  /**
   * The OSML deployment account.
   * @type {OSMLAccount}
   */
  account: OSMLAccount;

  /**
   * The OSML VPC (Virtual Private Cloud) configuration for the data server.
   * @type {OSMLVpc}
   */
  osmlVpc: OSMLVpc;

  /**
   * The Docker image code to use for the lambda function
   */
  dockerImageCode: DockerImageCode;

  /**
   * The security group ID to use for the data server (optional).
   * @type {string | undefined}
   */
  securityGroupId?: string;

  /**
   * The IAM (Identity and Access Management) role to be used for Lambda (optional).
   * @type {IRole | undefined}
   */
  lambdaRole?: IRole;

  /**
   * Custom configuration for the DCDataplane Construct (optional).
   * @type {DCDataplaneConfig | undefined}
   */
  config?: DCDataplaneConfig;
}

/**
 * Represents a construct responsible for deploying an ECR container image
 * for the data catalog Lambda.
 */
export class DCDataplane extends Construct {
  public removalPolicy: RemovalPolicy;
  public config: DCDataplaneConfig;
  public dockerImageCode: DockerImageCode;
  public securityGroup?: ISecurityGroup;
  public ecrDeployment: OSMLECRDeployment;
  public lambdaFunction: DockerImageFunction;
  public lambdaRole: IRole;
  /**
   * Creates an instance of DCDataplane.
   * @param {Construct} scope - The scope/stack in which to define this construct.
   * @param {string} id - The id of this construct within the current scope.
   * @param {DCDataplaneProps} props - The properties of this construct.
   * @returns DCDataplane - The DCDataplane instance.
   */
  constructor(scope: Construct, id: string, props: DCDataplaneProps) {
    super(scope, id);

    // Setup class from base properties
    this.setup(props);

    const opensearchSecurityGroup = new SecurityGroup(
      this,
      "DataCatalogOSSecurityGroup",
      {
        vpc: props.osmlVpc.vpc
      }
    );

    // Service-linked role that Amazon OpenSearch Service will use
    const iamClient = new IAMClient({
      region: props.account.region // Must be defined in the region
    });

    async () => {
      const response = await iamClient.send(
        new ListRolesCommand({
          PathPrefix: "/aws-service-role/opensearchservice.amazonaws.com/"
        })
      );

      // Only if the role for OpenSearch Service doesn't exist, it will be created.
      if (response.Roles && response.Roles.length == 0) {
        new CfnServiceLinkedRole(this, "OpensearchServiceLinkedRole", {
          awsServiceName: "es.amazonaws.com"
        });
      }
    };

    const osDomain = new Domain(this, "DataCatalogOSDomain", {
      version: EngineVersion.OPENSEARCH_2_11,
      nodeToNodeEncryption: true,
      enforceHttps: true,
      encryptionAtRest: {
        enabled: true
      },
      vpc: props.osmlVpc.vpc,
      capacity: {
        dataNodes: this.config.OS_DATA_NODES
      },
      vpcSubnets: [props.osmlVpc.selectedSubnets],
      removalPolicy: props.account.prodLike
        ? RemovalPolicy.RETAIN
        : RemovalPolicy.DESTROY,
      zoneAwareness: {
        enabled: true,
        availabilityZoneCount: props.osmlVpc.selectedSubnets.subnetIds.length
      },
      securityGroups: [opensearchSecurityGroup]
    });

    osDomain.addAccessPolicies(
      new PolicyStatement({
        principals: [new AnyPrincipal()],
        actions: ["es:ESHttp*"],
        resources: [osDomain.domainArn + "/*"]
      })
    );

    const dockerImageFunction = new DockerImageFunction(
      this,
      "DataCatalogOSFunction",
      {
        functionName: this.config.LAMBDA_FUNCTION_NAME,
        code: props.dockerImageCode,
        role: this.lambdaRole,
        vpc: props.osmlVpc.vpc,
        timeout: Duration.seconds(this.config.LAMBDA_TIMEOUT),
        ephemeralStorageSize: Size.gibibytes(this.config.LAMBDA_STORAGE_SIZE),
        memorySize: this.config.LAMBDA_MEMORY_SIZE,
        environment: {
          STAC_FASTAPI_TITLE: this.config.STAC_FASTAPI_TITLE,
          STAC_FASTAPI_DESCRIPTION: this.config.STAC_FASTAPI_DESCRIPTION,
          STAC_FASTAPI_VERSION: this.config.STAC_FASTAPI_VERSION,
          RELOAD: this.config.RELOAD,
          ENVIRONMENT: this.config.ENVIRONMENT,
          WEB_CONCURRENCY: this.config.WEB_CONCURRENCY,
          ES_HOST: osDomain.domainEndpoint,
          ES_PORT: this.config.ES_PORT,
          ES_USE_SSL: this.config.ES_USE_SSL,
          ES_VERIFY_CERTS: this.config.ES_VERIFY_CERTS,
          STAC_FASTAPI_ROOT_PATH: `/${this.config.STAC_FASTAPI_ROOT_PATH}`
        },
        applicationLogLevel: ApplicationLogLevel.ERROR,
        loggingFormat: LoggingFormat.JSON
      }
    );

    osDomain.connections.allowFrom(dockerImageFunction, Port.tcp(443));

    if (props.account.auth) {
      new OSMLRestApi(this, "DataCatalogRestApi", {
        account: props.account,
        name: this.config.SERVICE_NAME_ABBREVIATION,
        apiStageName: this.config.STAC_FASTAPI_ROOT_PATH,
        integration: new LambdaIntegration(dockerImageFunction)
      });
    }
  }

  /**
   * Sets up the DCDataplane construct with the provided properties.
   * This method initializes the construct's configuration based on the input properties,
   * configures security groups and IAM roles, and applies any custom configuration provided.
   * If no custom configuration is supplied, a default configuration will be created.
   *
   * @param {DCDataplaneProps} props - The properties used to configure the data server.
   *        Includes options for VPC configuration, IAM roles, security groups, and more.
   */
  setup(props: DCDataplaneProps): void {
    // Check if a custom configuration was provided
    if (props.config != undefined) {
      // Import existing passed-in DCDataplane configuration
      this.config = props.config;
    } else {
      // Create a new default configuration
      this.config = new DCDataplaneConfig();
    }

    // If a custom security group was provided
    if (props.securityGroupId) {
      this.securityGroup = SecurityGroup.fromSecurityGroupId(
        this,
        "DCImportSecurityGroup",
        props.securityGroupId
      );
    }

    // Setup a removal policy
    this.removalPolicy = props.account.prodLike
      ? RemovalPolicy.RETAIN
      : RemovalPolicy.DESTROY;

    // Create a lambda role if needed
    if (props.lambdaRole != undefined) {
      this.lambdaRole = props.lambdaRole;
    } else {
      this.lambdaRole = new DCLambdaRole(this, "DCLambdaRole", {
        account: props.account,
        roleName: this.config.LAMBDA_ROLE_NAME
      }).role;
    }
  }
}
