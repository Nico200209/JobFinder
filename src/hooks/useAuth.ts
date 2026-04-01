"use client";

import { useAuthContext } from "@/components/auth/AuthProvider";

/**
 * Hook to access the current authentication state.
 * Must be used inside a component wrapped by AuthProvider.
 */
export function useAuth() {
  return useAuthContext();
}
