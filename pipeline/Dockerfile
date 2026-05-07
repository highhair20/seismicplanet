FROM python:3.11-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends awscli \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY pyproject.toml .
COPY pipeline/ pipeline/

RUN pip install --no-cache-dir -e .

COPY pipeline/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
