import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/server.js';

const appPromise = buildApp();

describe('API', () => {
  it('returns health status', async () => {
    const app = await appPromise;
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('rejects malformed activity ids', async () => {
    const app = await appPromise;
    const response = await app.inject({ method: 'GET', url: '/api/v1/activities/not-a-uuid' });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('INVALID_ACTIVITY_ID');
  });

  afterAll(async () => {
    const app = await appPromise;
    await app.close();
  });
});
