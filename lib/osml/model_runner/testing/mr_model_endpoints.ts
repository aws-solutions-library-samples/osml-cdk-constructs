/*
 * Copyright 2023 Amazon.com, Inc. or its affiliates.
 */
import { RemovalPolicy, SymlinkFollowMode } from "aws-cdk-lib";
import { DockerImageAsset } from "aws-cdk-lib/aws-ecr-assets";
import { ContainerImage } from "aws-cdk-lib/aws-ecs";
import { IRole } from "aws-cdk-lib/aws-iam";
import { ITopic } from "aws-cdk-lib/aws-sns";
import { Construct } from "constructs";

import { OSMLHTTPModelEndpoint } from "../../model_endpoints/osml_http_endpoint";
import { OSMLHTTPEndpointRole } from "../../model_endpoints/osml_http_endpoint_role";
import { OSMLSMEndpoint } from "../../model_endpoints/osml_sm_endpoint";
import { OSMLAccount } from "../../osml_account";
import { OSMLECRDeployment } from "../../osml_ecr_deployment";
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
    public MODEL_DEFAULT_CONTAINER = "awsosml/osml-models:main",
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
  // the model runner image status topic
  imageStatusTopic: ITopic;
  // the model runner region status topic
  regionStatusTopic: ITopic;
  // role to apply to the http endpoint fargate tasks
  httpEndpointRole?: IRole;
  // optional custom configuration for the testing resources - will be defaulted if not provided
  mrModelEndpointsConfig?: MRModelEndpointsConfig;
  // optional sage maker iam role to use for endpoint construction - will be defaulted if not provided
  smRole?: IRole;
  // optional custom model container ECR URIs
  modelContainer?: string;
  // security groups to apply to the vpc config for SM endpoints
  securityGroupId?: string;
  // optional deploy custom model resources
  deployCenterpointModel?: boolean;
  deployFloodModel?: boolean;
  deployAircraftModel?: boolean;
  deployHttpCenterpointModel?: boolean;
}

