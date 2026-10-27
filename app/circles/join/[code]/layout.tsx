// The page here is a client component that loads its own data, so its HTML shell is the same
// for every id. Render it once per id and cache it, instead of running a server function on
// every tap (which was the slow part, especially on a cold start).
export const dynamic = 'force-static'
export const dynamicParams = true
export function generateStaticParams() { return [] }

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
