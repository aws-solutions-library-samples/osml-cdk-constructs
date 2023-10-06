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

export interface MRMonitoringProps {
  // the osml account interface
  account: OSMLAccount;
  // the model runner region request queue
  regionRequestQueue: Queue;
  // the model runner region request DLQ
  regionRequestDlQueue: Queue;
  // the model runner image request queue
  imageRequestQueue: Queue;
  // the model runner image request DLQ
  imageRequestDlQueue: Queue;
  // the model runner fargate service
  service: FargateService;
  // the model runner dataplane configuration
  mrDataplaneConfig: MRDataplaneConfig;
  model?: string;
}

export class MRMonitoring extends Construct {
  public modelStatsWidget: SingleValueWidget;
  public dashboard: Dashboard;
  public requestsWidget: SingleValueWidget;

  /**
   * Creates a new MRMonitoring construct.
   * @param scope the scope/stack in which to define this construct.
   * @param id the id of this construct within the current scope.
   * @param props the properties of this construct.
   * @returns the MRMonitoring construct.
   */
  constructor(scope: Construct, id: string, props: MRMonitoringProps) {
    super(scope, id);

    this.dashboard = new Dashboard(this, "OSMLDashboard", {
      dashboardName: "OSML"
    });
    // It doesn't seem like sparklines are supported in CDK yet
    // but the dashboard looks a little better with them. We should
    // add them here once support is added.
    this.requestsWidget = new SingleValueWidget({
      title: "Pending Requests",
      region: props.account.region,
      width: 24,
      height: 3,
      sparkline: true,
      metrics: [
        props.regionRequestQueue.metricApproximateNumberOfMessagesVisible({
          label: "Pending Region Requests",
          statistic: "sum",
          period: Duration.seconds(30)
        }),
        props.regionRequestQueue.metricApproximateAgeOfOldestMessage({
          label: "Oldest Pending Region Request",
          statistic: "max"
        }),
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

    if (props.model != undefined) {
      // There does not appear to be a great way to dynamically define
      // a widget set that includes multiple dynamic dimensions. We're
      // currently tracking model name as a dimension but from a graph
      // standpoint it may make sense to track these stats without that
      // dimension too.
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
   * @param metricName: the name of a metric
   * @param label: the label of this metric
   * @param imageFormat: image format based on an extension of an image
   * @param metricsNamespace metricsNamespace the name to apply to the metric namespace
   * @param statistic: type of statistic used for aggregating the datapoints
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
   * @param imageFormat: image format based on an extension of an image
   * @param region: what region it resides in
   * @param metricsNameSpace: name to apply to the metrics namespace
   * @returns: cloudwatch Widget
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
