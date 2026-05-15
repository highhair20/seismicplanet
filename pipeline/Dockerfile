FROM public.ecr.aws/lambda/python:3.11

RUN yum install -y awscli && yum clean all

WORKDIR /var/task

COPY pyproject.toml .
COPY pipeline/ pipeline/

RUN pip install --no-cache-dir -e .

COPY pipeline/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

CMD ["pipeline.lambda_handler.handler"]
