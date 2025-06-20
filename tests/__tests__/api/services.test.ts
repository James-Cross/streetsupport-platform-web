/**
 * @jest-environment node
 */

import { GET } from '@/app/api/services/route';

// ✅ Mock Mongo client for services + join with provider
jest.mock('@/utils/mongodb', () => ({
  getClientPromise: async () => {
    return {
      db: () => ({
        collection: (name: string) => {
          if (name === 'ProvidedServices') {
            return {
              countDocuments: async () => 1,
              find: () => ({
                skip: () => ({
                  limit: () => ({
                    toArray: async () => [
                      {
                        Key: 'service-1',
                        ServiceProviderKey: 'org-1',
                        Title: 'Test Service',
                        ParentCategoryKey: 'health',
                        SubCategoryKey: 'gp',
                        Description: 'Test description',
                        OpeningTimes: [],
                        ClientGroups: [],
                        Address: { City: 'Leeds' },
                        IsPublished: true // ✅ add to match your live filter
                      },
                    ],
                  }),
                }),
              }),
              aggregate: () => ({
                toArray: async () => [
                  {
                    Key: 'service-1',
                    ServiceProviderKey: 'org-1',
                    Title: 'Test Service',
                    ParentCategoryKey: 'health',
                    SubCategoryKey: 'gp',
                    Description: 'Test description',
                    OpeningTimes: [],
                    ClientGroups: [],
                    Address: { City: 'Leeds', Location: { coordinates: [-1,1] } },
                    IsPublished: true,
                    distance: 1.2,
                  },
                ],
              }),
            };
          }

          if (name === 'ServiceProviders') {
            return {
              findOne: async () => ({
                Key: 'org-1',
                Name: 'Test Org',
                ShortDescription: 'Test org description',
                Website: 'https://test.org',
                Telephone: '123456',
                Email: 'info@test.org',
                IsVerified: true,
              }),
            };
          }

          throw new Error('Unknown collection');
        },
      }),
    };
  },
}));

describe('GET /api/services', () => {
  it('returns success and services array', async () => {
    const req = new Request('http://localhost/api/services?page=1&limit=2');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe('success');
    expect(Array.isArray(json.results)).toBe(true);
    expect(typeof json.total).toBe('number');
  });

  it('handles invalid page value', async () => {
    const req = new Request('http://localhost/api/services?page=-1');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('filters by location and category (mock)', async () => {
    const req = new Request('http://localhost/api/services?location=leeds&category=health');
    const res = await GET(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.status).toBe('success');
    expect(Array.isArray(json.results)).toBe(true);
    expect(json.results[0].organisation).toBeDefined();
    // ✅ FIXED: new shape
    expect(json.results[0].organisation.name).toBe('Test Org');
    expect(json.results[0].organisation.slug).toBe('org-1');
    expect(json.results[0].organisation.isVerified).toBe(true);
  });

  it('supports lat/lng search with distance', async () => {
    const req = new Request('http://localhost/api/services?lat=53&lng=-1');
    const res = await GET(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.status).toBe('success');
    expect(Array.isArray(json.results)).toBe(true);
    expect(json.results[0].distance).toBeDefined();
  });
});
