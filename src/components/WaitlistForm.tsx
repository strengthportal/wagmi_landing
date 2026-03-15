import { useState, useEffect, useRef, useCallback } from 'react';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          size?: 'normal' | 'compact' | 'invisible';
          execution?: 'render' | 'execute';
          callback?: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
        }
      ) => string;
      execute: (widgetId: string) => void;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

type FormState = 'idle' | 'submitting' | 'success' | 'error';

interface WaitlistFormProps {
  variant?: 'hero' | 'cta' | 'modal';
}

export default function WaitlistForm({ variant = 'hero' }: WaitlistFormProps) {
  const [email, setEmail] = useState('');
  const [formState, setFormState] = useState<FormState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [turnstileInitialized, setTurnstileInitialized] = useState(false);
  const [turnstileLoadError, setTurnstileLoadError] = useState(false);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const tokenResolveRef = useRef<((token: string) => void) | null>(null);
  const tokenRejectRef = useRef<((error: Error) => void) | null>(null);
  const tokenTimeoutRef = useRef<number | null>(null);

  const clearPendingTokenRequest = useCallback(() => {
    if (tokenTimeoutRef.current) {
      window.clearTimeout(tokenTimeoutRef.current);
      tokenTimeoutRef.current = null;
    }
    tokenResolveRef.current = null;
    tokenRejectRef.current = null;
  }, []);

  const resetTurnstile = useCallback(() => {
    clearPendingTokenRequest();
    const widgetId = widgetIdRef.current;
    if (widgetId) {
      window.turnstile?.reset(widgetId);
    }
  }, [clearPendingTokenRequest]);

  const requestTurnstileToken = useCallback(() => {
    const widgetId = widgetIdRef.current;
    if (!widgetId || !window.turnstile) {
      return Promise.reject(new Error('Verification is still loading. Please try again in a moment.'));
    }

    clearPendingTokenRequest();
    setTurnstileLoadError(false);
    window.turnstile.reset(widgetId);

    return new Promise<string>((resolve, reject) => {
      tokenResolveRef.current = resolve;
      tokenRejectRef.current = reject;
      tokenTimeoutRef.current = window.setTimeout(() => {
        clearPendingTokenRequest();
        reject(new Error('Verification timed out. Please try again.'));
      }, 12000);
      window.turnstile?.execute(widgetId);
    });
  }, [clearPendingTokenRequest]);

  useEffect(() => {
    let cancelled = false;

    function initWidget() {
      if (cancelled || widgetIdRef.current || !turnstileContainerRef.current || !window.turnstile) return;
      widgetIdRef.current = window.turnstile.render(turnstileContainerRef.current, {
        sitekey: '0x4AAAAAAClPdTUjwMIFdS8i',
        size: 'invisible',
        execution: 'execute',
        callback: (token) => {
          if (cancelled) return;
          setTurnstileLoadError(false);
          const resolve = tokenResolveRef.current;
          clearPendingTokenRequest();
          resolve?.(token);
        },
        'expired-callback': () => {
          if (cancelled) return;
          const reject = tokenRejectRef.current;
          clearPendingTokenRequest();
          reject?.(new Error('Verification expired. Please try again.'));
        },
        'error-callback': () => {
          if (cancelled) return;
          setTurnstileLoadError(true);
          const reject = tokenRejectRef.current;
          clearPendingTokenRequest();
          reject?.(new Error('Verification failed. Please try again.'));
        },
      });
      setTurnstileInitialized(true);
      setTurnstileLoadError(false);
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
        script.onerror = () => {
          if (!cancelled) setTurnstileLoadError(true);
        };
        document.head.appendChild(script);
      }

      const timeout = window.setTimeout(() => {
        if (!cancelled && !window.turnstile && !widgetIdRef.current) {
          setTurnstileLoadError(true);
        }
      }, 8000);

      const interval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(interval);
          clearTimeout(timeout);
          initWidget();
        }
      }, 100);
      return () => {
        cancelled = true;
        clearInterval(interval);
        clearTimeout(timeout);
        if (widgetIdRef.current) {
          clearPendingTokenRequest();
          window.turnstile?.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }
      };
    }

    return () => {
      cancelled = true;
      if (widgetIdRef.current) {
        clearPendingTokenRequest();
        window.turnstile?.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [clearPendingTokenRequest]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Honeypot — silently succeed so bots think they signed up
    if (honeypotRef.current?.value) {
      setFormState('success');
      return;
    }

    if (turnstileLoadError) {
      setFormState('error');
      setErrorMessage('Verification failed to load. Please disable blockers or refresh and try again.');
      return;
    }

    if (!turnstileInitialized || !widgetIdRef.current) {
      setFormState('error');
      setErrorMessage('Verification is still loading. Please try again in a moment.');
      return;
    }

    setFormState('submitting');
    setErrorMessage('');

    const params = new URLSearchParams(window.location.search);

    try {
      const turnstileToken = await requestTurnstileToken();
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
        window.gtag?.('event', 'waitlist_signup', {
          form_variant: variant,
          utm_source: params.get('utm_source') ?? undefined,
          utm_medium: params.get('utm_medium') ?? undefined,
          utm_campaign: params.get('utm_campaign') ?? undefined,
        });
        setFormState('success');
      } else {
        setFormState('error');
        setErrorMessage(data.error ?? 'Something went wrong. Please try again.');
        resetTurnstile();
      }
    } catch (error) {
      setFormState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
      resetTurnstile();
    }
  }

  if (formState === 'success') {
    return (
      <div data-testid="success-state" className="flex flex-col items-center gap-1.5 py-3 text-center">
        <p className="text-sm font-medium text-cobalt">You're on the list!</p>
        <p className="text-xs text-ink-muted">We'll be in touch when it's your turn.</p>
      </div>
    );
  }

  const isCta = variant === 'cta';

  return (
    <div className={variant === 'hero' ? 'flex w-full max-w-md flex-col gap-2' : variant === 'modal' ? 'w-full flex flex-col gap-3' : 'mx-auto w-full max-w-md flex flex-col gap-3'}>
      {/* Turnstile mounts here via explicit render API — hidden, no layout impact */}
      <div ref={turnstileContainerRef} style={{ display: 'none' }} />

      <form
        onSubmit={handleSubmit}
        noValidate
        className={variant === 'hero' ? 'flex items-center gap-2' : variant === 'cta' ? 'flex flex-col gap-3 sm:flex-row' : 'flex flex-col gap-3'}
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
          placeholder={isCta ? 'coach@example.com' : 'Enter your email'}
          required
          disabled={formState === 'submitting'}
          className="flex h-12 w-full rounded-md border border-warm-border bg-card px-4 py-2 text-sm text-ink placeholder:text-ink-muted shadow-sm transition-all focus:border-cobalt focus:outline-none focus:ring-2 focus:ring-cobalt/20 disabled:opacity-60"
        />

        <button
          type="submit"
          disabled={formState === 'submitting'}
          className={[
            'inline-flex h-12 shrink-0 items-center justify-center rounded-md bg-cobalt px-6 font-medium text-white transition-all hover:bg-cobalt-dark focus:outline-none focus:ring-2 focus:ring-cobalt focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
            isCta
              ? 'w-full text-sm hover:shadow-md focus:ring-offset-parchment-alt sm:w-auto'
              : `${variant === 'modal' ? 'w-full ' : ''}text-base hover:-translate-y-px hover:shadow-lg focus:ring-offset-card`,
          ].join(' ')}
        >
          {formState === 'submitting' ? 'Joining…' : isCta ? 'Request Access' : 'Join Waitlist'}
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
