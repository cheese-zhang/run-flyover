import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { createActivity, getActivity, getTrack, listActivities } from './modules/activities/service.js';
import { GarminFitParser } from '@run-flyover/fit-parser';

const app = Fastify({ logger: true });
await app.register(cors, { origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' });
await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024, files: 1 } });

app.get('/health', async () => ({ status: 'ok' }));
app.get('/api/v1/activities', async (request) => {
  const query = request.query as { pageSize?: string };
  return listActivities(Number(query.pageSize ?? 20));
});
app.get('/api/v1/activities/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  const activity = await getActivity(id);
  if (!activity) return reply.code(404).send({ error: { code: 'ACTIVITY_NOT_FOUND', message: 'Activity not found' } });
  return activity;
});
app.get('/api/v1/activities/:id/track', async (request, reply) => {
  const { id } = request.params as { id: string };
  const activity = await getActivity(id);
  if (!activity) return reply.code(404).send({ error: { code: 'ACTIVITY_NOT_FOUND', message: 'Activity not found' } });
  return getTrack(id);
});
app.get('/api/v1/activities/:id/route', async (request, reply) => {
  const { id } = request.params as { id: string };
  const activity = await getActivity(id);
  if (!activity) return reply.code(404).send({ error: { code: 'ACTIVITY_NOT_FOUND', message: 'Activity not found' } });
  const points = await getTrack(id);
  return { type: 'Feature', properties: { activityId: id }, geometry: { type: 'LineString', coordinates: points.map((p) => [p.longitude, p.latitude, p.elevationMeters ?? 0]) } };
});
app.post('/api/v1/activities/import', async (request, reply) => {
  const file = await request.file();
  if (!file) return reply.code(400).send({ error: { code: 'INVALID_FILE', message: 'A FIT file is required' } });
  if (!file.filename.toLowerCase().endsWith('.fit')) return reply.code(400).send({ error: { code: 'INVALID_FILE', message: 'Only .FIT files are supported' } });
  const buffer = await file.toBuffer();
  try {
    const parser = new GarminFitParser();
    const parsed = parser.parse(buffer);
    const activity = await createActivity(parsed);
    return reply.code(201).send({ id: activity.id, status: activity.status });
  } catch (error) {
    request.log.error(error);
    return reply.code(400).send({ error: { code: 'INVALID_FIT', message: error instanceof Error ? error.message : 'Unable to parse FIT file' } });
  }
});

const port = Number(process.env.API_PORT ?? 3000);
app.listen({ port, host: '0.0.0.0' }).catch((error) => { app.log.error(error); process.exit(1); });
