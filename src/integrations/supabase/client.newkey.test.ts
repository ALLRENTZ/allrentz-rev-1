import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

// This suite proves src/integrations/supabase/client.ts requires no code
// change for the publishable/secret key migration, without editing or
// importing that file directly (it reads a browser `localStorage` global
// at module scope, which this suite intentionally does not stub).

const CLIENT_SOURCE_PATH = path.resolve(__dirname, './client.ts')

describe('supabase client — publishable-key compatibility', () => {
  it('never inspects the key as a JWT (no decode/split on the key)', () => {
    const source = readFileSync(CLIENT_SOURCE_PATH, 'utf8')
    expect(source).not.toMatch(/atob\(/)
    expect(source).not.toMatch(/jwt-decode/)
    expect(source).not.toMatch(/SUPABASE_PUBLISHABLE_KEY\s*\.split/)
    expect(source).toMatch(/createClient<Database>\(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY/)
  })

  it('createClient accepts an opaque sb_publishable_ key with no JWT-format validation', () => {
    const opaqueKey = 'sb_publishable_test_opaque_key_not_a_jwt'
    const client = createClient('http://127.0.0.1:54321', opaqueKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    expect(client.auth).toBeTruthy()
    expect(typeof client.from).toBe('function')
  })

  it('createClient still accepts a legacy JWT-format key (backward compatible)', () => {
    const legacyLikeKey = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.sig'
    expect(() => {
      createClient('http://127.0.0.1:54321', legacyLikeKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    }).not.toThrow()
  })
})
