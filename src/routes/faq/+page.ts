// Like /privacy, the FAQ is prerendered to real static HTML. The rest of the
// app is a client-only SPA (see +layout.ts: ssr = false), but a FAQ only earns
// its keep if people — and search/AI crawlers and link-preview scrapers — can
// actually read it without running JS. So ssr is re-enabled here to capture the
// rendered markup (questions, answers, and the FAQPage JSON-LD) in the initial
// response.
export const prerender = true;
export const ssr = true;
