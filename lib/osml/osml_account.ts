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
   * Indicates whether the OSML account is configured as an ADC region
   *
   * @type {boolean}
   * @memberof OSMLAccount
   */
  isAdc?: boolean;
}
