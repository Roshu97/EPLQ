/**
 * Predicate-Only Encryption Module for Inner Product Range Queries
 * Implements privacy-preserving location-based queries
 * 
 * This module provides encryption that allows computing inner products
 * on encrypted data without revealing the actual values.
 */

import CryptoJS from 'crypto-js';
import { EPLQLogger } from '../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Generate a random polynomial coefficient
 * @returns {number} Random coefficient
 */
function generateRandomCoefficient() {
    const buffer = CryptoJS.lib.WordArray.random(4);
    return Math.abs(buffer.words[0] % 1000000) / 1000000;
}

/**
 * Generate a random matrix for encryption
 * @param {number} size - Matrix size
 * @returns {Array<Array<number>>} Random matrix
 */
function generateRandomMatrix(size) {
    const matrix = [];
    for (let i = 0; i < size; i++) {
        matrix[i] = [];
        for (let j = 0; j < size; j++) {
            matrix[i][j] = generateRandomCoefficient();
        }
    }
    return matrix;
}

/**
 * Matrix multiplication
 * @param {Array<Array<number>>} a - First matrix
 * @param {Array<number>} b - Vector
 * @returns {Array<number>} Result vector
 */
function matrixVectorMultiply(a, b) {
    const result = [];
    for (let i = 0; i < a.length; i++) {
        let sum = 0;
        for (let j = 0; j < b.length; j++) {
            sum += a[i][j] * b[j];
        }
        result.push(sum);
    }
    return result;
}

/**
 * PredicateEncryption class
 * Implements predicate-only encryption for inner product range queries
 */
class PredicateEncryption {
    constructor(masterKey = null) {
        this.masterKey = masterKey || process.env.ENCRYPTION_MASTER_KEY || this.generateMasterKey();
        this.dimension = 4; // 2D location + range parameters
        this.setupKeys();
    }

    /**
     * Generate a new master key
     * @returns {string} Master key
     */
    generateMasterKey() {
        return CryptoJS.lib.WordArray.random(32).toString();
    }

    /**
     * Setup encryption keys from master key
     */
    setupKeys() {
        // Derive encryption matrix from master key
        const seed = CryptoJS.SHA256(this.masterKey).toString();
        
        // Use seed to generate deterministic random matrix
        this.encryptionMatrix = [];
        for (let i = 0; i < this.dimension; i++) {
            this.encryptionMatrix[i] = [];
            for (let j = 0; j < this.dimension; j++) {
                const hashInput = `${seed}-${i}-${j}`;
                const hash = CryptoJS.SHA256(hashInput).toString();
                this.encryptionMatrix[i][j] = parseInt(hash.substring(0, 8), 16) / 0xFFFFFFFF;
            }
        }

        // Generate inverse matrix approximation for decryption
        this.decryptionMatrix = this.approximateInverse(this.encryptionMatrix);
    }

    /**
     * Approximate matrix inverse using Gauss-Jordan elimination
     * @param {Array<Array<number>>} matrix - Input matrix
     * @returns {Array<Array<number>>} Inverse matrix
     */
    approximateInverse(matrix) {
        const n = matrix.length;
        const augmented = matrix.map((row, i) => {
            const newRow = [...row];
            for (let j = 0; j < n; j++) {
                newRow.push(i === j ? 1 : 0);
            }
            return newRow;
        });

        // Gauss-Jordan elimination
        for (let i = 0; i < n; i++) {
            let maxRow = i;
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
                    maxRow = k;
                }
            }
            [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

            const pivot = augmented[i][i];
            if (Math.abs(pivot) < 1e-10) continue;

            for (let j = 0; j < 2 * n; j++) {
                augmented[i][j] /= pivot;
            }

            for (let k = 0; k < n; k++) {
                if (k !== i) {
                    const factor = augmented[k][i];
                    for (let j = 0; j < 2 * n; j++) {
                        augmented[k][j] -= factor * augmented[i][j];
                    }
                }
            }
        }

        return augmented.map(row => row.slice(n));
    }

    /**
     * Encrypt a location point (latitude, longitude)
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @returns {Object} Encrypted location
     */
    encryptLocation(lat, lng) {
        const startTime = performance.now();
        
        // Normalize coordinates to [0, 1] range
        const normalizedLat = (lat + 90) / 180;
        const normalizedLng = (lng + 180) / 360;
        
        // Create location vector with padding
        const locationVector = [normalizedLat, normalizedLng, 1, generateRandomCoefficient()];
        
        // Apply encryption transformation
        const encryptedVector = matrixVectorMultiply(this.encryptionMatrix, locationVector);
        
        // Add noise for security
        const noise = generateRandomCoefficient() * 0.001;
        const noisyVector = encryptedVector.map(v => v + noise);

        const executionTime = performance.now() - startTime;
        EPLQLogger.logEncryption('LOCATION_ENCRYPT', JSON.stringify(noisyVector).length, executionTime);

        return {
            encryptedCoords: noisyVector,
            timestamp: Date.now(),
            version: '1.0'
        };
    }
}

export { PredicateEncryption };
export default PredicateEncryption;

