/*
 * Copyright 2023 Amazon.com, Inc. or its affiliates.
 */

import { RemovalPolicy, Size, SymlinkFollowMode } from "aws-cdk-lib";
import { DockerImageAsset } from "aws-cdk-lib/aws-ecr-assets";
import { IRole } from "aws-cdk-lib/aws-iam";
import { Stream, StreamMode } from "aws-cdk-lib/aws-kinesis";
import { BucketAccessControl } from "aws-cdk-lib/aws-s3";
import {
  BucketDeployment,
  ServerSideEncryption,
  Source
} from "aws-cdk-lib/aws-s3-deployment";
import { ITopic } from "aws-cdk-lib/aws-sns";
import { SqsSubscription } from "aws-cdk-lib/aws-sns-subscriptions";
import { Construct } from "constructs";

import { OSMLAccount } from "../osml/osml_account";
import { OSMLBucket } from "../osml/osml_bucket";
import { OSMLECRDeployment } from "../osml/osml_ecr_deployment";
import { OSMLHTTPModelEndpoint } from "../osml/osml_http_endpoint";
import { OSMLHTTPEndpointRole } from "../osml/osml_http_endpoint_role";
import { OSMLQueue } from "../osml/osml_queue";
import { OSMLSMEndpoint } from "../osml/osml_sm_endpoint";
import { OSMLVpc } from "../osml/osml_vpc";
import { MRSMRole } from "./mr_sm_role";

