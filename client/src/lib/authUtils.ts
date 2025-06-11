export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

export function logout(): void {
  // Clear any local storage or session storage if needed
  localStorage.clear();
  sessionStorage.clear();
  
  // Redirect to the logout endpoint which will handle session destruction
  window.location.href = '/api/logout';
}