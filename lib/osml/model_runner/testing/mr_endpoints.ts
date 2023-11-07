/*
 * Copyright 2023 Amazon.com, Inc. or its affiliates.
 */
import { RemovalPolicy } from "aws-cdk-lib";
import { ContainerImage } from "aws-cdk-lib/aws-ecs";
import { IRole } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

import { OSMLHTTPModelEndpoint } from "../../model_endpoints/osml_http_endpoint";
import { OSMLHTTPEndpointRole } from "../../model_endpoints/osml_http_endpoint_role";
import { OSMLSMEndpoint } from "../../model_endpoints/osml_sm_endpoint";
import { OSMLAccount } from "../../osml_account";
import { OSMLVpc } from "../../osml_vpc";
import { MRSMRole } from "../roles/mr_sm_role";

/**
 * Configuration class for defining endpoints for OSML model endpoints.
 */
export class MRModelEndpointsConfig {
  /**
   * Constructor for MRModelEndpointsConfig.
   * @param {string} SM_CENTER_POINT_MODEL - The name of the SageMaker endpoint for the centerpoint model.
   * @param {string} SM_FLOOD_MODEL - The name of the SageMaker endpoint for the flood model.
   * @param {string} SM_AIRCRAFT_MODEL - The name of the SageMaker endpoint for the aircraft model.
   * @param {string} SM_ROLE_NAME - The name of the SageMaker execution role.
   * @param {number} SM_INITIAL_INSTANCE_COUNT - The initial number of SageMaker instances.
   * @param {number} SM_INITIAL_VARIANT_WEIGHT - The initial weight for the SageMaker variant.
   * @param {string} SM_VARIANT_NAME - The name of the SageMaker variant.
   * @param {string} SM_CPU_INSTANCE_TYPE - The SageMaker CPU instance type.
   * @param {string} SM_GPU_INSTANCE_TYPE - The SageMaker GPU instance type.
   * @param {string} SM_REPOSITORY_ACCESS_MODE - The repository access mode for SageMaker.
   * @param {string} HTTP_ENDPOINT_NAME - The name of the HTTP endpoint cluster.
   * @param {string} HTTP_ENDPOINT_ROLE_NAME - The name of the HTTP endpoint execution role.
   * @param {number} HTTP_ENDPOINT_HOST_PORT - The host port for the HTTP endpoint.
   * @param {number} HTTP_ENDPOINT_CONTAINER_PORT - The container port for the HTTP endpoint.
   * @param {number} HTTP_ENDPOINT_MEMORY - The memory allocation for the HTTP endpoint.
   * @param {number} HTTP_ENDPOINT_CPU - The CPU allocation for the HTTP endpoint.
   * @param {string} HTTP_ENDPOINT_HEALTHCHECK_PATH - The health check path for the HTTP endpoint.
   * @param {string} HTTP_ENDPOINT_DOMAIN_NAME - The domain name for the HTTP endpoint.
   */
  constructor(
    public SM_CENTER_POINT_MODEL: string = "centerpoint",
    public SM_FLOOD_MODEL: string = "flood",
    public SM_AIRCRAFT_MODEL: string = "aircraft",
    public SM_ROLE_NAME: string = "OSMLSageMakerRole",
    public SM_INITIAL_INSTANCE_COUNT: number = 1,
    public SM_INITIAL_VARIANT_WEIGHT: number = 1,
    public SM_VARIANT_NAME: string = "AllTraffic",
    public SM_CPU_INSTANCE_TYPE: string = "ml.m5.xlarge",
    public SM_GPU_INSTANCE_TYPE: string = "ml.p3.2xlarge",
    public SM_REPOSITORY_ACCESS_MODE: string = "Platform",
    public HTTP_ENDPOINT_NAME: string = "HTTPModelCluster",
    public HTTP_ENDPOINT_ROLE_NAME: string = "HTTPEndpointRole",
    public HTTP_ENDPOINT_HOST_PORT: number = 8080,
    public HTTP_ENDPOINT_CONTAINER_PORT: number = 8080,
    public HTTP_ENDPOINT_MEMORY: number = 16384,
    public HTTP_ENDPOINT_CPU: number = 4096,
    public HTTP_ENDPOINT_HEALTHCHECK_PATH: string = "/ping",
    public HTTP_ENDPOINT_DOMAIN_NAME: string = "test-http-model-endpoint"
  ) {}
}

/**
 * Represents the properties required to configure an MR (Model Router) model endpoints.
 *
 * @interface MRModelEndpointsProps
 */
export interface MRModelEndpointsProps {
  /**
   * The OSML (OversightML) account associated with the model endpoints.
   *
   * @type {OSMLAccount}
   */
  account: OSMLAccount;

  /**
   * The OSML (OversightML) VPC (Virtual Private Cloud) where the model will be deployed.
   *
   * @type {OSMLVpc}
   */
  osmlVpc: OSMLVpc;

