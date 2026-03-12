import { useState, useEffect } from 'react';
import WaitlistForm from './WaitlistForm';

export default function WaitlistModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex h-9 items-center justify-center rounded-md bg-cobalt px-4 text-sm font-medium text-white transition-colors hover:bg-cobalt-dark hover:-translate-y-[1px] hover:shadow-md"
      >
        Get Early Access
      </button>

      <div
        className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${isOpen ? '' : 'hidden'}`}
        role="dialog"
        aria-modal="true"
        aria-label="Join the waitlist"
      >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal panel */}
          <div className="relative z-10 w-full max-w-md rounded-xl border border-warm-border bg-card p-8 shadow-2xl">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-parchment-alt hover:text-ink"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <div className="mb-6">
              <h2 className="text-xl font-semibold tracking-tight text-ink">Get early access</h2>
              <p className="mt-1.5 text-sm text-ink-muted">
                Join the waitlist — we'll let you know when it's your turn.
              </p>
            </div>

            <WaitlistForm variant="modal" />
          </div>
        </div>
      </div>
    </>
  );
}
