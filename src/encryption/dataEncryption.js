/**
 * Data Encryption Module
 * Handles symmetric encryption for POI metadata
 */

import CryptoJS from 'crypto-js';
import { EPLQLogger } from '../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * DataEncryption class
 * Provides symmetric encryption for POI data using AES-256
 */
class DataEncryption {
    constructor(secretKey = null) {
        this.secretKey = secretKey || process.env.ENCRYPTION_MASTER_KEY || this.generateKey();
    }

    /**
     * Generate a new encryption key
     * @returns {string} Generated key
     */
    generateKey() {
        return CryptoJS.lib.WordArray.random(32).toString();
    }

    /**
     * Encrypt POI data
     * @param {Object} poiData - POI data to encrypt
     * @returns {Object} Encrypted POI data
     */
    encryptPOI(poiData) {
        const startTime = performance.now();

        const encrypted = {
            id: poiData.id,
            encryptedName: this.encrypt(poiData.name),
            encryptedDescription: this.encrypt(poiData.description || ''),
            encryptedAddress: this.encrypt(poiData.address || ''),
            encryptedPhone: this.encrypt(poiData.phone || ''),
            category: poiData.category, // Category remains unencrypted for filtering
            createdAt: poiData.createdAt || Date.now(),
            updatedAt: Date.now()
        };

        const executionTime = performance.now() - startTime;
        EPLQLogger.logEncryption('POI_ENCRYPT', JSON.stringify(encrypted).length, executionTime);

        return encrypted;
    }

    /**
     * Decrypt POI data
     * @param {Object} encryptedPOI - Encrypted POI data
     * @returns {Object} Decrypted POI data
     */
    decryptPOI(encryptedPOI) {
        const startTime = performance.now();

        const decrypted = {
            id: encryptedPOI.id,
            name: this.decrypt(encryptedPOI.encryptedName),
            description: this.decrypt(encryptedPOI.encryptedDescription),
            address: this.decrypt(encryptedPOI.encryptedAddress),
            phone: this.decrypt(encryptedPOI.encryptedPhone),
            category: encryptedPOI.category,
            createdAt: encryptedPOI.createdAt,
            updatedAt: encryptedPOI.updatedAt
        };

        const executionTime = performance.now() - startTime;
        EPLQLogger.logEncryption('POI_DECRYPT', JSON.stringify(decrypted).length, executionTime);

        return decrypted;
    }

    /**
     * Encrypt a string value
     * @param {string} value - Value to encrypt
     * @returns {string} Encrypted value
     */
    encrypt(value) {
        if (!value) return '';
        
        try {
            const iv = CryptoJS.lib.WordArray.random(16);
            const encrypted = CryptoJS.AES.encrypt(value.toString(), this.secretKey, {
                iv: iv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            });

            // Combine IV and encrypted data
            const combined = iv.toString() + ':' + encrypted.toString();
            return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(combined));
        } catch (error) {
            EPLQLogger.error('Encryption failed', { error: error.message });
            throw new Error('Encryption failed');
        }
    }

    /**
     * Decrypt a string value
     * @param {string} encryptedValue - Encrypted value
     * @returns {string} Decrypted value
     */
    decrypt(encryptedValue) {
        if (!encryptedValue) return '';

        try {
            const combined = CryptoJS.enc.Utf8.stringify(
                CryptoJS.enc.Base64.parse(encryptedValue)
            );
            const parts = combined.split(':');
            
            if (parts.length !== 2) {
                throw new Error('Invalid encrypted format');
            }

            const iv = CryptoJS.enc.Hex.parse(parts[0]);
            const encrypted = parts[1];

            const decrypted = CryptoJS.AES.decrypt(encrypted, this.secretKey, {
                iv: iv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            });

            return decrypted.toString(CryptoJS.enc.Utf8);
        } catch (error) {
            EPLQLogger.error('Decryption failed', { error: error.message });
            throw new Error('Decryption failed');
        }
    }

    /**
     * Hash a value (one-way encryption for sensitive data)
     * @param {string} value - Value to hash
     * @returns {string} Hashed value
     */
    hash(value) {
        return CryptoJS.SHA256(value + this.secretKey).toString();
    }

    /**
     * Verify a hashed value
     * @param {string} value - Original value
     * @param {string} hashedValue - Hashed value to compare
     * @returns {boolean} True if values match
     */
    verifyHash(value, hashedValue) {
        return this.hash(value) === hashedValue;
    }
}

export { DataEncryption };
export default DataEncryption;

