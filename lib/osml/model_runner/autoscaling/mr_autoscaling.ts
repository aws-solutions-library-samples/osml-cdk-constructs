/*
 * Copyright 2023 Amazon.com, Inc. or its affiliates.
 */

import { EcsIsoServiceAutoscaler } from "@cdklabs/cdk-enterprise-iac";
import { Duration } from "aws-cdk-lib";
import { Alarm } from "aws-cdk-lib/aws-cloudwatch";
import { Cluster, FargateService } from "aws-cdk-lib/aws-ecs";
import { IRole } from "aws-cdk-lib/aws-iam";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";

import { OSMLAccount } from "../../osml_account";
import { MRDataplaneConfig } from "../mr_dataplane";

// mutable configuration dataclass for model runner
// for a more detailed breakdown of the configuration see: configuration_guide.md in the documentation directory.
export class MRAutoscalingConfig {
  constructor(
    public MR_AUTOSCALING_TASK_MAX_COUNT = 40,
    public MR_AUTOSCALING_TASK_MIN_COUNT = 5,
    public MR_AUTOSCALING_TASK_OUT_COOLDOWN = 3,
    public MR_AUTOSCALING_TASK_IN_COOLDOWN = 1,
    public MR_AUTOSCALING_TASK_IN_INCREMENT = 8,
    public MR_AUTOSCALING_TASK_OUT_INCREMENT = 8
  ) {}
}

export interface MRAutoScalingProps {
  // the osml account interface
  account: OSMLAccount;
  // the iam role to use for autoscaling components
  role: IRole;
  // the model runner ecs cluster
  cluster: Cluster;
  // the model runner fargate service
  service: FargateService;
  // the model runner image request queue
  imageRequestQueue: Queue;
  // the model runner region request queue
  regionRequestQueue: Queue;
  // the model runner service configuration
  mrDataplaneConfig: MRDataplaneConfig;
  // the optional autoscaling custom configuration
  mrAutoscalingConfig?: MRAutoscalingConfig;
}

export class MRAutoScaling extends Construct {
  readonly serviceAutoscaler: EcsIsoServiceAutoscaler;
  mrAutoscalingConfig: MRAutoscalingConfig;

  /**
   * Creates a custom autoscaling implementation for model runner.
   * @param scope the scope/stack in which to define this construct.
   * @param id the id of this construct within the current scope.
   * @param props the properties of this construct.
   * @returns the MRAutoScaling construct.
   */
  constructor(scope: Construct, id: string, props: MRAutoScalingProps) {
    super(scope, id);

    // check and see if a custom autoscaling configuration was provided
    if (props.mrAutoscalingConfig) {
      this.mrAutoscalingConfig = props.mrAutoscalingConfig;
    } else {
      // if not set to default
      this.mrAutoscalingConfig = new MRAutoscalingConfig();
    }

    // Create custom autoscaling for ADC regions where it isn't available
    if (props.account.isAdc) {
      /**
       * CloudWatch Scheduled Job to control scaling
       * This is currently used to provide scaling capability for ECS
       * tasks in the ADC partitions.
       */

      const regionQueueScalingAlarm = new Alarm(
        this,
        "RegionQueueScalingAlarm",
        {
          metric:
            props.regionRequestQueue.metricApproximateNumberOfMessagesVisible(),
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
        "MRServiceScaler",
        {
          role: props.role,
          ecsCluster: props.cluster,
          ecsService: props.service,
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
       *  capability is enabled for ECS.
       */
      const mrServiceScaling = props.service.autoScaleTaskCount({
        maxCapacity: this.mrAutoscalingConfig.MR_AUTOSCALING_TASK_MAX_COUNT,
        minCapacity: this.mrAutoscalingConfig.MR_AUTOSCALING_TASK_MIN_COUNT
      });

      mrServiceScaling.scaleOnMetric("MRRegionQueueScaling", {
        metric:
          props.regionRequestQueue.metricApproximateNumberOfMessagesVisible(),
        scalingSteps: [
          { change: +3, lower: 1 },
          { change: +5, lower: 5 },
          { change: +8, lower: 20 },
          { change: +15, lower: 100 }
        ]
      });

      mrServiceScaling.scaleOnMetric("MRImageQueueScaling", {
        metric: props.imageRequestQueue.metricNumberOfMessagesReceived({
          period: Duration.minutes(5),
          statistic: "sum"
        }),
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
