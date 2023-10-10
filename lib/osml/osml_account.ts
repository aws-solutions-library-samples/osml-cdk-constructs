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
 * @property {string} isDev - if true build local submodules from source
 * @property {boolean} isAdc - whether the account is in an isolated or non-standard region
 * @property {string} vpcId - pre-existing VPC id to use- if one is not provided a new VPC will be created
 */
export interface OSMLAccount {
  id: string;
  name: string;
  region: string;
  prodLike: boolean;
  isAdc?: boolean;
  isDev?: boolean;
  vpcId?: string;
  mrTerrainUri?: string;
}
