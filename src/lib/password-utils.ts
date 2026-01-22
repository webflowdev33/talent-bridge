/**
 * Hash a password using Web Crypto API (PBKDF2)
 * This creates a secure hash that can be stored in the database
 */
export async function hashPassword(password: string): Promise<string> {
  // Convert password to ArrayBuffer
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  
  // Generate a random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  // Import the password as a key
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    data,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  // Derive key using PBKDF2
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000, // High iteration count for security
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  
  // Export the derived key
  const exportedKey = await crypto.subtle.exportKey('raw', derivedKey);
  const hashArray = Array.from(new Uint8Array(exportedKey));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Combine salt and hash (salt as hex string)
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Return format: salt:hash (both in hex)
  return `${saltHex}:${hashHex}`;
}

/**
 * Verify a password against a stored hash
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const [saltHex, hashHex] = storedHash.split(':');
    
    // Convert hex strings back to Uint8Array
    const salt = new Uint8Array(
      saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );
    
    // Convert password to ArrayBuffer
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    
    // Import the password as a key
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      data,
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );
    
    // Derive key using PBKDF2 with the same salt
    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );
    
    // Export the derived key
    const exportedKey = await crypto.subtle.exportKey('raw', derivedKey);
    const hashArray = Array.from(new Uint8Array(exportedKey));
    const computedHashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Compare hashes (constant-time comparison)
    return computedHashHex === hashHex;
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
}