  /**
   * The container image for the model to be deployed.
   *
   * @type {ContainerImage}
   */
  modelContainerImage: ContainerImage;

  /**
   * The URI (Uniform Resource Identifier) for the model container.
   *
   * @type {string}
   */
  modelContainerUri: string;

  /**
   * (Optional) The IAM role to assume when making HTTP requests to the model endpoint.
   *
   * @type {IRole}
   */
  httpEndpointRole?: IRole;

  /**
   * (Optional) Configuration settings for MR (Model Router) model endpoints.
   *
   * @type {MRModelEndpointsConfig}
   */
  mrModelEndpointsConfig?: MRModelEndpointsConfig;

  /**
   * (Optional) The IAM role to assume when deploying the model.
   *
   * @type {IRole}
   */
  smRole?: IRole;

  /**
   * (Optional) The security group ID associated with the model's security settings.
   *
   * @type {string}
   */
  securityGroupId?: string;

  /**
   * (Optional) Indicates whether to deploy a centerpoint model.
   *
   * @type {boolean}
   */
  deployCenterpointModel?: boolean;

  /**
   * (Optional) Indicates whether to deploy a flood model.
   *
   * @type {boolean}
   */
  deployFloodModel?: boolean;

  /**
   * (Optional) Indicates whether to deploy an aircraft model.
   *
   * @type {boolean}
   */
  deployAircraftModel?: boolean;

  /**
   * (Optional) Indicates whether to deploy an HTTP centerpoint model.
   *
   * @type {boolean}
   */
  deployHttpCenterpointModel?: boolean;
}

/**
 * Represents an AWS CDK Construct for managing Model Registry (MR) endpoints.
 */
export class MREndpoints extends Construct {
  /**
   * The removal policy for the construct.
   */
  public removalPolicy: RemovalPolicy;

  /**
   * Configuration for MR Model Endpoints.
   */
  public mrModelEndpointsConfig: MRModelEndpointsConfig;

  /**
   * Optional SageMaker role for MR operations.
   */
  public smRole?: IRole;

  /**
   * Optional HTTP Endpoint role for MR operations.
   */
  public httpEndpointRole?: IRole;

  /**
   * HTTP model endpoint for the center point model.
   */
  public httpCenterpointModelEndpoint?: OSMLHTTPModelEndpoint;

  /**
   * SM model endpoint for the center point model.
   */
  public centerPointModelEndpoint?: OSMLSMEndpoint;

  /**
   * SM model endpoint for the flood model.
   */
  public floodModelEndpoint?: OSMLSMEndpoint;

  /**
   * SM model endpoint for the aircraft model.
   */
  public aircraftModelEndpoint?: OSMLSMEndpoint;

  /**
   * Security Group ID associated with the endpoints.
   */
  public securityGroupId: string;

