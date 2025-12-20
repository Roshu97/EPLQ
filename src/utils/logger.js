/**
 * EPLQ Logging Module
 * Implements Winston-based logging with Firebase integration
 * Supports multiple log levels: DEBUG, INFO, WARN, ERROR
 */

import winston from 'winston';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase.config.js';
import dotenv from 'dotenv';

dotenv.config();

// Custom log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, timestamp, ...meta }) => {
        let logMessage = `${timestamp} [${level.toUpperCase()}]: ${message}`;
        if (Object.keys(meta).length > 0) {
            logMessage += ` ${JSON.stringify(meta)}`;
        }
        return logMessage;
    })
);

// Create Winston logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'debug',
    format: logFormat,
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                logFormat
            )
        }),
        new winston.transports.File({ 
            filename: 'logs/error.log', 
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        new winston.transports.File({ 
            filename: 'logs/combined.log',
            maxsize: 5242880,
            maxFiles: 5
        })
    ]
});

/**
 * Log action to Firebase Firestore
 * @param {string} action - Action type
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} metadata - Additional metadata
 */
async function logToFirebase(action, level, message, metadata = {}) {
    if (process.env.LOG_TO_FIREBASE !== 'true' || !db) {
        return;
    }

    try {
        const logsCollection = collection(db, 'actionLogs');
        await addDoc(logsCollection, {
            action,
            level,
            message,
            metadata,
            timestamp: serverTimestamp(),
            environment: process.env.NODE_ENV || 'development'
        });
    } catch (error) {
        // Fallback to console if Firebase logging fails
        console.error('Failed to log to Firebase:', error.message);
    }
}

/**
 * EPLQ Logger class with action-specific logging methods
 */
class EPLQLogger {
    /**
     * Log user registration action
     */
    static async logRegistration(userId, email, success, error = null) {
        const message = success 
            ? `User registered successfully: ${email}`
            : `User registration failed: ${email}`;
        const level = success ? 'info' : 'error';
        
        logger.log(level, message, { userId, email, error: error?.message });
        await logToFirebase('USER_REGISTRATION', level, message, { userId, email });
    }

    /**
     * Log user login action
     */
    static async logLogin(userId, email, success, error = null) {
        const message = success 
            ? `User logged in: ${email}`
            : `Login failed: ${email}`;
        const level = success ? 'info' : 'warn';
        
        logger.log(level, message, { userId, email, error: error?.message });
        await logToFirebase('USER_LOGIN', level, message, { userId, email });
    }

    /**
     * Log user logout action
     */
    static async logLogout(userId, email) {
        logger.info(`User logged out: ${email}`, { userId });
        await logToFirebase('USER_LOGOUT', 'info', `User logged out: ${email}`, { userId });
    }

    /**
     * Log data upload action
     */
    static async logDataUpload(userId, poiCount, success, error = null) {
        const message = success 
            ? `Data uploaded: ${poiCount} POIs`
            : `Data upload failed`;
        const level = success ? 'info' : 'error';
        
        logger.log(level, message, { userId, poiCount, error: error?.message });
        await logToFirebase('DATA_UPLOAD', level, message, { userId, poiCount });
    }

    /**
     * Log search query action
     */
    static async logQuery(userId, queryParams, resultCount, executionTime) {
        const message = `Query executed: ${resultCount} results in ${executionTime}ms`;
        logger.info(message, { userId, queryParams, resultCount, executionTime });
        await logToFirebase('SEARCH_QUERY', 'info', message, { 
            userId, queryParams, resultCount, executionTime 
        });
    }

    /**
     * Log encryption operation
     */
    static async logEncryption(operation, dataSize, executionTime) {
        const message = `${operation} completed: ${dataSize} bytes in ${executionTime}ms`;
        logger.debug(message, { operation, dataSize, executionTime });
    }

    /**
     * Log general error
     */
    static async logError(context, error, metadata = {}) {
        const message = `Error in ${context}: ${error.message}`;
        logger.error(message, { ...metadata, stack: error.stack });
        await logToFirebase('ERROR', 'error', message, { context, ...metadata });
    }

    /**
     * Log general info
     */
    static info(message, metadata = {}) {
        logger.info(message, metadata);
    }

    /**
     * Log debug info
     */
    static debug(message, metadata = {}) {
        logger.debug(message, metadata);
    }

    /**
     * Log warning
     */
    static warn(message, metadata = {}) {
        logger.warn(message, metadata);
    }

    /**
     * Log error
     */
    static error(message, metadata = {}) {
        logger.error(message, metadata);
    }
}

export { logger, EPLQLogger };
export default EPLQLogger;

