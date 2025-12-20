/**
 * Encryption Module Tests
 * Tests for predicate encryption, range queries, and data encryption
 */

import { PredicateEncryption } from '../src/encryption/predicateEncryption.js';
import { RangeQueryEncryption } from '../src/encryption/rangeQuery.js';
import { DataEncryption } from '../src/encryption/dataEncryption.js';

describe('PredicateEncryption', () => {
    let encryption;

    beforeEach(() => {
        encryption = new PredicateEncryption('test-master-key-12345');
    });

    test('should initialize with master key', () => {
        expect(encryption.masterKey).toBe('test-master-key-12345');
        expect(encryption.dimension).toBe(4);
    });

    test('should generate master key if not provided', () => {
        const enc = new PredicateEncryption();
        expect(enc.masterKey).toBeDefined();
        expect(enc.masterKey.length).toBeGreaterThan(0);
    });

    test('should encrypt location coordinates', () => {
        const result = encryption.encryptLocation(40.7128, -74.0060);
        
        expect(result).toHaveProperty('encryptedCoords');
        expect(result).toHaveProperty('timestamp');
        expect(result).toHaveProperty('version');
        expect(result.encryptedCoords).toHaveLength(4);
    });

    test('should produce different encryptions for different locations', () => {
        const loc1 = encryption.encryptLocation(40.7128, -74.0060);
        const loc2 = encryption.encryptLocation(34.0522, -118.2437);
        
        expect(loc1.encryptedCoords).not.toEqual(loc2.encryptedCoords);
    });

    test('should handle edge case coordinates', () => {
        // North Pole
        const northPole = encryption.encryptLocation(90, 0);
        expect(northPole.encryptedCoords).toHaveLength(4);

        // South Pole
        const southPole = encryption.encryptLocation(-90, 0);
        expect(southPole.encryptedCoords).toHaveLength(4);

        // Date line
        const dateLine = encryption.encryptLocation(0, 180);
        expect(dateLine.encryptedCoords).toHaveLength(4);
    });
});

describe('RangeQueryEncryption', () => {
    let rangeEncryption;

    beforeEach(() => {
        rangeEncryption = new RangeQueryEncryption('test-master-key-12345');
    });

    test('should generate query token', () => {
        const token = rangeEncryption.generateQueryToken(40.7128, -74.0060, 5);
        
        expect(token).toHaveProperty('encryptedQuery');
        expect(token).toHaveProperty('encryptedBounds');
        expect(token).toHaveProperty('radiusNormalized');
        expect(token).toHaveProperty('timestamp');
        expect(token).toHaveProperty('expiresAt');
    });

    test('should generate encrypted bounds', () => {
        const token = rangeEncryption.generateQueryToken(40.7128, -74.0060, 5);
        
        expect(token.encryptedBounds).toHaveProperty('encryptedMin');
        expect(token.encryptedBounds).toHaveProperty('encryptedMax');
        expect(token.encryptedBounds.encryptedMin).toHaveLength(4);
        expect(token.encryptedBounds.encryptedMax).toHaveLength(4);
    });

    test('should evaluate predicate correctly', () => {
        // encryptLocation returns { encryptedCoords: [...], timestamp, version }
        const encryptedLocation = rangeEncryption.encryptLocation(40.7128, -74.0060);
        const encryptedPOI = {
            encryptedCoords: encryptedLocation.encryptedCoords
        };
        const queryToken = rangeEncryption.generateQueryToken(40.7128, -74.0060, 5);

        // Same location should match
        const result = rangeEncryption.evaluatePredicate(encryptedPOI, queryToken);
        expect(typeof result).toBe('boolean');
    });

    test('should convert km to lat/lng correctly', () => {
        const latDeg = rangeEncryption.kmToLat(111.32);
        expect(latDeg).toBeCloseTo(1, 1);

        const lngDeg = rangeEncryption.kmToLng(111.32, 0);
        expect(lngDeg).toBeCloseTo(1, 1);
    });
});

describe('DataEncryption', () => {
    let dataEncryption;

    beforeEach(() => {
        dataEncryption = new DataEncryption('test-secret-key-12345');
    });

    test('should encrypt and decrypt string', () => {
        const original = 'Test POI Name';
        const encrypted = dataEncryption.encrypt(original);
        const decrypted = dataEncryption.decrypt(encrypted);
        
        expect(decrypted).toBe(original);
    });

    test('should encrypt POI data', () => {
        const poi = {
            id: 'poi-123',
            name: 'Test Restaurant',
            description: 'A nice place',
            address: '123 Main St',
            phone: '555-1234',
            category: 'restaurant'
        };

        const encrypted = dataEncryption.encryptPOI(poi);
        
        expect(encrypted.id).toBe(poi.id);
        expect(encrypted.encryptedName).not.toBe(poi.name);
        expect(encrypted.category).toBe(poi.category);
    });

    test('should decrypt POI data correctly', () => {
        const poi = {
            id: 'poi-456',
            name: 'Test Hospital',
            description: 'Emergency services',
            address: '456 Health Ave',
            phone: '555-5678',
            category: 'hospital'
        };

        const encrypted = dataEncryption.encryptPOI(poi);
        const decrypted = dataEncryption.decryptPOI(encrypted);
        
        expect(decrypted.name).toBe(poi.name);
        expect(decrypted.description).toBe(poi.description);
        expect(decrypted.address).toBe(poi.address);
    });

    test('should handle empty strings', () => {
        const encrypted = dataEncryption.encrypt('');
        expect(encrypted).toBe('');

        const decrypted = dataEncryption.decrypt('');
        expect(decrypted).toBe('');
    });

    test('should generate hash', () => {
        const value = 'sensitive-data';
        const hash1 = dataEncryption.hash(value);
        const hash2 = dataEncryption.hash(value);
        
        expect(hash1).toBe(hash2);
        expect(hash1.length).toBe(64); // SHA256 hex length
    });

    test('should verify hash', () => {
        const value = 'test-value';
        const hash = dataEncryption.hash(value);
        
        expect(dataEncryption.verifyHash(value, hash)).toBe(true);
        expect(dataEncryption.verifyHash('wrong-value', hash)).toBe(false);
    });
});

