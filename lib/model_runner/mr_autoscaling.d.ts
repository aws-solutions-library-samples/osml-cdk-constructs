import { EcsIsoServiceAutoscaler } from "@cdklabs/cdk-enterprise-iac";
import { Cluster, FargateService } from "aws-cdk-lib/aws-ecs";
import { IRole } from "aws-cdk-lib/aws-iam";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import { OSMLAccount } from "../osml/osml_account";
import { MRDataplaneConfig } from "./mr_dataplane";
export declare class MRAutoscalingConfig {
    MR_AUTOSCALING_TASK_MAX_COUNT: number;
    MR_AUTOSCALING_TASK_MIN_COUNT: number;
    MR_AUTOSCALING_TASK_OUT_COOLDOWN: number;
    MR_AUTOSCALING_TASK_IN_COOLDOWN: number;
    MR_AUTOSCALING_TASK_IN_INCREMENT: number;
    MR_AUTOSCALING_TASK_OUT_INCREMENT: number;
    constructor(MR_AUTOSCALING_TASK_MAX_COUNT?: number, MR_AUTOSCALING_TASK_MIN_COUNT?: number, MR_AUTOSCALING_TASK_OUT_COOLDOWN?: number, MR_AUTOSCALING_TASK_IN_COOLDOWN?: number, MR_AUTOSCALING_TASK_IN_INCREMENT?: number, MR_AUTOSCALING_TASK_OUT_INCREMENT?: number);
}
export interface MRAutoScalingProps {
    account: OSMLAccount;
    role: IRole;
    cluster: Cluster;
    service: FargateService;
    imageRequestQueue: Queue;
    regionRequestQueue: Queue;
    mrDataplaneConfig: MRDataplaneConfig;
    mrAutoscalingConfig?: MRAutoscalingConfig;
}
export declare class MRAutoScaling extends Construct {
    readonly serviceAutoscaler: EcsIsoServiceAutoscaler;
    mrAutoscalingConfig: MRAutoscalingConfig;
    /**
     * Creates a custom autoscaling implementation for model runner.
     * @param scope the scope/stack in which to define this construct.
     * @param id the id of this construct within the current scope.
     * @param props the properties of this construct.
     * @returns the MRAutoScaling construct.
     */
    constructor(scope: Construct, id: string, props: MRAutoScalingProps);
}
