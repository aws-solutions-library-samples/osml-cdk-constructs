/*
 * Copyright 2023-2024 Amazon.com, Inc. or its affiliates.
 */

import { EcsIsoServiceAutoscaler } from "@cdklabs/cdk-enterprise-iac";
import { Duration } from "aws-cdk-lib";
import { Alarm } from "aws-cdk-lib/aws-cloudwatch";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";

import { OSMLAccount } from "../../osml_account";
import { MRDataplane } from "../mr_dataplane";

/**
 * Configuration settings for autoscaling the ModelRunner service.
 */
export class MRAutoscalingConfig {
  /**
   * Creates an instance of MRAutoscalingConfig.
   * @param {number} [MR_AUTOSCALING_TASK_MAX_COUNT=40] - The maximum number of tasks allowed in the cluster.
   * @param {number} [MR_AUTOSCALING_TASK_MIN_COUNT=5] - The minimum number of tasks required in the cluster.
   * @param {number} [MR_AUTOSCALING_TASK_OUT_COOLDOWN=3] - The cooldown period (in minutes) after scaling out tasks.
   * @param {number} [MR_AUTOSCALING_TASK_IN_COOLDOWN=1] - The cooldown period (in minutes) after scaling in tasks.
   * @param {number} [MR_AUTOSCALING_TASK_IN_INCREMENT=8] - The number of tasks to increment when scaling in.
   * @param {number} [MR_AUTOSCALING_TASK_OUT_INCREMENT=8] - The number of tasks to increment when scaling out.
   */
  constructor(
    public MR_AUTOSCALING_TASK_MAX_COUNT: number = 40,
    public MR_AUTOSCALING_TASK_MIN_COUNT: number = 3,
    public MR_AUTOSCALING_TASK_OUT_COOLDOWN: number = 3,
    public MR_AUTOSCALING_TASK_IN_COOLDOWN: number = 1,
    public MR_AUTOSCALING_TASK_IN_INCREMENT: number = 8,
    public MR_AUTOSCALING_TASK_OUT_INCREMENT: number = 8
  ) {}
}

/**
 * Represents the properties required for configuring auto-scaling in the MR system.
 *
 * @interface MRAutoScalingProps
 */
export interface MRAutoScalingProps {
  /**
   * The OSML account interface.
   *
   * @type {OSMLAccount}
   */
  account: OSMLAccount;

  /**
   * The IAM role to use for auto-scaling components.
   *
   * @type {MRDataplane}
   */
  mrDataplane: MRDataplane;

  /**
   * The optional auto-scaling custom configuration.
   *
   * @type {MRAutoscalingConfig|undefined}
   */
  mrAutoscalingConfig?: MRAutoscalingConfig;
}

/**
 * Represents a custom autoscaling implementation for model runner.
 */
export class MRAutoScaling extends Construct {
  /**
   * The service autoscaler for ECS tasks.
   */
  serviceAutoscaler: EcsIsoServiceAutoscaler;

  /**
   * The custom configuration for MRAutoscaling.
   */
  mrAutoscalingConfig: MRAutoscalingConfig;

  /**
   * Creates a new instance of the MRAutoScaling construct.
   * @param {Construct} scope - The scope/stack in which to define this construct.
   * @param {string} id - The id of this construct within the current scope.
   * @param {MRAutoScalingProps} props - The properties of this construct.
   */
  constructor(scope: Construct, id: string, props: MRAutoScalingProps) {
    super(scope, id);

    // Check and see if a custom autoscaling configuration was provided.
    if (props.mrAutoscalingConfig) {
      this.mrAutoscalingConfig = props.mrAutoscalingConfig;
    } else {
      // If not set to default configuration.
      this.mrAutoscalingConfig = new MRAutoscalingConfig();
    }

    // Create custom autoscaling for ADC regions where it isn't available.
    if (props.account.isAdc) {
      /**
       * CloudWatch Scheduled Job to control scaling.
       * This is currently used to provide scaling capability for ECS
       * tasks in the ADC partitions.
       */
      const regionQueueScalingAlarm = new Alarm(
        this,
        "RegionQueueScalingAlarm",
        {
          metric:
            props.mrDataplane.regionRequestQueue.queue.metricApproximateNumberOfMessagesVisible(),
          evaluationPeriods: 1,
          threshold: 3
        }
      );

      NagSuppressions.addResourceSuppressions(
        this,
        [
          {
            id: "NIST.800.53.R5-CloudWatchAlarmAction",
            reason:
              "Lambda function monitors these alarms on a cron basis " +
              "rather than an event trigger to help scaling smoothness."
          }
        ],
        true
      );

      this.serviceAutoscaler = new EcsIsoServiceAutoscaler(
        this,
        "MRServiceAutoscaling",
        {
          role: props.mrDataplane.mrRole,
          ecsCluster: props.mrDataplane.cluster,
          ecsService: props.mrDataplane.fargateService,
          minimumTaskCount:
            this.mrAutoscalingConfig.MR_AUTOSCALING_TASK_MIN_COUNT,
          maximumTaskCount:
            this.mrAutoscalingConfig.MR_AUTOSCALING_TASK_MAX_COUNT,
          scaleAlarm: regionQueueScalingAlarm,
          scaleOutIncrement:
            this.mrAutoscalingConfig.MR_AUTOSCALING_TASK_OUT_INCREMENT,
          scaleInIncrement:
            this.mrAutoscalingConfig.MR_AUTOSCALING_TASK_IN_INCREMENT,
          scaleOutCooldown: Duration.minutes(
            this.mrAutoscalingConfig.MR_AUTOSCALING_TASK_OUT_COOLDOWN
          ),
          scaleInCooldown: Duration.minutes(
            this.mrAutoscalingConfig.MR_AUTOSCALING_TASK_IN_COOLDOWN
          )
        }
      );
    } else {
      /**
       * This is currently used when not deploying into ADC
       * partitions. We can swap fully to this when the autoscaling
       * capability is enabled for ECS.
       */
      const mrServiceScaling =
        props.mrDataplane.fargateService.autoScaleTaskCount({
          maxCapacity: this.mrAutoscalingConfig.MR_AUTOSCALING_TASK_MAX_COUNT,
          minCapacity: this.mrAutoscalingConfig.MR_AUTOSCALING_TASK_MIN_COUNT
        });

      mrServiceScaling.scaleOnMetric("MRRegionQueueScaling", {
        metric:
          props.mrDataplane.regionRequestQueue.queue.metricApproximateNumberOfMessagesVisible(),
        scalingSteps: [
          { change: +3, lower: 1 },
          { change: +5, lower: 5 },
          { change: +8, lower: 20 },
          { change: +15, lower: 100 }
        ]
      });

      mrServiceScaling.scaleOnMetric("MRImageQueueScaling", {
        metric:
          props.mrDataplane.imageRequestQueue.queue.metricNumberOfMessagesReceived(
            {
              period: Duration.minutes(5),
              statistic: "sum"
            }
          ),
        scalingSteps: [
          { change: -1, upper: 0 },
          { change: +1, lower: 1 }
        ],
        cooldown: Duration.minutes(1),
        evaluationPeriods: 3
      });
    }
  }
}
