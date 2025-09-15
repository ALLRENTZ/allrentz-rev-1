import '@testing-library/jest-dom'
import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Cleanup after each test case
afterEach(() => {
  cleanup()
})

// Mock IntersectionObserver for tests
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
}))

// Mock ResizeObserver for tests
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
}))

// Mock matchMedia for responsive design tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock scrollTo for navigation tests
global.scrollTo = vi.fn()

// Mock fetch for API tests
global.fetch = vi.fn()

// Mock crypto for UUID generation and WebCrypto API in tests
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
    getRandomValues: (arr: any) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256)
      }
      return arr
    },
    subtle: {
      generateKey: vi.fn().mockResolvedValue({}),
      encrypt: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
      decrypt: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
      digest: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
      exportKey: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
      importKey: vi.fn().mockResolvedValue({})
    }
  }
})

// Mock canvas for device fingerprinting
const mockCanvas = {
  getContext: vi.fn(() => ({
    fillText: vi.fn(),
  })),
  toDataURL: vi.fn(() => 'data:image/png;base64,mock-canvas-data'),
  appendChild: vi.fn()
}

Object.defineProperty(document, 'createElement', {
  value: vi.fn((tagName: string) => {
    if (tagName === 'canvas') {
      return mockCanvas;
    }
    return {
      appendChild: vi.fn(),
      setAttribute: vi.fn(),
      getAttribute: vi.fn(),
      removeAttribute: vi.fn(),
      textContent: '',
      innerHTML: ''
    };
  }),
  writable: true,
})

// Mock TextEncoder/TextDecoder for encryption
global.TextEncoder = vi.fn(() => ({
  encode: vi.fn((str: string) => new Uint8Array(Buffer.from(str, 'utf8')))
})) as any

global.TextDecoder = vi.fn(() => ({
  decode: vi.fn((buffer: ArrayBuffer) => 'mocked-decoded-text')
})) as any

// Mock btoa/atob for base64 operations
global.btoa = vi.fn((str: string) => Buffer.from(str, 'binary').toString('base64'))
global.atob = vi.fn((str: string) => Buffer.from(str, 'base64').toString('binary'))

// Mock PublicKeyCredential for WebAuthn
Object.defineProperty(window, 'PublicKeyCredential', {
  value: vi.fn(),
  writable: true,
})

Object.defineProperty(navigator, 'credentials', {
  value: {
    create: vi.fn().mockResolvedValue({}),
    get: vi.fn().mockResolvedValue({})
  },
  writable: true,
})

// Mock geolocation for location-based tests
Object.defineProperty(global.navigator, 'geolocation', {
  value: {
    getCurrentPosition: vi.fn().mockImplementation((success) => {
      success({
        coords: {
          latitude: 29.7604, // Houston, TX
          longitude: -95.3698,
          accuracy: 100
        }
      })
    }),
    watchPosition: vi.fn(),
    clearWatch: vi.fn()
  }
})

// Mock localStorage for persistence tests
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock sessionStorage for temporary data tests
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
}
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
})

// Increase timeout for industrial equipment simulations
vi.setConfig({
  testTimeout: 10000, // 10 seconds for industrial equipment API simulations
  hookTimeout: 10000
})

// Mock console methods to reduce test noise
global.console = {
  ...console,
  warn: vi.fn(),
  error: vi.fn(),
  log: vi.fn()
}

// Export test utilities for consistent mocking
export const mockLocalStorage = localStorageMock
export const mockSessionStorage = sessionStorageMock
export const mockGeolocation = global.navigator.geolocation