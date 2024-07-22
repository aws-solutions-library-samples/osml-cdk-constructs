/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { Runtime } from "aws-cdk-lib/aws-lambda";

import { defaultConfig, regionalConfigs } from "./regional_configs";

export interface RegionConfig {
  ecrCdkDeployRuntime: Runtime;
  maxVpcAzs: number;
  sageMakerGpuEndpointInstanceType: string;
  s3Endpoint: string;
}

export class RegionalConfig {
  public static getConfig(region: string): RegionConfig {
    const regionalConfig = regionalConfigs[region] || {};
    return {
      ...defaultConfig,
      ...regionalConfig
    };
  }
}
