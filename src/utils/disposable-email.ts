
/**
 * Checks if an email address belongs to a disposable email provider.
 * Uses the free DeBounce API (https://disposable.debounce.io/).
 * 
 * @param email The email address to check
 * @returns Promise<boolean> true if disposable, false otherwise (or if API fails)
 */
export async function isDisposableEmail(email: string): Promise<boolean> {
  try {
    // Basic validation first to avoid unnecessary API calls
    if (!email || !email.includes('@')) {
      return false;
    }

    const response = await fetch(`https://disposable.debounce.io/?email=${encodeURIComponent(email)}`);
    
    if (!response.ok) {
      console.warn(`Disposable email API returned status ${response.status}`);
      return false; // Fail open to avoid blocking legitimate users on API error
    }

    const data = await response.json();
    // API returns { "disposable": "true" } or { "disposable": "false" }
    return data.disposable === "true";
  } catch (error) {
    console.error("Disposable email check failed:", error);
    return false; // Fail open
  }
}
