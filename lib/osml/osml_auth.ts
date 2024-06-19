/*
 * Copyright 2023-2024 Amazon.com, Inc. or its affiliates.
 */

/**
 * Represents the configuration for the authentication server.
 *
 * @interface OSMLAuth
 */
export interface OSMLAuth {
  /**
   * The audience of the application.
   */
  audience: string;

  /**
   * The authority of the authentication.
   */
  authority: string;
}
