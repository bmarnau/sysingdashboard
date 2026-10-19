# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim

ARG BUN_VERSION=1.4.3

USER root

RUN apt-get update \
    && apt-get install --no-install-recommends -y ca-certificates curl git unzip \
    && groupadd --system vscode \
    && useradd --system --gid vscode --create-home --shell /bin/bash vscode \
    && rm -rf /var/lib/apt/lists/*

RUN BUN_INSTALL=/opt/bun \
    && export BUN_INSTALL \
    && curl -fsSL https://bun.sh/install | bash -s -- "bun-v${BUN_VERSION}" \
    && ln -s /opt/bun/bin/bun /usr/local/bin/bun \
    && bun --version

USER vscode
WORKDIR /workspace
