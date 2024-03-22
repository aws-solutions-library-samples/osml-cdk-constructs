/*
 * Copyright 2023-2024 Amazon.com, Inc. or its affiliates.
 */

import { region_info } from "aws-cdk-lib";
import {
  ContainerImage,
  LogDriver,
  LogDrivers,
  obtainDefaultFluentBitECRImage,
  TaskDefinition
} from "aws-cdk-lib/aws-ecs";
import { LogGroup } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

import { OSMLAccount } from "../../osml_account";

/**
 * Defines the configuration options needed to set up logging for an OSML model runner
 *
 * @interface MRFluentBitLogDriverProps
 */
export interface MRFluentBitLogDriverProps {
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
 * Represents an MRFluentBitLogDriver construct for managing logging options for Model Runner.
 */
export class MRFluentBitLogDriver extends Construct {
  /**
   * The container image for the Fluent Bit container.
   */
  public fluentBitImage: ContainerImage;

  /**
   * The logging options for the Model Runner
   */
  public logging: LogDriver;

  /**
   * Creates an MRFluentBitLogDriver construct.
   * @param {Construct} scope - The scope/stack in which to define this construct.
   * @param {string} id - The ID of this construct within the current scope.
   * @param {MRFluentBitLogDriverProps} props - The properties of this construct.
   */
  constructor(scope: Construct, id: string, props: MRFluentBitLogDriverProps) {
    super(scope, id);

    const logsEndpoint = region_info.Fact.find(
      props.account.region,
      region_info.FactName.servicePrincipal("logs.amazonaws.com")
    )!;

    // Set up Logging Options
    this.logging = LogDrivers.firelens({
      options: {
        Name: "cloudwatch",
        region: props.account.region,
        log_group_name: props.logGroup.logGroupName,
        log_format: "json/emf",
        log_key: "log",
        log_stream_prefix: "${TASK_ID}/",
        endpoint: `https://${logsEndpoint}`
      }
    });

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
