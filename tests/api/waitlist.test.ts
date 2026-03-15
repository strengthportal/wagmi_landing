import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import handler from '../../api/waitlist';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALID_EMAIL = 'trainer@example.com';
const VALID_TOKEN = 'test-turnstile-token';
const ORIGIN = 'http://localhost:4321';

function makeRequest(
  body: unknown,
  { method = 'POST', origin = ORIGIN }: { method?: string; origin?: string } = {}
): Request {
  if (method === 'OPTIONS' || method === 'GET') {
    return new Request('http://localhost/api/waitlist', {
      method,
      headers: { origin },
    });
  }
  return new Request('http://localhost/api/waitlist', {
    method,
    headers: { 'Content-Type': 'application/json', origin },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

async function parseResponse(res: Response) {
  const data = await res.json();
  return { status: res.status, data };
}

/**
 * Build a mock for the global `fetch`. Handles:
 *   - Cloudflare Turnstile siteverify
 *   - Intercom contact creation (POST /contacts)
 *   - Intercom search (POST /contacts/search)
 *   - Intercom custom-attr patch (PATCH /contacts/:id)
 */
function mockFetch({
  turnstileSuccess = true,
  turnstileErrorCodes = [] as string[],
  turnstileThrows = false,
  intercomContactId = 'ic_abc123',
  intercomCreateStatus = 200,
  intercomThrows = false,
} = {}) {
  return vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
    const u = String(url);
    const method = ((init as RequestInit)?.method ?? 'GET').toUpperCase();

    // ── Cloudflare Turnstile ────────────────────────────────────────────────
    if (u.includes('challenges.cloudflare.com')) {
      if (turnstileThrows) throw new Error('Turnstile network error');
      return new Response(
        JSON.stringify({ success: turnstileSuccess, 'error-codes': turnstileErrorCodes }),
        { status: 200 }
      );
    }

    // ── Intercom ───────────────────────────────────────────────────────────
    if (u.includes('api.intercom.io')) {
      if (intercomThrows) throw new Error('Intercom unreachable');

      // Search for existing contact (called after 409)
      if (u.includes('/search')) {
        return new Response(
          JSON.stringify({ data: [{ id: intercomContactId }] }),
          { status: 200 }
        );
      }

      // PATCH custom attributes
      if (method === 'PATCH') {
        return new Response(JSON.stringify({}), { status: 200 });
      }

      // POST create contact
      if (intercomCreateStatus === 409) {
        return new Response(
          JSON.stringify({ errors: [{ message: 'Contact already exists' }] }),
          { status: 409 }
        );
      }
      if (intercomCreateStatus >= 400) {
        return new Response('Intercom error', { status: intercomCreateStatus });
      }
      return new Response(
        JSON.stringify({ id: intercomContactId }),
        { status: 200 }
      );
    }

    return new Response('Not found', { status: 404 });
  });
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubEnv('TURNSTILE_SECRET_KEY', 'test-secret-key');
  vi.stubEnv('INTERCOM_API_TOKEN', 'test-intercom-token');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/waitlist', () => {

  describe('success cases', () => {
    it('returns 200 for valid email and valid Turnstile token', async () => {
      vi.stubGlobal('fetch', mockFetch());

      const { status, data } = await parseResponse(
        await handler(makeRequest({ email: VALID_EMAIL, turnstileToken: VALID_TOKEN }))
      );

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("You're on the list!");
    });

    it('accepts emails with subdomains and plus-addressing', async () => {
      vi.stubGlobal('fetch', mockFetch());

      for (const email of ['user+tag@example.com', 'coach@mail.gym.io']) {
        const { status, data } = await parseResponse(
          await handler(makeRequest({ email, turnstileToken: VALID_TOKEN }))
        );
        expect(status, `expected 200 for ${email}`).toBe(200);
        expect(data.success).toBe(true);
      }
    });

    it('normalises email to lowercase before writing', async () => {
      const fetchMock = mockFetch();
      vi.stubGlobal('fetch', fetchMock);

      await handler(makeRequest({ email: 'Coach@Example.COM', turnstileToken: VALID_TOKEN }));

      // The Intercom POST body should contain the lowercased email
      const intercomCall = fetchMock.mock.calls.find(([url]) =>
        String(url).includes('api.intercom.io/contacts')
      );
      expect(intercomCall).toBeDefined();
      const sentBody = JSON.parse((intercomCall![1] as RequestInit).body as string);
      expect(sentBody.email).toBe('coach@example.com');
    });

    it('handles duplicate Intercom contact (409) gracefully — still returns 200', async () => {
      vi.stubGlobal('fetch', mockFetch({ intercomCreateStatus: 409 }));

      const { status, data } = await parseResponse(
        await handler(makeRequest({ email: VALID_EMAIL, turnstileToken: VALID_TOKEN }))
      );

      expect(status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('honeypot', () => {
    it('silently returns 200 when honeypot field is filled (bot trap)', async () => {
      // fetch should never be called — honeypot short-circuits before Turnstile
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      const { status, data } = await parseResponse(
        await handler(makeRequest({ email: VALID_EMAIL, turnstileToken: VALID_TOKEN, honeypot: 'bot-value' }))
      );

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('email validation', () => {
    it('returns 400 when email is missing', async () => {
      const { status, data } = await parseResponse(
        await handler(makeRequest({ turnstileToken: VALID_TOKEN }))
      );
      expect(status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/invalid email/i);
    });

    it('returns 400 when email is an empty string', async () => {
      const { status, data } = await parseResponse(
        await handler(makeRequest({ email: '', turnstileToken: VALID_TOKEN }))
      );
      expect(status).toBe(400);
      expect(data.error).toMatch(/invalid email/i);
    });

    it('returns 400 for email missing @ symbol', async () => {
      const { status } = await parseResponse(
        await handler(makeRequest({ email: 'notanemail', turnstileToken: VALID_TOKEN }))
      );
      expect(status).toBe(400);
    });

    it('returns 400 for email missing domain', async () => {
      const { status } = await parseResponse(
        await handler(makeRequest({ email: 'coach@', turnstileToken: VALID_TOKEN }))
      );
      expect(status).toBe(400);
    });

    it('returns 400 for email with spaces', async () => {
      const { status } = await parseResponse(
        await handler(makeRequest({ email: 'coach @example.com', turnstileToken: VALID_TOKEN }))
      );
      expect(status).toBe(400);
    });
  });

  describe('request body', () => {
    it('returns 400 for empty (non-JSON) request body', async () => {
      const req = new Request('http://localhost/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', origin: ORIGIN },
        body: 'not-json',
      });
      const { status, data } = await parseResponse(await handler(req));
      expect(status).toBe(400);
      expect(data.error).toMatch(/invalid request body/i);
    });

    it('returns 400 for completely empty body', async () => {
      const req = new Request('http://localhost/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', origin: ORIGIN },
      });
      const { status } = await parseResponse(await handler(req));
      expect(status).toBe(400);
    });
  });

  describe('Turnstile verification', () => {
    it('returns 400 when turnstileToken is missing', async () => {
      const { status, data } = await parseResponse(
        await handler(makeRequest({ email: VALID_EMAIL }))
      );
      expect(status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/verification/i);
    });

    it('returns 400 when Turnstile verification fails', async () => {
      vi.stubGlobal('fetch', mockFetch({
        turnstileSuccess: false,
        turnstileErrorCodes: ['invalid-input-response'],
      }));

      const { status, data } = await parseResponse(
        await handler(makeRequest({ email: VALID_EMAIL, turnstileToken: 'bad-token' }))
      );
      expect(status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/verification failed/i);
    });

    it('returns 400 with expiry message for timeout-or-duplicate Turnstile error', async () => {
      vi.stubGlobal('fetch', mockFetch({
        turnstileSuccess: false,
        turnstileErrorCodes: ['timeout-or-duplicate'],
      }));

      const { status, data } = await parseResponse(
        await handler(makeRequest({ email: VALID_EMAIL, turnstileToken: 'expired-token' }))
      );
      expect(status).toBe(400);
      expect(data.error).toMatch(/expired/i);
    });

    it('returns 502 when Turnstile network request throws', async () => {
      vi.stubGlobal('fetch', mockFetch({ turnstileThrows: true }));

      const { status } = await parseResponse(
        await handler(makeRequest({ email: VALID_EMAIL, turnstileToken: VALID_TOKEN }))
      );
      expect(status).toBe(502);
    });

    it('returns 500 when TURNSTILE_SECRET_KEY env var is not set', async () => {
      vi.stubEnv('TURNSTILE_SECRET_KEY', '');

      const { status } = await parseResponse(
        await handler(makeRequest({ email: VALID_EMAIL, turnstileToken: VALID_TOKEN }))
      );
      expect(status).toBe(500);
    });
  });

  describe('partial write failures', () => {
    it('returns 200 even when Intercom write throws — user is never penalised', async () => {
      vi.stubGlobal('fetch', mockFetch({ intercomThrows: true }));

      const { status, data } = await parseResponse(
        await handler(makeRequest({ email: VALID_EMAIL, turnstileToken: VALID_TOKEN }))
      );

      // The handler uses Promise.allSettled — a rejected write must not surface as a 5xx
      expect(status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('returns 200 when Intercom returns a 5xx server error', async () => {
      vi.stubGlobal('fetch', mockFetch({ intercomCreateStatus: 503 }));

      const { status, data } = await parseResponse(
        await handler(makeRequest({ email: VALID_EMAIL, turnstileToken: VALID_TOKEN }))
      );
      expect(status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('UTM and metadata passthrough', () => {
    it('passes UTM params and signup_page to Intercom custom attributes', async () => {
      const fetchMock = mockFetch();
      vi.stubGlobal('fetch', fetchMock);

      await handler(makeRequest({
        email: VALID_EMAIL,
        turnstileToken: VALID_TOKEN,
        utm_source: 'instagram',
        utm_medium: 'social',
        utm_campaign: 'spring2026',
        signup_page: '/blog/post-slug',
      }));

      const patchCall = fetchMock.mock.calls.find(([url, init]) =>
        String(url).includes('api.intercom.io/contacts/') &&
        ((init as RequestInit)?.method ?? '').toUpperCase() === 'PATCH'
      );
      expect(patchCall).toBeDefined();
      const patchBody = JSON.parse((patchCall![1] as RequestInit).body as string);
      expect(patchBody.custom_attributes.utm_source).toBe('instagram');
      expect(patchBody.custom_attributes.signup_page).toBe('/blog/post-slug');
    });
  });
});

describe('HTTP method handling', () => {
  it('returns 405 for GET requests', async () => {
    const { status, data } = await parseResponse(
      await handler(makeRequest(null, { method: 'GET' }))
    );
    expect(status).toBe(405);
    expect(data.error).toMatch(/method not allowed/i);
  });

  it('returns 204 for OPTIONS preflight requests', async () => {
    const res = await handler(makeRequest(null, { method: 'OPTIONS' }));
    expect(res.status).toBe(204);
  });

  it('includes CORS headers on all responses', async () => {
    vi.stubGlobal('fetch', mockFetch());

    const res = await handler(makeRequest({ email: VALID_EMAIL, turnstileToken: VALID_TOKEN }));
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeTruthy();
  });
});
