/*
 * Copyright 2023 Amazon.com, Inc. or its affiliates.
 */

/**
 * OSML Account interface.
 * @interface OSMLAccount
 * @property {string} id - aws account id
 * @property {string} name - name of the account - used for tagging stack names
 * @property {string} region - aws region associated with the account
 * @property {boolean} prodLike - controls termination protection on stacks and retention policies on various resources
 * @property {boolean} enableAutoscaling - whether to enable pre-build autoscaling on the FargateService
 * @property {boolean} enableMonitoring - whether to enable CloudWatch monitoring and dashboards
 * @property {boolean} enableTesting - whether to enable the deployment of test resources
 * @property {string} isDev - if true build local submodules from source
 * @property {boolean} isAdc - whether the account is in an isolated or non-standard region
 * @property {string} vpcId - pre-existing VPC id to use- if one is not provided a new VPC will be created
 */
export interface OSMLAccount {
  id: string;
  name: string;
  region: string;
  prodLike: boolean;
  enableAutoscaling?: boolean;
  enableMonitoring?: boolean;
  enableTesting?: boolean;
  isAdc?: boolean;
  isDev?: boolean;
  vpcId?: string;
  mrTerrainUri?: string;
}