  /**
   * Creates an MRTesting construct.
   * @param {Construct} scope - The scope/stack in which to define this construct.
   * @param {string} id - The id of this construct within the current scope.
   * @param {MRModelEndpointsProps} props - The properties of this construct.
   * @returns MREndpoints - The MRTesting construct.
   */
  constructor(scope: Construct, id: string, props: MRModelEndpointsProps) {
    super(scope, id);

    // Check if a custom config was provided
    if (props.mrModelEndpointsConfig != undefined) {
      // Import existing passed-in MR configuration
      this.mrModelEndpointsConfig = props.mrModelEndpointsConfig;
    } else {
      // Create a new default configuration
      this.mrModelEndpointsConfig = new MRModelEndpointsConfig();
    }

    // Set up a removal policy
    this.removalPolicy = props.account.prodLike
      ? RemovalPolicy.RETAIN
      : RemovalPolicy.DESTROY;

    // Check if a SageMaker role was provided
    if (props.smRole != undefined) {
      // Import custom SageMaker endpoint role
      this.smRole = props.smRole;
    } else {
      // Create a new role
      this.smRole = new MRSMRole(this, "MRSMRole", {
        account: props.account,
        roleName: this.mrModelEndpointsConfig.SM_ROLE_NAME
      }).role;
    }

    if (
      props.deployHttpCenterpointModel != false ||
      props.deployCenterpointModel != false ||
      props.deployAircraftModel != false ||
      props.deployFloodModel != false
    ) {
      // If a custom security group was provided
      if (props.securityGroupId) {
        this.securityGroupId = props.securityGroupId;
      } else {
        this.securityGroupId = props.osmlVpc.vpcDefaultSecurityGroup;
      }
    }
    if (props.deployHttpCenterpointModel != false) {
      // Check if a role was provided for the HTTP endpoint
      if (props.httpEndpointRole != undefined) {
        // Import passed custom role for the HTTP endpoint
        this.httpEndpointRole = props.httpEndpointRole;
      } else {
        // Create a new role for the HTTP endpoint
        this.httpEndpointRole = new OSMLHTTPEndpointRole(
          this,
          "HTTPEndpointTaskRole",
          {
            account: props.account,
            roleName: this.mrModelEndpointsConfig.HTTP_ENDPOINT_ROLE_NAME
          }
        ).role;
      }

      // Build a Fargate HTTP endpoint from the centerpoint model container
      this.httpCenterpointModelEndpoint = new OSMLHTTPModelEndpoint(
        this,
        "OSMLHTTPCenterPointModelEndpoint",
        {
          account: props.account,
          osmlVpc: props.osmlVpc,
          image: props.modelContainerImage,
          clusterName: this.mrModelEndpointsConfig.HTTP_ENDPOINT_NAME,
          role: this.httpEndpointRole,
          memory: this.mrModelEndpointsConfig.HTTP_ENDPOINT_MEMORY,
          cpu: this.mrModelEndpointsConfig.HTTP_ENDPOINT_CPU,
          hostPort: this.mrModelEndpointsConfig.HTTP_ENDPOINT_HOST_PORT,
          containerPort:
            this.mrModelEndpointsConfig.HTTP_ENDPOINT_CONTAINER_PORT,
          healthcheckPath:
            this.mrModelEndpointsConfig.HTTP_ENDPOINT_HEALTHCHECK_PATH,
          loadBalancerName:
            this.mrModelEndpointsConfig.HTTP_ENDPOINT_DOMAIN_NAME,
          containerEnv: {
            MODEL_SELECTION: this.mrModelEndpointsConfig.SM_CENTER_POINT_MODEL
          },
          securityGroupId: this.securityGroupId
        }
      );
    }

    if (props.deployCenterpointModel != false) {
      // Build an SM endpoint from the centerpoint model container
      this.centerPointModelEndpoint = new OSMLSMEndpoint(
        this,
        "OSMLCenterPointModelEndpoint",
        {
          ecrContainerUri: props.modelContainerUri,
          modelName: this.mrModelEndpointsConfig.SM_CENTER_POINT_MODEL,
          roleArn: this.smRole.roleArn,
          instanceType: this.mrModelEndpointsConfig.SM_CPU_INSTANCE_TYPE,
          initialInstanceCount:
            this.mrModelEndpointsConfig.SM_INITIAL_INSTANCE_COUNT,
          initialVariantWeight:
            this.mrModelEndpointsConfig.SM_INITIAL_VARIANT_WEIGHT,
          variantName: this.mrModelEndpointsConfig.SM_VARIANT_NAME,
          repositoryAccessMode:
            this.mrModelEndpointsConfig.SM_REPOSITORY_ACCESS_MODE,
          securityGroupId: this.securityGroupId,
          subnetIds: props.osmlVpc.selectedSubnets.subnetIds
        }
      );
    }

    if (props.deployFloodModel != false) {
      // Build an SM endpoint from the flood model container
      this.floodModelEndpoint = new OSMLSMEndpoint(
        this,
        "OSMLFloodModelEndpoint",
        {
          ecrContainerUri: props.modelContainerUri,
          modelName: this.mrModelEndpointsConfig.SM_FLOOD_MODEL,
          roleArn: this.smRole.roleArn,
          instanceType: this.mrModelEndpointsConfig.SM_CPU_INSTANCE_TYPE,
          initialInstanceCount:
            this.mrModelEndpointsConfig.SM_INITIAL_INSTANCE_COUNT,
          initialVariantWeight:
            this.mrModelEndpointsConfig.SM_INITIAL_VARIANT_WEIGHT,
          variantName: this.mrModelEndpointsConfig.SM_VARIANT_NAME,
          repositoryAccessMode:
            this.mrModelEndpointsConfig.SM_REPOSITORY_ACCESS_MODE,
          securityGroupId: this.securityGroupId,
          subnetIds: props.osmlVpc.selectedSubnets.subnetIds
        }
      );
    }

    if (props.deployAircraftModel != false) {
      // Build an SM endpoint from the aircraft model container
      this.aircraftModelEndpoint = new OSMLSMEndpoint(
        this,
        "OSMLAircraftModelEndpoint",
        {
          ecrContainerUri: props.modelContainerUri,
          modelName: this.mrModelEndpointsConfig.SM_AIRCRAFT_MODEL,
          roleArn: this.smRole.roleArn,
          instanceType: this.mrModelEndpointsConfig.SM_GPU_INSTANCE_TYPE,
          initialInstanceCount:
            this.mrModelEndpointsConfig.SM_INITIAL_INSTANCE_COUNT,
          initialVariantWeight:
            this.mrModelEndpointsConfig.SM_INITIAL_VARIANT_WEIGHT,
          variantName: this.mrModelEndpointsConfig.SM_VARIANT_NAME,
          repositoryAccessMode:
            this.mrModelEndpointsConfig.SM_REPOSITORY_ACCESS_MODE,
          securityGroupId: this.securityGroupId,
          subnetIds: props.osmlVpc.selectedSubnets.subnetIds
        }
      );
    }
  }
}
