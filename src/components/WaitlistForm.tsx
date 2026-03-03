import { useState, useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          size?: 'normal' | 'compact' | 'invisible';
          callback?: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
        }
      ) => string;
      remove: (widgetId: string) => void;
    };
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
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    function initWidget() {
      if (cancelled || !turnstileContainerRef.current || !window.turnstile) return;
      widgetIdRef.current = window.turnstile.render(turnstileContainerRef.current, {
        sitekey: '0x4AAAAAAClPdTUjwMIFdS8i',
        size: 'invisible',
        callback: (token) => { if (!cancelled) setTurnstileToken(token); },
        'expired-callback': () => { if (!cancelled) setTurnstileToken(null); },
        'error-callback': () => { if (!cancelled) setTurnstileToken(null); },
      });
    }

    if (window.turnstile) {
      initWidget();
    } else {
      // Load with render=explicit so the script doesn't auto-render .cf-turnstile divs
      if (!document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]')) {
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
      // Poll until the script has loaded and window.turnstile is available
      const interval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(interval);
          initWidget();
        }
      }, 100);
      return () => {
        cancelled = true;
        clearInterval(interval);
        if (widgetIdRef.current) window.turnstile?.remove(widgetIdRef.current);
      };
    }

    return () => {
      cancelled = true;
      if (widgetIdRef.current) window.turnstile?.remove(widgetIdRef.current);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Honeypot — silently succeed so bots think they signed up
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
        setTurnstileToken(null);
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
      {/* Turnstile mounts here via explicit render API — hidden, no layout impact */}
      <div ref={turnstileContainerRef} style={{ display: 'none' }} />

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
