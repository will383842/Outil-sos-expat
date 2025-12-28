/**
 * =============================================================================
 * TEST UTILITIES - Wrappers et helpers pour les tests
 * =============================================================================
 */

import { ReactElement, ReactNode } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";

// Create a fresh QueryClient for each test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// Mock AuthContext
const mockAuthContext = {
  user: null,
  providerProfile: null,
  loading: false,
  signOut: () => Promise.resolve(),
  isAdmin: false,
  isProvider: false,
};

// Mock SubscriptionContext
const mockSubscriptionContext = {
  subscription: null,
  loading: false,
  hasActiveSubscription: false,
  checkSubscription: () => Promise.resolve(),
};

// Mock ProviderContext
const mockProviderContext = {
  provider: null,
  loading: false,
  setProvider: () => {},
};

interface AllProvidersProps {
  children: ReactNode;
}

function AllProviders({ children }: AllProvidersProps) {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

// Re-export everything from testing-library
export * from "@testing-library/react";
export { customRender as render };

// Test data factories
export const createMockUser = (overrides = {}) => ({
  uid: "test-user-id",
  email: "test@example.com",
  displayName: "Test User",
  emailVerified: true,
  ...overrides,
});

export const createMockProvider = (overrides = {}) => ({
  id: "test-provider-id",
  name: "Test Provider",
  email: "provider@example.com",
  type: "lawyer" as const,
  country: "France",
  createdAt: new Date(),
  ...overrides,
});

export const createMockBooking = (overrides = {}) => ({
  id: "test-booking-id",
  clientName: "Test Client",
  clientEmail: "client@example.com",
  providerId: "test-provider-id",
  status: "pending" as const,
  createdAt: new Date(),
  ...overrides,
});

export const createMockMessage = (overrides = {}) => ({
  id: "test-message-id",
  content: "Test message content",
  role: "user" as const,
  timestamp: new Date(),
  ...overrides,
});

// Context mock exports
export { mockAuthContext, mockSubscriptionContext, mockProviderContext };
