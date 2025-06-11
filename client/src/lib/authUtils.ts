import { queryClient } from '@/lib/queryClient';

export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

export async function logout(): Promise<void> {
  try {
    // Clear React Query cache
    queryClient.clear();
    
    // Clear any local storage or session storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Call the logout endpoint to destroy the session
    const response = await fetch('/api/logout', {
      method: 'GET',
      credentials: 'include',
    });
    
    if (response.ok) {
      // Redirect to home page after successful logout
      window.location.href = '/';
    } else {
      console.error('Logout failed:', response.statusText);
      // Redirect anyway to clear the frontend state
      window.location.href = '/';
    }
  } catch (error) {
    console.error('Logout error:', error);
    // Redirect anyway to clear the frontend state
    window.location.href = '/';
  }
}