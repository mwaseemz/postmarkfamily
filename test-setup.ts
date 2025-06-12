import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Clean up after each test
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// Mock environment variables for tests
vi.mock('process', () => ({
  env: {
    POSTMARK_SERVER_TOKEN: 'test-token',
    DATABASE_URL: 'file:./test.db',
    NODE_ENV: 'test'
  }
}))

// Mock fetch globally
Object.defineProperty(window, 'fetch', {
  writable: true,
  value: vi.fn()
})

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
})

// Mock document methods
Object.defineProperty(document, 'documentElement', {
  value: {
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
    }
  },
  writable: true,
}) 