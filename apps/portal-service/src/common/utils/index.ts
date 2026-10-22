import { hash, verify } from 'argon2';

/**
 * Hashes data using Argon2
 */
export const hashData = async (data: string) => {
  return await hash(data);
};

/**
 * Verifies plain data against a stored hash
 * @param hash - The hashed string from your source e.g database
 * @param data - The plain text string to verify (e.g., from a login dto)
 * @returns boolean
 */
export const verifyHashData = async (
  hash: string,
  data: string,
): Promise<boolean> => {
  try {
    return await verify(hash, data);
  } catch (error) {
    // returns false if verification fails or data is malformed...
    return false;
  }
};
