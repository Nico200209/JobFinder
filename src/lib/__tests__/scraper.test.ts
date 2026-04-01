import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchFromTorre } from '../scraper';

function mockFetch(body: unknown, ok = true, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok,
      status,
      statusText: ok ? 'OK' : 'Error',
      json: async () => body,
    })
  );
}

describe('fetchFromTorre', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('normalizes a remote LATAM result to RawJob', async () => {
    mockFetch({
      results: [
        {
          opportunity: {
            id: 'abc123',
            objective: 'Frontend Developer',
            organizations: [{ name: 'Acme LATAM', picture: 'https://logo.png' }],
            locations: [{ name: 'Colombia' }],
            remote: true,
            compensation: { minAmount: 40000, maxAmount: 60000, currency: 'USD' },
            deadline: null,
          },
        },
      ],
    });

    const jobs = await fetchFromTorre(['frontend'], { remote: true });

    expect(jobs).toHaveLength(1);
    expect(jobs[0].external_id).toBe('torre_abc123');
    expect(jobs[0].title).toBe('Frontend Developer');
    expect(jobs[0].company).toBe('Acme LATAM');
    expect(jobs[0].company_logo_url).toBe('https://logo.png');
    expect(jobs[0].remote_type).toBe('remote');
    expect(jobs[0].source).toBe('torre');
    expect(jobs[0].salary_min).toBe(40000);
    expect(jobs[0].salary_max).toBe(60000);
    expect(jobs[0].salary_currency).toBe('USD');
  });

  it('sets remote_type to onsite when remote=false', async () => {
    mockFetch({
      results: [
        {
          opportunity: {
            id: 'xyz',
            objective: 'Game Designer',
            organizations: [{ name: 'DR Studio' }],
            locations: [{ name: 'Santo Domingo' }],
            remote: false,
            compensation: null,
            deadline: null,
          },
        },
      ],
    });

    const jobs = await fetchFromTorre(['game designer'], {
      remote: false,
      location: 'Dominican Republic',
    });

    expect(jobs[0].remote_type).toBe('onsite');
    expect(jobs[0].location).toBe('Santo Domingo');
  });

  it('returns empty array when results is empty', async () => {
    mockFetch({ results: [] });
    const jobs = await fetchFromTorre(['react'], { remote: true });
    expect(jobs).toEqual([]);
  });

  it('throws on unexpected response shape', async () => {
    mockFetch({ unexpected: true });
    await expect(fetchFromTorre(['react'], { remote: true })).rejects.toThrow(
      'Torre.ai returned unexpected response shape'
    );
  });

  it('throws on non-ok HTTP response', async () => {
    mockFetch({}, false, 429);
    await expect(fetchFromTorre(['react'], { remote: true })).rejects.toThrow(
      'Torre.ai request failed: 429'
    );
  });
});
