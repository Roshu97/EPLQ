/**
 * Input Validation and Sanitization Module
 * Provides validation functions for user inputs
 */

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {Object} Validation result
 */
function validateEmail(email) {
    if (!email || typeof email !== 'string') {
        return { valid: false, error: 'Email is required' };
    }

    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!emailRegex.test(trimmedEmail)) {
        return { valid: false, error: 'Invalid email format' };
    }

    if (trimmedEmail.length > 254) {
        return { valid: false, error: 'Email is too long' };
    }

    return { valid: true, value: trimmedEmail };
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result
 */
function validatePassword(password) {
    if (!password || typeof password !== 'string') {
        return { valid: false, error: 'Password is required' };
    }

    if (password.length < 8) {
        return { valid: false, error: 'Password must be at least 8 characters' };
    }

    if (password.length > 128) {
        return { valid: false, error: 'Password is too long' };
    }

    if (!/[A-Z]/.test(password)) {
        return { valid: false, error: 'Password must contain at least one uppercase letter' };
    }

    if (!/[a-z]/.test(password)) {
        return { valid: false, error: 'Password must contain at least one lowercase letter' };
    }

    if (!/[0-9]/.test(password)) {
        return { valid: false, error: 'Password must contain at least one number' };
    }

    return { valid: true };
}

/**
 * Sanitize string input to prevent XSS
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized input
 */
function sanitizeInput(input) {
    if (!input || typeof input !== 'string') {
        return '';
    }

    return input
        .trim()
        .replace(/[<>]/g, '') // Remove angle brackets
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+=/gi, '') // Remove event handlers
        .substring(0, 1000); // Limit length
}

/**
 * Validate latitude
 * @param {number} lat - Latitude to validate
 * @returns {Object} Validation result
 */
function validateLatitude(lat) {
    const latitude = parseFloat(lat);
    
    if (isNaN(latitude)) {
        return { valid: false, error: 'Latitude must be a number' };
    }

    if (latitude < -90 || latitude > 90) {
        return { valid: false, error: 'Latitude must be between -90 and 90' };
    }

    return { valid: true, value: latitude };
}

/**
 * Validate longitude
 * @param {number} lng - Longitude to validate
 * @returns {Object} Validation result
 */
function validateLongitude(lng) {
    const longitude = parseFloat(lng);
    
    if (isNaN(longitude)) {
        return { valid: false, error: 'Longitude must be a number' };
    }

    if (longitude < -180 || longitude > 180) {
        return { valid: false, error: 'Longitude must be between -180 and 180' };
    }

    return { valid: true, value: longitude };
}

/**
 * Validate search radius
 * @param {number} radius - Radius in kilometers
 * @param {number} maxRadius - Maximum allowed radius
 * @returns {Object} Validation result
 */
function validateRadius(radius, maxRadius = 50) {
    const radiusKm = parseFloat(radius);
    
    if (isNaN(radiusKm)) {
        return { valid: false, error: 'Radius must be a number' };
    }

    if (radiusKm <= 0) {
        return { valid: false, error: 'Radius must be positive' };
    }

    if (radiusKm > maxRadius) {
        return { valid: false, error: `Radius cannot exceed ${maxRadius} km` };
    }

    return { valid: true, value: radiusKm };
}

/**
 * Validate POI data
 * @param {Object} poi - POI data to validate
 * @returns {Object} Validation result
 */
function validatePOI(poi) {
    const errors = [];

    if (!poi.name || poi.name.trim().length < 2) {
        errors.push('POI name must be at least 2 characters');
    }

    const latValidation = validateLatitude(poi.latitude);
    if (!latValidation.valid) {
        errors.push(latValidation.error);
    }

    const lngValidation = validateLongitude(poi.longitude);
    if (!lngValidation.valid) {
        errors.push(lngValidation.error);
    }

    if (!poi.category || poi.category.trim().length === 0) {
        errors.push('Category is required');
    }

    if (errors.length > 0) {
        return { valid: false, errors };
    }

    return {
        valid: true,
        value: {
            name: sanitizeInput(poi.name),
            latitude: latValidation.value,
            longitude: lngValidation.value,
            description: sanitizeInput(poi.description || ''),
            address: sanitizeInput(poi.address || ''),
            phone: sanitizeInput(poi.phone || ''),
            category: sanitizeInput(poi.category)
        }
    };
}

export {
    validateEmail,
    validatePassword,
    sanitizeInput,
    validateLatitude,
    validateLongitude,
    validateRadius,
    validatePOI
};

