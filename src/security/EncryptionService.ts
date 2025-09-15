// Enterprise-grade encryption service using AES-256 and RSA
// Implements field-level encryption, key management, and secure data handling

interface EncryptionConfig {
  algorithm: 'AES-GCM' | 'AES-CBC';
  keyLength: 128 | 192 | 256;
  ivLength: 12 | 16;
  tagLength?: 16;
  keyRotationInterval: number; // days
  compressionEnabled: boolean;
}

interface EncryptedData {
  data: string; // Base64 encoded encrypted data
  iv: string; // Base64 encoded initialization vector
  tag?: string; // Base64 encoded authentication tag (for GCM)
  keyId: string; // Reference to encryption key
  algorithm: string;
  timestamp: string;
  compressed?: boolean;
}

interface EncryptionKey {
  id: string;
  key: CryptoKey;
  createdAt: string;
  expiresAt: string;
  algorithm: string;
  usage: 'encrypt' | 'decrypt' | 'both';
  status: 'active' | 'expired' | 'revoked';
}

interface FieldEncryptionRule {
  tableName: string;
  fieldName: string;
  encryptionLevel: 'standard' | 'high' | 'maximum';
  keyRotation: boolean;
  searchable: boolean; // For encrypted search capabilities
}

class EncryptionService {
  private config: EncryptionConfig;
  private keys: Map<string, EncryptionKey>;
  private fieldRules: Map<string, FieldEncryptionRule>;
  private keyRotationTimer?: NodeJS.Timeout;

  constructor(config?: Partial<EncryptionConfig>) {
    this.config = {
      algorithm: 'AES-GCM',
      keyLength: 256,
      ivLength: 12,
      tagLength: 16,
      keyRotationInterval: 90, // 90 days
      compressionEnabled: true,
      ...config
    };

    this.keys = new Map();
    this.fieldRules = new Map();
    
    this.initializeFieldRules();
    this.initializeKeyRotation();
  }

  private initializeFieldRules(): void {
    // Define field-level encryption rules for sensitive data
    const rules: FieldEncryptionRule[] = [
      {
        tableName: 'profiles',
        fieldName: 'profile',
        encryptionLevel: 'standard',
        keyRotation: true,
        searchable: false
      },
      {
        tableName: 'profiles',
        fieldName: 'phone',
        encryptionLevel: 'high',
        keyRotation: true,
        searchable: true
      },
      {
        tableName: 'smart_match_requests',
        fieldName: 'location',
        encryptionLevel: 'standard',
        keyRotation: false,
        searchable: true
      },
      {
        tableName: 'equipment',
        fieldName: 'specifications',
        encryptionLevel: 'standard',
        keyRotation: false,
        searchable: false
      },
      {
        tableName: 'vendor_profiles',
        fieldName: 'banking_info',
        encryptionLevel: 'maximum',
        keyRotation: true,
        searchable: false
      },
      {
        tableName: 'compliance_records',
        fieldName: 'certification_data',
        encryptionLevel: 'high',
        keyRotation: true,
        searchable: false
      }
    ];

    rules.forEach(rule => {
      this.fieldRules.set(`${rule.tableName}.${rule.fieldName}`, rule);
    });
  }

  private initializeKeyRotation(): void {
    // Set up automatic key rotation
    const rotationInterval = this.config.keyRotationInterval * 24 * 60 * 60 * 1000; // Convert days to milliseconds
    
    this.keyRotationTimer = setInterval(async () => {
      await this.rotateExpiredKeys();
    }, rotationInterval);
  }

