FROM ghcr.io/astral-sh/uv:latest AS api-uv


FROM node:20-alpine AS api-uvbase
COPY --from=api-uv /uv /uvx /bin/


FROM api-uvbase AS api-uvsync
WORKDIR /app
ENV UV_NO_DEV=1
COPY api/pyproject.toml api/.python-version api/uv.lock ./
RUN uv sync --frozen
ENV PATH="/app/.venv/bin:$PATH"


FROM api-uvsync AS api
WORKDIR /app
COPY api/ .
RUN python -c "import main, json; print(json.dumps(main.app.openapi()))" > openapi.json
CMD ["fastapi", "run"]



FROM node:20-alpine AS web-dev
COPY web/ /app
WORKDIR /app
RUN npm ci

FROM node:20-alpine AS web-prod
COPY web/package.json web/package-lock.json /app/
WORKDIR /app
RUN npm ci --omit=dev

FROM web-dev AS web-build
COPY --from=api /app/openapi.json /app/openapi.json
WORKDIR /app
RUN npm run build

FROM node:20-alpine AS web
COPY web/package.json web/package-lock.json /app/
COPY --from=web-prod /app/node_modules /app/node_modules
COPY --from=web-build /app/build /app/build
WORKDIR /app
CMD ["npm", "run", "start"]