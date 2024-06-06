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
   * The client ID of the application.
   */
  clientId: string;

  /**
   * The client secret of the application
   */
  clientSecret: string;

  /**
   * The authority of the authentication.
   */
  authority: string;

  /**
   * The certificate arn of the certificate.
   */
  certificateArn: string;

  /**
   * The domain name of the authentication.
   */
  domainName: string;
}
