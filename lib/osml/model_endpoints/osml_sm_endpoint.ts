/*
 * Copyright 2023 Amazon.com, Inc. or its affiliates.
 */

import {
  CfnEndpoint,
  CfnEndpointConfig,
  CfnModel
} from "aws-cdk-lib/aws-sagemaker";
import { Construct } from "constructs";

/**
 * Represents the properties required to configure an OSML model endpoint.
 *
 * @interface OSMLSMEndpointProps
 */
export interface OSMLSMEndpointProps {
  /**
   * The Amazon Resource Name (ARN) of the role that provides permissions for the endpoint.
   *
   * @type {string}
   */
  roleArn: string;

  /**
   * The URI of the Amazon Elastic Container Registry (ECR) container image.
   *
   * @type {string}
   */
  ecrContainerUri: string;

  /**
   * The name of the machine learning model.
   *
   * @type {string}
   */
  modelName: string;

  /**
   * Whether to include segmentation masks in the model output.
   *
   * @type {string}
   */
  enableSegmentation: boolean;

  /**
   * The initial number of instances to run for the endpoint.
   *
   * @type {number}
   */
  initialInstanceCount: number;

  /**
   * The initial weight for the model variant when using traffic splitting.
   *
   * @type {number}
   */
  initialVariantWeight: number;

  /**
   * The instance type for the endpoint.
   *
   * @type {string}
   */
  instanceType: string;

  /**
   * The name of the model variant.
   *
   * @type {string}
   */
  variantName: string;

  /**
   * The security group ID to associate with the endpoint.
   *
   * @type {string}
   */
  securityGroupId: string;

  /**
   * An array of subnet IDs where the endpoint should be deployed.
   *
   * @type {string[]}
   */
  subnetIds: string[];

  /**
   * The access mode for the model repository (e.g., "ReadWrite" or "ReadOnly").
   *
   * @type {string}
   */
  repositoryAccessMode: string;
}

/**
 * Represents an AWS SageMaker endpoint for a specified model.
 */
export class OSMLSMEndpoint extends Construct {
  public model: CfnModel;
  public endpointConfig: CfnEndpointConfig;
  public endpoint: CfnEndpoint;

  /**
   * Creates a SageMaker endpoint for the specified model.
   *
   * @param {Construct} scope - The scope/stack in which to define this construct.
   * @param {string} id - The id of this construct within the current scope.
   * @param {OSMLSMEndpointProps} props - The properties of this construct.
   * @returns OSMLSMEndpoint- The OSMLSMEndpoint construct.
   */
  constructor(scope: Construct, id: string, props: OSMLSMEndpointProps) {
    super(scope, id);

    // Create a SageMaker model
    this.model = new CfnModel(this, id, {
      executionRoleArn: props.roleArn,
      containers: [
        {
          image: props.ecrContainerUri,
          environment: {
            MODEL_SELECTION: props.modelName,
            ENABLE_SEGMENTATION: props.enableSegmentation ? "true" : "false"
          },
          imageConfig: {
            repositoryAccessMode: props.repositoryAccessMode
          }
        }
      ],
      vpcConfig: {
        subnets: props.subnetIds,
        securityGroupIds: [props.securityGroupId]
      }
    });

    // Configure the SageMaker endpoint settings
    this.endpointConfig = new CfnEndpointConfig(this, `${id}-EndpointConfig`, {
      productionVariants: [
        {
          initialInstanceCount: props.initialInstanceCount,
          initialVariantWeight: props.initialVariantWeight,
          instanceType: props.instanceType,
          modelName: this.model.attrModelName,
          variantName: props.variantName
        }
      ],
      tags: [
        { key: "Name", value: props.modelName },
        { key: "Timestamp", value: new Date().toISOString() }
      ]
    });

    // Host a SageMaker endpoint on top of the imported model container
    this.endpoint = new CfnEndpoint(this, `${id}-Endpoint`, {
      endpointConfigName: this.endpointConfig.attrEndpointConfigName,
      endpointName: props.modelName
    });
  }
}
