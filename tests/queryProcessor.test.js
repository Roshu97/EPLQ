/**
 * Query Processor Tests
 * Tests for privacy-preserving range query processing
 */

import { QueryProcessor } from '../src/query/queryProcessor.js';

describe('QueryProcessor', () => {
    let processor;

    beforeEach(() => {
        processor = new QueryProcessor('test-key-12345');
    });

    test('should initialize with empty data', () => {
        const stats = processor.initialize([]);
        
        expect(stats.totalPOIs).toBe(0);
    });

    test('should generate unique query IDs', () => {
        const id1 = processor.generateQueryId(40.7128, -74.0060, 5);
        const id2 = processor.generateQueryId(40.7128, -74.0060, 5);
        const id3 = processor.generateQueryId(40.8000, -74.0060, 5); // Different lat by large enough margin

        // Same inputs should produce same ID
        expect(id1).toBe(id2);
        // Different inputs should produce different ID
        expect(id1).not.toBe(id3);
    });

    test('should cache query results', () => {
        const queryId = 'test-query-123';
        const result = { success: true, results: [] };

        // Cache result
        processor.cacheResult(queryId, result);

        // Retrieve from cache
        const cached = processor.getCachedResult(queryId);
        expect(cached).toEqual(result);
    });

    test('should expire cached results', async () => {
        // Set short cache age for testing
        processor.cacheMaxAge = 100; // 100ms

        const queryId = 'expire-test';
        processor.cacheResult(queryId, { data: 'test' });

        // Should exist immediately
        expect(processor.getCachedResult(queryId)).toBeDefined();

        // Wait for expiration
        await new Promise(resolve => setTimeout(resolve, 150));

        // Should be expired now
        expect(processor.getCachedResult(queryId)).toBeNull();
    });

    test('should respect cache max size', () => {
        processor.cacheMaxSize = 3;

        processor.cacheResult('q1', { r: 1 });
        processor.cacheResult('q2', { r: 2 });
        processor.cacheResult('q3', { r: 3 });
        processor.cacheResult('q4', { r: 4 });

        // First entry should be evicted
        expect(processor.getCachedResult('q1')).toBeNull();
        expect(processor.getCachedResult('q4')).toBeDefined();
    });

    test('should clear cache', () => {
        processor.cacheResult('test', { data: 'test' });
        expect(processor.getCachedResult('test')).toBeDefined();

        processor.clearCache();
        expect(processor.getCachedResult('test')).toBeNull();
    });

    test('should calculate approximate distance', () => {
        const poi = { originalLat: 40.7128, originalLng: -74.0060 };
        
        // Same location = 0 distance
        const dist1 = processor.calculateApproxDistance(poi, 40.7128, -74.0060);
        expect(dist1).toBeCloseTo(0, 1);

        // ~111km for 1 degree
        const dist2 = processor.calculateApproxDistance(poi, 41.7128, -74.0060);
        expect(dist2).toBeGreaterThan(100);
        expect(dist2).toBeLessThan(120);
    });

    test('should handle missing coordinates in distance calc', () => {
        const poi = {};
        const dist = processor.calculateApproxDistance(poi, 40.7128, -74.0060);
        expect(dist).toBe(0);
    });

    test('should get statistics', () => {
        const stats = processor.getStats();

        expect(stats).toHaveProperty('indexStats');
        expect(stats).toHaveProperty('cacheSize');
        expect(stats).toHaveProperty('cacheMaxSize');
    });

    test('should execute query with mock data', async () => {
        // Initialize with test POIs
        const mockPOIs = [
            {
                id: 'poi-1',
                encryptedName: 'encrypted',
                encryptedDescription: '',
                encryptedAddress: '',
                encryptedPhone: '',
                category: 'restaurant',
                encryptedLocation: { encryptedCoords: [0.5, 0.5, 0.1, 0.1] },
                encryptedBoundingBox: { minX: 0.4, minY: 0.4, maxX: 0.6, maxY: 0.6 }
            }
        ];

        processor.initialize(mockPOIs);

        const result = await processor.executeQuery(40.7128, -74.0060, 5, 'test-user', {
            decrypt: false,
            useCache: false
        });

        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('queryId');
        expect(result).toHaveProperty('metadata');
    });
});

