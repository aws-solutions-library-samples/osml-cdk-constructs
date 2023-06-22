import { Dashboard, Metric, SingleValueWidget } from "aws-cdk-lib/aws-cloudwatch";
import { FargateService } from "aws-cdk-lib/aws-ecs";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import { OSMLAccount } from "../osml/osml_account";
import { MRDataplaneConfig } from "./mr_dataplane";
export interface MRMonitoringProps {
    account: OSMLAccount;
    regionRequestQueue: Queue;
    regionRequestDlQueue: Queue;
    imageRequestQueue: Queue;
    imageRequestDlQueue: Queue;
    service: FargateService;
    mrDataplaneConfig: MRDataplaneConfig;
    model?: string;
}
export declare class MRMonitoring extends Construct {
    modelStatsWidget: SingleValueWidget;
    dashboard: Dashboard;
    requestsWidget: SingleValueWidget;
    /**
     * Creates a new MRMonitoring construct.
     * @param scope the scope/stack in which to define this construct.
     * @param id the id of this construct within the current scope.
     * @param props the properties of this construct.
     * @returns the MRMonitoring construct.
     */
    constructor(scope: Construct, id: string, props: MRMonitoringProps);
    /**
     * Builds a metric widget in Cloudwatch Dashboard
     * @param metricName: the name of a metric
     * @param label: the label of this metric
     * @param imageFormat: image format based on an extension of an image
     * @param metricsNamespace metricsNamespace the name to apply to the metric namespace
     * @param statistic: type of statistic used for aggregating the datapoints
     * @returns: cloudwatch metric
     */
    buildProcessingMetric(metricName: string, label: string, imageFormat: string, metricsNamespace: string, statistic?: string): Metric;
    /**
     * Generates a widget that contains metrics for processing images, regions, and tiles
     * @param imageFormat: image format based on an extension of an image
     * @param region: what region it resides in
     * @param metricsNameSpace: name to apply to the metrics namespace
     * @returns: cloudwatch Widget
     */
    generateProcessingWidget(imageFormat: string, region: string, metricsNameSpace: string): SingleValueWidget;
}
