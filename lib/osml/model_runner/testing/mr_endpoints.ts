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

// mutable configuration dataclass for the model runner testing Construct
// for a more detailed breakdown of the configuration see: configuration_guide.md in the documentation directory.
export class MRModelEndpointsConfig {
  constructor(
    // sagemaker endpoint params
    public SM_CENTER_POINT_MODEL = "centerpoint",
    public SM_FLOOD_MODEL = "flood",
    public SM_AIRCRAFT_MODEL = "aircraft",
    public SM_ROLE_NAME = "OSMLSageMakerRole",
    public SM_INITIAL_INSTANCE_COUNT = 1,
    public SM_INITIAL_VARIANT_WEIGHT = 1,
    public SM_VARIANT_NAME = "AllTraffic",
    public SM_CPU_INSTANCE_TYPE = "ml.m5.xlarge",
    public SM_GPU_INSTANCE_TYPE = "ml.p3.2xlarge",
    // http endpoint params
    public HTTP_ENDPOINT_NAME = "HTTPModelCluster",
    public HTTP_ENDPOINT_ROLE_NAME = "HTTPEndpointRole",
    public HTTP_ENDPOINT_HOST_PORT = 8080,
    public HTTP_ENDPOINT_CONTAINER_PORT = 8080,
    public HTTP_ENDPOINT_MEMORY = 16384,
    public HTTP_ENDPOINT_CPU = 4096,
    public HTTP_ENDPOINT_HEALTHCHECK_PATH = "/ping",
    public HTTP_ENDPOINT_DOMAIN_NAME = "test-http-model-endpoint",
    // ecr repo names
    public ECR_MODEL_REPOSITORY = "model-container",
    // path to the control model source
    public ECR_MODELS_PATH = "lib/osml-models",
    // build target for control model container
    public ECR_MODEL_TARGET = "osml_model",
    public REPOSITORY_ACCESS_MODE = "Platform"
  ) {}
}

export interface MRModelEndpointsProps {
  // the osml account interface
  account: OSMLAccount;
  // the model runner vpc
  osmlVpc: OSMLVpc;
  // role to apply to the http endpoint fargate tasks
  httpEndpointRole?: IRole;
  // optional custom configuration for the testing resources - will be defaulted if not provided
  mrModelEndpointsConfig?: MRModelEndpointsConfig;
  // optional sage maker iam role to use for endpoint construction - will be defaulted if not provided
  smRole?: IRole;
  // security groups to apply to the vpc config for SM endpoints
  securityGroupId?: string;
  // optional deploy custom model resources
  deployCenterpointModel?: boolean;
  deployFloodModel?: boolean;
  deployAircraftModel?: boolean;
  deployHttpCenterpointModel?: boolean;
  modelContainerImage: ContainerImage;
  modelContainerUri: string;
}

export class MREndpoints extends Construct {
  public removalPolicy: RemovalPolicy;
  public mrModelEndpointsConfig: MRModelEndpointsConfig;
  public smRole?: IRole;
  public httpEndpointRole?: IRole;
  public httpCenterpointModelEndpoint?: OSMLHTTPModelEndpoint;
  public centerPointModelEndpoint?: OSMLSMEndpoint;
  public floodModelEndpoint?: OSMLSMEndpoint;
  public aircraftModelEndpoint?: OSMLSMEndpoint;
  public securityGroupId: string;

  /**
   * Creates an MRTesting construct.
   * @param scope the scope/stack in which to define this construct.
   * @param id the id of this construct within the current scope.
   * @param props the properties of this construct.
   * @returns the MRTesting construct.
   */
  constructor(scope: Construct, id: string, props: MRModelEndpointsProps) {
    super(scope, id);

    // check if a custom config was provided
    if (props.mrModelEndpointsConfig != undefined) {
      // import existing pass in MR configuration
      this.mrModelEndpointsConfig = props.mrModelEndpointsConfig;
    } else {
      // create a new default configuration
      this.mrModelEndpointsConfig = new MRModelEndpointsConfig();
    }

    // setup a removal policy
    this.removalPolicy = props.account.prodLike
      ? RemovalPolicy.RETAIN
      : RemovalPolicy.DESTROY;

    // check if a role was provided
    if (props.smRole != undefined) {
      // import custom SageMaker endpoint role
      this.smRole = props.smRole;
    } else {
      // create a new role
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
      // if a custom security group was provided
      if (props.securityGroupId) {
        this.securityGroupId = props.securityGroupId;
      } else {
        this.securityGroupId = props.osmlVpc.vpcDefaultSecurityGroup;
      }
    }
    if (props.deployHttpCenterpointModel != false) {
      // check if a role was provided
      if (props.httpEndpointRole != undefined) {
        // import passed custom role for the httpEndpoint
        this.httpEndpointRole = props.httpEndpointRole;
      } else {
        // create a new role
        this.httpEndpointRole = new OSMLHTTPEndpointRole(
          this,
          "HTTPEndpointTaskRole",
          {
            account: props.account,
            roleName: this.mrModelEndpointsConfig.HTTP_ENDPOINT_ROLE_NAME
          }
        ).role;
      }

      // build a Fargate HTTP endpoint from the centerpoint model container
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
      // build an SM endpoint from the centerpoint model container
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
            this.mrModelEndpointsConfig.REPOSITORY_ACCESS_MODE,
          securityGroupId: this.securityGroupId,
          subnetIds: props.osmlVpc.selectedSubnets.subnetIds
        }
      );
    }

    if (props.deployFloodModel != false) {
      // build an SM endpoint from the flood model container
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
            this.mrModelEndpointsConfig.REPOSITORY_ACCESS_MODE,
          securityGroupId: this.securityGroupId,
          subnetIds: props.osmlVpc.selectedSubnets.subnetIds
        }
      );
    }

    if (props.deployAircraftModel != false) {
      // build an SM endpoint from the aircraft model container
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
            this.mrModelEndpointsConfig.REPOSITORY_ACCESS_MODE,
          securityGroupId: this.securityGroupId,
          subnetIds: props.osmlVpc.selectedSubnets.subnetIds
        }
      );
    }
  }
}
