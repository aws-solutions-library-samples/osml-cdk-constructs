/*
 * Copyright 2023 Amazon.com, Inc. or its affiliates.
 */
import { Duration } from "aws-cdk-lib";
import {
  Dashboard,
  Metric,
  SingleValueWidget
} from "aws-cdk-lib/aws-cloudwatch";
import { FargateService } from "aws-cdk-lib/aws-ecs";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";

import { OSMLAccount } from "../../osml_account";
import { MRDataplaneConfig } from "../mr_dataplane";

/**
 * Interface for MR Monitoring Props.
 *
 * @interface MRMonitoringProps
 */
export interface MRMonitoringProps {
  /**
   * The OSML account interface.
   *
   * @type {OSMLAccount}
   */
  account: OSMLAccount;

  /**
   * The model runner region request queue.
   *
   * @type {Queue}
   */
  regionRequestQueue: Queue;

  /**
   * The model runner region request DLQ (Dead Letter Queue).
   *
   * @type {Queue}
   */
  regionRequestDlQueue: Queue;

  /**
   * The model runner image request queue.
   *
   * @type {Queue}
   */
  imageRequestQueue: Queue;

  /**
   * The model runner image request DLQ (Dead Letter Queue).
   *
   * @type {Queue}
   */
  imageRequestDlQueue: Queue;

  /**
   * The model runner Fargate service.
   *
   * @type {FargateService}
   */
  service: FargateService;

  /**
   * The model runner dataplane configuration.
   *
   * @type {MRDataplaneConfig}
   */
  mrDataplaneConfig: MRDataplaneConfig;

  /**
   * Optional model information.
   *
   * @type {string | undefined}
   */
  model?: string;
}

/**
 * Represents an MRMonitoring construct for monitoring various metrics and statistics.
 */
export class MRMonitoring extends Construct {
  /**
   * Creates a new MRMonitoring construct.
   * @param {Construct} scope - The scope/stack in which to define this construct.
   * @param {string} id - The id of this construct within the current scope.
   * @param {MRMonitoringProps} props - The properties of this construct.
   * @returns {MRMonitoring} - The MRMonitoring construct.
   */
  public modelStatsWidget: SingleValueWidget;
  public dashboard: Dashboard;
  public requestsWidget: SingleValueWidget;
  constructor(scope: Construct, id: string, props: MRMonitoringProps) {
    super(scope, id);

    // Create a dashboard for monitoring
    this.dashboard = new Dashboard(this, "OSMLDashboard", {
      dashboardName: "OSML"
    });

    // Create a widget for monitoring pending requests
    this.requestsWidget = new SingleValueWidget({
      title: "Pending Requests",
      region: props.account.region,
      width: 24,
      height: 3,
      sparkline: true,
      metrics: [
        // Metrics for pending region requests and oldest pending region request
        props.regionRequestQueue.metricApproximateNumberOfMessagesVisible({
          label: "Pending Region Requests",
          statistic: "sum",
          period: Duration.seconds(30)
        }),
        props.regionRequestQueue.metricApproximateAgeOfOldestMessage({
          label: "Oldest Pending Region Request",
          statistic: "max"
        }),
        // Metrics for failed region requests, pending image requests, and oldest pending image request
        props.regionRequestDlQueue.metricApproximateNumberOfMessagesVisible({
          label: "Failed Region Requests",
          statistic: "sum"
        }),
        props.imageRequestQueue.metricApproximateNumberOfMessagesVisible({
          label: "Pending Image Requests",
          statistic: "sum"
        }),
        props.imageRequestQueue.metricApproximateAgeOfOldestMessage({
          label: "Oldest Pending Region Request",
          statistic: "sum"
        }),
        props.imageRequestDlQueue.metricApproximateNumberOfMessagesVisible({
          label: "Failed Image Requests",
          statistic: "sum"
        })
      ]
    });

    // Create a widget for monitoring model statistics if a model is provided
    if (props.model != undefined) {
      // Metrics for model inference latency, invocations, model errors, throttling exceptions, and image latency
      this.modelStatsWidget = new SingleValueWidget({
        title: "Model Statistics",
        width: 14,
        height: 3,
        sparkline: true,
        metrics: [
          new Metric({
            namespace: props.mrDataplaneConfig.METRICS_NAMESPACE,
            metricName: "EndpointLatency",
            dimensionsMap: {
              ModelName: props.model
            },
            label: "Avg Inference Latency (Max: ${MAX} Min: ${MIN})"
          }),
          new Metric({
            namespace: props.mrDataplaneConfig.METRICS_NAMESPACE,
            metricName: "ModelInvocation",
            dimensionsMap: {
              ModelName: props.model
            },
            label: "Invocations (Total: ${SUM})",
            statistic: "sum"
          }),
          new Metric({
            namespace: props.mrDataplaneConfig.METRICS_NAMESPACE,
            metricName: "ModelError",
            dimensionsMap: {
              ModelName: props.model
            },
            statistic: "Sum",
            label: "Model Errors (Total: ${SUM})"
          }),
          new Metric({
            namespace: props.mrDataplaneConfig.METRICS_NAMESPACE,
            metricName: "ThrottlingException",
            dimensionsMap: {
              ModelName: props.model
            },
            statistic: "Sum",
            label: "Throttling Exceptions (Total: ${SUM})"
          }),
          // This is the complete end to end processing latency for an image
          // Includes reading metadata, generating regions, processing all regions
          // (tile and inference), aggregating features, and publishing results
          new Metric({
            namespace: props.mrDataplaneConfig.METRICS_NAMESPACE,
            metricName: "ImageLatency",
            dimensionsMap: {
              ModelName: props.model
            },
            label: "Avg Image Latency (Max: ${MAX} Min: ${MIN})"
          })
        ]
      });
    }

    const ecsClusterUtilizationWidget = new SingleValueWidget({
      title: "MR Cluster Utilization",
      region: props.account.region,
      width: 12,
      height: 3,
      sparkline: true,
      metrics: [
        props.service.metricCpuUtilization({
          label: "CPU Utilization"
        }),
        props.service.metricMemoryUtilization({
          label: "Memory Utilization"
        })
      ]
    });

    const featureMetricsWidget = new SingleValueWidget({
      title: "Feature Metrics",
      region: props.account.region,
      width: 12,
      height: 3,
      sparkline: true,
      metrics: [
        new Metric({
          namespace: props.mrDataplaneConfig.METRICS_NAMESPACE,
          metricName: "FeatureStoreLatency",
          label: "Feature Store Avg Latency (Max: ${MAX} Min: ${MIN})"
        }),
        new Metric({
          namespace: props.mrDataplaneConfig.METRICS_NAMESPACE,
          metricName: "FeatureAggLatency",
          label: "Feature Aggregation Latency (Max: ${MAX} Min: ${MIN})"
        })
      ]
    });

    this.dashboard.addWidgets(this.requestsWidget);

    // This comes from image_utils.py in the ModelRunner code. We include
    // image format as a dimension not image type.
    ["TIFF", "NITF"].forEach((imageFormat) => {
      this.dashboard.addWidgets(
        this.generateProcessingWidget(
          imageFormat,
          props.account.region,
          props.mrDataplaneConfig.METRICS_NAMESPACE
        )
      );
    });

    if (this.modelStatsWidget != undefined) {
      this.dashboard.addWidgets(this.modelStatsWidget);
    }

    this.dashboard.addWidgets(
      featureMetricsWidget,
      ecsClusterUtilizationWidget
    );
  }

