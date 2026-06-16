// Privacy is the one route we prerender to real static HTML. The rest of the
// app is a client-only SPA (see +layout.ts: ssr = false), but the policy
// should be in the initial HTML response — so link-preview scrapers, search
// crawlers, and a plain `curl https://clave.casa/privacy` all see the actual
// text, not an empty shell. ssr is re-enabled here so prerendering can capture
// the rendered markup.
export const prerender = true;
export const ssr = true;
