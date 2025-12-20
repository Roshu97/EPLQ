/**
 * Spatial Index Module
 * Implements R-tree based spatial indexing for efficient range queries
 * Uses RBush library for high-performance spatial indexing
 */

import RBush from 'rbush';
import { EPLQLogger } from '../utils/logger.js';

/**
 * Custom R-tree node class for encrypted spatial data
 */
class EncryptedRBush extends RBush {
    toBBox(item) {
        return {
            minX: item.minX,
            minY: item.minY,
            maxX: item.maxX,
            maxY: item.maxY
        };
    }

    compareMinX(a, b) {
        return a.minX - b.minX;
    }

    compareMinY(a, b) {
        return a.minY - b.minY;
    }
}

/**
 * SpatialIndex class
 * Manages encrypted spatial data in an R-tree structure
 */
class SpatialIndex {
    constructor(maxEntries = 9) {
        this.tree = new EncryptedRBush(maxEntries);
        this.poiMap = new Map();
        this.indexStats = {
            totalNodes: 0,
            totalPOIs: 0,
            lastBuildTime: null,
            queryCount: 0
        };
    }

    /**
     * Build index from encrypted POI data
     * @param {Array<Object>} encryptedPOIs - Array of encrypted POI objects
     * @returns {Object} Build statistics
     */
    buildIndex(encryptedPOIs) {
        const startTime = performance.now();
        EPLQLogger.info('Building spatial index', { poiCount: encryptedPOIs.length });

        this.tree.clear();
        this.poiMap.clear();

        const items = encryptedPOIs.map(poi => {
            // Store POI reference
            this.poiMap.set(poi.id, poi);

            // Extract encrypted bounding box
            const bbox = this.extractBoundingBox(poi);
            return {
                ...bbox,
                id: poi.id
            };
        });

        // Bulk load for efficiency
        this.tree.load(items);

        const buildTime = performance.now() - startTime;
        this.indexStats = {
            totalNodes: this.tree.data ? this.countNodes(this.tree.data) : 0,
            totalPOIs: encryptedPOIs.length,
            lastBuildTime: buildTime,
            queryCount: 0
        };

        EPLQLogger.info(`Spatial index built in ${buildTime.toFixed(2)}ms`, this.indexStats);
        return this.indexStats;
    }

    /**
     * Extract bounding box from encrypted POI
     * @param {Object} poi - Encrypted POI
     * @returns {Object} Bounding box
     */
    extractBoundingBox(poi) {
        if (poi.encryptedBoundingBox) {
            return {
                minX: poi.encryptedBoundingBox.minX,
                minY: poi.encryptedBoundingBox.minY,
                maxX: poi.encryptedBoundingBox.maxX,
                maxY: poi.encryptedBoundingBox.maxY
            };
        }

        // If no bounding box, use encrypted coordinates as point
        const coords = poi.encryptedLocation?.encryptedCoords || [0, 0, 0, 0];
        return {
            minX: coords[0],
            minY: coords[1],
            maxX: coords[0],
            maxY: coords[1]
        };
    }

    /**
     * Count nodes in R-tree
     * @param {Object} node - R-tree node
     * @returns {number} Node count
     */
    countNodes(node) {
        if (!node.children) return 1;
        let count = 1;
        for (const child of node.children) {
            count += this.countNodes(child);
        }
        return count;
    }

    /**
     * Insert a single encrypted POI into the index
     * @param {Object} encryptedPOI - Encrypted POI to insert
     */
    insert(encryptedPOI) {
        const bbox = this.extractBoundingBox(encryptedPOI);
        this.poiMap.set(encryptedPOI.id, encryptedPOI);
        this.tree.insert({
            ...bbox,
            id: encryptedPOI.id
        });
        this.indexStats.totalPOIs++;
    }

    /**
     * Remove a POI from the index
     * @param {string} poiId - POI ID to remove
     * @returns {boolean} Success status
     */
    remove(poiId) {
        const poi = this.poiMap.get(poiId);
        if (!poi) return false;

        const bbox = this.extractBoundingBox(poi);
        this.tree.remove({ ...bbox, id: poiId }, (a, b) => a.id === b.id);
        this.poiMap.delete(poiId);
        this.indexStats.totalPOIs--;
        return true;
    }

    /**
     * Search for POIs within encrypted bounding box
     * @param {Object} encryptedBounds - Encrypted search bounds
     * @returns {Array<Object>} Matching POIs
     */
    search(encryptedBounds) {
        const startTime = performance.now();
        this.indexStats.queryCount++;

        const searchBox = {
            minX: Math.min(encryptedBounds.encryptedMin[0], encryptedBounds.encryptedMax[0]),
            minY: Math.min(encryptedBounds.encryptedMin[1], encryptedBounds.encryptedMax[1]),
            maxX: Math.max(encryptedBounds.encryptedMin[0], encryptedBounds.encryptedMax[0]),
            maxY: Math.max(encryptedBounds.encryptedMin[1], encryptedBounds.encryptedMax[1])
        };

        const candidates = this.tree.search(searchBox);
        const results = candidates.map(item => this.poiMap.get(item.id)).filter(Boolean);

        const searchTime = performance.now() - startTime;
        EPLQLogger.debug(`Spatial search completed in ${searchTime.toFixed(2)}ms`, {
            candidates: candidates.length,
            results: results.length
        });

        return results;
    }

    /**
     * Get all POIs (for admin purposes)
     * @returns {Array<Object>} All POIs
     */
    getAll() {
        return Array.from(this.poiMap.values());
    }

    /**
     * Get index statistics
     * @returns {Object} Index statistics
     */
    getStats() {
        return { ...this.indexStats };
    }

    /**
     * Clear the index
     */
    clear() {
        this.tree.clear();
        this.poiMap.clear();
        this.indexStats = {
            totalNodes: 0,
            totalPOIs: 0,
            lastBuildTime: null,
            queryCount: 0
        };
    }
}

export { SpatialIndex, EncryptedRBush };
export default SpatialIndex;

