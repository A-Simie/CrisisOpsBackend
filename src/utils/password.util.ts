import { randomBytes, randomInt } from 'crypto';

/**
 * Generate a cryptographically secure random password
 * Rules:
 * - At least 8 characters long
 * - Include at least one uppercase letter
 * - Include at least one number
 * - Include at least one special character
 */
export const generateSecurePassword = (length = 12): string => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const specials = '!@#$%^&*()_+~`|}{[]:;?><,./-=';
  
  const allChars = uppercase + lowercase + numbers + specials;
  
  let password = '';
  
  // Ensure at least one of each required type
  password += uppercase[randomInt(0, uppercase.length)];
  password += lowercase[randomInt(0, lowercase.length)];
  password += numbers[randomInt(0, numbers.length)];
  password += specials[randomInt(0, specials.length)];
  
  // Fill the rest of the password length
  for (let i = password.length; i < length; i++) {
    const randomIndex = randomInt(0, allChars.length);
    password += allChars[randomIndex];
  }
  
  // Shuffle the password to avoid predictable patterns
  return password.split('').sort(() => randomInt(-1, 2)).join('');
};
