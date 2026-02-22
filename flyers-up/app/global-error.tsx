'use client';

/**
 * Catches unhandled errors in the root layout.
 * Renders a minimal fallback when the main app crashes.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui', margin: 0, padding: 24, background: '#faf9f6', color: '#1a1a1a' }}>
        <div style={{ maxWidth: 400, margin: '40px auto', textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: '#666', fontSize: 14, marginBottom: 24 }}>
            We encountered an error. Please try again.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: '10px 20px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Try again
          </button>
          <p style={{ marginTop: 24 }}>
            <a href="/" style={{ color: '#2563eb', textDecoration: 'none' }}>
              Go to home
            </a>
          </p>
        </div>
      </body>
    </html>
  );
}
