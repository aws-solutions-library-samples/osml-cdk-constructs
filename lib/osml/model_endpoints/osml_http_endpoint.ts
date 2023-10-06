/*
 * Copyright 2023 Amazon.com, Inc. or its affiliates.
 */

import { Duration, RemovalPolicy } from "aws-cdk-lib";
import { ISecurityGroup, SecurityGroup } from "aws-cdk-lib/aws-ec2";
import {
  Cluster,
  Compatibility,
  ContainerImage,
  LogDriver,
  Protocol,
  TaskDefinition
} from "aws-cdk-lib/aws-ecs";
import { ApplicationLoadBalancedFargateService } from "aws-cdk-lib/aws-ecs-patterns";
import { IRole } from "aws-cdk-lib/aws-iam";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

import { OSMLAccount } from "../osml_account";
import { OSMLVpc } from "../osml_vpc";

export interface OSMLHTTPEndpointProps {
  account: OSMLAccount;
  osmlVpc: OSMLVpc;
  image: ContainerImage;
  clusterName: string;
  role: IRole;
  memory: number;
  cpu: number;
  hostPort: number;
  containerPort: number;
  healthcheckPath: string;
  loadBalancerName: string;
  containerEnv?: { [key: string]: string };
  securityGroupId?: string;
}

export class OSMLHTTPModelEndpoint extends Construct {
  public networkHTTPEndpoint: ApplicationLoadBalancedFargateService;
  public logGroup: LogGroup;
  public removalPolicy: RemovalPolicy;
  public securityGroups: ISecurityGroup[];

  constructor(scope: Construct, id: string, props: OSMLHTTPEndpointProps) {
    super(scope, id);
    const httpEndpointCluster = new Cluster(this, props.clusterName, {
      clusterName: props.clusterName,
      vpc: props.osmlVpc.vpc
    });
    // setup a removal policy
    this.removalPolicy = props.account.prodLike
      ? RemovalPolicy.RETAIN
      : RemovalPolicy.DESTROY;

    // log group for MR container
    this.logGroup = new LogGroup(this, "MRServiceLogGroup", {
      logGroupName: "/aws/OSML/HTTPEndpoint",
      retention: RetentionDays.TEN_YEARS,
      removalPolicy: this.removalPolicy
    });

    const taskDefinition = new TaskDefinition(
      this,
      "HTTPEndpointFargateTaskDefinition",
      {
        memoryMiB: props.memory.toString(),
        cpu: props.cpu.toString(),
        compatibility: Compatibility.FARGATE,
        taskRole: props.role,
        ephemeralStorageGiB: 100
      }
    );
    taskDefinition.addContainer("HTTPEndpointContainer", {
      image: props.image,
      portMappings: [
        {
          containerPort: props.containerPort,
          hostPort: props.hostPort,
          protocol: Protocol.TCP
        }
      ],
      logging: LogDriver.awsLogs({
        logGroup: this.logGroup,
        streamPrefix: "OSML"
      }),
      environment: props.containerEnv
    });

    // if a custom security group was provided
    if (props.securityGroupId) {
      this.securityGroups = [
        SecurityGroup.fromSecurityGroupId(
          this,
          "MRImportSecurityGroup",
          props.securityGroupId
        )
      ];
    }

    this.networkHTTPEndpoint = new ApplicationLoadBalancedFargateService(
      this,
      `${id}-HTTPEndpointService`,
      {
        cluster: httpEndpointCluster,
        loadBalancerName: props.loadBalancerName,
        healthCheckGracePeriod: Duration.seconds(120),
        taskDefinition: taskDefinition,
        taskSubnets: props.osmlVpc.selectedSubnets,
        publicLoadBalancer: false,
        securityGroups: this.securityGroups
      }
    );

    this.networkHTTPEndpoint.targetGroup.configureHealthCheck({
      path: props.healthcheckPath,
      port: props.hostPort.toString()
    });
  }
}
