export const config = { runtime: 'edge' };

const ALLOWED_ORIGINS = ['https://wagmi.fit', 'https://www.wagmi.fit'];

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed =
    (origin && ALLOWED_ORIGINS.includes(origin)) ||
    (origin?.startsWith('http://localhost') ?? false);
  return {
    'Access-Control-Allow-Origin': allowed ? (origin ?? ALLOWED_ORIGINS[0]) : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function json(data: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

export default async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get('origin');
  const cors = corsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  if (req.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, 405, cors);
  }

  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: 'Invalid request body' }, 400, cors);
  }

  const {
    email,
    turnstileToken,
    honeypot,
    utm_source,
    utm_medium,
    utm_campaign,
    referrer,
    signup_page,
  } = body;

  // Honeypot — silently succeed so bots think they signed up
  if (honeypot) {
    return json({ success: true, message: "You're on the list!" }, 200, cors);
  }

  // Email validation
  if (!email || !isValidEmail(email)) {
    return json({ success: false, error: 'Invalid email address' }, 400, cors);
  }

  // Turnstile verification
  if (!turnstileToken) {
    return json({ success: false, error: 'Verification failed' }, 400, cors);
  }

  const turnstileRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: process.env.TURNSTILE_SECRET_KEY,
      response: turnstileToken,
    }),
  });

  const turnstileData = (await turnstileRes.json()) as { success: boolean };
  if (!turnstileData.success) {
    return json({ success: false, error: 'Verification failed' }, 400, cors);
  }

  const signedUpAt = new Date().toISOString();
  const normalizedEmail = email.trim().toLowerCase();

  const intercomHeaders = {
    Authorization: `Bearer ${process.env.INTERCOM_API_TOKEN}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'Intercom-Version': '2.10',
  };

  // Parallel writes — fire-and-forget; failures are logged but never block the user
  const [intercomResult] = await Promise.allSettled([
    // ── Intercom ──────────────────────────────────────────────────────────────
    // Step 1: create the contact (email + role only — always works)
    fetch('https://api.intercom.io/contacts', {
      method: 'POST',
      headers: intercomHeaders,
      body: JSON.stringify({ role: 'lead', email: normalizedEmail }),
    }).then(async (r) => {
      // 409 = duplicate — merge and return the existing contact
      if (r.status === 409) {
        const body = await r.json() as { errors?: Array<{ field?: string; message?: string }> };
        // Intercom returns the conflicting id in the error — search for it
        const searchRes = await fetch(
          `https://api.intercom.io/contacts/search`,
          {
            method: 'POST',
            headers: intercomHeaders,
            body: JSON.stringify({ query: { field: 'email', operator: '=', value: normalizedEmail } }),
          }
        );
        const searchData = await searchRes.json() as { data?: Array<{ id: string }> };
        return searchData.data?.[0] ?? body;
      }
      if (!r.ok) {
        const text = await r.text();
        throw new Error(`Intercom ${r.status}: ${text}`);
      }
      return r.json() as Promise<{ id: string }>;
    }).then(async (contact) => {
      // Step 2: patch custom attributes — best-effort, won't break contact creation
      // Note: custom data attributes must be pre-created in Intercom Settings →
      // Custom data attributes before they can be populated here.
      const contactId = (contact as { id?: string }).id;
      if (!contactId) return contact;

      const patchRes = await fetch(`https://api.intercom.io/contacts/${contactId}`, {
        method: 'PATCH',
        headers: intercomHeaders,
        body: JSON.stringify({
          custom_attributes: {
            utm_source: utm_source || null,
            utm_medium: utm_medium || null,
            utm_campaign: utm_campaign || null,
            referrer: referrer || null,
            signup_page: signup_page || '/',
            signed_up_at: signedUpAt,
            lead_source: 'wagmi.fit_waitlist',
          },
        }),
      });

      if (!patchRes.ok) {
        const text = await patchRes.text();
        console.error(`[waitlist] Custom attributes patch failed ${patchRes.status}: ${text}`);
      }

      return contact;
    }),

    // ── Database (api-nuevo) ───────────────────────────────────────────────────
    // TODO: replace stub with POST to api-nuevo once the waitlist endpoint exists
    // Repo: https://github.com/strengthportal/api-nuevo
    //
    // Expected call shape (to be confirmed with BE team):
    //   POST <API_BASE_URL>/waitlist
    //   Authorization: Bearer <API_SECRET_KEY>
    //   { email, utm_source, utm_medium, utm_campaign, referrer, signup_page, signed_up_at }
    //
    // Suggested DB schema (waitlist_signups):
    //   id UUID PRIMARY KEY DEFAULT gen_random_uuid()
    //   email TEXT NOT NULL UNIQUE
    //   utm_source TEXT, utm_medium TEXT, utm_campaign TEXT
    //   referrer TEXT, signup_page TEXT
    //   intercom_contact_id TEXT  -- null if Intercom write failed
    //   created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    //
    // Add API_BASE_URL + API_SECRET_KEY to Vercel env vars when ready.
    Promise.resolve({ stubbed: true }),
  ]);

  if (intercomResult.status === 'rejected') {
    console.error('[waitlist] Intercom write failed for', normalizedEmail, intercomResult.reason);
  }

  // Always return success — never punish the user for infrastructure failures
  return json({ success: true, message: "You're on the list!" }, 200, cors);
}
