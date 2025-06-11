import { queryClient } from '@/lib/queryClient';

export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

export function logout(): void {
  // Clear React Query cache
  queryClient.clear();
  
  // Clear any local storage or session storage
  localStorage.clear();
  sessionStorage.clear();
  
  // Redirect to the logout endpoint which will handle session destruction
  window.location.href = '/api/logout';
}