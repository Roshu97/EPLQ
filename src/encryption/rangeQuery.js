/**
 * Range Query Encryption Module
 * Implements encrypted range queries for location-based services
 */

import CryptoJS from 'crypto-js';
import { PredicateEncryption } from './predicateEncryption.js';
import { EPLQLogger } from '../utils/logger.js';

/**
 * RangeQueryEncryption class
 * Enables privacy-preserving range queries on encrypted location data
 */
class RangeQueryEncryption extends PredicateEncryption {
    constructor(masterKey = null) {
        super(masterKey);
        this.queryDimension = 6; // Extended dimension for range queries
    }

    /**
     * Generate encrypted query token for range search
     * @param {number} centerLat - Query center latitude
     * @param {number} centerLng - Query center longitude
     * @param {number} radiusKm - Search radius in kilometers
     * @returns {Object} Encrypted query token
     */
    generateQueryToken(centerLat, centerLng, radiusKm) {
        const startTime = performance.now();

        // Normalize coordinates
        const normalizedLat = (centerLat + 90) / 180;
        const normalizedLng = (centerLng + 180) / 360;
        
        // Convert radius to normalized units (approximate)
        // Earth's circumference is ~40,075 km
        const normalizedRadius = radiusKm / 40075;

        // Create query vector with range parameters
        const queryVector = [
            normalizedLat,
            normalizedLng,
            normalizedRadius,
            normalizedRadius * normalizedRadius, // For distance calculation
            1, // Constant term
            Date.now() % 1000000 / 1000000 // Random factor
        ];

        // Encrypt query vector
        const encryptedQuery = this.encryptQueryVector(queryVector);

        // Generate query bounds for tree traversal
        const bounds = {
            minLat: centerLat - this.kmToLat(radiusKm),
            maxLat: centerLat + this.kmToLat(radiusKm),
            minLng: centerLng - this.kmToLng(radiusKm, centerLat),
            maxLng: centerLng + this.kmToLng(radiusKm, centerLat)
        };

        const encryptedBounds = this.encryptBounds(bounds);

        const executionTime = performance.now() - startTime;
        EPLQLogger.logEncryption('QUERY_TOKEN_GENERATE', JSON.stringify(encryptedQuery).length, executionTime);

        return {
            encryptedQuery,
            encryptedBounds,
            radiusNormalized: normalizedRadius,
            timestamp: Date.now(),
            expiresAt: Date.now() + 300000 // 5 minute expiration
        };
    }

    /**
     * Encrypt query vector
     * @param {Array<number>} vector - Query vector
     * @returns {Array<number>} Encrypted query vector
     */
    encryptQueryVector(vector) {
        // Extend encryption matrix for query dimension
        const extendedMatrix = this.generateExtendedMatrix(vector.length);
        
        const encrypted = [];
        for (let i = 0; i < vector.length; i++) {
            let sum = 0;
            for (let j = 0; j < vector.length; j++) {
                sum += extendedMatrix[i][j] * vector[j];
            }
            encrypted.push(sum);
        }

        return encrypted;
    }

    /**
     * Generate extended encryption matrix
     * @param {number} size - Matrix size
     * @returns {Array<Array<number>>} Extended matrix
     */
    generateExtendedMatrix(size) {
        const matrix = [];
        const seed = CryptoJS.SHA256(this.masterKey + 'extended').toString();
        
        for (let i = 0; i < size; i++) {
            matrix[i] = [];
            for (let j = 0; j < size; j++) {
                const hashInput = `${seed}-ext-${i}-${j}`;
                const hash = CryptoJS.SHA256(hashInput).toString();
                matrix[i][j] = parseInt(hash.substring(0, 8), 16) / 0xFFFFFFFF;
            }
        }
        return matrix;
    }

    /**
     * Encrypt bounding box
     * @param {Object} bounds - Bounding box coordinates
     * @returns {Object} Encrypted bounds
     */
    encryptBounds(bounds) {
        const encryptMin = this.encryptLocation(bounds.minLat, bounds.minLng);
        const encryptMax = this.encryptLocation(bounds.maxLat, bounds.maxLng);

        return {
            encryptedMin: encryptMin.encryptedCoords,
            encryptedMax: encryptMax.encryptedCoords
        };
    }

    /**
     * Evaluate encrypted predicate - check if POI is within range
     * @param {Object} encryptedPOI - Encrypted POI data
     * @param {Object} queryToken - Encrypted query token
     * @returns {boolean} True if POI matches query
     */
    evaluatePredicate(encryptedPOI, queryToken) {
        const startTime = performance.now();

        // Compute inner product of encrypted vectors
        const innerProduct = this.computeInnerProduct(
            encryptedPOI.encryptedCoords,
            queryToken.encryptedQuery.slice(0, 4)
        );

        // The inner product result determines if point is in range
        // Threshold is derived from the encrypted radius
        const threshold = queryToken.radiusNormalized * queryToken.radiusNormalized * 0.5;
        
        const result = innerProduct <= threshold;

        const executionTime = performance.now() - startTime;
        EPLQLogger.debug(`Predicate evaluation: ${executionTime.toFixed(2)}ms`, { result });

        return result;
    }

    /**
     * Compute inner product of encrypted vectors
     * @param {Array<number>} a - First encrypted vector
     * @param {Array<number>} b - Second encrypted vector
     * @returns {number} Inner product result
     */
    computeInnerProduct(a, b) {
        const minLength = Math.min(a.length, b.length);
        let sum = 0;
        for (let i = 0; i < minLength; i++) {
            sum += a[i] * b[i];
        }
        return sum;
    }

    /**
     * Convert kilometers to latitude degrees
     * @param {number} km - Distance in kilometers
     * @returns {number} Latitude degrees
     */
    kmToLat(km) {
        return km / 111.32;
    }

    /**
     * Convert kilometers to longitude degrees at given latitude
     * @param {number} km - Distance in kilometers
     * @param {number} lat - Latitude
     * @returns {number} Longitude degrees
     */
    kmToLng(km, lat) {
        return km / (111.32 * Math.cos(lat * Math.PI / 180));
    }
}

export { RangeQueryEncryption };
export default RangeQueryEncryption;

