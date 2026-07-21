import { describe, it, expect } from 'vitest'
import {
  BACKEND_SECRET_KEY_NAME,
  KeyConfigError,
  preferProductionValue,
  selectPublishableKey,
  selectSecretKey,
} from './keys'

const PUB_NAME = 'local'
const PUB_VALUE = 'sb_publishable_abc123'
const SECRET_VALUE = 'sb_secret_xyz789'

describe('preferProductionValue', () => {
  it('prefers a configured production value over the local fallback', () => {
    expect(preferProductionValue('production', 'local')).toBe('production')
  })

  it('uses the local fallback only when the production value is absent', () => {
    expect(preferProductionValue(undefined, 'local')).toBe('local')
    expect(preferProductionValue('   ', 'local')).toBe('local')
  })

  it('returns undefined when neither value is configured', () => {
    expect(preferProductionValue(undefined, undefined)).toBeUndefined()
    expect(preferProductionValue('', '   ')).toBeUndefined()
  })
})

describe('selectPublishableKey', () => {
  it('auto-selects the single entry when only one key is present', () => {
    const dict = JSON.stringify({ [PUB_NAME]: PUB_VALUE })
    expect(selectPublishableKey(dict, undefined)).toBe(PUB_VALUE)
  })

  it('requires an explicit name when multiple entries are present', () => {
    const dict = JSON.stringify({ a: 'sb_publishable_a', b: 'sb_publishable_b' })
    expect(() => selectPublishableKey(dict, undefined)).toThrow(KeyConfigError)
  })

  it('selects the named entry when an override is given', () => {
    const dict = JSON.stringify({ a: 'sb_publishable_a', b: 'sb_publishable_b' })
    expect(selectPublishableKey(dict, 'b')).toBe('sb_publishable_b')
  })

  it('fails closed when the named override does not exist', () => {
    const dict = JSON.stringify({ a: 'sb_publishable_a' })
    expect(() => selectPublishableKey(dict, 'missing')).toThrow(KeyConfigError)
  })

  it('fails closed when the env var is missing', () => {
    expect(() => selectPublishableKey(undefined, undefined)).toThrow(KeyConfigError)
  })

  it('fails closed when the env var is not valid JSON', () => {
    expect(() => selectPublishableKey('not-json', undefined)).toThrow(KeyConfigError)
  })

  it('fails closed when the env var is a JSON array, not an object', () => {
    expect(() => selectPublishableKey('["a"]', undefined)).toThrow(KeyConfigError)
  })

  it('fails closed when the dict is empty', () => {
    expect(() => selectPublishableKey('{}', undefined)).toThrow(KeyConfigError)
  })
})

describe('selectSecretKey', () => {
  it('selects the required named entry', () => {
    const dict = JSON.stringify({ [BACKEND_SECRET_KEY_NAME]: SECRET_VALUE })
    expect(selectSecretKey(dict, BACKEND_SECRET_KEY_NAME)).toBe(SECRET_VALUE)
  })

  it('fails closed when the required name is absent', () => {
    const dict = JSON.stringify({ some_other_name: SECRET_VALUE })
    expect(() => selectSecretKey(dict, BACKEND_SECRET_KEY_NAME)).toThrow(KeyConfigError)
  })

  it('fails closed when the env var is missing', () => {
    expect(() => selectSecretKey(undefined, BACKEND_SECRET_KEY_NAME)).toThrow(KeyConfigError)
  })
})

describe('error messages never contain key values', () => {
  it('does not leak the secret value when the named key is missing', () => {
    const dict = JSON.stringify({ some_other_name: SECRET_VALUE })
    try {
      selectSecretKey(dict, BACKEND_SECRET_KEY_NAME)
      throw new Error('expected selectSecretKey to throw')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      expect(message).not.toContain(SECRET_VALUE)
    }
  })

  it('does not leak a configured value when the dict fails to parse', () => {
    try {
      selectPublishableKey('not-json-containing-sb_publishable_should_not_leak', undefined)
      throw new Error('expected selectPublishableKey to throw')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      expect(message).not.toContain('sb_publishable_should_not_leak')
    }
  })
})
