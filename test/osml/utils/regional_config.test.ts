/*
 * Copyright 2025 Amazon.com, Inc. or its affiliates.
 */

import { Runtime } from "aws-cdk-lib/aws-lambda";

import { defaultConfig, RegionalConfig } from "../../../lib";

describe("RegionalConfig Class Tests", () => {
  it("should return default configuration for an unknown region", () => {
    const config = RegionalConfig.getConfig("unknown-region");
    expect(config).toEqual(defaultConfig);
  });

  it("should return the correct configuration for 'us-west-1' region", () => {
    const config = RegionalConfig.getConfig("us-west-1");
    expect(config.maxVpcAzs).toBe(2);
    expect(config.sageMakerGpuEndpointInstanceType).toBe("ml.g4dn.2xlarge");
    expect(config.ecrCdkDeployRuntime).toBe(defaultConfig.ecrCdkDeployRuntime);
    expect(config.s3Endpoint).toBe(defaultConfig.s3Endpoint);
  });

  it("should return the correct configuration for 'us-gov-west-1' region", () => {
    const config = RegionalConfig.getConfig("us-gov-west-1");
    expect(config.ecrCdkDeployRuntime).toBe(Runtime.PROVIDED_AL2);
    expect(config.s3Endpoint).toBe("s3.us-gov-west-1.amazonaws.com");
    expect(config.maxVpcAzs).toBe(defaultConfig.maxVpcAzs);
    expect(config.sageMakerGpuEndpointInstanceType).toBe(
      defaultConfig.sageMakerGpuEndpointInstanceType
    );
  });

  it("should return the correct configuration for 'us-isob-east-1' region", () => {
    const config = RegionalConfig.getConfig("us-isob-east-1");
    expect(config.ecrCdkDeployRuntime).toBe(Runtime.PROVIDED_AL2);
    expect(config.maxVpcAzs).toBe(2);
    expect(config.s3Endpoint).toBe("s3.us-isob-east-1.sc2s.sgov.gov");
  });

  it("should return the correct configuration for 'us-iso-east-1' region", () => {
    const config = RegionalConfig.getConfig("us-iso-east-1");
    expect(config.ecrCdkDeployRuntime).toBe(Runtime.PROVIDED_AL2);
    expect(config.s3Endpoint).toBe("s3.us-iso-east-1.c2s.ic.gov");
  });

  it("should merge partial region-specific configs with default values", () => {
    const config = RegionalConfig.getConfig("us-west-1");
    expect(config.ecrCdkDeployRuntime).toBe(defaultConfig.ecrCdkDeployRuntime);
    expect(config.s3Endpoint).toBe(defaultConfig.s3Endpoint);
  });
});
