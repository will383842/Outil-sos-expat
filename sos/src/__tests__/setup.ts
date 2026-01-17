import '@testing-library/jest-dom'
import { vi, beforeAll, afterAll } from 'vitest'

// Mock Firebase
vi.mock('../config/firebase', () => ({
  db: {},
  auth: {},
  storage: {},
  functions: {}
}))

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  deleteDoc: vi.fn(),
  serverTimestamp: vi.fn(() => new Date()),
  limit: vi.fn(),
  Timestamp: {
    fromDate: (date: Date) => ({ toDate: () => date }),
    now: () => ({ toDate: () => new Date() })
  }
}))

// Mock console.warn pour les tests
const originalWarn = console.warn
beforeAll(() => {
  console.warn = vi.fn()
})

afterAll(() => {
  console.warn = originalWarn
})
