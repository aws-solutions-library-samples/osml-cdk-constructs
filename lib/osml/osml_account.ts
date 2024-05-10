/*
 * Copyright 2023-2024 Amazon.com, Inc. or its affiliates.
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
   * Indicates whether to deploy the model runner application
   *
   * @type {boolean}
   * @memberof OSMLAccount
   */
  deployModelRunner: boolean;

  /**
   * Indicates whether to deploy the tile server application
   *
   * @type {boolean}
   * @memberof OSMLAccount
   */
  deployTileServer: boolean;

  /**
   * Indicates whether to deploy the data intake application
   *
   * @type {boolean}
   * @memberof OSMLAccount
   */
  deployDataIntake: boolean;

  /**
   * Optional: Indicates whether the account is configured as an ADC (Application Development Cloud).
   *
   * @type {boolean|undefined}
   * @memberof OSMLAccount
   */
  isAdc?: boolean;

  /**
   * Optional: The unique identifier of the Virtual Private Cloud (VPC) associated with the account.
   *
   * @type {string|undefined}
   * @memberof OSMLAccount
   */
  vpcId?: string;
}