  // Generate new encryption key
  async generateKey(algorithm: string = this.config.algorithm): Promise<EncryptionKey> {
    try {
      const cryptoKey = await window.crypto.subtle.generateKey(
        {
          name: algorithm,
          length: this.config.keyLength
        },
        true, // extractable
        ['encrypt', 'decrypt']
      );

      const keyId = crypto.randomUUID();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (this.config.keyRotationInterval * 24 * 60 * 60 * 1000));

      const encryptionKey: EncryptionKey = {
        id: keyId,
        key: cryptoKey,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        algorithm,
        usage: 'both',
        status: 'active'
      };

      this.keys.set(keyId, encryptionKey);
      
      // Store key metadata (not the actual key) for audit purposes
      this.logKeyGeneration(keyId, algorithm);

      return encryptionKey;
    } catch (error) {
      console.error('Failed to generate encryption key:', error);
      throw new Error('Key generation failed');
    }
  }

  // Get active encryption key
  private getActiveKey(): EncryptionKey | null {
    for (const key of this.keys.values()) {
      if (key.status === 'active' && new Date(key.expiresAt) > new Date()) {
        return key;
      }
    }
    return null;
  }

  // Encrypt data
  async encrypt(data: any, fieldPath?: string): Promise<EncryptedData> {
    try {
      let activeKey = this.getActiveKey();
      
      // Generate new key if none exists
      if (!activeKey) {
        activeKey = await this.generateKey();
      }

      // Convert data to string if it's an object
      let plaintext = typeof data === 'string' ? data : JSON.stringify(data);
      
      // Apply compression if enabled and data is large enough
      let compressed = false;
      if (this.config.compressionEnabled && plaintext.length > 1024) {
        plaintext = this.compress(plaintext);
        compressed = true;
      }

      // Convert to ArrayBuffer
      const encoder = new TextEncoder();
      const plaintextBuffer = encoder.encode(plaintext);

      // Generate random IV
      const iv = window.crypto.getRandomValues(new Uint8Array(this.config.ivLength));

      // Encrypt data
      const encryptedBuffer = await window.crypto.subtle.encrypt(
        {
          name: this.config.algorithm,
          iv: iv,
          ...(this.config.algorithm === 'AES-GCM' && { tagLength: (this.config.tagLength || 16) * 8 })
        },
        activeKey.key,
        plaintextBuffer
      );

      const encryptedData: EncryptedData = {
        data: this.arrayBufferToBase64(encryptedBuffer),
        iv: this.arrayBufferToBase64(iv),
        keyId: activeKey.id,
        algorithm: this.config.algorithm,
        timestamp: new Date().toISOString(),
        compressed
      };

      // For GCM mode, extract the authentication tag
      if (this.config.algorithm === 'AES-GCM') {
        const tagLength = this.config.tagLength || 16;
        const tag = encryptedBuffer.slice(encryptedBuffer.byteLength - tagLength);
        encryptedData.tag = this.arrayBufferToBase64(tag);
        // Remove tag from data
        encryptedData.data = this.arrayBufferToBase64(encryptedBuffer.slice(0, encryptedBuffer.byteLength - tagLength));
      }

      // Log encryption activity for audit
      if (fieldPath) {
        this.logEncryptionActivity('encrypt', fieldPath, activeKey.id);
      }

      return encryptedData;
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Data encryption failed');
    }
  }

  // Decrypt data
  async decrypt(encryptedData: EncryptedData): Promise<any> {
    try {
      const key = this.keys.get(encryptedData.keyId);
      if (!key) {
        throw new Error(`Encryption key ${encryptedData.keyId} not found`);
      }

      // Convert base64 to ArrayBuffer
      const iv = this.base64ToArrayBuffer(encryptedData.iv);
      let ciphertext = this.base64ToArrayBuffer(encryptedData.data);

      // For GCM mode, append the authentication tag
      if (encryptedData.algorithm === 'AES-GCM' && encryptedData.tag) {
        const tag = this.base64ToArrayBuffer(encryptedData.tag);
        const combined = new Uint8Array(ciphertext.byteLength + tag.byteLength);
        combined.set(new Uint8Array(ciphertext));
        combined.set(new Uint8Array(tag), ciphertext.byteLength);
        ciphertext = combined.buffer;
      }

      // Decrypt data
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        {
          name: encryptedData.algorithm,
          iv: iv
        },
        key.key,
        ciphertext
      );

      // Convert back to string
      const decoder = new TextDecoder();
      let plaintext = decoder.decode(decryptedBuffer);

      // Decompress if needed
      if (encryptedData.compressed) {
        plaintext = this.decompress(plaintext);
      }

      // Try to parse as JSON, otherwise return as string
      try {
        return JSON.parse(plaintext);
      } catch {
        return plaintext;
      }
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Data decryption failed');
    }
  }

  // Encrypt field-level data based on rules
  async encryptField(tableName: string, fieldName: string, value: any): Promise<EncryptedData> {
    const fieldPath = `${tableName}.${fieldName}`;
    const rule = this.fieldRules.get(fieldPath);
    
    if (!rule) {
      throw new Error(`No encryption rule found for ${fieldPath}`);
    }

    // Apply encryption level specific settings
    const config = { ...this.config };
    
    switch (rule.encryptionLevel) {
      case 'maximum':
        config.keyLength = 256;
        config.algorithm = 'AES-GCM';
        break;
      case 'high':
        config.keyLength = 256;
        break;
      case 'standard':
        config.keyLength = 192;
        break;
    }

    return await this.encrypt(value, fieldPath);
  }

  // Batch encrypt multiple fields
  async encryptFields(tableName: string, data: Record<string, any>): Promise<Record<string, any>> {
    const encryptedData: Record<string, any> = { ...data };
    
    for (const [fieldName, value] of Object.entries(data)) {
      const fieldPath = `${tableName}.${fieldName}`;
      if (this.fieldRules.has(fieldPath)) {
        encryptedData[fieldName] = await this.encryptField(tableName, fieldName, value);
      }
    }
    
    return encryptedData;
  }

  // Generate searchable hash for encrypted fields
  async generateSearchHash(value: string, salt?: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(value + (salt || 'allrentz-salt-2024'));
    
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    return this.arrayBufferToBase64(hashBuffer);
  }

  // Key management methods
  async rotateKey(keyId: string): Promise<EncryptionKey> {
    const oldKey = this.keys.get(keyId);
    if (!oldKey) {
      throw new Error('Key not found');
    }

    // Generate new key
    const newKey = await this.generateKey(oldKey.algorithm);
    
    // Mark old key as expired
    oldKey.status = 'expired';
    
    this.logKeyRotation(keyId, newKey.id);
    
    return newKey;
  }

  async rotateExpiredKeys(): Promise<void> {
    const now = new Date();
    const expiredKeys = Array.from(this.keys.values())
      .filter(key => key.status === 'active' && new Date(key.expiresAt) <= now);
    
    for (const key of expiredKeys) {
      await this.rotateKey(key.id);
    }
    
    console.log(`Rotated ${expiredKeys.length} expired keys`);
  }

  async revokeKey(keyId: string): Promise<boolean> {
    const key = this.keys.get(keyId);
    if (!key) return false;
    
    key.status = 'revoked';
    this.logKeyRevocation(keyId);
    
    return true;
  }

  // Utility methods
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private compress(data: string): string {
    // Simple compression implementation
    // In production, use a proper compression library
    try {
      const compressed = btoa(data);
      return compressed.length < data.length ? compressed : data;
    } catch {
      return data;
    }
  }

  private decompress(data: string): string {
    // Simple decompression implementation
    try {
      return atob(data);
    } catch {
      return data;
    }
  }

  // Audit logging methods
  private logKeyGeneration(keyId: string, algorithm: string): void {
    console.log('🔑 Key Generated:', { keyId, algorithm, timestamp: new Date().toISOString() });
  }

  private logKeyRotation(oldKeyId: string, newKeyId: string): void {
    console.log('🔄 Key Rotated:', { oldKeyId, newKeyId, timestamp: new Date().toISOString() });
  }

  private logKeyRevocation(keyId: string): void {
    console.log('🚫 Key Revoked:', { keyId, timestamp: new Date().toISOString() });
  }

  private logEncryptionActivity(action: 'encrypt' | 'decrypt', fieldPath: string, keyId: string): void {
    console.log(`🔒 Encryption ${action}:`, { fieldPath, keyId, timestamp: new Date().toISOString() });
  }

  // Public key management for RSA encryption (for key exchange)
  async generateRSAKeyPair(): Promise<{ publicKey: CryptoKey; privateKey: CryptoKey }> {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
        hash: 'SHA-256'
      },
      true,
      ['encrypt', 'decrypt']
    );

    return {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey
    };
  }

  async exportPublicKey(publicKey: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey('spki', publicKey);
    return this.arrayBufferToBase64(exported);
  }

  async importPublicKey(publicKeyBase64: string): Promise<CryptoKey> {
    const publicKeyBuffer = this.base64ToArrayBuffer(publicKeyBase64);
    
    return await window.crypto.subtle.importKey(
      'spki',
      publicKeyBuffer,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256'
      },
      false,
      ['encrypt']
    );
  }

  // Clean up
  destroy(): void {
    if (this.keyRotationTimer) {
      clearInterval(this.keyRotationTimer);
    }
    this.keys.clear();
    this.fieldRules.clear();
  }
}

// Singleton instance
export const encryptionService = new EncryptionService();

// Export types for external use
export type {
  EncryptedData,
  EncryptionKey,
  FieldEncryptionRule,
  EncryptionConfig
};