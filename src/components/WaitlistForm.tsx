import { useState, useEffect, useRef } from 'react';

declare global {
  interface Window {
    __wagmiTurnstileToken?: string;
    __wagmiTurnstileCallback?: (token: string) => void;
    __wagmiTurnstileExpired?: () => void;
    __wagmiTurnstileError?: () => void;
  }
}

type FormState = 'idle' | 'submitting' | 'success' | 'error';

interface WaitlistFormProps {
  variant?: 'hero' | 'cta';
}

export default function WaitlistForm({ variant = 'hero' }: WaitlistFormProps) {
  const [email, setEmail] = useState('');
  const [formState, setFormState] = useState<FormState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Register Turnstile callbacks — the widget calls these by name on window
    window.__wagmiTurnstileCallback = (token: string) => setTurnstileToken(token);
    window.__wagmiTurnstileExpired = () => setTurnstileToken(null);
    window.__wagmiTurnstileError = () => setTurnstileToken(null);

    // Load Turnstile script once
    if (!document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]')) {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    return () => {
      delete window.__wagmiTurnstileCallback;
      delete window.__wagmiTurnstileExpired;
      delete window.__wagmiTurnstileError;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Honeypot — silently "succeed" for bots that filled the hidden field
    if (honeypotRef.current?.value) {
      setFormState('success');
      return;
    }

    if (!turnstileToken) {
      setFormState('error');
      setErrorMessage('Verification still loading — please try again in a moment.');
      return;
    }

    setFormState('submitting');
    setErrorMessage('');

    const params = new URLSearchParams(window.location.search);

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          turnstileToken,
          honeypot: honeypotRef.current?.value ?? '',
          utm_source: params.get('utm_source') ?? undefined,
          utm_medium: params.get('utm_medium') ?? undefined,
          utm_campaign: params.get('utm_campaign') ?? undefined,
          referrer: document.referrer || undefined,
          signup_page: window.location.pathname,
        }),
      });

      const data = (await res.json()) as { success: boolean; error?: string };

      if (data.success) {
        setFormState('success');
      } else {
        setFormState('error');
        setErrorMessage(data.error ?? 'Something went wrong. Please try again.');
        setTurnstileToken(null); // token was consumed; widget will re-verify automatically
      }
    } catch {
      setFormState('error');
      setErrorMessage('Something went wrong. Please try again.');
      setTurnstileToken(null);
    }
  }

  if (formState === 'success') {
    return (
      <div className="flex flex-col items-center gap-1.5 py-3 text-center">
        <p className="text-sm font-medium text-indigo-600">You're on the list!</p>
        <p className="text-xs text-slate-500">We'll be in touch when it's your turn.</p>
      </div>
    );
  }

  const isHero = variant === 'hero';

  return (
    <div className={isHero ? 'flex w-full max-w-md flex-col gap-2' : 'mx-auto w-full max-w-md flex flex-col gap-3'}>
      <form
        onSubmit={handleSubmit}
        noValidate
        className={isHero ? 'flex items-center gap-2' : 'flex flex-col gap-3 sm:flex-row'}
      >
        {/* Honeypot — hidden from humans, filled by bots */}
        <input
          ref={honeypotRef}
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, width: 0 }}
        />

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={isHero ? 'Enter your email' : 'coach@example.com'}
          required
          disabled={formState === 'submitting'}
          className="flex h-12 w-full rounded-md border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60"
        />

        {/* Invisible Turnstile widget — no visible UI, token captured via callback */}
        <div
          className="cf-turnstile"
          data-sitekey="0x4AAAAAAClPdTUjwMIFdS8i"
          data-size="invisible"
          data-callback="__wagmiTurnstileCallback"
          data-expired-callback="__wagmiTurnstileExpired"
          data-error-callback="__wagmiTurnstileError"
        />

        <button
          type="submit"
          disabled={formState === 'submitting'}
          className={[
            'inline-flex h-12 shrink-0 items-center justify-center rounded-md bg-indigo-600 px-6 font-medium text-white transition-all hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
            isHero
              ? 'text-base hover:-translate-y-[1px] hover:shadow-lg focus:ring-offset-white'
              : 'w-full text-sm hover:shadow-md focus:ring-offset-slate-50 sm:w-auto',
          ].join(' ')}
        >
          {formState === 'submitting' ? 'Joining…' : isHero ? 'Join Waitlist' : 'Request Access'}
        </button>
      </form>

      {errorMessage && (
        <p role="alert" className="text-xs text-red-500">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
