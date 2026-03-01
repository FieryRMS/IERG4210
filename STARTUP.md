# Development Server Startup instructions

After creating the `.env` file based on the `.env.example` file, you can start the development server by following these steps:

1. Install dependencies

```bash
cd web
npm install
cd ../api
uv sync
```

1. Start database server

```bash
docker compose up -d
```

1. Start the development server

```bash
cd web
npm run dev
cd ../api
fastapi dev main.py
```