// mutable configuration dataclass for the model runner testing Construct
// for a more detailed breakdown of the configuration see: configuration_guide.md in the documentation directory.
export class MRTestingConfig {
  constructor(
    // queue names
    public SQS_IMAGE_STATUS_QUEUE = "ImageStatusQueue",
    public SQS_REGION_STATUS_QUEUE = "RegionStatusQueue",
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
    // bucket names
    public S3_RESULTS_BUCKET = "test-results",
    public S3_IMAGE_BUCKET = "test-images",
    // path to test images
    public S3_TEST_IMAGES_PATH = "assets/images",
    // default model container to pull from
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

export interface MRTestingProps {
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
  mrTestingConfig?: MRTestingConfig;
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

export class MRTesting extends Construct {
  public resultsBucket: OSMLBucket;
  public imageBucket: OSMLBucket;
  public resultStream: Stream;
  public modelContainerSourceUri: string;
  public modelContainerEcrDeployment: OSMLECRDeployment;
  public imageStatusQueue: OSMLQueue;
  public regionStatusQueue: OSMLQueue;
  public removalPolicy: RemovalPolicy;
  public mrTestingConfig: MRTestingConfig;
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
  constructor(scope: Construct, id: string, props: MRTestingProps) {
    super(scope, id);

    // check if a custom config was provided
    if (props.mrTestingConfig != undefined) {
      // import existing pass in MR configuration
      this.mrTestingConfig = props.mrTestingConfig;
    } else {
      // create a new default configuration
      this.mrTestingConfig = new MRTestingConfig();
    }

    // setup a removal policy
    this.removalPolicy = props.account.prodLike
      ? RemovalPolicy.RETAIN
      : RemovalPolicy.DESTROY;

    // bucket to store images in
    this.imageBucket = new OSMLBucket(this, `OSMLTestImageBucket`, {
      bucketName: `${this.mrTestingConfig.S3_IMAGE_BUCKET}-${props.account.id}`,
      prodLike: props.account.prodLike,
      removalPolicy: this.removalPolicy
    });

    // deploy test images into bucket
    new BucketDeployment(this, "OSMLTestImageDeployment", {
      sources: [Source.asset(this.mrTestingConfig.S3_TEST_IMAGES_PATH)],
      destinationBucket: this.imageBucket.bucket,
      accessControl: BucketAccessControl.BUCKET_OWNER_FULL_CONTROL,
      memoryLimit: 10240,
      ephemeralStorageSize: Size.mebibytes(8196),
      vpc: props.osmlVpc.vpc,
      vpcSubnets: props.osmlVpc.selectedSubnets,
      retainOnDelete: props.account.prodLike,
      serverSideEncryption: ServerSideEncryption.AES_256
    });

    // bucket to store rest results in
    this.resultsBucket = new OSMLBucket(this, `OSMLTestResultsBucket`, {
      bucketName: `${this.mrTestingConfig.S3_RESULTS_BUCKET}-${props.account.id}`,
      prodLike: props.account.prodLike,
      removalPolicy: this.removalPolicy
    });

    // a simple provisioned stream for testing the kinesis sink
    this.resultStream = new Stream(this, "TestStream", {
      streamName: `test-stream-${props.account.id}`,
      streamMode: StreamMode.PROVISIONED,
      shardCount: 1
    });

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
        this.modelContainerSourceUri = new DockerImageAsset(this, id, {
          directory: this.mrTestingConfig.ECR_MODELS_PATH,
          file: "Dockerfile",
          followSymlinks: SymlinkFollowMode.ALWAYS,
          target: this.mrTestingConfig.ECR_MODEL_TARGET
        }).imageUri;
      } else {
        this.modelContainerSourceUri =
          this.mrTestingConfig.MODEL_DEFAULT_CONTAINER;
      }
      this.modelContainerEcrDeployment = new OSMLECRDeployment(
        this,
        "OSMLModelContainer",
        {
          sourceUri: this.mrTestingConfig.MODEL_DEFAULT_CONTAINER,
          repositoryName: this.mrTestingConfig.ECR_MODEL_REPOSITORY,
          removalPolicy: this.removalPolicy,
          osmlVpc: props.osmlVpc
        }
      );
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
          image: this.modelContainerEcrDeployment.containerImage,
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
      this.httpCenterpointModelEndpoint.node.addDependency(
        this.modelContainerEcrDeployment
      );
    }

    if (props.deployCenterpointModel != false) {
      // build an SM endpoint from the centerpoint model container
      this.centerPointModelEndpoint = new OSMLSMEndpoint(
        this,
        "OSMLCenterPointModelEndpoint",
        {
          ecrContainerUri: this.modelContainerEcrDeployment.ecrContainerUri,
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
      this.centerPointModelEndpoint.node.addDependency(
        this.modelContainerEcrDeployment
      );
    }

    if (props.deployFloodModel != false) {
      // build an SM endpoint from the flood model container
      this.floodModelEndpoint = new OSMLSMEndpoint(
        this,
        "OSMLFloodModelEndpoint",
        {
          ecrContainerUri: this.modelContainerEcrDeployment.ecrContainerUri,
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
      this.floodModelEndpoint.node.addDependency(
        this.modelContainerEcrDeployment
      );
    }

    if (props.deployAircraftModel != false) {
      // build an SM endpoint from the aircraft model container
      this.aircraftModelEndpoint = new OSMLSMEndpoint(
        this,
        "OSMLAircraftModelEndpoint",
        {
          ecrContainerUri: this.modelContainerEcrDeployment.ecrContainerUri,
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
      this.aircraftModelEndpoint.node.addDependency(
        this.modelContainerEcrDeployment
      );
    }

    // create an SQS queue for region status processing updates
    this.regionStatusQueue = new OSMLQueue(this, "OSMLRegionStatusQueue", {
      queueName: this.mrTestingConfig.SQS_REGION_STATUS_QUEUE
    });

    // subscribe the region status topic to the queue
    props.regionStatusTopic.addSubscription(
      new SqsSubscription(this.regionStatusQueue.queue)
    );

    // create an SQS queue for image processing status updates
    this.imageStatusQueue = new OSMLQueue(this, "OSMLImageStatusQueue", {
      queueName: this.mrTestingConfig.SQS_IMAGE_STATUS_QUEUE
    });

    // subscribe the image status topic to the queue
    props.imageStatusTopic.addSubscription(
      new SqsSubscription(this.imageStatusQueue.queue)
    );
  }
}
