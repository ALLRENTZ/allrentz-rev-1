# rfq-transition — publishable/secret key migration notes

## What changed

`index.ts` no longer reads `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
directly. Key selection is delegated to `keys.ts`, which reads two JSON-dict
env vars and fails closed (500, sanitized error, no key values logged or
returned) if they are missing or malformed:

- `SUPABASE_PUBLISHABLE_KEYS` — `{ "<name>": "sb_publishable_..." }`. Used to
  build the user-scoped client that validates the caller's `Authorization`
  JWT via `auth.getUser()`. If more than one entry is present,
  `SUPABASE_PUBLISHABLE_KEY_NAME` must select which one to use.
- `SUPABASE_SECRET_KEYS` — `{ "<name>": "sb_secret_..." }`. Used to build the
  privileged `svc` client. The function always requires the entry named
  `allrentz_backend_rotation_20260720` (`keys.ts:BACKEND_SECRET_KEY_NAME`).

Production variables are always preferred. For local function serving only,
the function falls back to `ALLRENTZ_LOCAL_SUPABASE_URL`,
`ALLRENTZ_LOCAL_SUPABASE_PUBLISHABLE_KEYS`, and
`ALLRENTZ_LOCAL_SUPABASE_SECRET_KEYS` when the corresponding production
variables are absent. These fallback names are required because the Supabase
CLI removes `SUPABASE_`-prefixed values supplied through `--env-file`.

Nothing downstream of client construction (body parsing, RFQ fetch, demo/
simulation boundary, allowlist check, actor-authority derivation, the
`transition_rfq_status()` RPC call, error mapping) was touched.

## verify_jwt: handler-owned verification is required

Local GoTrue now issues ES256 session JWTs with a signing-key ID. The Edge
Function gateway's legacy `verify_jwt` path rejects those valid tokens before
the request reaches the handler. `supabase/config.toml` therefore configures
only this function with `verify_jwt = false`.

This does not make the function anonymous. The handler still requires an
`Authorization: Bearer ...` header and immediately validates that token with
`userClient.auth.getUser()`. Missing, malformed, expired, or otherwise invalid
tokens fail with 401 before any database read or mutation.

In this function, the `Authorization` header is always expected to be a
real end-user session JWT (see Step 1 — the function immediately 401s if
it's absent, and it's passed straight through to `userClient.auth.getUser()`
for verification). No code path in this repository substitutes an anon or
publishable key as the `Authorization` bearer token for this endpoint.

The publishable key remains only the `apikey` used by the user-scoped client;
caller identity and authorization continue to come from the GoTrue session JWT
and the function's server-side authority checks.
