/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { Runtime } from "aws-cdk-lib/aws-lambda";

import { RegionConfig } from "./regional_config";

export const defaultConfig = {
  ecrCdkDeployRuntime: Runtime.PROVIDED_AL2023,
  maxVpcAzs: 3,
  sageMakerGpuEndpointInstanceType: "ml.p3.2xlarge"
};

export const regionalConfigs: { [key: string]: Partial<RegionConfig> } = {
  "us-west-1": {
    maxVpcAzs: 2,
    sageMakerGpuEndpointInstanceType: "ml.g4dn.2xlarge"
  },
  "us-gov-west-1": {
    ecrCdkDeployRuntime: Runtime.PROVIDED_AL2
  },
  "us-gov-east-1": {
    ecrCdkDeployRuntime: Runtime.PROVIDED_AL2,
    sageMakerGpuEndpointInstanceType: "ml.g4dn.2xlarge"
  },
  "us-isob-east-1": {
    maxVpcAzs: 2,
    ecrCdkDeployRuntime: Runtime.PROVIDED_AL2
  },
  "us-iso-east-1": {
    ecrCdkDeployRuntime: Runtime.PROVIDED_AL2
  }
};
