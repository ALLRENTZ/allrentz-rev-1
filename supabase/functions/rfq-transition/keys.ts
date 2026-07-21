// Key-selection logic for the Supabase publishable/secret API-key system.
//
// Deliberately free of Deno-only APIs so this module can be unit-tested
// under Node/vitest and imported as-is by the Deno Edge Function runtime.
//
// SUPABASE_PUBLISHABLE_KEYS and SUPABASE_SECRET_KEYS are JSON objects
// mapping a key name to its opaque key value, e.g.:
//   SUPABASE_SECRET_KEYS = { "allrentz_backend_rotation_20260720": "sb_secret_..." }
//
// Callers must never log or return the resolved key values. Error messages
// from this module may reference key *names* (safe, non-secret identifiers)
// but never key *values*.

export const BACKEND_SECRET_KEY_NAME = 'allrentz_backend_rotation_20260720'

export class KeyConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'KeyConfigError'
  }
}

// Production variables are authoritative. The ALLRENTZ_LOCAL_* variables
// exist only because the Supabase CLI removes SUPABASE_-prefixed entries from
// function --env-file input during local serving.
export function preferProductionValue(
  productionValue: string | undefined,
  localFallbackValue: string | undefined,
): string | undefined {
  if (productionValue?.trim()) {
    return productionValue
  }

  if (localFallbackValue?.trim()) {
    return localFallbackValue
  }

  return undefined
}

function parseKeyDict(raw: string | undefined, varName: string): Record<string, string> {
  if (!raw || raw.trim() === '') {
    throw new KeyConfigError(`${varName} is not configured`)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new KeyConfigError(`${varName} is not valid JSON`)
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new KeyConfigError(`${varName} must be a JSON object keyed by key name`)
  }

  const out: Record<string, string> = {}
  for (const [name, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new KeyConfigError(`${varName} has a non-string or empty value for key "${name}"`)
    }
    out[name] = value
  }

  if (Object.keys(out).length === 0) {
    throw new KeyConfigError(`${varName} contains no keys`)
  }

  return out
}

// Selects the publishable key to use for the user-scoped client.
// If exactly one key is present, it is used. If more than one is present,
// SUPABASE_PUBLISHABLE_KEY_NAME must name which one to use — an ambiguous
// dict with no override fails closed rather than guessing.
export function selectPublishableKey(
  rawDict: string | undefined,
  nameOverride: string | undefined,
): string {
  const dict = parseKeyDict(rawDict, 'SUPABASE_PUBLISHABLE_KEYS')
  const names = Object.keys(dict)

  if (nameOverride) {
    const value = dict[nameOverride]
    if (!value) {
      throw new KeyConfigError(`SUPABASE_PUBLISHABLE_KEYS has no entry named "${nameOverride}"`)
    }
    return value
  }

  if (names.length === 1) {
    return dict[names[0]]
  }

  throw new KeyConfigError(
    'SUPABASE_PUBLISHABLE_KEYS has multiple entries; set SUPABASE_PUBLISHABLE_KEY_NAME to select one',
  )
}

// Selects the named secret key for the privileged (service-authority) client.
// Fails closed if the dict or the specific named entry is absent.
export function selectSecretKey(rawDict: string | undefined, requiredName: string): string {
  const dict = parseKeyDict(rawDict, 'SUPABASE_SECRET_KEYS')
  const value = dict[requiredName]
  if (!value) {
    throw new KeyConfigError(`SUPABASE_SECRET_KEYS has no entry named "${requiredName}"`)
  }
  return value
}