export class MREndpoints extends Construct {
  public modelContainerEcrDeployment: OSMLECRDeployment;
  public removalPolicy: RemovalPolicy;
  public mrTestingConfig: MRModelEndpointsConfig;
  public smRole?: IRole;
  public httpEndpointRole?: IRole;
  public httpCenterpointModelEndpoint?: OSMLHTTPModelEndpoint;
  public centerPointModelEndpoint?: OSMLSMEndpoint;
  public floodModelEndpoint?: OSMLSMEndpoint;
  public aircraftModelEndpoint?: OSMLSMEndpoint;
  public securityGroupId: string;
  public modelContainerImage: ContainerImage;
  public modelContainerUri: string;

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
      this.mrTestingConfig = props.mrModelEndpointsConfig;
    } else {
      // create a new default configuration
      this.mrTestingConfig = new MRModelEndpointsConfig();
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
        roleName: this.mrTestingConfig.SM_ROLE_NAME
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

      if (props.account.isDev == true) {
        const dockerImageAsset = new DockerImageAsset(this, id, {
          directory: this.mrTestingConfig.ECR_MODELS_PATH,
          file: "Dockerfile",
          followSymlinks: SymlinkFollowMode.ALWAYS,
          target: this.mrTestingConfig.ECR_MODEL_TARGET
        });

        this.modelContainerImage =
          ContainerImage.fromDockerImageAsset(dockerImageAsset);

        this.modelContainerUri = dockerImageAsset.imageUri;
      } else {
        const osmlEcrDeployment = new OSMLECRDeployment(
          this,
          "OSMLModelContainer",
          {
            sourceUri: this.mrTestingConfig.MODEL_DEFAULT_CONTAINER,
            repositoryName: this.mrTestingConfig.ECR_MODEL_REPOSITORY,
            removalPolicy: this.removalPolicy,
            osmlVpc: props.osmlVpc
          }
        );
        this.modelContainerImage = osmlEcrDeployment.containerImage;
        this.modelContainerUri = osmlEcrDeployment.ecrContainerUri;
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
            roleName: this.mrTestingConfig.HTTP_ENDPOINT_ROLE_NAME
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
          image: this.modelContainerImage,
          clusterName: this.mrTestingConfig.HTTP_ENDPOINT_NAME,
          role: this.httpEndpointRole,
          memory: this.mrTestingConfig.HTTP_ENDPOINT_MEMORY,
          cpu: this.mrTestingConfig.HTTP_ENDPOINT_CPU,
          hostPort: this.mrTestingConfig.HTTP_ENDPOINT_HOST_PORT,
          containerPort: this.mrTestingConfig.HTTP_ENDPOINT_CONTAINER_PORT,
          healthcheckPath: this.mrTestingConfig.HTTP_ENDPOINT_HEALTHCHECK_PATH,
          loadBalancerName: this.mrTestingConfig.HTTP_ENDPOINT_DOMAIN_NAME,
          containerEnv: {
            MODEL_SELECTION: this.mrTestingConfig.SM_CENTER_POINT_MODEL
          },
          securityGroupId: this.securityGroupId
        }
      );
      if (props.account.isDev == false) {
        this.httpCenterpointModelEndpoint.node.addDependency(
          this.modelContainerEcrDeployment
        );
      }
    }

    if (props.deployCenterpointModel != false) {
      // build an SM endpoint from the centerpoint model container
      this.centerPointModelEndpoint = new OSMLSMEndpoint(
        this,
        "OSMLCenterPointModelEndpoint",
        {
          ecrContainerUri: this.modelContainerUri,
          modelName: this.mrTestingConfig.SM_CENTER_POINT_MODEL,
          roleArn: this.smRole.roleArn,
          instanceType: this.mrTestingConfig.SM_CPU_INSTANCE_TYPE,
          initialInstanceCount: this.mrTestingConfig.SM_INITIAL_INSTANCE_COUNT,
          initialVariantWeight: this.mrTestingConfig.SM_INITIAL_VARIANT_WEIGHT,
          variantName: this.mrTestingConfig.SM_VARIANT_NAME,
          repositoryAccessMode: this.mrTestingConfig.REPOSITORY_ACCESS_MODE,
          securityGroupId: this.securityGroupId,
          subnetIds: props.osmlVpc.selectedSubnets.subnetIds
        }
      );
      if (props.account.isDev == false) {
        this.centerPointModelEndpoint.node.addDependency(
          this.modelContainerEcrDeployment
        );
      }
    }

    if (props.deployFloodModel != false) {
      // build an SM endpoint from the flood model container
      this.floodModelEndpoint = new OSMLSMEndpoint(
        this,
        "OSMLFloodModelEndpoint",
        {
          ecrContainerUri: this.modelContainerUri,
          modelName: this.mrTestingConfig.SM_FLOOD_MODEL,
          roleArn: this.smRole.roleArn,
          instanceType: this.mrTestingConfig.SM_CPU_INSTANCE_TYPE,
          initialInstanceCount: this.mrTestingConfig.SM_INITIAL_INSTANCE_COUNT,
          initialVariantWeight: this.mrTestingConfig.SM_INITIAL_VARIANT_WEIGHT,
          variantName: this.mrTestingConfig.SM_VARIANT_NAME,
          repositoryAccessMode: this.mrTestingConfig.REPOSITORY_ACCESS_MODE,
          securityGroupId: this.securityGroupId,
          subnetIds: props.osmlVpc.selectedSubnets.subnetIds
        }
      );
      if (props.account.isDev == false) {
        this.floodModelEndpoint.node.addDependency(
          this.modelContainerEcrDeployment
        );
      }
    }

    if (props.deployAircraftModel != false) {
      // build an SM endpoint from the aircraft model container
      this.aircraftModelEndpoint = new OSMLSMEndpoint(
        this,
        "OSMLAircraftModelEndpoint",
        {
          ecrContainerUri: this.modelContainerUri,
          modelName: this.mrTestingConfig.SM_AIRCRAFT_MODEL,
          roleArn: this.smRole.roleArn,
          instanceType: this.mrTestingConfig.SM_GPU_INSTANCE_TYPE,
          initialInstanceCount: this.mrTestingConfig.SM_INITIAL_INSTANCE_COUNT,
          initialVariantWeight: this.mrTestingConfig.SM_INITIAL_VARIANT_WEIGHT,
          variantName: this.mrTestingConfig.SM_VARIANT_NAME,
          repositoryAccessMode: this.mrTestingConfig.REPOSITORY_ACCESS_MODE,
          securityGroupId: this.securityGroupId,
          subnetIds: props.osmlVpc.selectedSubnets.subnetIds
        }
      );
      if (props.account.isDev == false) {
        this.aircraftModelEndpoint.node.addDependency(
          this.modelContainerEcrDeployment
        );
      }
    }
  }
}
