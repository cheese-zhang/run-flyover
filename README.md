# Run Flyover

Personal running activity visualization platform. Garmin is the first data source; the internal domain stays source-agnostic.

## Current milestone

FIT upload -> Garmin FIT SDK -> canonical activity -> PostgreSQL -> REST API -> React -> MapLibre route.

Garmin OAuth, webhook, AWS, Cesium and Flyover playback are intentionally deferred until this local pipeline is working.

## Requirements

- Node.js 20+
- pnpm 10+
- PostgreSQL 16+

## Development

```bash
pnpm install
cp .env.example .env
pnpm dev
```

API: http://localhost:3000
Web: http://localhost:5173

## FIT import

```bash
curl -F "file=@activity.fit" http://localhost:3000/api/v1/activities/import
```

See `docs/RUN_FLYOVER_AI_DEVELOPMENT_SPEC.md` for the complete agent development specification.
