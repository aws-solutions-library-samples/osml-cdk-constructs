/*
 * Copyright 2023-2024 Amazon.com, Inc. or its affiliates.
 */

import { region_info } from "aws-cdk-lib";
import {
  ContainerImage,
  FireLensLogDriverProps,
  LogDriver,
  LogDrivers,
  obtainDefaultFluentBitECRImage,
  TaskDefinition
} from "aws-cdk-lib/aws-ecs";
import { LogGroup } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

import { OSMLAccount } from "../../osml_account";

/**
 * Interface for logging options configuration
 *
 * @interface LoggingOptions
 *
 * @description Defines the configuration options needed to set up AWS IoT logging
 *
 * @property {string} Name - The name of the logging configuration
 * @property {string} region - The AWS region for the log group
 * @property {string} log_group_name - The name of the CloudWatch Logs log group
 * @property {string} log_format - The format of the log messages
 * @property {string} log_key - The key used for indexing log events
 * @property {string} log_stream_prefix - The prefix for the log stream name
 * @property {string} endpoint - The endpoint for the logging service
 */
export interface LoggingOptions {
  Name: string;
  region: string;
  log_group_name: string;
  log_format: string;
  log_key: string;
  log_stream_prefix: string;
  endpoint: string;
}

/**
 * Defines the configuration options needed to set up logging for an OSML model runner
 *
 * @interface MRLoggingOptionsProps
 */
export interface MRLoggingOptionsProps {
  /**
   * The OSML deployment account.
   * @type {OSMLAccount}
   */
  account: OSMLAccount;

  /**
   * The CloudWatch Logs log group for logging
   * @type {LogGroup}
   */
  logGroup: LogGroup;

  /**
   *  The ECS task definition for the model runner
   * @type {TaskDefinition}
   */
  taskDefinition: TaskDefinition;
}

/**
 * Represents an MRLoggingOptions construct for managing logging options for Model Runner.
 */
export class MRLoggingOptions extends Construct {
  /**
   * The container image for the Fluent Bit container.
   */
  public fluentBitImage: ContainerImage;

  /**
   * The logging options for the Model Runner
   */
  public logging: LogDriver;

  /**
   * Creates an MRLoggingOptions construct.
   * @param {Construct} scope - The scope/stack in which to define this construct.
   * @param {string} id - The ID of this construct within the current scope.
   * @param {MRLoggingProps} props - The properties of this construct.
   */
  constructor(scope: Construct, id: string, props: MRLoggingOptionsProps) {
    super(scope, id);

    const logsEndpoint = region_info.Fact.find(
      props.account.region,
      region_info.FactName.servicePrincipal("logs.amazonaws.com")
    )!;

    // Set up Logging Options
    const loggingOptions: {
      [key: string]: LoggingOptions;
    } = {
      options: {
        Name: "cloudwatch",
        region: props.account.region,
        log_group_name: props.logGroup.logGroupName,
        log_format: "json/emf",
        log_key: "log",
        log_stream_prefix: "${TASK_ID}/",
        endpoint: `https://${logsEndpoint}`
      }
    };

    this.logging = LogDrivers.firelens(
      loggingOptions as FireLensLogDriverProps
    );

    if (props.account.isAdc) {
      // Get Fluent Bit Container from ECR repo
      if (props.account.region === "us-iso-east-1") {
        this.fluentBitImage = ContainerImage.fromRegistry(
          `${props.account.id}.dkr.ecr.us-iso-east-1.c2s.ic.gov/aws-for-fluent-bit:latest`
        );
      } else if (props.account.region === "us-isob-east-1") {
        this.fluentBitImage = ContainerImage.fromRegistry(
          `${props.account.id}.dkr.ecr.us-isob-east-1.sc2s.sgov.gov/aws-for-fluent-bit:latest`
        );
      } else {
        this.fluentBitImage = obtainDefaultFluentBitECRImage(
          props.taskDefinition,
          props.taskDefinition.defaultContainer?.logDriverConfig
        );
      }
    } else {
      this.fluentBitImage = obtainDefaultFluentBitECRImage(
        props.taskDefinition,
        props.taskDefinition.defaultContainer?.logDriverConfig
      );
    }
  }
}
