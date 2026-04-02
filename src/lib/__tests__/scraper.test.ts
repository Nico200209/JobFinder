import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchFromTorre, fetchFromHimalayas, fetchFromJSearch } from '../scraper';

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
          id: 'abc123',
          objective: 'Frontend Developer',
          organizations: [{ name: 'Acme LATAM', picture: 'https://logo.png' }],
          locations: ['Colombia'],
          remote: true,
          compensation: { data: { minAmount: 40000, maxAmount: 60000, currency: 'USD' } },
          created: '2024-12-01T00:00:00Z',
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
    expect(jobs[0].posted_at).toBe('2024-12-01T00:00:00Z');
  });

  it('filters out non-remote jobs when options.remote is true', async () => {
    mockFetch({
      results: [
        {
          id: 'r1',
          objective: 'Remote Dev',
          organizations: [{ name: 'Co A' }],
          locations: ['Mexico'],
          remote: true,
          compensation: null,
          created: null,
        },
        {
          id: 'o1',
          objective: 'Onsite Dev',
          organizations: [{ name: 'Co B' }],
          locations: ['Bogota'],
          remote: false,
          compensation: null,
          created: null,
        },
      ],
    });

    const jobs = await fetchFromTorre(['developer'], { remote: true });
    expect(jobs).toHaveLength(1);
    expect(jobs[0].external_id).toBe('torre_r1');
  });

  it('filters for DR location when location option is set', async () => {
    mockFetch({
      results: [
        {
          id: 'dr1',
          objective: 'Game Designer',
          organizations: [{ name: 'DR Studio' }],
          locations: ['Santo Domingo, Dominican Republic'],
          remote: false,
          compensation: null,
          created: null,
        },
        {
          id: 'mx1',
          objective: 'Game Designer',
          organizations: [{ name: 'MX Studio' }],
          locations: ['Mexico City, Mexico'],
          remote: false,
          compensation: null,
          created: null,
        },
      ],
    });

    const jobs = await fetchFromTorre(['game designer'], {
      remote: false,
      location: 'Dominican Republic',
    });

    expect(jobs).toHaveLength(1);
    expect(jobs[0].external_id).toBe('torre_dr1');
    expect(jobs[0].remote_type).toBe('onsite');
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

describe('fetchFromHimalayas', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('filters jobs by keyword and normalizes to RawJob', async () => {
    mockFetch({
      jobs: [
        {
          guid: 'https://himalayas.app/companies/startup-co/jobs/react-developer',
          title: 'React Developer',
          companyName: 'StartupCo',
          companyLogo: 'https://cdn-images.himalayas.app/logo.png',
          description: '<p>We need React and TypeScript skills</p>',
          minSalary: 60000,
          maxSalary: 90000,
          currency: 'USD',
          pubDate: 1743465600,   // 2025-04-01T00:00:00Z
          expiryDate: 1751241600, // 2025-06-30T00:00:00Z
          applicationLink: 'https://himalayas.app/companies/startup-co/jobs/react-developer',
          locationRestrictions: ['United States', 'Canada'],
        },
        {
          guid: 'https://himalayas.app/companies/other-co/jobs/java-backend-engineer',
          title: 'Java Backend Engineer',
          companyName: 'OtherCo',
          companyLogo: null,
          description: '<p>Java Spring Boot experience required</p>',
          minSalary: null,
          maxSalary: null,
          currency: null,
          pubDate: 1743465600,
          expiryDate: null,
          applicationLink: 'https://himalayas.app/companies/other-co/jobs/java-backend-engineer',
          locationRestrictions: null,
        },
      ],
    });

    const jobs = await fetchFromHimalayas(['react'], 50);

    expect(jobs).toHaveLength(1);
    expect(jobs[0].external_id).toBe('himalayas_startup-co_react-developer');
    expect(jobs[0].title).toBe('React Developer');
    expect(jobs[0].company).toBe('StartupCo');
    expect(jobs[0].company_logo_url).toBe('https://cdn-images.himalayas.app/logo.png');
    expect(jobs[0].remote_type).toBe('remote');
    expect(jobs[0].source).toBe('himalayas');
    expect(jobs[0].description).not.toContain('<p>');
    expect(jobs[0].salary_min).toBe(60000);
    expect(jobs[0].salary_max).toBe(90000);
    expect(jobs[0].salary_currency).toBe('USD');
    expect(jobs[0].location).toBe('United States, Canada');
    expect(jobs[0].posted_at).toBe(new Date(1743465600 * 1000).toISOString());
    expect(jobs[0].expires_at).toBe(new Date(1751241600 * 1000).toISOString());
  });

  it('returns empty array when no jobs match keywords', async () => {
    mockFetch({
      jobs: [
        {
          guid: 'https://himalayas.app/companies/other-co/jobs/java-backend-engineer',
          title: 'Java Backend Engineer',
          companyName: 'OtherCo',
          companyLogo: null,
          description: '<p>Java only</p>',
          minSalary: null,
          maxSalary: null,
          currency: null,
          pubDate: null,
          expiryDate: null,
          applicationLink: 'https://himalayas.app/companies/other-co/jobs/java-backend-engineer',
          locationRestrictions: null,
        },
      ],
    });

    const jobs = await fetchFromHimalayas(['react', 'typescript'], 50);
    expect(jobs).toEqual([]);
  });

  it('throws on non-ok HTTP response', async () => {
    mockFetch({}, false, 503);
    await expect(fetchFromHimalayas(['react'], 50)).rejects.toThrow(
      'Himalayas request failed: 503'
    );
  });

  it('throws on unexpected response shape', async () => {
    mockFetch([{ title: 'Job' }]); // array instead of { jobs: [] }
    await expect(fetchFromHimalayas(['react'], 50)).rejects.toThrow(
      'Himalayas returned unexpected response shape'
    );
  });
});

describe('fetchFromJSearch — location parameter', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.RAPIDAPI_KEY;
  });

  it('includes location param and omits remote_jobs_only when location is set', async () => {
    const capturedUrls: string[] = [];

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        capturedUrls.push(url);
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [] }),
        });
      })
    );

    process.env.RAPIDAPI_KEY = 'test-key';
    await fetchFromJSearch(['software developer'], true, 'Dominican Republic');

    expect(capturedUrls).toHaveLength(1);
    expect(capturedUrls[0]).toContain('location=Dominican+Republic');
    expect(capturedUrls[0]).not.toContain('remote_jobs_only');
  });

  it('caps at 1 keyword when location is set', async () => {
    const capturedUrls: string[] = [];

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        capturedUrls.push(url);
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [] }),
        });
      })
    );

    process.env.RAPIDAPI_KEY = 'test-key';
    await fetchFromJSearch(
      ['react developer', 'game designer', 'frontend'],
      false,
      'Dominican Republic'
    );

    // Only 1 request regardless of how many keywords
    expect(capturedUrls).toHaveLength(1);
  });
});
