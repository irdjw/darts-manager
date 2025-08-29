// Test setup and configuration
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/svelte';
import matchers from '@testing-library/jest-dom/matchers';

// Extend expect with testing-library matchers
expect.extend(matchers);

// Mock environment variables
vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

// Mock Supabase
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      })),
      signOut: vi.fn(() => Promise.resolve({ error: null }))
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      then: vi.fn((callback) => callback({ data: [], error: null }))
    }))
  })),
  isBrowser: true,
  parse: vi.fn(() => ({}))
}));

// Mock SvelteKit modules
vi.mock('$app/stores', () => ({
  page: {
    subscribe: vi.fn(() => () => {})
  }
}));

vi.mock('$app/navigation', () => ({
  goto: vi.fn(),
  invalidate: vi.fn()
}));

// Mock browser APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
});

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  }))
});

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  }))
});

// Mock localStorage and sessionStorage
const storageMock = (): Storage => {
  let store: { [key: string]: string } = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null)
  };
};

Object.defineProperty(window, 'localStorage', {
  value: storageMock()
});

Object.defineProperty(window, 'sessionStorage', {
  value: storageMock()
});

// Mock service worker
Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    register: vi.fn(() => Promise.resolve({
      addEventListener: vi.fn(),
      installing: null,
      controller: null
    })),
    ready: Promise.resolve({
      sync: {
        register: vi.fn()
      }
    })
  }
});

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});