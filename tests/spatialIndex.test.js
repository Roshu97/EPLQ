/**
 * Spatial Index Tests
 * Tests for R-tree based spatial indexing
 */

import { SpatialIndex } from '../src/query/spatialIndex.js';

describe('SpatialIndex', () => {
    let index;

    beforeEach(() => {
        index = new SpatialIndex();
    });

    test('should initialize empty', () => {
        const stats = index.getStats();
        expect(stats.totalPOIs).toBe(0);
        expect(stats.totalNodes).toBe(0);
    });

    test('should build index from POIs', () => {
        const pois = [
            {
                id: 'poi-1',
                encryptedLocation: { encryptedCoords: [0.5, 0.5, 0.1, 0.1] },
                encryptedBoundingBox: { minX: 0.4, minY: 0.4, maxX: 0.6, maxY: 0.6 }
            },
            {
                id: 'poi-2',
                encryptedLocation: { encryptedCoords: [0.7, 0.7, 0.1, 0.1] },
                encryptedBoundingBox: { minX: 0.6, minY: 0.6, maxX: 0.8, maxY: 0.8 }
            }
        ];

        const stats = index.buildIndex(pois);
        
        expect(stats.totalPOIs).toBe(2);
        expect(stats.lastBuildTime).toBeGreaterThan(0);
    });

    test('should insert single POI', () => {
        const poi = {
            id: 'poi-new',
            encryptedLocation: { encryptedCoords: [0.3, 0.3, 0.1, 0.1] },
            encryptedBoundingBox: { minX: 0.2, minY: 0.2, maxX: 0.4, maxY: 0.4 }
        };

        index.insert(poi);
        
        expect(index.getStats().totalPOIs).toBe(1);
    });

    test('should remove POI', () => {
        const poi = {
            id: 'poi-remove',
            encryptedLocation: { encryptedCoords: [0.5, 0.5, 0.1, 0.1] },
            encryptedBoundingBox: { minX: 0.4, minY: 0.4, maxX: 0.6, maxY: 0.6 }
        };

        index.insert(poi);
        expect(index.getStats().totalPOIs).toBe(1);

        const removed = index.remove('poi-remove');
        expect(removed).toBe(true);
        expect(index.getStats().totalPOIs).toBe(0);
    });

    test('should search within bounds', () => {
        const pois = [
            {
                id: 'poi-in',
                encryptedLocation: { encryptedCoords: [0.5, 0.5, 0.1, 0.1] },
                encryptedBoundingBox: { minX: 0.4, minY: 0.4, maxX: 0.6, maxY: 0.6 }
            },
            {
                id: 'poi-out',
                encryptedLocation: { encryptedCoords: [0.9, 0.9, 0.1, 0.1] },
                encryptedBoundingBox: { minX: 0.85, minY: 0.85, maxX: 0.95, maxY: 0.95 }
            }
        ];

        index.buildIndex(pois);

        const searchBounds = {
            encryptedMin: [0.3, 0.3],
            encryptedMax: [0.7, 0.7]
        };

        const results = index.search(searchBounds);
        
        expect(results.length).toBe(1);
        expect(results[0].id).toBe('poi-in');
    });

    test('should get all POIs', () => {
        const pois = [
            {
                id: 'poi-1',
                encryptedLocation: { encryptedCoords: [0.1, 0.1, 0.1, 0.1] },
                encryptedBoundingBox: { minX: 0.05, minY: 0.05, maxX: 0.15, maxY: 0.15 }
            },
            {
                id: 'poi-2',
                encryptedLocation: { encryptedCoords: [0.9, 0.9, 0.1, 0.1] },
                encryptedBoundingBox: { minX: 0.85, minY: 0.85, maxX: 0.95, maxY: 0.95 }
            }
        ];

        index.buildIndex(pois);
        
        const all = index.getAll();
        expect(all.length).toBe(2);
    });

    test('should clear index', () => {
        const poi = {
            id: 'poi-clear',
            encryptedLocation: { encryptedCoords: [0.5, 0.5, 0.1, 0.1] },
            encryptedBoundingBox: { minX: 0.4, minY: 0.4, maxX: 0.6, maxY: 0.6 }
        };

        index.insert(poi);
        expect(index.getStats().totalPOIs).toBe(1);

        index.clear();
        expect(index.getStats().totalPOIs).toBe(0);
    });

    test('should handle large number of POIs', () => {
        const pois = [];
        for (let i = 0; i < 1000; i++) {
            const x = Math.random();
            const y = Math.random();
            pois.push({
                id: `poi-${i}`,
                encryptedLocation: { encryptedCoords: [x, y, 0.1, 0.1] },
                encryptedBoundingBox: { 
                    minX: x - 0.01, 
                    minY: y - 0.01, 
                    maxX: x + 0.01, 
                    maxY: y + 0.01 
                }
            });
        }

        const stats = index.buildIndex(pois);
        
        expect(stats.totalPOIs).toBe(1000);
        expect(stats.lastBuildTime).toBeLessThan(1000); // Should complete in < 1 second
    });

    test('should track query count', () => {
        const poi = {
            id: 'poi-track',
            encryptedLocation: { encryptedCoords: [0.5, 0.5, 0.1, 0.1] },
            encryptedBoundingBox: { minX: 0.4, minY: 0.4, maxX: 0.6, maxY: 0.6 }
        };

        index.insert(poi);
        
        expect(index.getStats().queryCount).toBe(0);

        index.search({ encryptedMin: [0, 0], encryptedMax: [1, 1] });
        expect(index.getStats().queryCount).toBe(1);

        index.search({ encryptedMin: [0, 0], encryptedMax: [1, 1] });
        expect(index.getStats().queryCount).toBe(2);
    });
});

