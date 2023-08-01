# OSML CDK Constructs

This project demonstrates a CDK Construct Library which includes the constructs that make up the OversightML (OSML) solutions's AWS infrastructure. This package may also be consumed by using the [NPM package](https://www.npmjs.com/package/osml-cdk-constructs).

## Table of Contents

* [Useful commands](#useful-commands)
* [Components](#components)
  * [Model Runner Components](#model-runner-components)
  * [OSML Components](#osml-components)
* [Feature Flags](#feature-flags)
* [Support & Feedback](#support--feedback)
* [Security](#security)
* [License](#license)

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests

## Components

This package contains an assortment of CDK components that may be re-used and re-purposed for your own projects. These components are split into two groups:

1. `MR*`: these are model runner components. These create the model runner infrastructure, which is responsible for leveraging the user-provided AI model against images.
2. `OSML*`: these are OversightML components. These create the OSML infrastructure for storing imagery, queueing jobs, setting up SageMaker endpoints, creating a VPC, and more.

### Model Runner Components

* `MRAutoScaling`: Creates a custom autoscaling implementation for model runner. Will automatically accomodate ADC regions as well as public/commercial regions. If set, this component will use the settings defined in the MRAutoscalingConfig.
* `MRDataplane`: This construct is responsible for managing the data plane of the model runner application. This construct makes use of many OSML constructs to create resources like the VPC, DDB tables, SQS queues, SNS topics, ECS clusters, and more. If set, this component will use the settings defined in the MRDataplaneConfig
* `MRMonitoring`: Creates a CloudWatch Dashboard for monitoring the status of the Model Runner. Tracks metrics like the number of requests in the ImageRequestQueue, SageMakerEndpoint latency, etc.
* `MRSMRole`: Creates a SageMaker execution role for hosting CV models at the SM endpoint. This role will give SageMaker full access to SQS, S3, DynamoDB, SageMaker, CloudWatch, SecretsManager, and ECS.
* `MRTaskRole`: Creates a role for Fargate/ECS so they can access everything they need. This role will give Fargate/ECS full access to SQS, S3, DynamoDB, SageMaker, CloudWatch, SecretsManager, and ECS.
* `MRTesting`: Creates a construct for testing the Model Runner. This construct will provision resources for storing test images, for storing test results, and everything else needed for Model Runner to run tests against the testing models provided in the [osml-model-runner-test package](https://github.com/aws-solutions-library-samples/osml-model-runner-test). If set, this component will use the settings defined in the MRTestingConfig.

### OSML Components

* `OSMLAccount`: An interface that handles settings such as whether to enable auto-scaling, whether to enable monitoring, whether to use an existing VPC or create a new one, and more.
* `OSMLBucket`: Creates an OSML bucket and access logging bucket. This construct makes use of security best practices, such as encryption, encforcing SSL, and access logging.
* `OSMLECRContainer`: This construct takes a local directory and copies it to a docker image asset and deploys it to an ECR repository with the "latest" tag if a repository is provided.
* `OSMLQueue`: Creates an encrypted Queue and Dead Letter Queue.
* `OSMLRepository`: Creates an encrypted ECR repository for storing Docker images. The repository can be configured to auto-delete images when the repository is removed from the stack or the stack is deleted.
* `OSMLSMEndpoint`: Creates a SageMaker endpoint for the specified model. A model is specified by providing the URI for the container image of the model.
* `OSMLTable`: Creates a DynamoDB table with the specified partition key and sort key (if one is provided). The table will come with encryption enabled and point-in-time-recovery enabled.
* `OSMLTopic`: Creates an encrypted SNS Topic.
* `OSMLVpc`: Creates or imports a VPC for OSML. If one is created, it will have 2 subnets - one will be public, and the other will be private with egress (it can touch the internet, but not vice-versa).

## Feature Flags

By default, ModelRunner does not send status messages to SNS. To get status messages about the image processing status,
set the `IMAGE_PROCESSING_STATUS` environment variable to the ARN of the SNS topic to send messages to.

## Support & Feedback

To post feedback, submit feature ideas, or report bugs, please use the [Issues](https://github.com/aws-solutions-library-samples/osml-cdk-constructs/issues) section of this GitHub repo.

If you are interested in contributing to OversightML Model Runner, see the [CONTRIBUTING](CONTRIBUTING.md) guide.

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

MIT No Attribution Licensed. See [LICENSE](LICENSE).
