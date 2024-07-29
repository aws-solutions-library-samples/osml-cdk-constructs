/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { Runtime } from "aws-cdk-lib/aws-lambda";

/**
 * Interface representing the configuration settings for a specific AWS region.
 */
export interface RegionConfig {
  /**
   * The runtime environment for deploying ECR CDK.
   */
  ecrCdkDeployRuntime: Runtime;

  /**
   * The maximum number of Availability Zones (AZs) for VPC.
   */
  maxVpcAzs: number;

  /**
   * The instance type for the SageMaker GPU endpoint.
   */
  sageMakerGpuEndpointInstanceType: string;

  /**
   * The S3 endpoint for the specified region.
   */
  s3Endpoint: string;
}

/**
 * Class providing regional configuration settings.
 */
export class RegionalConfig {
  /**
   * Retrieves the configuration settings for the specified region.
   * If a specific configuration is not available for the region, the default configuration is used.
   *
   * @param region - The AWS region identifier.
   * @returns The configuration settings for the specified region.
   */
  public static getConfig(region: string): RegionConfig {
    const regionalConfig = regionalConfigs[region] || {};
    return {
      ...defaultConfig,
      ...regionalConfig
    };
  }
}

/**
 * Default configuration settings.
 */
export const defaultConfig: RegionConfig = {
  ecrCdkDeployRuntime: Runtime.PROVIDED_AL2023,
  maxVpcAzs: 3,
  sageMakerGpuEndpointInstanceType: "ml.p3.2xlarge",
  s3Endpoint: "s3.amazonaws.com"
};

/**
 * Specific configuration settings for various AWS regions.
 */
export const regionalConfigs: { [key: string]: Partial<RegionConfig> } = {
  "us-west-1": {
    maxVpcAzs: 2,
    sageMakerGpuEndpointInstanceType: "ml.g4dn.2xlarge"
  },
  "us-gov-west-1": {
    ecrCdkDeployRuntime: Runtime.PROVIDED_AL2,
    s3Endpoint: "s3.us-gov-west-1.amazonaws.com"
  },
  "us-gov-east-1": {
    ecrCdkDeployRuntime: Runtime.PROVIDED_AL2,
    sageMakerGpuEndpointInstanceType: "ml.g4dn.2xlarge",
    s3Endpoint: "s3.us-gov-east-1.amazonaws.com"
  },
  "us-isob-east-1": {
    maxVpcAzs: 2,
    ecrCdkDeployRuntime: Runtime.PROVIDED_AL2,
    s3Endpoint: "s3.us-isob-east-1.sc2s.sgov.gov"
  },
  "us-iso-east-1": {
    ecrCdkDeployRuntime: Runtime.PROVIDED_AL2,
    s3Endpoint: "s3.us-iso-east-1.c2s.ic.gov"
  }
};
