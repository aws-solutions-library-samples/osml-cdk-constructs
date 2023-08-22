/*
 * Copyright 2023 Amazon.com, Inc. or its affiliates.
 */

import { RemovalPolicy } from "aws-cdk-lib";
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
import { OSMLECRContainer } from "../osml/osml_container";
import { OSMLQueue } from "../osml/osml_queue";
import { OSMLRepository } from "../osml/osml_repository";
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

    // sagemaker names
    public SM_CENTER_POINT_MODEL = "centerpoint",
    public SM_FLOOD_MODEL = "flood",
    public SM_AIRCRAFT_MODEL = "aircraft",
    public SM_ROLE_NAME = "OSMLSageMakerRole",
    public SM_INITIAL_INSTANCE_COUNT = 1,
    public SM_INITIAL_VARIANT_WEIGHT = 1,
    public SM_VARIANT_NAME = "AllTraffic",
    public SM_CPU_INSTANCE_TYPE = "ml.m5.xlarge",
    public SM_GPU_INSTANCE_TYPE = "ml.p3.2xlarge",

    // bucket names
    public S3_RESULTS_BUCKET = "test-results",
    public S3_IMAGE_BUCKET = "test-images",
    // path to test images
    public S3_TEST_IMAGES_PATH = "assets/images",

    public MODEL_DEFAULT_CONTAINER = "awsosml/osml-models:main",
    // ecr repo names
    public ECR_MODEL_REPOSITORY = "model-container",
    // path to the control model source
    public ECR_MODELS_PATH = "lib/osml-models",
    // build target for control model container
    public ECR_MODEL_TARGET = "osml_model",
    public REPOSITORY_ACCESS_MODE = "Vpc"
  ) {}
}

export interface MRTestingProps {
  // the osml account interface
  account: OSMLAccount;
  // the model runner osmlVpc
  osmlVpc: OSMLVpc;
  // the model runner image status topic
  imageStatusTopic: ITopic;
  // the model runner region status topic
  regionStatusTopic: ITopic;
  // optional custom configuration for the testing resources - will be defaulted if not provided
  mrTestingConfig?: MRTestingConfig;
  // optional sage maker iam role to use for endpoint construction - will be defaulted if not provided
  smRole?: IRole;
  // optional custom model container ECR URIs
  modelContainer?: string;

  // optional deploy custom model resources
  deployCenterpointModel?: boolean;
  deployFloodModel?: boolean;
  deployAircraftModel?: boolean;
}

export class MRTesting extends Construct {
  public resultsBucket: OSMLBucket;
  public imageBucket: OSMLBucket;
  public resultStream: Stream;
  public modelContainer: string;
  public imageStatusQueue: OSMLQueue;
  public regionStatusQueue: OSMLQueue;
  public removalPolicy: RemovalPolicy;
  public mrTestingConfig: MRTestingConfig;
  public smRole?: IRole;
  public modelRepository?: OSMLRepository;
  public centerPointModelEndpoint?: OSMLSMEndpoint;
  public floodModelEndpoint?: OSMLSMEndpoint;
  public aircraftModelEndpoint?: OSMLSMEndpoint;
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
      useEfs: true,
      vpc: props.osmlVpc.vpc,
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
      // import passed in MR task role
      this.smRole = props.smRole;
    } else {
      // create a new role
      this.smRole = new MRSMRole(this, "MRSMRole", {
        account: props.account,
        roleName: this.mrTestingConfig.SM_ROLE_NAME
      }).role;
    }

    if (
      props.deployCenterpointModel != false ||
      props.deployAircraftModel != false ||
      props.deployFloodModel != false
    ) {
      if (props.modelContainer != undefined) {
        // import the image asset passed in
        this.modelContainer = props.modelContainer;
      } else {
        if (props.account.isDev == true) {
          // set the SM endpoint repository access mode to ECR
          this.mrTestingConfig.REPOSITORY_ACCESS_MODE = "Platform";

          // build a new repository for the test model
          this.modelRepository = new OSMLRepository(this, "MRModelRepository", {
            repositoryName: this.mrTestingConfig.ECR_MODEL_REPOSITORY,
            removalPolicy: this.removalPolicy
          });
          this.modelContainer = new OSMLECRContainer(
            this,
            "OSMLModelContainer",
            {
              directory: this.mrTestingConfig.ECR_MODELS_PATH,
              file: "Dockerfile",
              target: this.mrTestingConfig.ECR_MODEL_TARGET,
              repository: this.modelRepository.repository
            }
          ).imageAsset.imageUri;
        } else {
          this.modelContainer = this.mrTestingConfig.MODEL_DEFAULT_CONTAINER;
        }
      }
    }
    if (props.deployCenterpointModel != false) {
      // build an SM endpoint from the centerpoint model container
      this.centerPointModelEndpoint = new OSMLSMEndpoint(
        this,
        "OSMLCenterPointModelEndpoint",
        {
          modelContainer: this.modelContainer,
          modelName: this.mrTestingConfig.SM_CENTER_POINT_MODEL,
          roleArn: this.smRole.roleArn,
          instanceType: this.mrTestingConfig.SM_CPU_INSTANCE_TYPE,
          initialInstanceCount: this.mrTestingConfig.SM_INITIAL_INSTANCE_COUNT,
          initialVariantWeight: this.mrTestingConfig.SM_INITIAL_VARIANT_WEIGHT,
          variantName: this.mrTestingConfig.SM_VARIANT_NAME,
          repositoryAccessMode: this.mrTestingConfig.REPOSITORY_ACCESS_MODE,
          osmlVpc: props.osmlVpc
        }
      );
    }

    if (props.deployFloodModel != false) {
      // build an SM endpoint from the flood model container
      this.floodModelEndpoint = new OSMLSMEndpoint(
        this,
        "OSMLFloodModelEndpoint",
        {
          modelContainer: this.modelContainer,
          modelName: this.mrTestingConfig.SM_FLOOD_MODEL,
          roleArn: this.smRole.roleArn,
          instanceType: this.mrTestingConfig.SM_CPU_INSTANCE_TYPE,
          initialInstanceCount: this.mrTestingConfig.SM_INITIAL_INSTANCE_COUNT,
          initialVariantWeight: this.mrTestingConfig.SM_INITIAL_VARIANT_WEIGHT,
          variantName: this.mrTestingConfig.SM_VARIANT_NAME,
          repositoryAccessMode: this.mrTestingConfig.REPOSITORY_ACCESS_MODE,
          osmlVpc: props.osmlVpc
        }
      );
    }

    if (props.deployAircraftModel != false) {
      // build an SM endpoint from the aircraft model container
      this.aircraftModelEndpoint = new OSMLSMEndpoint(
        this,
        "OSMLAircraftModelEndpoint",
        {
          modelContainer: this.modelContainer,
          modelName: this.mrTestingConfig.SM_AIRCRAFT_MODEL,
          roleArn: this.smRole.roleArn,
          instanceType: this.mrTestingConfig.SM_GPU_INSTANCE_TYPE,
          initialInstanceCount: this.mrTestingConfig.SM_INITIAL_INSTANCE_COUNT,
          initialVariantWeight: this.mrTestingConfig.SM_INITIAL_VARIANT_WEIGHT,
          variantName: this.mrTestingConfig.SM_VARIANT_NAME,
          repositoryAccessMode: this.mrTestingConfig.REPOSITORY_ACCESS_MODE,
          osmlVpc: props.osmlVpc
        }
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
