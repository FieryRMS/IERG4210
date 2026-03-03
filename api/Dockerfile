FROM ghcr.io/astral-sh/uv:latest AS uv

FROM node:20-alpine AS base
COPY --from=uv /uv /uvx /bin/

FROM base AS env
WORKDIR /app
ENV UV_NO_DEV=1
COPY pyproject.toml .
COPY .python-version .
RUN uv sync


FROM env AS build
WORKDIR /app
COPY . .
CMD ["./.venv/bin/fastapi", "run", "./main.py"]