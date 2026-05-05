/**
 * Form validation utilities
 */

export interface PasswordValidationResult {
  isValid: boolean
  errors: string[]
  requirements: {
    minLength: boolean
    hasUppercase: boolean
    hasNumber: boolean
  }
}

/**
 * Validates email format
 * Uses standard email regex that accepts common test domains
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validates password against requirements:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 number
 */
export function validatePassword(password: string): PasswordValidationResult {
  const requirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
  }

  const errors: string[] = []
  
  if (!requirements.minLength) {
    errors.push("At least 8 characters")
  }
  if (!requirements.hasUppercase) {
    errors.push("At least 1 uppercase letter")
  }
  if (!requirements.hasNumber) {
    errors.push("At least 1 number")
  }

  return {
    isValid: requirements.minLength && requirements.hasUppercase && requirements.hasNumber,
    errors,
    requirements,
  }
}
