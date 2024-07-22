/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { Runtime } from "aws-cdk-lib/aws-lambda";

import { RegionConfig } from "./regional_config";

export const defaultConfig = {
  ecrCdkDeployRuntime: Runtime.PROVIDED_AL2023,
  maxVpcAzs: 3,
  sageMakerGpuEndpointInstanceType: "ml.p3.2xlarge",
  s3Endpoint: "s3.amazonaws.com"
};

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
