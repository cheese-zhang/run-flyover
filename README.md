# Run Flyover

Personal running activity visualization platform. Garmin is the first data source; the internal domain stays source-agnostic.

## Current milestone

FIT upload -> Garmin FIT SDK -> canonical activity processing -> PostgreSQL -> REST API -> React -> MapLibre route.

The Phase 1 local flow now includes FIT validation/integrity checking, GPS normalization, fallback distance/elevation calculation, activity/lap/track persistence, REST endpoints, and browser FIT upload.

Garmin OAuth, webhook, AWS, Cesium and Flyover playback are intentionally deferred until this local pipeline is working.

## Requirements

- Node.js 20+
- pnpm 10+
- PostgreSQL 16+
- Docker (recommended for local PostgreSQL)

## Development

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm dev
```

API: `http://localhost:3000`
Web: `http://localhost:5173`

## FIT import

Browser: open the web application and choose **Import FIT**.

CLI:

```bash
curl -F "file=@activity.fit" http://localhost:3000/api/v1/activities/import
```

## Quality gates

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

See `docs/development.md` and `RUN_FLYOVER_AI_DEVELOPMENT_SPEC.md` for the implementation contract and developer workflow.
