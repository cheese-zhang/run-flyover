import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { z } from 'zod';
import { createActivity, getActivity, getLaps, getTrack, listActivities } from './modules/activities/service.js';
import { GarminFitParser } from '@run-flyover/fit-parser';

const app = Fastify({ logger: true });
await app.register(cors, { origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' });
await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024, files: 1 } });

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

app.get('/health', async () => ({ status: 'ok' }));

app.get('/api/v1/activities', async (request) => {
  const query = paginationSchema.parse(request.query);
  return listActivities(query.page, query.pageSize);
});

app.get('/api/v1/activities/:id', async (request, reply) => {
  const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
  if (!params.success) return reply.code(400).send({ error: { code: 'INVALID_ACTIVITY_ID', message: 'Activity id must be a UUID' } });
  const activity = await getActivity(params.data.id);
  if (!activity) return reply.code(404).send({ error: { code: 'ACTIVITY_NOT_FOUND', message: 'Activity not found' } });
  return activity;
});

app.get('/api/v1/activities/:id/track', async (request, reply) => {
  const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
  if (!params.success) return reply.code(400).send({ error: { code: 'INVALID_ACTIVITY_ID', message: 'Activity id must be a UUID' } });
  const activity = await getActivity(params.data.id);
  if (!activity) return reply.code(404).send({ error: { code: 'ACTIVITY_NOT_FOUND', message: 'Activity not found' } });
  return getTrack(params.data.id);
});

app.get('/api/v1/activities/:id/route', async (request, reply) => {
  const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
  if (!params.success) return reply.code(400).send({ error: { code: 'INVALID_ACTIVITY_ID', message: 'Activity id must be a UUID' } });
  const activity = await getActivity(params.data.id);
  if (!activity) return reply.code(404).send({ error: { code: 'ACTIVITY_NOT_FOUND', message: 'Activity not found' } });
  const points = await getTrack(params.data.id);
  return { type: 'Feature', properties: { activityId: params.data.id }, geometry: { type: 'LineString', coordinates: points.map((point) => [point.longitude, point.latitude, point.elevationMeters].filter((value) => value !== undefined)) } };
});

app.get('/api/v1/activities/:id/laps', async (request, reply) => {
  const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
  if (!params.success) return reply.code(400).send({ error: { code: 'INVALID_ACTIVITY_ID', message: 'Activity id must be a UUID' } });
  const activity = await getActivity(params.data.id);
  if (!activity) return reply.code(404).send({ error: { code: 'ACTIVITY_NOT_FOUND', message: 'Activity not found' } });
  return getLaps(params.data.id);
});

app.post('/api/v1/activities/import', async (request, reply) => {
  const file = await request.file();
  if (!file) return reply.code(400).send({ error: { code: 'INVALID_FILE', message: 'A FIT file is required' } });
  if (!file.filename.toLowerCase().endsWith('.fit')) return reply.code(400).send({ error: { code: 'INVALID_FILE', message: 'Only .FIT files are supported' } });
  const buffer = await file.toBuffer();
  const parser = new GarminFitParser();
  const validation = parser.validate(buffer);
  if (!validation.valid) return reply.code(400).send({ error: { code: 'INVALID_FIT', message: validation.reason ?? 'Invalid FIT file' } });
  try {
    const parsed = parser.parse(buffer);
    const activity = await createActivity(parsed);
    return reply.code(201).send({ id: activity.id, status: activity.status });
  } catch (error) {
    request.log.error(error);
    return reply.code(400).send({ error: { code: 'IMPORT_FAILED', message: error instanceof Error ? error.message : 'Unable to import FIT file' } });
  }
});

const port = Number(process.env.API_PORT ?? 3000);
app.listen({ port, host: '0.0.0.0' }).catch((error) => { app.log.error(error); process.exit(1); });
