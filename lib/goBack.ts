// The in-app Back arrow: go to the previous page, or to a sensible parent when the page was opened
// directly (a shared link, a notification, or the first screen of the Android app).
type Router = { back: () => void; push: (href: string) => void }

export function goBack(router: Router, fallback = '/dashboard') {
  if (window.history.length > 1) router.back()
  else router.push(fallback)
}
