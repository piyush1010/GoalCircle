'use client'

// Last-resort screen if something in the app's frame fails. Uses plain styles: the app's CSS may not be loaded here.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  const reload = () => {
    try { sessionStorage.setItem('goalyaar-recovered', String(Date.now())) } catch { /* ignore */ }
    window.location.reload()
  }
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#F5F7FB', color: '#101B2D', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
        <main style={{ maxWidth: 340, padding: 24, textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, margin: '0 auto 16px', borderRadius: 14, background: '#101B2D', display: 'grid', placeItems: 'center', color: '#E8890C', fontSize: 28, fontWeight: 800 }}>!</div>
          <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>GoalYaar hit a snag</h1>
          <p style={{ fontSize: 15, lineHeight: 1.5, color: '#475569', margin: '0 0 20px' }}>Your data is safe. Reload to continue.</p>
          <button onClick={reload} style={{ border: 0, borderRadius: 12, background: '#E8890C', color: '#07101F', fontSize: 16, fontWeight: 700, padding: '12px 22px' }}>Reload GoalYaar</button>
          {error?.digest && <p style={{ marginTop: 16, fontSize: 12, color: '#94A3B8' }}>Code: {error.digest}</p>}
        </main>
      </body>
    </html>
  )
}
