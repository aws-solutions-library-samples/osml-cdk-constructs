# Copyright 2024 Amazon.com, Inc. or its affiliates.

FROM public.ecr.aws/lambda/python:3.11 as osml_data_catalog

RUN yum -y upgrade
RUN yum -y install gcc
RUN yum -y install ca-certificates

RUN pip3 install stac_fastapi.core
RUN pip3 install stac_fastapi.opensearch[server]
RUN pip3 install mangum

EXPOSE 8080

CMD ["stac_fastapi.opensearch.app.handler"]
