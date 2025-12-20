/**
 * Search Service Module
 * Handles user search operations for POIs
 */

import { QueryProcessor } from '../query/queryProcessor.js';
import { POIManager } from '../admin/poiManager.js';
import { EPLQLogger } from '../utils/logger.js';
import { validateLatitude, validateLongitude, validateRadius } from '../utils/validators.js';

/**
 * SearchService class
 * Provides privacy-preserving POI search functionality for users
 */
class SearchService {
    constructor(masterKey = null) {
        this.queryProcessor = new QueryProcessor(masterKey);
        this.poiManager = new POIManager(masterKey);
        this.isInitialized = false;
        this.defaultRadius = parseFloat(process.env.DEFAULT_QUERY_RADIUS_KM) || 5;
        this.maxRadius = parseFloat(process.env.MAX_QUERY_RADIUS_KM) || 50;
    }

    /**
     * Initialize search service with POI data
     * @returns {Object} Initialization result
     */
    async initialize() {
        try {
            const startTime = performance.now();
            
            // Load encrypted POIs from database
            const encryptedPOIs = await this.poiManager.getEncryptedPOIs();
            
            // Build spatial index
            const stats = this.queryProcessor.initialize(encryptedPOIs);
            
            this.isInitialized = true;
            const initTime = performance.now() - startTime;
            
            EPLQLogger.info(`Search service initialized in ${initTime.toFixed(2)}ms`, stats);
            
            return {
                success: true,
                poiCount: stats.totalPOIs,
                indexNodes: stats.totalNodes,
                initTime: initTime.toFixed(2)
            };
        } catch (error) {
            EPLQLogger.error('Failed to initialize search service', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Search for POIs within a radius
     * @param {Object} searchParams - Search parameters
     * @param {string} userId - User ID for logging
     * @returns {Object} Search results
     */
    async search(searchParams, userId) {
        const startTime = performance.now();

        try {
            // Validate inputs
            const latValidation = validateLatitude(searchParams.latitude);
            if (!latValidation.valid) {
                return { success: false, error: latValidation.error };
            }

            const lngValidation = validateLongitude(searchParams.longitude);
            if (!lngValidation.valid) {
                return { success: false, error: lngValidation.error };
            }

            const radius = searchParams.radius || this.defaultRadius;
            const radiusValidation = validateRadius(radius, this.maxRadius);
            if (!radiusValidation.valid) {
                return { success: false, error: radiusValidation.error };
            }

            // Ensure service is initialized
            if (!this.isInitialized) {
                await this.initialize();
            }

            // Execute privacy-preserving query
            const result = await this.queryProcessor.executeQuery(
                latValidation.value,
                lngValidation.value,
                radiusValidation.value,
                userId,
                {
                    decrypt: true,
                    limit: searchParams.limit || 50,
                    useCache: searchParams.useCache !== false,
                    category: searchParams.category
                }
            );

            // Filter by category if specified
            if (searchParams.category && result.success) {
                result.results = result.results.filter(
                    poi => poi.category === searchParams.category
                );
                result.metadata.returnedCount = result.results.length;
            }

            const totalTime = performance.now() - startTime;
            result.metadata = result.metadata || {};
            result.metadata.totalTime = totalTime.toFixed(2);

            return result;
        } catch (error) {
            EPLQLogger.error('Search failed', error, { userId, searchParams });
            return {
                success: false,
                error: error.message,
                results: []
            };
        }
    }

    /**
     * Get available POI categories
     * @returns {Array<string>} Category list
     */
    async getCategories() {
        try {
            const stats = await this.poiManager.getCategoryStats();
            return {
                success: true,
                categories: Object.keys(stats).map(cat => ({
                    name: cat,
                    count: stats[cat]
                }))
            };
        } catch (error) {
            EPLQLogger.error('Failed to get categories', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get search statistics for user
     * @returns {Object} Search stats
     */
    getStats() {
        return {
            isInitialized: this.isInitialized,
            processorStats: this.queryProcessor.getStats(),
            defaultRadius: this.defaultRadius,
            maxRadius: this.maxRadius
        };
    }

    /**
     * Clear search cache
     */
    clearCache() {
        this.queryProcessor.clearCache();
    }

    /**
     * Reinitialize with fresh data
     */
    async refresh() {
        this.isInitialized = false;
        this.queryProcessor.clearCache();
        return await this.initialize();
    }
}

export { SearchService };
export default SearchService;

