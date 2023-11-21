/*
 * Copyright 2023 Amazon.com, Inc. or its affiliates.
 */

/**
 * Represents an OSML (OversightML) deployment account configuration.
 *
 * @interface OSMLAccount
 */
export interface OSMLAccount {
  /**
   * The unique identifier of the OSML account.
   *
   * @type {string}
   * @memberof OSMLAccount
   */
  id: string;

  /**
   * The name of the OSML account.
   *
   * @type {string}
   * @memberof OSMLAccount
   */
  name: string;

  /**
   * The region where the OSML account is deployed.
   *
   * @type {string}
   * @memberof OSMLAccount
   */
  region: string;

  /**
   * Indicates whether the OSML account is configured as a production-like environment.
   *
   * @type {boolean}
   * @memberof OSMLAccount
   */
  prodLike: boolean;

  /**
   * Optional: Indicates whether monitoring is enabled for the OSML account.
   *
   * @type {boolean|undefined}
   * @memberof OSMLAccount
   */
  enableMonitoring?: boolean;

  /**
   * Optional: Indicates whether autoscaling is enabled for the OSML account.
   *
   * @type {boolean|undefined}
   * @memberof OSMLAccount
   */
  enableAutoscaling?: boolean;

  /**
   * Optional: Indicates whether testing features are enabled for the OSML account.
   *
   * @type {boolean|undefined}
   * @memberof OSMLAccount
   */
  enableTesting?: boolean;

  /**
   * Optional: Indicates whether the account is configured as an ADC (Application Development Cloud).
   *
   * @type {boolean|undefined}
   * @memberof OSMLAccount
   */
  isAdc?: boolean;

  /**
   * Optional: Indicates whether to build the model runner container from source.
   *
   * @type {boolean|undefined}
   * @memberof OSMLAccount
   */
  buildAppContainer?: boolean;

  /**
   * Optional: Indicates whether to build the model container from source.
   *
   * @type {boolean|undefined}
   * @memberof OSMLAccount
   */
  buildModelContainer?: boolean;

  /**
   * Optional: Indicates whether to build the tile server container from source.
   *
   * @type {boolean|undefined}
   * @memberof OSMLAccount
   */
  buildTileServerContainer?: boolean;

  /**
   * Optional: The unique identifier of the Virtual Private Cloud (VPC) associated with the account.
   *
   * @type {string|undefined}
   * @memberof OSMLAccount
   */
  vpcId?: string;

  /**
   * Optional: The URI of the terrain configuration for Magnum Load Manager (MR).
   *
   * @type {string|undefined}
   * @memberof OSMLAccount
   */
  mrTerrainUri?: string;
}
