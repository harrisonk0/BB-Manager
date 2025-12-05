const ENCRYPTION_ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256; // in bits
const DEVICE_KEY_PREFIX = 'bbm_device_key_';

const base64ToBytes = (value: string): Uint8Array => {
  return Uint8Array.from(atob(value), c => c.charCodeAt(0));
};

const bytesToBase64 = (bytes: ArrayBuffer): string => {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
};

/**
 * Creates or retrieves a stable, per-user encryption key that survives token refreshes.
 * The raw key material is stored in localStorage (scoped by user id) to keep
 * encrypted offline data readable across sessions on the same device.
 */
export async function getOrCreateDeviceKey(userId: string): Promise<CryptoKey> {
  const storageKey = `${DEVICE_KEY_PREFIX}${userId}`;
  const cached = typeof localStorage !== 'undefined' ? localStorage.getItem(storageKey) : null;

  if (cached) {
    const raw = base64ToBytes(cached);
    return crypto.subtle.importKey(
      'raw',
      raw,
      { name: ENCRYPTION_ALGORITHM, length: KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );
  }

  const generated = await crypto.subtle.generateKey(
    { name: ENCRYPTION_ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );

  const exported = await crypto.subtle.exportKey('raw', generated);
  const encoded = bytesToBase64(exported);

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(storageKey, encoded);
  }

  return crypto.subtle.importKey(
    'raw',
    exported,
    { name: ENCRYPTION_ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
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