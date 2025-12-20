/**
 * Query Processor Module
 * Handles privacy-preserving range queries on encrypted POI data
 */

import { SpatialIndex } from './spatialIndex.js';
import { RangeQueryEncryption } from '../encryption/rangeQuery.js';
import { DataEncryption } from '../encryption/dataEncryption.js';
import { EPLQLogger } from '../utils/logger.js';

/**
 * QueryProcessor class
 * Orchestrates encrypted range queries with spatial indexing
 */
class QueryProcessor {
    constructor(masterKey = null) {
        this.rangeEncryption = new RangeQueryEncryption(masterKey);
        this.dataEncryption = new DataEncryption(masterKey);
        this.spatialIndex = new SpatialIndex();
        this.queryCache = new Map();
        this.cacheMaxSize = 100;
        this.cacheMaxAge = 300000; // 5 minutes
    }

    /**
     * Initialize the query processor with POI data
     * @param {Array<Object>} encryptedPOIs - Encrypted POI data
     */
    initialize(encryptedPOIs) {
        return this.spatialIndex.buildIndex(encryptedPOIs);
    }

    /**
     * Execute a privacy-preserving range query
     * @param {number} lat - Query center latitude
     * @param {number} lng - Query center longitude
     * @param {number} radiusKm - Search radius in kilometers
     * @param {string} userId - User ID for logging
     * @param {Object} options - Query options
     * @returns {Object} Query results
     */
    async executeQuery(lat, lng, radiusKm, userId, options = {}) {
        const startTime = performance.now();
        const queryId = this.generateQueryId(lat, lng, radiusKm);

        EPLQLogger.info('Executing range query', { userId, lat, lng, radiusKm });

        try {
            // Check cache first (optional)
            if (options.useCache !== false) {
                const cached = this.getCachedResult(queryId);
                if (cached) {
                    EPLQLogger.debug('Cache hit for query', { queryId });
                    return cached;
                }
            }

            // Generate encrypted query token
            const tokenStartTime = performance.now();
            const queryToken = this.rangeEncryption.generateQueryToken(lat, lng, radiusKm);
            const tokenTime = performance.now() - tokenStartTime;

            // Search spatial index for candidates
            const searchStartTime = performance.now();
            const candidates = this.spatialIndex.search(queryToken.encryptedBounds);
            const searchTime = performance.now() - searchStartTime;

            // Evaluate predicate for each candidate
            const evaluateStartTime = performance.now();
            const matchingPOIs = candidates.filter(poi => 
                this.rangeEncryption.evaluatePredicate(poi.encryptedLocation, queryToken)
            );
            const evaluateTime = performance.now() - evaluateStartTime;

            // Decrypt matching POIs if requested
            let results = matchingPOIs;
            let decryptTime = 0;
            if (options.decrypt !== false) {
                const decryptStartTime = performance.now();
                results = matchingPOIs.map(poi => ({
                    ...this.dataEncryption.decryptPOI(poi),
                    distance: this.calculateApproxDistance(poi, lat, lng)
                }));
                decryptTime = performance.now() - decryptStartTime;

                // Sort by distance
                results.sort((a, b) => a.distance - b.distance);
            }

            // Apply limit if specified
            if (options.limit) {
                results = results.slice(0, options.limit);
            }

            const totalTime = performance.now() - startTime;

            const queryResult = {
                success: true,
                queryId,
                results,
                metadata: {
                    totalCandidates: candidates.length,
                    matchingCount: matchingPOIs.length,
                    returnedCount: results.length,
                    timing: {
                        tokenGeneration: tokenTime.toFixed(2),
                        spatialSearch: searchTime.toFixed(2),
                        predicateEvaluation: evaluateTime.toFixed(2),
                        decryption: decryptTime.toFixed(2),
                        total: totalTime.toFixed(2)
                    }
                }
            };

            // Cache result
            if (options.useCache !== false) {
                this.cacheResult(queryId, queryResult);
            }

            // Log query
            await EPLQLogger.logQuery(userId, { lat, lng, radiusKm }, results.length, totalTime);

            return queryResult;
        } catch (error) {
            EPLQLogger.error('Query execution failed', error, { userId, lat, lng, radiusKm });
            return {
                success: false,
                queryId,
                error: error.message,
                results: []
            };
        }
    }

    /**
     * Generate unique query ID for caching
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @param {number} radius - Radius
     * @returns {string} Query ID
     */
    generateQueryId(lat, lng, radius) {
        // Round to reduce cache key variations
        const roundedLat = Math.round(lat * 1000) / 1000;
        const roundedLng = Math.round(lng * 1000) / 1000;
        const roundedRadius = Math.round(radius * 10) / 10;
        return `${roundedLat}_${roundedLng}_${roundedRadius}`;
    }

    /**
     * Get cached query result
     * @param {string} queryId - Query ID
     * @returns {Object|null} Cached result or null
     */
    getCachedResult(queryId) {
        const cached = this.queryCache.get(queryId);
        if (!cached) return null;
        
        if (Date.now() - cached.timestamp > this.cacheMaxAge) {
            this.queryCache.delete(queryId);
            return null;
        }
        
        return cached.result;
    }

    /**
     * Cache query result
     * @param {string} queryId - Query ID
     * @param {Object} result - Query result
     */
    cacheResult(queryId, result) {
        if (this.queryCache.size >= this.cacheMaxSize) {
            const oldestKey = this.queryCache.keys().next().value;
            this.queryCache.delete(oldestKey);
        }
        this.queryCache.set(queryId, { result, timestamp: Date.now() });
    }

    /**
     * Calculate approximate distance (for sorting)
     * @param {Object} poi - POI object
     * @param {number} queryLat - Query latitude
     * @param {number} queryLng - Query longitude
     * @returns {number} Approximate distance in km
     */
    calculateApproxDistance(poi, queryLat, queryLng) {
        if (!poi.originalLat || !poi.originalLng) {
            return 0;
        }
        const R = 6371;
        const dLat = (poi.originalLat - queryLat) * Math.PI / 180;
        const dLng = (poi.originalLng - queryLng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(queryLat * Math.PI / 180) * Math.cos(poi.originalLat * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }

    /**
     * Clear query cache
     */
    clearCache() {
        this.queryCache.clear();
        EPLQLogger.info('Query cache cleared');
    }

    /**
     * Get processor statistics
     * @returns {Object} Statistics
     */
    getStats() {
        return {
            indexStats: this.spatialIndex.getStats(),
            cacheSize: this.queryCache.size,
            cacheMaxSize: this.cacheMaxSize
        };
    }
}

export { QueryProcessor };
export default QueryProcessor;

