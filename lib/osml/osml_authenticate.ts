/*
 * Copyright 2023-2024 Amazon.com, Inc. or its affiliates.
 */

import { SecretValue } from "aws-cdk-lib";
import { IVpc, Peer, Port, SecurityGroup } from "aws-cdk-lib/aws-ec2";
import { ApplicationLoadBalancedFargateService } from "aws-cdk-lib/aws-ecs-patterns";
import {
  ApplicationProtocol,
  IListenerCertificate,
  ListenerAction,
  SslPolicy
} from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

/**
 * Represents the configuration for the authentication.
 *
 * @interface OSMLAuthConfig
 */
export interface OSMLAuthConfig {
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

/**
 * Represents the properties required to configure the OSMLAuthenticate Construct.
 * @interface
 */
export interface OSMLAuthenticateProps {
  /**
   * The ALB that hosts the service.
   *
   * @type {ApplicationLoadBalancedFargateService}
   */
  serverALB: ApplicationLoadBalancedFargateService;

  /**
   * The configuration for the authentication.
   *
   * @type {OSMLAuthConfig}
   */
  authConfig: OSMLAuthConfig;

  /**
   * The VPC that the service resides in.
   *
   * @type {IVpc}
   */
  vpc: IVpc;
}

/**
 * Represents the construct that authenticates the user.
 */
export class OSMLAuthenticate extends Construct {
  /**
   * Creates an instance of OSMLAuthenticate.
   * @param {Construct} scope - The scope/stack in which to define this construct.
   * @param {string} id - The id of this construct within the current scope.
   * @param {OSMLAuthenticateProps} props - The properties of this construct.
   */
  constructor(scope: Construct, id: string, props: OSMLAuthenticateProps) {
    super(scope, id);

    // change the default HTTP listener and redirect it to HTTPS
    props.serverALB.listener.addAction("default", {
      action: ListenerAction.redirect({
        port: "443",
        protocol: "HTTPS",
        host: props.authConfig.domainName,
        path: "/#{path}",
        query: "#{query}"
      })
    });

    // get user's certificate arn
    const certificate: IListenerCertificate = {
      certificateArn: props.authConfig?.certificateArn
    };

    // create target group to allow inbound / outbound traffic
    const securityGroup = new SecurityGroup(this, `SecurityGroup${id}`, {
      vpc: props.vpc,
      allowAllOutbound: true
    });

    // allow inbound traffic from anywhere
    securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(443));
    securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(8080));

    props.serverALB.loadBalancer.addSecurityGroup(securityGroup);

    const issuer = props.authConfig.authority;

    const client_secret = new Secret(this, `ClientSecret${id}`, {
      secretStringValue: SecretValue.unsafePlainText(
        props.authConfig.clientSecret
      )
    });

    // add HTTPS listener to authenticate then access ECS cluster
    props.serverALB.loadBalancer.addListener("https", {
      port: 443,
      protocol: ApplicationProtocol.HTTPS,
      certificates: [certificate],
      sslPolicy: SslPolicy.RECOMMENDED_TLS,
      defaultAction: ListenerAction.authenticateOidc({
        authorizationEndpoint: `${issuer}/protocol/openid-connect/auth`,
        clientId: props.authConfig.clientId,
        clientSecret: client_secret.secretValue,
        issuer: issuer,
        tokenEndpoint: `${issuer}/protocol/openid-connect/token`,
        userInfoEndpoint: `${issuer}/protocol/openid-connect/userinfo`,
        next: ListenerAction.forward([props.serverALB.targetGroup])
      })
    });
  }
}
