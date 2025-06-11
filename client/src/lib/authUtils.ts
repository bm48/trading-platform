import { queryClient } from '@/lib/queryClient';

export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

export async function logout(): Promise<void> {
  try {
    // Call the logout endpoint to destroy the session
    const response = await fetch('/api/logout', {
      method: 'GET',
      credentials: 'include',
    });
    
    // Always clear frontend state regardless of response
    queryClient.removeQueries({ queryKey: ["/api/auth/user"] });
    queryClient.clear();
    localStorage.clear();
    sessionStorage.clear();
    
    if (response.ok) {
      console.log('Logout successful');
    } else {
      console.error('Logout failed:', response.statusText);
    }
    
    // Redirect to home page
    window.location.href = '/';
  } catch (error) {
    console.error('Logout error:', error);
    // Clear frontend state even on error
    queryClient.removeQueries({ queryKey: ["/api/auth/user"] });
    queryClient.clear();
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/';
  }
}