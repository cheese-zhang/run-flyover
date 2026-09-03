# Run Flyover local development

## Start PostgreSQL

```bash
docker compose up -d
```

The default database is `run_flyover` on `localhost:5432`.

## Install and run

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Web: `http://localhost:5173`
API: `http://localhost:3000`
Health: `http://localhost:3000/health`

## Import a FIT file

```bash
curl -F "file=@activity.fit" http://localhost:3000/api/v1/activities/import
```

The upload is validated and decoded by Garmin's official FIT JavaScript SDK. The backend then normalizes the result into the canonical activity model and stores the activity, GPS track points, and laps in PostgreSQL.

## API

- `GET /api/v1/activities?page=1&pageSize=20`
- `GET /api/v1/activities/:id`
- `GET /api/v1/activities/:id/route`
- `GET /api/v1/activities/:id/track`
- `GET /api/v1/activities/:id/laps`
- `POST /api/v1/activities/import`

The activity detail endpoint returns summary data only. Track data is exposed separately for route rendering and future playback.

## Quality gates

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Garmin OAuth, webhooks, AWS, SQS, S3, Cesium, Flyover playback, and video rendering are intentionally not part of Phase 1.
