# SunSea Steel SEO/GEO Delivery Design

**Date:** 2026-07-28

## Goal

Make the SEO metadata, canonical URLs, localized HTML, crawlable content, and
structured data that already exist in the Node application reach production
crawlers reliably. Fix the remaining technical inconsistencies identified by
the supplied audit without migrating frameworks, fabricating business facts, or
changing customer-facing application behavior.

## Evidence and root cause

The audit observed that multiple production URLs returned the same static Vite
shell: a generic title and description, a homepage canonical URL, English
`html[lang]`, and no route-specific JSON-LD.

The current codebase already generates route-specific server output in
`server/index.js`:

- product, article, organization, item-list, and breadcrumb JSON-LD;
- route-specific title, description, canonical, Open Graph, and Twitter tags;
- localized `html[lang]` and `hreflang`;
- crawlable server-rendered product, article, category, and static-page content;
- real HTTP 404 responses for missing public content.

The production setup path is inconsistent with that architecture.
`server-setup.sh` serves `dist/index.html` directly for public routes and sends
only `/api/` and `/sitemap.xml` to Node. That bypasses the server SEO pipeline
and leaves the sitemap child routes outside Node. `server-update.sh` rebuilds
the application but does not verify that the active Nginx virtual host sends
public pages through Node.

## Scope

### In scope

1. Make Node the authoritative renderer for public HTML and every sitemap
   endpoint in the supplied Nginx configuration.
2. Keep hashed assets and uploaded media cacheable without bypassing Node for
   HTML.
3. Make the update workflow detect an incompatible production proxy
   configuration and fail with an actionable message rather than reporting a
   successful SEO deployment.
4. Remove generic static-shell SEO signals that can leak into fallback output.
5. Ensure successful SSR output contains exactly one canonical URL, one set of
   route-specific social metadata, localized `html[lang]`, and the expected
   structured data.
6. Replace `no-store` on public SSR HTML with revalidation-oriented cache
   headers that permit safe intermediary caching while avoiding stale browser
   pages.
7. Use the configured article author when present; otherwise identify the
   company as the article author. Do not invent a person.
8. Remove the hard-coded organization founding date because the database does
   not currently contain an authoritative founding-date field.
9. Return an error status instead of a generic 200 homepage shell when the SSR
   pipeline fails.
10. Add automated regression coverage for HTML metadata, error behavior,
    deployment configuration, and sitemap proxy coverage.

### Out of scope

- Creating customer cases, certificates, employee biographies, reviews, or
  backlinks without source material.
- Migrating Vue/Vite to Nuxt or adding a second SSG/SSR framework.
- Rewriting existing product or article copy.
- Promising Google rankings, indexing percentages, rich results, or AI
  citations.
- Altering the existing product offer/rating markup as part of this report
  remediation.

## Architecture

### One SEO rendering path

The existing production Node process remains the single source of truth for
public HTML. Nginx proxies page requests to `127.0.0.1:3001`; Node serves static
assets, performs route normalization, reads localized database content, injects
metadata and JSON-LD, and returns the final HTTP status.

Nginx may serve `/assets/` and `/uploads/` directly with immutable or bounded
cache headers. It must not use `try_files ... /index.html` for public routes.

### Deployment guard

The repository will contain one production Nginx example consistent with the
Node rendering architecture. The one-click setup script will generate that
same topology.

The update script will perform post-start checks against the local Node port
and the configured public domain:

- `/health` must succeed;
- a known public route must not expose the generic homepage canonical;
- `/sitemap-products.xml` must return XML rather than the Vite shell.

The update script will not blindly rewrite a panel-managed TLS virtual host.
If the active Nginx configuration still bypasses Node, deployment stops with
the exact configuration file/example and commands needed to correct it. This
preserves existing TLS, Cloudflare, and panel configuration.

### Metadata normalization

`index.html` remains a safe development shell, but route-specific SEO belongs
to Node. Static cache-control meta elements will be removed. The server will
remove any pre-existing canonical, Open Graph, Twitter, hreflang, and
server-owned JSON-LD blocks before inserting one normalized set.

Public SSR responses use:

```text
Cache-Control: public, max-age=0, must-revalidate, s-maxage=300,
               stale-while-revalidate=60
```

Error and not-found responses are not cacheable. Hashed assets retain their
long immutable cache policy.

### Truthful entity data

Organization and Article markup uses only database-backed company information.
Article author selection is:

1. configured `default_news_author` as a `Person`; otherwise
2. the company as an `Organization`, linked to the localized About page.

The hard-coded founding date and employee count are removed unless future
database-backed fields are introduced with real values.

## Request flow

1. The browser or crawler requests a localized public URL.
2. Nginx proxies the request to Node.
3. Node normalizes host, path, language prefix, and slug.
4. Node returns a permanent redirect only for a genuine canonicalization case.
5. Node loads the localized record and computes metadata, canonical,
   hreflang, structured data, and crawlable body content.
6. Node returns `200`, `301`, `404`, or `5xx` according to the actual result.
7. Post-deployment verification compares the public response with the Node
   response so a proxy regression cannot be mistaken for a successful update.

## Error handling

- Missing product, article, category, or invalid language routes return HTTP
  404 plus `noindex`.
- Missing static assets return HTTP 404 without the application shell.
- An SSR exception returns HTTP 500 with a minimal non-indexable HTML response;
  it never returns the generic homepage shell with status 200.
- A failed Nginx syntax check must leave the previous active configuration in
  place.
- A deployment verification failure stops before claiming completion and
  prints the failed URL and expected signal.

## Testing

Automated tests will verify:

- product, article, category, About, and homepage responses have distinct title,
  description, canonical, and language attributes;
- product and article pages contain their corresponding JSON-LD plus
  BreadcrumbList;
- Article author fallback uses the company organization;
- no hard-coded founding date or employee count is emitted;
- metadata blocks are not duplicated;
- missing routes and SSR exceptions never return an indexable 200 shell;
- public SSR cache headers permit revalidation and 404/5xx responses are not
  cacheable;
- generated Nginx configuration proxies public HTML and all sitemap routes to
  Node while retaining asset caching;
- `server-update.sh` contains post-deployment checks for canonical and child
  sitemap delivery.

The full Node test suite, server syntax checks, shell syntax checks, and Vite
production build must pass before publication.

## Rollout and verification

1. Back up the database, uploads, and current Nginx virtual host.
2. Deploy application code and rebuild the Vite bundle.
3. Restart the Node process.
4. Validate the active Nginx configuration with `nginx -t`.
5. Verify public product, article, About, invalid route, root sitemap, and child
   sitemap responses.
6. Use Google Rich Results Test and Search Console URL Inspection on a small
   representative set.
7. Request validation only after live inspection sees the new server output.

Search Console and external AI crawlers may require days or weeks to revisit
URLs. Successful rollout is defined by correct live HTTP output, not by an
immediate ranking or index-count change.
