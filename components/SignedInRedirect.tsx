/**
 * On the landing page: people who are already signed in go straight to Today. Runs as a tiny
 * inline script before the page paints, so there's no flash of the marketing page.
 */
export default function SignedInRedirect() {
  const code = `try{var k=Object.keys(localStorage).find(function(x){return /^sb-.+-auth-token$/.test(x)});if(k){var v=JSON.parse(localStorage.getItem(k)||'null');if(v&&(v.refresh_token||(v.currentSession&&v.currentSession.refresh_token)))location.replace('/dashboard')}}catch(e){}`
  return <script dangerouslySetInnerHTML={{ __html: code }} />
}
