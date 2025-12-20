/**
 * POI Manager Module
 * Handles POI data management for administrators
 */

import { v4 as uuidv4 } from 'uuid';
import { 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    getDocs, 
    deleteDoc, 
    updateDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../config/firebase.config.js';
import { RangeQueryEncryption } from '../encryption/rangeQuery.js';
import { DataEncryption } from '../encryption/dataEncryption.js';
import { EPLQLogger } from '../utils/logger.js';
import { validatePOI } from '../utils/validators.js';

/**
 * POIManager class
 * Manages encrypted POI data in Firebase
 */
class POIManager {
    constructor(masterKey = null) {
        this.rangeEncryption = new RangeQueryEncryption(masterKey);
        this.dataEncryption = new DataEncryption(masterKey);
        this.collectionName = 'pois';
    }

    /**
     * Upload a single POI
     * @param {Object} poiData - POI data to upload
     * @param {string} uploaderId - Admin user ID
     * @returns {Object} Upload result
     */
    async uploadPOI(poiData, uploaderId) {
        try {
            // Validate POI data
            const validation = validatePOI(poiData);
            if (!validation.valid) {
                return { success: false, errors: validation.errors };
            }

            const validatedPOI = validation.value;
            const poiId = uuidv4();

            // Encrypt location
            const encryptedLocation = this.rangeEncryption.encryptLocation(
                validatedPOI.latitude,
                validatedPOI.longitude
            );

            // Create encrypted bounding box for spatial indexing
            const boundingBox = this.createBoundingBox(
                validatedPOI.latitude,
                validatedPOI.longitude
            );

            // Encrypt POI metadata
            const encryptedPOI = this.dataEncryption.encryptPOI({
                id: poiId,
                ...validatedPOI
            });

            // Prepare document for storage
            const poiDocument = {
                id: poiId,
                ...encryptedPOI,
                encryptedLocation,
                encryptedBoundingBox: boundingBox,
                category: validatedPOI.category,
                uploadedBy: uploaderId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            // Store in Firebase
            if (db) {
                await setDoc(doc(db, this.collectionName, poiId), poiDocument);
            }

            await EPLQLogger.logDataUpload(uploaderId, 1, true);

            return {
                success: true,
                poiId,
                message: 'POI uploaded successfully'
            };
        } catch (error) {
            await EPLQLogger.logDataUpload(uploaderId, 1, false, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Upload multiple POIs in batch
     * @param {Array<Object>} pois - Array of POI data
     * @param {string} uploaderId - Admin user ID
     * @returns {Object} Upload result
     */
    async uploadBatch(pois, uploaderId) {
        const startTime = performance.now();
        const results = { success: 0, failed: 0, errors: [] };

        for (const poi of pois) {
            const result = await this.uploadPOI(poi, uploaderId);
            if (result.success) {
                results.success++;
            } else {
                results.failed++;
                results.errors.push({ poi: poi.name, error: result.error || result.errors });
            }
        }

        const duration = performance.now() - startTime;
        EPLQLogger.info(`Batch upload completed in ${duration.toFixed(2)}ms`, {
            total: pois.length,
            success: results.success,
            failed: results.failed
        });

        return {
            success: results.failed === 0,
            totalProcessed: pois.length,
            successCount: results.success,
            failedCount: results.failed,
            errors: results.errors,
            duration: duration.toFixed(2)
        };
    }

    /**
     * Create bounding box from coordinates
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @returns {Object} Encrypted bounding box
     */
    createBoundingBox(lat, lng) {
        const encryptedPoint = this.rangeEncryption.encryptLocation(lat, lng);
        return {
            minX: encryptedPoint.encryptedCoords[0],
            minY: encryptedPoint.encryptedCoords[1],
            maxX: encryptedPoint.encryptedCoords[0],
            maxY: encryptedPoint.encryptedCoords[1]
        };
    }

    /**
     * Get all POIs (for admin dashboard)
     * @returns {Array<Object>} All POIs (decrypted)
     */
    async getAllPOIs() {
        try {
            if (!db) {
                return { success: false, error: 'Database not available' };
            }

            const q = query(
                collection(db, this.collectionName),
                orderBy('createdAt', 'desc')
            );
            
            const snapshot = await getDocs(q);
            const pois = [];

            snapshot.forEach(doc => {
                const data = doc.data();
                const decrypted = this.dataEncryption.decryptPOI(data);
                pois.push({
                    ...decrypted,
                    encryptedLocation: data.encryptedLocation,
                    encryptedBoundingBox: data.encryptedBoundingBox
                });
            });

            return { success: true, pois };
        } catch (error) {
            EPLQLogger.error('Failed to get all POIs', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get encrypted POIs for query processing
     * @returns {Array<Object>} Encrypted POIs
     */
    async getEncryptedPOIs() {
        try {
            if (!db) return [];

            const snapshot = await getDocs(collection(db, this.collectionName));
            const pois = [];

            snapshot.forEach(doc => {
                pois.push(doc.data());
            });

            return pois;
        } catch (error) {
            EPLQLogger.error('Failed to get encrypted POIs', error);
            return [];
        }
    }

    /**
     * Delete a POI
     * @param {string} poiId - POI ID to delete
     * @param {string} adminId - Admin user ID
     * @returns {Object} Delete result
     */
    async deletePOI(poiId, adminId) {
        try {
            if (!db) throw new Error('Database not available');

            await deleteDoc(doc(db, this.collectionName, poiId));
            EPLQLogger.info('POI deleted', { poiId, adminId });

            return { success: true, message: 'POI deleted successfully' };
        } catch (error) {
            EPLQLogger.error('Failed to delete POI', error, { poiId });
            return { success: false, error: error.message };
        }
    }

    /**
     * Get POI count by category
     * @returns {Object} Category counts
     */
    async getCategoryStats() {
        try {
            if (!db) return {};

            const snapshot = await getDocs(collection(db, this.collectionName));
            const stats = {};

            snapshot.forEach(doc => {
                const category = doc.data().category || 'unknown';
                stats[category] = (stats[category] || 0) + 1;
            });

            return stats;
        } catch (error) {
            EPLQLogger.error('Failed to get category stats', error);
            return {};
        }
    }
}

export { POIManager };
export default POIManager;

