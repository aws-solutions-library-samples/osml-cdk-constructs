# OSML CDK Constructs

You should explore the contents of this project. It demonstrates a CDK Construct Library that includes a construct (OsmlCdkConstructs) which contains an Amazon SQS queue that is subscribed to an Amazon SNS topic.

### Table of Contents
* [Useful commands](#useful-commands)
* [Support & Feedback](#support--feedback)
* [Security](#security)
* [License](#license)
  
## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests

## Feature Flags:

By default, ModelRunner does not send status messages to SNS. To get status messages about the image processing status,
set the `IMAGE_PROCESSING_STATUS` environment variable to the ARN of the SNS topic to send messages to.

## Support & Feedback

To post feedback, submit feature ideas, or report bugs, please use the [Issues](https://github.com/aws-solutions-library-samples/osml-cdk-constructs/issues) section of this GitHub repo.

If you are interested in contributing to OversightML Model Runner, see the [CONTRIBUTING](CONTRIBUTING.md) guide.

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

MIT No Attribution Licensed. See [LICENSE](LICENSE).
