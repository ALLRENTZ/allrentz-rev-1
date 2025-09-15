import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { encryptionService, EncryptedData } from '../EncryptionService';

// Mock Web Crypto API
const mockCrypto = {
  subtle: {
    generateKey: vi.fn(),
    encrypt: vi.fn(),
    decrypt: vi.fn(),
    digest: vi.fn(),
    exportKey: vi.fn(),
    importKey: vi.fn()
  },
  getRandomValues: vi.fn(),
  randomUUID: vi.fn(() => 'mock-uuid-123')
};

// Mock window.crypto
Object.defineProperty(global, 'crypto', {
  value: mockCrypto
});

// Mock CryptoKey
class MockCryptoKey {
  constructor(public algorithm: string, public type: string) {}
}

// Mock ArrayBuffer conversion functions
const mockArrayBuffer = new ArrayBuffer(32);
const mockUint8Array = new Uint8Array(mockArrayBuffer);

describe('EncryptionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock implementations
    mockCrypto.subtle.generateKey.mockResolvedValue(
      new MockCryptoKey('AES-GCM', 'secret')
    );
    
    mockCrypto.subtle.encrypt.mockResolvedValue(mockArrayBuffer);
    mockCrypto.subtle.decrypt.mockResolvedValue(mockArrayBuffer);
    mockCrypto.subtle.digest.mockResolvedValue(mockArrayBuffer);
    
    mockCrypto.getRandomValues.mockImplementation((array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    });

    // Mock TextEncoder/TextDecoder
    global.TextEncoder = vi.fn(() => ({
      encode: vi.fn(() => mockUint8Array)
    })) as any;

    global.TextDecoder = vi.fn(() => ({
      decode: vi.fn(() => 'decrypted-data')
    })) as any;

    // Mock btoa/atob
    global.btoa = vi.fn((str) => Buffer.from(str, 'binary').toString('base64'));
    global.atob = vi.fn((str) => Buffer.from(str, 'base64').toString('binary'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Key Generation', () => {
    it('should generate a new encryption key', async () => {
      const key = await encryptionService.generateKey();

      expect(key).toHaveProperty('id');
      expect(key).toHaveProperty('key');
      expect(key).toHaveProperty('createdAt');
      expect(key).toHaveProperty('expiresAt');
      expect(key.algorithm).toBe('AES-GCM');
      expect(key.usage).toBe('both');
      expect(key.status).toBe('active');
      
      expect(mockCrypto.subtle.generateKey).toHaveBeenCalledWith(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
    });

    it('should generate key with custom algorithm', async () => {
      await encryptionService.generateKey('AES-CBC');

      expect(mockCrypto.subtle.generateKey).toHaveBeenCalledWith(
        { name: 'AES-CBC', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
    });

    it('should handle key generation failure', async () => {
      mockCrypto.subtle.generateKey.mockRejectedValue(new Error('Key generation failed'));

      await expect(encryptionService.generateKey()).rejects.toThrow('Key generation failed');
    });
  });

  describe('Data Encryption', () => {
    beforeEach(async () => {
      // Generate a key first
      await encryptionService.generateKey();
    });

    it('should encrypt string data', async () => {
      const plaintext = 'sensitive data';
      
      const encryptedData = await encryptionService.encrypt(plaintext);

      expect(encryptedData).toHaveProperty('data');
      expect(encryptedData).toHaveProperty('iv');
      expect(encryptedData).toHaveProperty('keyId');
      expect(encryptedData).toHaveProperty('algorithm', 'AES-GCM');
      expect(encryptedData).toHaveProperty('timestamp');
      expect(encryptedData.compressed).toBe(false); // Short data shouldn't be compressed

      expect(mockCrypto.subtle.encrypt).toHaveBeenCalled();
    });

    it('should encrypt object data', async () => {
      const plainObject = { 
        firstName: 'John', 
        lastName: 'Doe',
        ssn: '123-45-6789'
      };
      
      const encryptedData = await encryptionService.encrypt(plainObject);

      expect(encryptedData).toHaveProperty('data');
      expect(encryptedData).toHaveProperty('iv');
      expect(encryptedData).toHaveProperty('keyId');
      expect(encryptedData.algorithm).toBe('AES-GCM');
    });

    it('should compress large data', async () => {
      const largeData = 'x'.repeat(2000); // > 1024 bytes
      
      const encryptedData = await encryptionService.encrypt(largeData);

      expect(encryptedData.compressed).toBe(true);
    });

    it('should handle encryption failure', async () => {
      mockCrypto.subtle.encrypt.mockRejectedValue(new Error('Encryption failed'));

      await expect(encryptionService.encrypt('data')).rejects.toThrow('Data encryption failed');
    });
  });

  describe('Data Decryption', () => {
    let encryptedData: EncryptedData;

    beforeEach(async () => {
      await encryptionService.generateKey();
      encryptedData = await encryptionService.encrypt('test data');
    });

    it('should decrypt data successfully', async () => {
      const decrypted = await encryptionService.decrypt(encryptedData);

      expect(decrypted).toBe('decrypted-data'); // Mocked TextDecoder output
      expect(mockCrypto.subtle.decrypt).toHaveBeenCalled();
    });

    it('should handle missing encryption key', async () => {
      const invalidData = {
        ...encryptedData,
        keyId: 'non-existent-key'
      };

      await expect(encryptionService.decrypt(invalidData))
        .rejects.toThrow('Encryption key non-existent-key not found');
    });

    it('should handle decryption failure', async () => {
      mockCrypto.subtle.decrypt.mockRejectedValue(new Error('Decryption failed'));

      await expect(encryptionService.decrypt(encryptedData))
        .rejects.toThrow('Data decryption failed');
    });

    it('should decompress compressed data', async () => {
      const compressedData = {
        ...encryptedData,
        compressed: true
      };

      const decrypted = await encryptionService.decrypt(compressedData);
      expect(decrypted).toBeDefined();
    });
  });

  describe('Field-Level Encryption', () => {
    beforeEach(async () => {
      await encryptionService.generateKey();
    });

    it('should encrypt field based on rules', async () => {
      const value = { firstName: 'John', lastName: 'Doe' };
      
      const encryptedData = await encryptionService.encryptField('profiles', 'profile', value);

      expect(encryptedData).toHaveProperty('data');
      expect(encryptedData).toHaveProperty('keyId');
      expect(encryptedData.algorithm).toBe('AES-GCM'); // Standard level
    });

    it('should apply encryption level settings', async () => {
      // Maximum level encryption
      const bankingInfo = { account: '1234567890', routing: '987654321' };
      
      const encryptedData = await encryptionService.encryptField('vendor_profiles', 'banking_info', bankingInfo);

      expect(encryptedData).toHaveProperty('data');
      expect(encryptedData.algorithm).toBe('AES-GCM'); // Maximum level uses AES-GCM
    });

    it('should throw error for unknown field', async () => {
      await expect(encryptionService.encryptField('unknown_table', 'unknown_field', 'data'))
        .rejects.toThrow('No encryption rule found for unknown_table.unknown_field');
    });

    it('should encrypt multiple fields', async () => {
      const data = {
        profile: { name: 'John Doe' },
        email: 'john@example.com',
        phone: '555-1234'
      };

      const encryptedData = await encryptionService.encryptFields('profiles', data);

      // Profile should be encrypted (has rule)
      expect(encryptedData.profile).toHaveProperty('data');
      // Email should remain unchanged (no rule)
      expect(encryptedData.email).toBe('john@example.com');
      // Phone should be encrypted (has rule)
      expect(encryptedData.phone).toHaveProperty('data');
    });
  });

  describe('Searchable Hash Generation', () => {
    it('should generate consistent hash for same input', async () => {
      const value = 'test@example.com';
      
      const hash1 = await encryptionService.generateSearchHash(value);
      const hash2 = await encryptionService.generateSearchHash(value);

      expect(hash1).toBe(hash2);
      expect(mockCrypto.subtle.digest).toHaveBeenCalledWith('SHA-256', expect.any(Uint8Array));
    });

    it('should generate different hashes for different inputs', async () => {
      const hash1 = await encryptionService.generateSearchHash('value1');
      const hash2 = await encryptionService.generateSearchHash('value2');

      expect(hash1).not.toBe(hash2);
    });

    it('should use custom salt', async () => {
      const value = 'test@example.com';
      const salt = 'custom-salt';
      
      const hashWithSalt = await encryptionService.generateSearchHash(value, salt);
      const hashWithoutSalt = await encryptionService.generateSearchHash(value);

      expect(hashWithSalt).not.toBe(hashWithoutSalt);
    });
  });

  describe('Key Management', () => {
    let originalKey: any;

    beforeEach(async () => {
      originalKey = await encryptionService.generateKey();
    });

    it('should rotate key successfully', async () => {
      const newKey = await encryptionService.rotateKey(originalKey.id);

      expect(newKey).toHaveProperty('id');
      expect(newKey.id).not.toBe(originalKey.id);
      expect(newKey.status).toBe('active');
      expect(originalKey.status).toBe('expired');
    });

    it('should handle rotation of non-existent key', async () => {
      await expect(encryptionService.rotateKey('non-existent'))
        .rejects.toThrow('Key not found');
    });

    it('should revoke key successfully', async () => {
      const success = await encryptionService.revokeKey(originalKey.id);

      expect(success).toBe(true);
      expect(originalKey.status).toBe('revoked');
    });

    it('should handle revocation of non-existent key', async () => {
      const success = await encryptionService.revokeKey('non-existent');
      expect(success).toBe(false);
    });

    it('should rotate expired keys', async () => {
      // Mock Date to simulate expired key
      const originalDate = Date;
      const mockDate = vi.fn(() => ({
        toISOString: () => '2023-01-01T00:00:00Z'
      }));
      global.Date = mockDate as any;

      // Create key that will appear expired
      const expiredKey = await encryptionService.generateKey();
      
      // Restore Date and set current time to future
      global.Date = originalDate;
      const futureDate = new Date('2024-01-01');
      vi.spyOn(Date, 'now').mockReturnValue(futureDate.getTime());

      await encryptionService.rotateExpiredKeys();

      expect(expiredKey.status).toBe('expired');
    });
  });

  describe('RSA Key Pair Generation', () => {
    beforeEach(() => {
      mockCrypto.subtle.generateKey.mockResolvedValue({
        publicKey: new MockCryptoKey('RSA-OAEP', 'public'),
        privateKey: new MockCryptoKey('RSA-OAEP', 'private')
      });
    });

    it('should generate RSA key pair', async () => {
      const keyPair = await encryptionService.generateRSAKeyPair();

      expect(keyPair).toHaveProperty('publicKey');
      expect(keyPair).toHaveProperty('privateKey');
      
      expect(mockCrypto.subtle.generateKey).toHaveBeenCalledWith(
        {
          name: 'RSA-OAEP',
          modulusLength: 2048,
          publicExponent: expect.any(Uint8Array),
          hash: 'SHA-256'
        },
        true,
        ['encrypt', 'decrypt']
      );
    });

    it('should export public key', async () => {
      mockCrypto.subtle.exportKey.mockResolvedValue(mockArrayBuffer);
      
      const keyPair = await encryptionService.generateRSAKeyPair();
      const exportedKey = await encryptionService.exportPublicKey(keyPair.publicKey);

      expect(exportedKey).toBeDefined();
      expect(mockCrypto.subtle.exportKey).toHaveBeenCalledWith('spki', keyPair.publicKey);
    });

    it('should import public key', async () => {
      mockCrypto.subtle.importKey.mockResolvedValue(new MockCryptoKey('RSA-OAEP', 'public'));
      
      const importedKey = await encryptionService.importPublicKey('base64-key-data');

      expect(importedKey).toBeDefined();
      expect(mockCrypto.subtle.importKey).toHaveBeenCalledWith(
        'spki',
        expect.any(ArrayBuffer),
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        false,
        ['encrypt']
      );
    });
  });

  describe('Service Cleanup', () => {
    it('should clean up resources on destroy', () => {
      // Setup some state
      encryptionService.generateKey();

      // Destroy should not throw
      expect(() => encryptionService.destroy()).not.toThrow();
    });
  });
});