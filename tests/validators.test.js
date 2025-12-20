/**
 * Validators Module Tests
 * Tests for input validation and sanitization
 */

import {
    validateEmail,
    validatePassword,
    sanitizeInput,
    validateLatitude,
    validateLongitude,
    validateRadius,
    validatePOI
} from '../src/utils/validators.js';

describe('validateEmail', () => {
    test('should accept valid emails', () => {
        expect(validateEmail('user@example.com').valid).toBe(true);
        expect(validateEmail('user.name@domain.co.uk').valid).toBe(true);
        expect(validateEmail('user+tag@example.org').valid).toBe(true);
    });

    test('should reject invalid emails', () => {
        expect(validateEmail('invalid').valid).toBe(false);
        expect(validateEmail('invalid@').valid).toBe(false);
        expect(validateEmail('@domain.com').valid).toBe(false);
        expect(validateEmail('user@domain').valid).toBe(false);
    });

    test('should handle empty/null input', () => {
        expect(validateEmail('').valid).toBe(false);
        expect(validateEmail(null).valid).toBe(false);
        expect(validateEmail(undefined).valid).toBe(false);
    });

    test('should normalize email to lowercase', () => {
        const result = validateEmail('User@EXAMPLE.COM');
        expect(result.valid).toBe(true);
        expect(result.value).toBe('user@example.com');
    });
});

describe('validatePassword', () => {
    test('should accept valid passwords', () => {
        expect(validatePassword('Password1').valid).toBe(true);
        expect(validatePassword('MySecure123Pass').valid).toBe(true);
        expect(validatePassword('Complex1Password!').valid).toBe(true);
    });

    test('should reject short passwords', () => {
        const result = validatePassword('Pass1');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('8 characters');
    });

    test('should require uppercase letter', () => {
        const result = validatePassword('password1');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('uppercase');
    });

    test('should require lowercase letter', () => {
        const result = validatePassword('PASSWORD1');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('lowercase');
    });

    test('should require number', () => {
        const result = validatePassword('Passwordd');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('number');
    });
});

describe('sanitizeInput', () => {
    test('should remove HTML tags', () => {
        expect(sanitizeInput('<script>alert("xss")</script>')).not.toContain('<');
        expect(sanitizeInput('<div>content</div>')).not.toContain('<');
    });

    test('should remove javascript: protocol', () => {
        expect(sanitizeInput('javascript:alert(1)')).not.toContain('javascript:');
    });

    test('should remove event handlers', () => {
        expect(sanitizeInput('onclick=alert(1)')).not.toContain('onclick=');
        expect(sanitizeInput('onmouseover=evil()')).not.toContain('onmouseover=');
    });

    test('should trim whitespace', () => {
        expect(sanitizeInput('  hello  ')).toBe('hello');
    });

    test('should limit length', () => {
        const longString = 'a'.repeat(2000);
        expect(sanitizeInput(longString).length).toBe(1000);
    });

    test('should handle empty/null input', () => {
        expect(sanitizeInput('')).toBe('');
        expect(sanitizeInput(null)).toBe('');
        expect(sanitizeInput(undefined)).toBe('');
    });
});

describe('validateLatitude', () => {
    test('should accept valid latitudes', () => {
        expect(validateLatitude(0).valid).toBe(true);
        expect(validateLatitude(45.5).valid).toBe(true);
        expect(validateLatitude(-45.5).valid).toBe(true);
        expect(validateLatitude(90).valid).toBe(true);
        expect(validateLatitude(-90).valid).toBe(true);
    });

    test('should reject out of range latitudes', () => {
        expect(validateLatitude(91).valid).toBe(false);
        expect(validateLatitude(-91).valid).toBe(false);
        expect(validateLatitude(180).valid).toBe(false);
    });

    test('should handle string numbers', () => {
        expect(validateLatitude('45.5').valid).toBe(true);
        expect(validateLatitude('45.5').value).toBe(45.5);
    });

    test('should reject non-numbers', () => {
        expect(validateLatitude('abc').valid).toBe(false);
        expect(validateLatitude(NaN).valid).toBe(false);
    });
});

describe('validateLongitude', () => {
    test('should accept valid longitudes', () => {
        expect(validateLongitude(0).valid).toBe(true);
        expect(validateLongitude(90).valid).toBe(true);
        expect(validateLongitude(-90).valid).toBe(true);
        expect(validateLongitude(180).valid).toBe(true);
        expect(validateLongitude(-180).valid).toBe(true);
    });

    test('should reject out of range longitudes', () => {
        expect(validateLongitude(181).valid).toBe(false);
        expect(validateLongitude(-181).valid).toBe(false);
    });
});

describe('validateRadius', () => {
    test('should accept valid radii', () => {
        expect(validateRadius(1).valid).toBe(true);
        expect(validateRadius(5).valid).toBe(true);
        expect(validateRadius(50).valid).toBe(true);
    });

    test('should reject zero or negative', () => {
        expect(validateRadius(0).valid).toBe(false);
        expect(validateRadius(-5).valid).toBe(false);
    });

    test('should reject values exceeding max', () => {
        expect(validateRadius(100, 50).valid).toBe(false);
        expect(validateRadius(51).valid).toBe(false);
    });

    test('should allow custom max radius', () => {
        expect(validateRadius(75, 100).valid).toBe(true);
    });
});

describe('validatePOI', () => {
    test('should accept valid POI', () => {
        const poi = {
            name: 'Test POI',
            latitude: 40.7128,
            longitude: -74.0060,
            category: 'restaurant'
        };
        const result = validatePOI(poi);
        expect(result.valid).toBe(true);
    });

    test('should reject POI without name', () => {
        const poi = {
            name: '',
            latitude: 40.7128,
            longitude: -74.0060,
            category: 'restaurant'
        };
        const result = validatePOI(poi);
        expect(result.valid).toBe(false);
    });

    test('should reject POI with invalid coordinates', () => {
        const poi = {
            name: 'Test',
            latitude: 100,
            longitude: -74.0060,
            category: 'restaurant'
        };
        const result = validatePOI(poi);
        expect(result.valid).toBe(false);
    });

    test('should sanitize POI fields', () => {
        const poi = {
            name: '  <script>Test</script>  ',
            latitude: 40.7128,
            longitude: -74.0060,
            category: 'restaurant'
        };
        const result = validatePOI(poi);
        expect(result.valid).toBe(true);
        expect(result.value.name).not.toContain('<');
    });
});

