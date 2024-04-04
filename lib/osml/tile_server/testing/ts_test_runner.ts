/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { Duration, RemovalPolicy } from "aws-cdk-lib";
import { IRole } from "aws-cdk-lib/aws-iam";
import { DockerImageCode, DockerImageFunction } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

import { OSMLAccount } from "../../osml_account";
import { OSMLVpc } from "../../osml_vpc";

/**
 * Interface representing the properties for the TSTestRunner construct.
 */
export interface TSTestRunnerProps {
  /**
   * The OSML deployment account.
   */
  account: OSMLAccount;

  /**
   * The OSML vpc to deploy into
   */
  osmlVpc: OSMLVpc;

  /**
   * The Docker image code to use for the lambda function
   */
  dockerImageCode: DockerImageCode;

  /**
   * Optional task role to be used by the TSTestContainer.
   */
  taskRole?: IRole;
}

/**
 * Represents a construct responsible for deploying an ECR container image
 * for the tile server test.
 */
export class TSTestRunner extends Construct {
  public removalPolicy: RemovalPolicy;
  public lambdaIntegRunner: DockerImageFunction;
  /**
   * Creates an instance of TSTestRunner.
   * @param {Construct} scope - The scope/stack in which to define this construct.
   * @param {string} id - The id of this construct within the current scope.
   * @param {TSTestRunnerProps} props - The properties of this construct.
   * @returns TSTestRunner - The TSTestContainer instance.
   */
  constructor(scope: Construct, id: string, props: TSTestRunnerProps) {
    super(scope, id);

    // Set the removal policy based on the provided properties
    this.removalPolicy = props.account.prodLike
      ? RemovalPolicy.RETAIN
      : RemovalPolicy.DESTROY;

    this.lambdaIntegRunner = new DockerImageFunction(this, "TSTestRunner", {
      code: props.dockerImageCode,
      vpc: props.osmlVpc.vpc,
      role: props.taskRole,
      timeout: Duration.minutes(10),
      memorySize: 1024,
      functionName: "TSTestRunner"
    });
  }
}