  /**
   * Builds a metric widget in Cloudwatch Dashboard
   * @param metricName
   * @param label
   * @param imageFormat
   * @param metricsNamespace metricsNamespace the name to apply to the metric namespace
   * @param statistic
   * @returns: cloudwatch metric
   */
  buildProcessingMetric(
    metricName: string,
    label: string,
    imageFormat: string,
    metricsNamespace: string,
    statistic?: string
  ): Metric {
    return new Metric({
      namespace: metricsNamespace,
      metricName,
      dimensionsMap: {
        ImageFormat: imageFormat
      },
      statistic,
      label
    });
  }

  /**
   * Generates a widget that contains metrics for processing images, regions, and tiles
   * @returns: cloudwatch Widget
   * @param imageFormat
   * @param region
   * @param metricsNameSpace
   */
  generateProcessingWidget(
    imageFormat: string,
    region: string,
    metricsNameSpace: string
  ): SingleValueWidget {
    return new SingleValueWidget({
      title: `Processing Stats - ${imageFormat}`,
      region,
      width: 24,
      height: 3,
      sparkline: true,
      metrics: [
        this.buildProcessingMetric(
          "RegionsProcessed",
          "Regions Processed (Total: ${SUM})",
          imageFormat,
          metricsNameSpace,
          "sum"
        ),
        this.buildProcessingMetric(
          "TilingLatency",
          "Tiling Latency",
          imageFormat,
          metricsNameSpace,
          "avg"
        ),
        this.buildProcessingMetric(
          "RegionLatency",
          "Regions Latency",
          imageFormat,
          metricsNameSpace,
          "avg"
        ),
        this.buildProcessingMetric(
          "TilesProcessed",
          "Tiles Processed (Total: ${SUM})",
          imageFormat,
          metricsNameSpace,
          "sum"
        ),
        this.buildProcessingMetric(
          "ImageProcessingError",
          "Processing Failures (Total: ${SUM})",
          imageFormat,
          metricsNameSpace,
          "sum"
        )
      ]
    });
  }
}
