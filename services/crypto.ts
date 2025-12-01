const ENCRYPTION_ALGORITHM = 'AES-GCM';
const KEY_DERIVATION_ALGORITHM = 'PBKDF2';
const HASH_ALGORITHM = 'SHA-256';
const ITERATIONS = 100000;
const KEY_LENGTH = 256; // in bits

// Use a fixed salt for key derivation. This salt is not a secret, 
// it just ensures the PBKDF2 output is unique for the input token.
const FIXED_SALT = new TextEncoder().encode('bb-manager-salt-v1'); 

/**
 * Derives a cryptographic key from the user's JWT token using PBKDF2.
 * @param token The JWT token string.
 * @returns A CryptoKey object.
 */
export async function deriveKeyFromToken(token: string): Promise<CryptoKey> {
  const tokenBytes = new TextEncoder().encode(token);

  // 1. Import the token as a raw key
  const baseKey = await crypto.subtle.importKey(
    'raw',
    tokenBytes,
    { name: KEY_DERIVATION_ALGORITHM },
    false,
    ['deriveKey']
  );

  // 2. Derive the final key using PBKDF2
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: KEY_DERIVATION_ALGORITHM,
      salt: FIXED_SALT,
      iterations: ITERATIONS,
      hash: HASH_ALGORITHM,
    },
    baseKey,
    { name: ENCRYPTION_ALGORITHM, length: KEY_LENGTH },
    true, // Extractable
    ['encrypt', 'decrypt']
  );

  return derivedKey;
}

/**
 * Encrypts data using the derived key.
 * @param data The object to encrypt.
 * @param key The CryptoKey.
 * @returns An object containing the ciphertext (ArrayBuffer) and IV (ArrayBuffer).
 */
export async function encryptData(data: any, key: CryptoKey): Promise<{ ciphertext: ArrayBuffer, iv: ArrayBuffer }> {
  const dataString = JSON.stringify(data);
  const dataBytes = new TextEncoder().encode(dataString);
  
  // Generate a random Initialization Vector (IV)
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 12 bytes is standard for AES-GCM

  const ciphertext = await crypto.subtle.encrypt(
    { name: ENCRYPTION_ALGORITHM, iv: iv },
    key,
    dataBytes
  );

  return { 
    ciphertext: ciphertext, 
    iv: iv.buffer 
  };
}

/**
 * Decrypts data using the derived key.
 * @param encryptedData The object containing ciphertext and IV.
 * @param key The CryptoKey.
 * @returns The decrypted object.
 */
export async function decryptData(encryptedData: { ciphertext: ArrayBuffer, iv: ArrayBuffer }, key: CryptoKey): Promise<any> {
  const iv = new Uint8Array(encryptedData.iv);
  
  const decryptedBytes = await crypto.subtle.decrypt(
    { name: ENCRYPTION_ALGORITHM, iv: iv },
    key,
    encryptedData.ciphertext
  );

  const decryptedString = new TextDecoder().decode(decryptedBytes);
  return JSON.parse(decryptedString);
}