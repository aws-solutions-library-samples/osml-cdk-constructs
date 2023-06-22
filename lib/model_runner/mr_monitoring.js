"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MRMonitoring = void 0;
/*
 * Copyright 2023 Amazon.com, Inc. or its affiliates.
 */
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_cloudwatch_1 = require("aws-cdk-lib/aws-cloudwatch");
const constructs_1 = require("constructs");
class MRMonitoring extends constructs_1.Construct {
    /**
     * Creates a new MRMonitoring construct.
     * @param scope the scope/stack in which to define this construct.
     * @param id the id of this construct within the current scope.
     * @param props the properties of this construct.
     * @returns the MRMonitoring construct.
     */
    constructor(scope, id, props) {
        super(scope, id);
        this.dashboard = new aws_cloudwatch_1.Dashboard(this, "OSMLDashboard", {
            dashboardName: "OSML"
        });
        // It doesn't seem like sparklines are supported in CDK yet
        // but the dashboard looks a little better with them. We should
        // add them here once support is added.
        this.requestsWidget = new aws_cloudwatch_1.SingleValueWidget({
            title: "Pending Requests",
            region: props.account.region,
            width: 24,
            height: 3,
            sparkline: true,
            metrics: [
                props.regionRequestQueue.metricApproximateNumberOfMessagesVisible({
                    label: "Pending Region Requests",
                    statistic: "sum",
                    period: aws_cdk_lib_1.Duration.seconds(30)
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
            this.modelStatsWidget = new aws_cloudwatch_1.SingleValueWidget({
                title: "Model Statistics",
                width: 14,
                height: 3,
                sparkline: true,
                metrics: [
                    new aws_cloudwatch_1.Metric({
                        namespace: props.mrDataplaneConfig.METRICS_NAMESPACE,
                        metricName: "EndpointLatency",
                        dimensionsMap: {
                            ModelName: props.model
                        },
                        label: "Avg Inference Latency (Max: ${MAX} Min: ${MIN})"
                    }),
                    new aws_cloudwatch_1.Metric({
                        namespace: props.mrDataplaneConfig.METRICS_NAMESPACE,
                        metricName: "ModelInvocation",
                        dimensionsMap: {
                            ModelName: props.model
                        },
                        label: "Invocations (Total: ${SUM})",
                        statistic: "sum"
                    }),
                    new aws_cloudwatch_1.Metric({
                        namespace: props.mrDataplaneConfig.METRICS_NAMESPACE,
                        metricName: "ModelError",
                        dimensionsMap: {
                            ModelName: props.model
                        },
                        statistic: "Sum",
                        label: "Model Errors (Total: ${SUM})"
                    }),
                    new aws_cloudwatch_1.Metric({
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
                    new aws_cloudwatch_1.Metric({
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
        const ecsClusterUtilizationWidget = new aws_cloudwatch_1.SingleValueWidget({
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
        const featureMetricsWidget = new aws_cloudwatch_1.SingleValueWidget({
            title: "Feature Metrics",
            region: props.account.region,
            width: 12,
            height: 3,
            sparkline: true,
            metrics: [
                new aws_cloudwatch_1.Metric({
                    namespace: props.mrDataplaneConfig.METRICS_NAMESPACE,
                    metricName: "FeatureStoreLatency",
                    label: "Feature Store Avg Latency (Max: ${MAX} Min: ${MIN})"
                }),
                new aws_cloudwatch_1.Metric({
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
            this.dashboard.addWidgets(this.generateProcessingWidget(imageFormat, props.account.region, props.mrDataplaneConfig.METRICS_NAMESPACE));
        });
        if (this.modelStatsWidget != undefined) {
            this.dashboard.addWidgets(this.modelStatsWidget);
        }
        this.dashboard.addWidgets(featureMetricsWidget, ecsClusterUtilizationWidget);
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
    buildProcessingMetric(metricName, label, imageFormat, metricsNamespace, statistic) {
        return new aws_cloudwatch_1.Metric({
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
    generateProcessingWidget(imageFormat, region, metricsNameSpace) {
        return new aws_cloudwatch_1.SingleValueWidget({
            title: `Processing Stats - ${imageFormat}`,
            region,
            width: 24,
            height: 3,
            sparkline: true,
            metrics: [
                this.buildProcessingMetric("RegionsProcessed", "Regions Processed (Total: ${SUM})", imageFormat, metricsNameSpace, "sum"),
                this.buildProcessingMetric("TilingLatency", "Tiling Latency", imageFormat, metricsNameSpace, "avg"),
                this.buildProcessingMetric("RegionLatency", "Regions Latency", imageFormat, metricsNameSpace, "avg"),
                this.buildProcessingMetric("TilesProcessed", "Tiles Processed (Total: ${SUM})", imageFormat, metricsNameSpace, "sum"),
                this.buildProcessingMetric("ImageProcessingError", "Processing Failures (Total: ${SUM})", imageFormat, metricsNameSpace, "sum")
            ]
        });
    }
}
exports.MRMonitoring = MRMonitoring;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXJfbW9uaXRvcmluZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1yX21vbml0b3JpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUE7O0dBRUc7QUFDSCw2Q0FBdUM7QUFDdkMsK0RBSW9DO0FBR3BDLDJDQUF1QztBQXVCdkMsTUFBYSxZQUFhLFNBQVEsc0JBQVM7SUFLekM7Ozs7OztPQU1HO0lBQ0gsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUF3QjtRQUNoRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSwwQkFBUyxDQUFDLElBQUksRUFBRSxlQUFlLEVBQUU7WUFDcEQsYUFBYSxFQUFFLE1BQU07U0FDdEIsQ0FBQyxDQUFDO1FBQ0gsMkRBQTJEO1FBQzNELCtEQUErRDtRQUMvRCx1Q0FBdUM7UUFDdkMsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLGtDQUFpQixDQUFDO1lBQzFDLEtBQUssRUFBRSxrQkFBa0I7WUFDekIsTUFBTSxFQUFFLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTTtZQUM1QixLQUFLLEVBQUUsRUFBRTtZQUNULE1BQU0sRUFBRSxDQUFDO1lBQ1QsU0FBUyxFQUFFLElBQUk7WUFDZixPQUFPLEVBQUU7Z0JBQ1AsS0FBSyxDQUFDLGtCQUFrQixDQUFDLHdDQUF3QyxDQUFDO29CQUNoRSxLQUFLLEVBQUUseUJBQXlCO29CQUNoQyxTQUFTLEVBQUUsS0FBSztvQkFDaEIsTUFBTSxFQUFFLHNCQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztpQkFDN0IsQ0FBQztnQkFDRixLQUFLLENBQUMsa0JBQWtCLENBQUMsbUNBQW1DLENBQUM7b0JBQzNELEtBQUssRUFBRSwrQkFBK0I7b0JBQ3RDLFNBQVMsRUFBRSxLQUFLO2lCQUNqQixDQUFDO2dCQUNGLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyx3Q0FBd0MsQ0FBQztvQkFDbEUsS0FBSyxF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LGVBQWUsRUFDZixpQkFBaUIsRUFDakIsV0FBVyxFQUNYLGdCQUFnQixFQUNoQixLQUFLLENBQ047Z0JBQ0QsSUFBSSxDQUFDLHFCQUFxQixDQUN4QixnQkFBZ0IsRUFDaEIsaUNBQWlDLEVBQ2pDLFdBQVcsRUFDWCxnQkFBZ0IsRUFDaEIsS0FBSyxDQUNOO2dCQUNELElBQUksQ0FBQyxxQkFBcUIsQ0FDeEIsc0JBQXNCLEVBQ3RCLHFDQUFxQyxFQUNyQyxXQUFXLEVBQ1gsZ0JBQWdCLEVBQ2hCLEtBQUssQ0FDTjthQUNGO1NBQ0YsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBdFFELG9DQXNRQyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgMjAyMyBBbWF6b24uY29tLCBJbmMuIG9yIGl0cyBhZmZpbGlhdGVzLlxuICovXG5pbXBvcnQgeyBEdXJhdGlvbiB9IGZyb20gXCJhd3MtY2RrLWxpYlwiO1xuaW1wb3J0IHtcbiAgRGFzaGJvYXJkLFxuICBNZXRyaWMsXG4gIFNpbmdsZVZhbHVlV2lkZ2V0XG59IGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtY2xvdWR3YXRjaFwiO1xuaW1wb3J0IHsgRmFyZ2F0ZVNlcnZpY2UgfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWVjc1wiO1xuaW1wb3J0IHsgUXVldWUgfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXNxc1wiO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSBcImNvbnN0cnVjdHNcIjtcblxuaW1wb3J0IHsgT1NNTEFjY291bnQgfSBmcm9tIFwiLi4vb3NtbC9vc21sX2FjY291bnRcIjtcbmltcG9ydCB7IE1SRGF0YXBsYW5lQ29uZmlnIH0gZnJvbSBcIi4vbXJfZGF0YXBsYW5lXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTVJNb25pdG9yaW5nUHJvcHMge1xuICAvLyB0aGUgb3NtbCBhY2NvdW50IGludGVyZmFjZVxuICBhY2NvdW50OiBPU01MQWNjb3VudDtcbiAgLy8gdGhlIG1vZGVsIHJ1bm5lciByZWdpb24gcmVxdWVzdCBxdWV1ZVxuICByZWdpb25SZXF1ZXN0UXVldWU6IFF1ZXVlO1xuICAvLyB0aGUgbW9kZWwgcnVubmVyIHJlZ2lvbiByZXF1ZXN0IERMUVxuICByZWdpb25SZXF1ZXN0RGxRdWV1ZTogUXVldWU7XG4gIC8vIHRoZSBtb2RlbCBydW5uZXIgaW1hZ2UgcmVxdWVzdCBxdWV1ZVxuICBpbWFnZVJlcXVlc3RRdWV1ZTogUXVldWU7XG4gIC8vIHRoZSBtb2RlbCBydW5uZXIgaW1hZ2UgcmVxdWVzdCBETFFcbiAgaW1hZ2VSZXF1ZXN0RGxRdWV1ZTogUXVldWU7XG4gIC8vIHRoZSBtb2RlbCBydW5uZXIgZmFyZ2F0ZSBzZXJ2aWNlXG4gIHNlcnZpY2U6IEZhcmdhdGVTZXJ2aWNlO1xuICAvLyB0aGUgbW9kZWwgcnVubmVyIGRhdGFwbGFuZSBjb25maWd1cmF0aW9uXG4gIG1yRGF0YXBsYW5lQ29uZmlnOiBNUkRhdGFwbGFuZUNvbmZpZztcbiAgbW9kZWw/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBNUk1vbml0b3JpbmcgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICBwdWJsaWMgbW9kZWxTdGF0c1dpZGdldDogU2luZ2xlVmFsdWVXaWRnZXQ7XG4gIHB1YmxpYyBkYXNoYm9hcmQ6IERhc2hib2FyZDtcbiAgcHVibGljIHJlcXVlc3RzV2lkZ2V0OiBTaW5nbGVWYWx1ZVdpZGdldDtcblxuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBNUk1vbml0b3JpbmcgY29uc3RydWN0LlxuICAgKiBAcGFyYW0gc2NvcGUgdGhlIHNjb3BlL3N0YWNrIGluIHdoaWNoIHRvIGRlZmluZSB0aGlzIGNvbnN0cnVjdC5cbiAgICogQHBhcmFtIGlkIHRoZSBpZCBvZiB0aGlzIGNvbnN0cnVjdCB3aXRoaW4gdGhlIGN1cnJlbnQgc2NvcGUuXG4gICAqIEBwYXJhbSBwcm9wcyB0aGUgcHJvcGVydGllcyBvZiB0aGlzIGNvbnN0cnVjdC5cbiAgICogQHJldHVybnMgdGhlIE1STW9uaXRvcmluZyBjb25zdHJ1Y3QuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogTVJNb25pdG9yaW5nUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpO1xuXG4gICAgdGhpcy5kYXNoYm9hcmQgPSBuZXcgRGFzaGJvYXJkKHRoaXMsIFwiT1NNTERhc2hib2FyZFwiLCB7XG4gICAgICBkYXNoYm9hcmROYW1lOiBcIk9TTUxcIlxuICAgIH0pO1xuICAgIC8vIEl0IGRvZXNuJ3Qgc2VlbSBsaWtlIHNwYXJrbGluZXMgYXJlIHN1cHBvcnRlZCBpbiBDREsgeWV0XG4gICAgLy8gYnV0IHRoZSBkYXNoYm9hcmQgbG9va3MgYSBsaXR0bGUgYmV0dGVyIHdpdGggdGhlbS4gV2Ugc2hvdWxkXG4gICAgLy8gYWRkIHRoZW0gaGVyZSBvbmNlIHN1cHBvcnQgaXMgYWRkZWQuXG4gICAgdGhpcy5yZXF1ZXN0c1dpZGdldCA9IG5ldyBTaW5nbGVWYWx1ZVdpZGdldCh7XG4gICAgICB0aXRsZTogXCJQZW5kaW5nIFJlcXVlc3RzXCIsXG4gICAgICByZWdpb246IHByb3BzLmFjY291bnQucmVnaW9uLFxuICAgICAgd2lkdGg6IDI0LFxuICAgICAgaGVpZ2h0OiAzLFxuICAgICAgc3BhcmtsaW5lOiB0cnVlLFxuICAgICAgbWV0cmljczogW1xuICAgICAgICBwcm9wcy5yZWdpb25SZXF1ZXN0UXVldWUubWV0cmljQXBwcm94aW1hdGVOdW1iZXJPZk1lc3NhZ2VzVmlzaWJsZSh7XG4gICAgICAgICAgbGFiZWw6IFwiUGVuZGluZyBSZWdpb24gUmVxdWVzdHNcIixcbiAgICAgICAgICBzdGF0aXN0aWM6IFwic3VtXCIsXG4gICAgICAgICAgcGVyaW9kOiBEdXJhdGlvbi5zZWNvbmRzKDMwKVxuICAgICAgICB9KSxcbiAgICAgICAgcHJvcHMucmVnaW9uUmVxdWVzdFF1ZXVlLm1ldHJpY0FwcHJveGltYXRlQWdlT2ZPbGRlc3RNZXNzYWdlKHtcbiAgICAgICAgICBsYWJlbDogXCJPbGRlc3QgUGVuZGluZyBSZWdpb24gUmVxdWVzdFwiLFxuICAgICAgICAgIHN0YXRpc3RpYzogXCJtYXhcIlxuICAgICAgICB9KSxcbiAgICAgICAgcHJvcHMucmVnaW9uUmVxdWVzdERsUXVldWUubWV0cmljQXBwcm94aW1hdGVOdW1iZXJPZk1lc3NhZ2VzVmlzaWJsZSh7XG4gICAgICAgICAgbGFiZWw6IFwiRmFpbGVkIFJlZ2lvbiBSZXF1ZXN0c1wiLFxuICAgICAgICAgIHN0YXRpc3RpYzogXCJzdW1cIlxuICAgICAgICB9KSxcbiAgICAgICAgcHJvcHMuaW1hZ2VSZXF1ZXN0UXVldWUubWV0cmljQXBwcm94aW1hdGVOdW1iZXJPZk1lc3NhZ2VzVmlzaWJsZSh7XG4gICAgICAgICAgbGFiZWw6IFwiUGVuZGluZyBJbWFnZSBSZXF1ZXN0c1wiLFxuICAgICAgICAgIHN0YXRpc3RpYzogXCJzdW1cIlxuICAgICAgICB9KSxcbiAgICAgICAgcHJvcHMuaW1hZ2VSZXF1ZXN0UXVldWUubWV0cmljQXBwcm94aW1hdGVBZ2VPZk9sZGVzdE1lc3NhZ2Uoe1xuICAgICAgICAgIGxhYmVsOiBcIk9sZGVzdCBQZW5kaW5nIFJlZ2lvbiBSZXF1ZXN0XCIsXG4gICAgICAgICAgc3RhdGlzdGljOiBcInN1bVwiXG4gICAgICAgIH0pLFxuICAgICAgICBwcm9wcy5pbWFnZVJlcXVlc3REbFF1ZXVlLm1ldHJpY0FwcHJveGltYXRlTnVtYmVyT2ZNZXNzYWdlc1Zpc2libGUoe1xuICAgICAgICAgIGxhYmVsOiBcIkZhaWxlZCBJbWFnZSBSZXF1ZXN0c1wiLFxuICAgICAgICAgIHN0YXRpc3RpYzogXCJzdW1cIlxuICAgICAgICB9KVxuICAgICAgXVxuICAgIH0pO1xuXG4gICAgaWYgKHByb3BzLm1vZGVsICE9IHVuZGVmaW5lZCkge1xuICAgICAgLy8gVGhlcmUgZG9lcyBub3QgYXBwZWFyIHRvIGJlIGEgZ3JlYXQgd2F5IHRvIGR5bmFtaWNhbGx5IGRlZmluZVxuICAgICAgLy8gYSB3aWRnZXQgc2V0IHRoYXQgaW5jbHVkZXMgbXVsdGlwbGUgZHluYW1pYyBkaW1lbnNpb25zLiBXZSdyZVxuICAgICAgLy8gY3VycmVudGx5IHRyYWNraW5nIG1vZGVsIG5hbWUgYXMgYSBkaW1lbnNpb24gYnV0IGZyb20gYSBncmFwaFxuICAgICAgLy8gc3RhbmRwb2ludCBpdCBtYXkgbWFrZSBzZW5zZSB0byB0cmFjayB0aGVzZSBzdGF0cyB3aXRob3V0IHRoYXRcbiAgICAgIC8vIGRpbWVuc2lvbiB0b28uXG4gICAgICB0aGlzLm1vZGVsU3RhdHNXaWRnZXQgPSBuZXcgU2luZ2xlVmFsdWVXaWRnZXQoe1xuICAgICAgICB0aXRsZTogXCJNb2RlbCBTdGF0aXN0aWNzXCIsXG4gICAgICAgIHdpZHRoOiAxNCxcbiAgICAgICAgaGVpZ2h0OiAzLFxuICAgICAgICBzcGFya2xpbmU6IHRydWUsXG4gICAgICAgIG1ldHJpY3M6IFtcbiAgICAgICAgICBuZXcgTWV0cmljKHtcbiAgICAgICAgICAgIG5hbWVzcGFjZTogcHJvcHMubXJEYXRhcGxhbmVDb25maWcuTUVUUklDU19OQU1FU1BBQ0UsXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiBcIkVuZHBvaW50TGF0ZW5jeVwiLFxuICAgICAgICAgICAgZGltZW5zaW9uc01hcDoge1xuICAgICAgICAgICAgICBNb2RlbE5hbWU6IHByb3BzLm1vZGVsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbGFiZWw6IFwiQXZnIEluZmVyZW5jZSBMYXRlbmN5IChNYXg6ICR7TUFYfSBNaW46ICR7TUlOfSlcIlxuICAgICAgICAgIH0pLFxuICAgICAgICAgIG5ldyBNZXRyaWMoe1xuICAgICAgICAgICAgbmFtZXNwYWNlOiBwcm9wcy5tckRhdGFwbGFuZUNvbmZpZy5NRVRSSUNTX05BTUVTUEFDRSxcbiAgICAgICAgICAgIG1ldHJpY05hbWU6IFwiTW9kZWxJbnZvY2F0aW9uXCIsXG4gICAgICAgICAgICBkaW1lbnNpb25zTWFwOiB7XG4gICAgICAgICAgICAgIE1vZGVsTmFtZTogcHJvcHMubW9kZWxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsYWJlbDogXCJJbnZvY2F0aW9ucyAoVG90YWw6ICR7U1VNfSlcIixcbiAgICAgICAgICAgIHN0YXRpc3RpYzogXCJzdW1cIlxuICAgICAgICAgIH0pLFxuICAgICAgICAgIG5ldyBNZXRyaWMoe1xuICAgICAgICAgICAgbmFtZXNwYWNlOiBwcm9wcy5tckRhdGFwbGFuZUNvbmZpZy5NRVRSSUNTX05BTUVTUEFDRSxcbiAgICAgICAgICAgIG1ldHJpY05hbWU6IFwiTW9kZWxFcnJvclwiLFxuICAgICAgICAgICAgZGltZW5zaW9uc01hcDoge1xuICAgICAgICAgICAgICBNb2RlbE5hbWU6IHByb3BzLm1vZGVsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3RhdGlzdGljOiBcIlN1bVwiLFxuICAgICAgICAgICAgbGFiZWw6IFwiTW9kZWwgRXJyb3JzIChUb3RhbDogJHtTVU19KVwiXG4gICAgICAgICAgfSksXG4gICAgICAgICAgbmV3IE1ldHJpYyh7XG4gICAgICAgICAgICBuYW1lc3BhY2U6IHByb3BzLm1yRGF0YXBsYW5lQ29uZmlnLk1FVFJJQ1NfTkFNRVNQQUNFLFxuICAgICAgICAgICAgbWV0cmljTmFtZTogXCJUaHJvdHRsaW5nRXhjZXB0aW9uXCIsXG4gICAgICAgICAgICBkaW1lbnNpb25zTWFwOiB7XG4gICAgICAgICAgICAgIE1vZGVsTmFtZTogcHJvcHMubW9kZWxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzdGF0aXN0aWM6IFwiU3VtXCIsXG4gICAgICAgICAgICBsYWJlbDogXCJUaHJvdHRsaW5nIEV4Y2VwdGlvbnMgKFRvdGFsOiAke1NVTX0pXCJcbiAgICAgICAgICB9KSxcbiAgICAgICAgICAvLyBUaGlzIGlzIHRoZSBjb21wbGV0ZSBlbmQgdG8gZW5kIHByb2Nlc3NpbmcgbGF0ZW5jeSBmb3IgYW4gaW1hZ2VcbiAgICAgICAgICAvLyBJbmNsdWRlcyByZWFkaW5nIG1ldGFkYXRhLCBnZW5lcmF0aW5nIHJlZ2lvbnMsIHByb2Nlc3NpbmcgYWxsIHJlZ2lvbnNcbiAgICAgICAgICAvLyAodGlsZSBhbmQgaW5mZXJlbmNlKSwgYWdncmVnYXRpbmcgZmVhdHVyZXMsIGFuZCBwdWJsaXNoaW5nIHJlc3VsdHNcbiAgICAgICAgICBuZXcgTWV0cmljKHtcbiAgICAgICAgICAgIG5hbWVzcGFjZTogcHJvcHMubXJEYXRhcGxhbmVDb25maWcuTUVUUklDU19OQU1FU1BBQ0UsXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiBcIkltYWdlTGF0ZW5jeVwiLFxuICAgICAgICAgICAgZGltZW5zaW9uc01hcDoge1xuICAgICAgICAgICAgICBNb2RlbE5hbWU6IHByb3BzLm1vZGVsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbGFiZWw6IFwiQXZnIEltYWdlIExhdGVuY3kgKE1heDogJHtNQVh9IE1pbjogJHtNSU59KVwiXG4gICAgICAgICAgfSlcbiAgICAgICAgXVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgY29uc3QgZWNzQ2x1c3RlclV0aWxpemF0aW9uV2lkZ2V0ID0gbmV3IFNpbmdsZVZhbHVlV2lkZ2V0KHtcbiAgICAgIHRpdGxlOiBcIk1SIENsdXN0ZXIgVXRpbGl6YXRpb25cIixcbiAgICAgIHJlZ2lvbjogcHJvcHMuYWNjb3VudC5yZWdpb24sXG4gICAgICB3aWR0aDogMTIsXG4gICAgICBoZWlnaHQ6IDMsXG4gICAgICBzcGFya2xpbmU6IHRydWUsXG4gICAgICBtZXRyaWNzOiBbXG4gICAgICAgIHByb3BzLnNlcnZpY2UubWV0cmljQ3B1VXRpbGl6YXRpb24oe1xuICAgICAgICAgIGxhYmVsOiBcIkNQVSBVdGlsaXphdGlvblwiXG4gICAgICAgIH0pLFxuICAgICAgICBwcm9wcy5zZXJ2aWNlLm1ldHJpY01lbW9yeVV0aWxpemF0aW9uKHtcbiAgICAgICAgICBsYWJlbDogXCJNZW1vcnkgVXRpbGl6YXRpb25cIlxuICAgICAgICB9KVxuICAgICAgXVxuICAgIH0pO1xuXG4gICAgY29uc3QgZmVhdHVyZU1ldHJpY3NXaWRnZXQgPSBuZXcgU2luZ2xlVmFsdWVXaWRnZXQoe1xuICAgICAgdGl0bGU6IFwiRmVhdHVyZSBNZXRyaWNzXCIsXG4gICAgICByZWdpb246IHByb3BzLmFjY291bnQucmVnaW9uLFxuICAgICAgd2lkdGg6IDEyLFxuICAgICAgaGVpZ2h0OiAzLFxuICAgICAgc3BhcmtsaW5lOiB0cnVlLFxuICAgICAgbWV0cmljczogW1xuICAgICAgICBuZXcgTWV0cmljKHtcbiAgICAgICAgICBuYW1lc3BhY2U6IHByb3BzLm1yRGF0YXBsYW5lQ29uZmlnLk1FVFJJQ1NfTkFNRVNQQUNFLFxuICAgICAgICAgIG1ldHJpY05hbWU6IFwiRmVhdHVyZVN0b3JlTGF0ZW5jeVwiLFxuICAgICAgICAgIGxhYmVsOiBcIkZlYXR1cmUgU3RvcmUgQXZnIExhdGVuY3kgKE1heDogJHtNQVh9IE1pbjogJHtNSU59KVwiXG4gICAgICAgIH0pLFxuICAgICAgICBuZXcgTWV0cmljKHtcbiAgICAgICAgICBuYW1lc3BhY2U6IHByb3BzLm1yRGF0YXBsYW5lQ29uZmlnLk1FVFJJQ1NfTkFNRVNQQUNFLFxuICAgICAgICAgIG1ldHJpY05hbWU6IFwiRmVhdHVyZUFnZ0xhdGVuY3lcIixcbiAgICAgICAgICBsYWJlbDogXCJGZWF0dXJlIEFnZ3JlZ2F0aW9uIExhdGVuY3kgKE1heDogJHtNQVh9IE1pbjogJHtNSU59KVwiXG4gICAgICAgIH0pXG4gICAgICBdXG4gICAgfSk7XG5cbiAgICB0aGlzLmRhc2hib2FyZC5hZGRXaWRnZXRzKHRoaXMucmVxdWVzdHNXaWRnZXQpO1xuXG4gICAgLy8gVGhpcyBjb21lcyBmcm9tIGltYWdlX3V0aWxzLnB5IGluIHRoZSBNb2RlbFJ1bm5lciBjb2RlLiBXZSBpbmNsdWRlXG4gICAgLy8gaW1hZ2UgZm9ybWF0IGFzIGEgZGltZW5zaW9uIG5vdCBpbWFnZSB0eXBlLlxuICAgIFtcIlRJRkZcIiwgXCJOSVRGXCJdLmZvckVhY2goKGltYWdlRm9ybWF0KSA9PiB7XG4gICAgICB0aGlzLmRhc2hib2FyZC5hZGRXaWRnZXRzKFxuICAgICAgICB0aGlzLmdlbmVyYXRlUHJvY2Vzc2luZ1dpZGdldChcbiAgICAgICAgICBpbWFnZUZvcm1hdCxcbiAgICAgICAgICBwcm9wcy5hY2NvdW50LnJlZ2lvbixcbiAgICAgICAgICBwcm9wcy5tckRhdGFwbGFuZUNvbmZpZy5NRVRSSUNTX05BTUVTUEFDRVxuICAgICAgICApXG4gICAgICApO1xuICAgIH0pO1xuXG4gICAgaWYgKHRoaXMubW9kZWxTdGF0c1dpZGdldCAhPSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuZGFzaGJvYXJkLmFkZFdpZGdldHModGhpcy5tb2RlbFN0YXRzV2lkZ2V0KTtcbiAgICB9XG5cbiAgICB0aGlzLmRhc2hib2FyZC5hZGRXaWRnZXRzKFxuICAgICAgZmVhdHVyZU1ldHJpY3NXaWRnZXQsXG4gICAgICBlY3NDbHVzdGVyVXRpbGl6YXRpb25XaWRnZXRcbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqIEJ1aWxkcyBhIG1ldHJpYyB3aWRnZXQgaW4gQ2xvdWR3YXRjaCBEYXNoYm9hcmRcbiAgICogQHBhcmFtIG1ldHJpY05hbWU6IHRoZSBuYW1lIG9mIGEgbWV0cmljXG4gICAqIEBwYXJhbSBsYWJlbDogdGhlIGxhYmVsIG9mIHRoaXMgbWV0cmljXG4gICAqIEBwYXJhbSBpbWFnZUZvcm1hdDogaW1hZ2UgZm9ybWF0IGJhc2VkIG9uIGFuIGV4dGVuc2lvbiBvZiBhbiBpbWFnZVxuICAgKiBAcGFyYW0gbWV0cmljc05hbWVzcGFjZSBtZXRyaWNzTmFtZXNwYWNlIHRoZSBuYW1lIHRvIGFwcGx5IHRvIHRoZSBtZXRyaWMgbmFtZXNwYWNlXG4gICAqIEBwYXJhbSBzdGF0aXN0aWM6IHR5cGUgb2Ygc3RhdGlzdGljIHVzZWQgZm9yIGFnZ3JlZ2F0aW5nIHRoZSBkYXRhcG9pbnRzXG4gICAqIEByZXR1cm5zOiBjbG91ZHdhdGNoIG1ldHJpY1xuICAgKi9cbiAgYnVpbGRQcm9jZXNzaW5nTWV0cmljKFxuICAgIG1ldHJpY05hbWU6IHN0cmluZyxcbiAgICBsYWJlbDogc3RyaW5nLFxuICAgIGltYWdlRm9ybWF0OiBzdHJpbmcsXG4gICAgbWV0cmljc05hbWVzcGFjZTogc3RyaW5nLFxuICAgIHN0YXRpc3RpYz86IHN0cmluZ1xuICApOiBNZXRyaWMge1xuICAgIHJldHVybiBuZXcgTWV0cmljKHtcbiAgICAgIG5hbWVzcGFjZTogbWV0cmljc05hbWVzcGFjZSxcbiAgICAgIG1ldHJpY05hbWUsXG4gICAgICBkaW1lbnNpb25zTWFwOiB7XG4gICAgICAgIEltYWdlRm9ybWF0OiBpbWFnZUZvcm1hdFxuICAgICAgfSxcbiAgICAgIHN0YXRpc3RpYyxcbiAgICAgIGxhYmVsXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogR2VuZXJhdGVzIGEgd2lkZ2V0IHRoYXQgY29udGFpbnMgbWV0cmljcyBmb3IgcHJvY2Vzc2luZyBpbWFnZXMsIHJlZ2lvbnMsIGFuZCB0aWxlc1xuICAgKiBAcGFyYW0gaW1hZ2VGb3JtYXQ6IGltYWdlIGZvcm1hdCBiYXNlZCBvbiBhbiBleHRlbnNpb24gb2YgYW4gaW1hZ2VcbiAgICogQHBhcmFtIHJlZ2lvbjogd2hhdCByZWdpb24gaXQgcmVzaWRlcyBpblxuICAgKiBAcGFyYW0gbWV0cmljc05hbWVTcGFjZTogbmFtZSB0byBhcHBseSB0byB0aGUgbWV0cmljcyBuYW1lc3BhY2VcbiAgICogQHJldHVybnM6IGNsb3Vkd2F0Y2ggV2lkZ2V0XG4gICAqL1xuICBnZW5lcmF0ZVByb2Nlc3NpbmdXaWRnZXQoXG4gICAgaW1hZ2VGb3JtYXQ6IHN0cmluZyxcbiAgICByZWdpb246IHN0cmluZyxcbiAgICBtZXRyaWNzTmFtZVNwYWNlOiBzdHJpbmdcbiAgKTogU2luZ2xlVmFsdWVXaWRnZXQge1xuICAgIHJldHVybiBuZXcgU2luZ2xlVmFsdWVXaWRnZXQoe1xuICAgICAgdGl0bGU6IGBQcm9jZXNzaW5nIFN0YXRzIC0gJHtpbWFnZUZvcm1hdH1gLFxuICAgICAgcmVnaW9uLFxuICAgICAgd2lkdGg6IDI0LFxuICAgICAgaGVpZ2h0OiAzLFxuICAgICAgc3BhcmtsaW5lOiB0cnVlLFxuICAgICAgbWV0cmljczogW1xuICAgICAgICB0aGlzLmJ1aWxkUHJvY2Vzc2luZ01ldHJpYyhcbiAgICAgICAgICBcIlJlZ2lvbnNQcm9jZXNzZWRcIixcbiAgICAgICAgICBcIlJlZ2lvbnMgUHJvY2Vzc2VkIChUb3RhbDogJHtTVU19KVwiLFxuICAgICAgICAgIGltYWdlRm9ybWF0LFxuICAgICAgICAgIG1ldHJpY3NOYW1lU3BhY2UsXG4gICAgICAgICAgXCJzdW1cIlxuICAgICAgICApLFxuICAgICAgICB0aGlzLmJ1aWxkUHJvY2Vzc2luZ01ldHJpYyhcbiAgICAgICAgICBcIlRpbGluZ0xhdGVuY3lcIixcbiAgICAgICAgICBcIlRpbGluZyBMYXRlbmN5XCIsXG4gICAgICAgICAgaW1hZ2VGb3JtYXQsXG4gICAgICAgICAgbWV0cmljc05hbWVTcGFjZSxcbiAgICAgICAgICBcImF2Z1wiXG4gICAgICAgICksXG4gICAgICAgIHRoaXMuYnVpbGRQcm9jZXNzaW5nTWV0cmljKFxuICAgICAgICAgIFwiUmVnaW9uTGF0ZW5jeVwiLFxuICAgICAgICAgIFwiUmVnaW9ucyBMYXRlbmN5XCIsXG4gICAgICAgICAgaW1hZ2VGb3JtYXQsXG4gICAgICAgICAgbWV0cmljc05hbWVTcGFjZSxcbiAgICAgICAgICBcImF2Z1wiXG4gICAgICAgICksXG4gICAgICAgIHRoaXMuYnVpbGRQcm9jZXNzaW5nTWV0cmljKFxuICAgICAgICAgIFwiVGlsZXNQcm9jZXNzZWRcIixcbiAgICAgICAgICBcIlRpbGVzIFByb2Nlc3NlZCAoVG90YWw6ICR7U1VNfSlcIixcbiAgICAgICAgICBpbWFnZUZvcm1hdCxcbiAgICAgICAgICBtZXRyaWNzTmFtZVNwYWNlLFxuICAgICAgICAgIFwic3VtXCJcbiAgICAgICAgKSxcbiAgICAgICAgdGhpcy5idWlsZFByb2Nlc3NpbmdNZXRyaWMoXG4gICAgICAgICAgXCJJbWFnZVByb2Nlc3NpbmdFcnJvclwiLFxuICAgICAgICAgIFwiUHJvY2Vzc2luZyBGYWlsdXJlcyAoVG90YWw6ICR7U1VNfSlcIixcbiAgICAgICAgICBpbWFnZUZvcm1hdCxcbiAgICAgICAgICBtZXRyaWNzTmFtZVNwYWNlLFxuICAgICAgICAgIFwic3VtXCJcbiAgICAgICAgKVxuICAgICAgXVxuICAgIH0pO1xuICB9XG59XG4iXX0=