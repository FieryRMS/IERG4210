FROM node:20-alpine AS api-uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
ENV PATH="/app/.venv/bin:$PATH"

FROM api-uv AS api-dev
WORKDIR /app
COPY api/pyproject.toml api/.python-version api/uv.lock ./
RUN apk add --no-cache openjdk11
RUN uv sync --frozen --only-dev
RUN poe build


FROM api-uv AS api-prod
WORKDIR /app
COPY api/pyproject.toml api/.python-version api/uv.lock ./
COPY --from=api-dev /app/generated /app/generated
RUN uv sync --no-dev --frozen


FROM api-uv AS api
WORKDIR /app
COPY api/ .
COPY --from=api-prod /app/.venv /app/.venv
COPY --from=api-prod /root/.local/share/uv/python /root/.local/share/uv/python
RUN ls -la /app/.venv/Lib/site-packages
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