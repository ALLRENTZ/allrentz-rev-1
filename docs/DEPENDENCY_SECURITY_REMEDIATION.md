# Production Dependency Security Remediation

Date: 2026-07-20

## Scope

This is a separate bounded task after Phase 1 stabilization. It changes only
dependency metadata and records the supporting evidence. It does not change
application, authorization, RLS, workflow, database, or Supabase code.

Baseline:

- Commit: `961868b`
- Node: `v22.19.0`
- npm: `10.9.3`
- Audit command: `npm audit --omit=dev --json`
- Production findings: 40 total (0 low, 29 moderate, 11 high, 0 critical)

The npm high count represented 11 affected package nodes and 15 unique GHSA
advisories across three direct-dependency families.

## Baseline High-Severity Inventory

### React Router family

Direct dependency: `react-router-dom@^6.26.2`

Installed path:

`react-router-dom@6.27.0` -> `react-router@6.27.0` and
`@remix-run/router@1.20.0`

- `GHSA-2w69-qvjg-hvjx` — React Router XSS through open redirects
- `GHSA-9jcx-v3wj-wh4m` — unexpected external redirect through untrusted paths
- `GHSA-2j2x-hqr9-3h42` — protocol-relative same-origin redirect becomes an open redirect

### Recharts/Lodash family

Direct dependency: `recharts@^2.12.7`

Installed path: `recharts@2.13.0` -> `lodash@4.17.21`

- `GHSA-r5fr-rjxr-66jc` — code injection through `_.template` import key names
- `GHSA-f23m-r3pf-42rh` — prototype pollution through array-path bypass
- `GHSA-xxjr-mmjv-4gpg` — prototype pollution in `_.unset` and `_.omit`

### Tailwind build-tool family

Responsible direct dependency: `tailwindcss-animate@^1.0.7`

`tailwindcss-animate` was incorrectly classified as a runtime dependency even
though its only repository use is the plugin entry in `tailwind.config.ts`.
Its peer dependency pulled the Tailwind build toolchain into the production
audit graph:

`tailwindcss-animate` -> `tailwindcss` -> `chokidar` / `fast-glob` /
`micromatch` / `sucrase` -> affected glob packages.

- `GHSA-3v7f-55p6-f55p` — Picomatch POSIX character-class method injection
- `GHSA-c2c7-rcm5-vvqj` — Picomatch extglob ReDoS
- `GHSA-5j98-mcp5-4vw2` — Glob CLI command injection
- `GHSA-3ppc-4f35-3m26` — Minimatch repeated-wildcard ReDoS
- `GHSA-7r86-cg39-jmmj` — Minimatch GLOBSTAR combinatorial backtracking
- `GHSA-23c5-xmqv-rm74` — Minimatch nested-extglob ReDoS
- `GHSA-v6h2-p8h4-qcjw` — Brace Expansion regular-expression DoS
- `GHSA-f886-m6hf-6m8v` — Brace Expansion zero-step hang and memory exhaustion
- `GHSA-3jxr-9vmj-r5cp` — Brace Expansion exponential-time DoS

## Controlled Changes

1. Raised the direct `react-router-dom` minimum from `^6.26.2` to
   `^6.30.4`. The lockfile now resolves `react-router-dom@6.30.4`,
   `react-router@6.30.4`, and `@remix-run/router@1.23.3`.
2. Added an exact `lodash@4.18.1` override. This satisfies Recharts'
   existing `^4.17.21` range and is outside every verified vulnerable range.
   `4.18.0` was rejected after npm identified it as a deprecated bad release.
3. Moved `tailwindcss-animate@^1.0.7` from `dependencies` to
   `devDependencies`. Its version and behavior are unchanged; the correction
   removes the build-only Tailwind graph from production installation and
   audit scope.

No Vite, Tailwind, Recharts, application-code, or breaking major-version
upgrade was taken. npm 10 also normalized dev-only optional platform entries
for Vitest's already-present nested esbuild package; no production package
version changed as a result of that lockfile normalization.

## Result

Post-change production audit:

- 1 total
- 0 low
- 1 moderate
- 0 high
- 0 critical

All 11 high affected production package nodes and all 15 associated high
advisories were removed from the production graph.

The remaining production finding is `GHSA-968p-4wvh-cqc8`, a moderate-severity
`@babel/runtime@7.25.9` inefficient-regular-expression advisory. It is outside
this high-severity remediation scope and is retained for a separately reviewed
moderate-severity dependency pass rather than expanding this task.

The full development-inclusive install still reports 14 findings (2 low,
4 moderate, 8 high). The eight high findings are confined to dev/build
tooling and are not present in `npm audit --omit=dev`.

## Verification

- `npm ci`: PASS; lockfile reproduced successfully
- `npm audit --omit=dev`: PASS for the objective; 0 high and 0 critical
- `npm test`: PASS, 19/19
- `npx tsc --noEmit` equivalent local binary invocation: PASS
- `npm run lint` equivalent local binary invocation: PASS, 0 errors and 17 existing warnings
- `npm run build`: PASS, 2,661 modules transformed in 6.13 seconds; only the excluded Browserslist-age and bundle-size warnings were emitted
- API-key migration verification: PASS, 6/6
- Membership and authorization verification: PASS, 34/34
- RFQ lifecycle and database enforcement: PASS, 95/95
- Vendor authority verification: PASS, 9/9
- Local Supabase runtime total: PASS, 144/144
