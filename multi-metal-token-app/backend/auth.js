// Authentication Module for Multi-Metal Token App
// Handles user registration, login, JWT tokens, and security

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'multi-metal-token-app-secret-key-2025';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

// Password Configuration
const SALT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;

/**
 * Hash password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(password) {
    try {
        if (!password || password.length < MIN_PASSWORD_LENGTH) {
            throw new Error('Password must be at least 8 characters long');
        }
        
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        return hashedPassword;
    } catch (error) {
        console.error('Password hashing error:', error);
        throw new Error('Password hashing failed');
    }
}

/**
 * Verify password against hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} Password verification result
 */
async function verifyPassword(password, hash) {
    try {
        return await bcrypt.compare(password, hash);
    } catch (error) {
        console.error('Password verification error:', error);
        return false;
    }
}

/**
 * Generate JWT access token
 * @param {Object} payload - Token payload
 * @returns {string} JWT access token
 */
function generateToken(payload) {
    try {
        const token = jwt.sign(payload, JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN,
            issuer: 'multi-metal-token-app',
            audience: 'multi-metal-users'
        });
        return token;
    } catch (error) {
        console.error('Token generation error:', error);
        throw new Error('Token generation failed');
    }
}

/**
 * Generate refresh token
 * @param {Object} payload - Token payload
 * @returns {string} Refresh token
 */
function generateRefreshToken(payload) {
    try {
        const refreshToken = jwt.sign(payload, JWT_SECRET, {
            expiresIn: JWT_REFRESH_EXPIRES_IN,
            issuer: 'multi-metal-token-app',
            audience: 'multi-metal-refresh'
        });
        return refreshToken;
    } catch (error) {
        console.error('Refresh token generation error:', error);
        throw new Error('Refresh token generation failed');
    }
}

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 */
function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET, {
            issuer: 'multi-metal-token-app',
            audience: 'multi-metal-users'
        });
        return decoded;
    } catch (error) {
        console.error('Token verification error:', error);
        if (error.name === 'TokenExpiredError') {
            throw new Error('Token has expired');
        } else if (error.name === 'JsonWebTokenError') {
            throw new Error('Invalid token');
        } else {
            throw new Error('Token verification failed');
        }
    }
}

/**
 * Verify refresh token
 * @param {string} token - Refresh token
 * @returns {Object} Decoded token payload
 */
function verifyRefreshToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET, {
            issuer: 'multi-metal-token-app',
            audience: 'multi-metal-refresh'
        });
        return decoded;
    } catch (error) {
        console.error('Refresh token verification error:', error);
        throw new Error('Invalid refresh token');
    }
}

/**
 * Generate secure random token
 * @param {number} length - Token length
 * @returns {string} Random token
 */
function generateRandomToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate OTP for verification
 * @param {number} length - OTP length (default 6)
 * @returns {string} Generated OTP
 */
function generateOTP(length = 6) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    return otp.substring(0, length);
}

/**
 * Hash sensitive data
 * @param {string} data - Data to hash
 * @returns {string} Hashed data
 */
function hashSensitiveData(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generate device fingerprint
 * @param {Object} req - Express request object
 * @returns {string} Device fingerprint
 */
function generateDeviceFingerprint(req) {
    const userAgent = req.headers['user-agent'] || '';
    const acceptLanguage = req.headers['accept-language'] || '';
    const acceptEncoding = req.headers['accept-encoding'] || '';
    
    const fingerprint = hashSensitiveData(userAgent + acceptLanguage + acceptEncoding);
    return fingerprint;
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Email validation result
 */
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate phone number format (Indian numbers)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} Phone validation result
 */
function validatePhone(phone) {
    // Indian mobile number validation
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone.replace(/\D/g, ''));
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Password validation result
 */
function validatePassword(password) {
    const result = {
        isValid: true,
        errors: [],
        score: 0
    };
    
    if (!password) {
        result.isValid = false;
        result.errors.push('Password is required');
        return result;
    }
    
    if (password.length < MIN_PASSWORD_LENGTH) {
        result.isValid = false;
        result.errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
        result.score -= 1;
    }
    
    if (!/[A-Z]/.test(password)) {
        result.errors.push('Password must contain at least one uppercase letter');
        result.score -= 1;
    }
    
    if (!/[a-z]/.test(password)) {
        result.errors.push('Password must contain at least one lowercase letter');
        result.score -= 1;
    }
    
    if (!/\d/.test(password)) {
        result.errors.push('Password must contain at least one number');
        result.score -= 1;
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        result.errors.push('Password must contain at least one special character');
        result.score -= 1;
    }
    
    if (/^(.)\1{4,}$/.test(password)) {
        result.isValid = false;
        result.errors.push('Password cannot contain repeating characters');
    }
    
    // Calculate strength score
    let score = 0;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
    if (password.length >= 16) score += 1;
    
    result.score = Math.max(0, score);
    
    if (result.score >= 6) {
        result.strength = 'STRONG';
    } else if (result.score >= 4) {
        result.strength = 'MEDIUM';
    } else {
        result.strength = 'WEAK';
        result.isValid = result.errors.length === 0;
    }
    
    return result;
}

/**
 * Generate secure session ID
 * @returns {string} Session ID
 */
function generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Authenticate JWT middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function authenticateJWT(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Access token required' });
        }
        
        const token = authHeader.substring(7);
        const decoded = verifyToken(token);
        
        req.user = decoded;
        next();
    } catch (error) {
        console.error('JWT authentication error:', error);
        return res.status(401).json({ 
            error: error.message || 'Invalid or expired token' 
        });
    }
}

/**
 * Optional JWT authentication (doesn't fail if no token)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = verifyToken(token);
            req.user = decoded;
        }
        
        next();
    } catch (error) {
        // Continue without authentication
        next();
    }
}

/**
 * Generate API key for user
 * @param {string} userId - User ID
 * @returns {string} API key
 */
function generateAPIKey(userId) {
    const timestamp = Date.now().toString();
    const randomData = crypto.randomBytes(16).toString('hex');
    const apiKey = `mmt_${userId}_${timestamp}_${randomData}`;
    return apiKey;
}

/**
 * Validate API key format
 * @param {string} apiKey - API key to validate
 * @returns {boolean} Validation result
 */
function validateAPIKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
        return false;
    }
    
    const apiKeyRegex = /^mmt_[a-zA-Z0-9_]+_\d+_[a-f0-9]{32}$/;
    return apiKeyRegex.test(apiKey);
}

/**
 * Rate limiting helper for authentication attempts
 * @param {string} identifier - User identifier (email/phone/IP)
 * @returns {boolean} Whether rate limit exceeded
 */
function checkAuthRateLimit(identifier) {
    // In production, use Redis for distributed rate limiting
    // For now, simple in-memory implementation
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxAttempts = 5;
    
    // This would typically be stored in Redis
    // For now, return false to allow all requests
    return false;
}

/**
 * Log authentication attempt
 * @param {string} identifier - User identifier
 * @param {boolean} success - Whether attempt was successful
 * @param {string} ipAddress - Client IP address
 */
function logAuthAttempt(identifier, success, ipAddress) {
    const logEntry = {
        timestamp: new Date(),
        identifier,
        success,
        ipAddress,
        userAgent: 'unknown' // Would be populated from request
    };
    
    // In production, log to database or log aggregation service
    console.log('Auth attempt:', JSON.stringify(logEntry));
}

/**
 * Generate secure reset token for password reset
 * @param {string} email - User email
 * @returns {Object} Reset token details
 */
function generateResetToken(email) {
    const token = generateRandomToken(32);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    return {
        token,
        email,
        expiresAt,
        used: false
    };
}

/**
 * Validate reset token
 * @param {string} token - Reset token
 * @param {string} email - User email
 * @returns {boolean} Token validity
 */
function validateResetToken(token, email) {
    // In production, validate against database
    // For now, return true for demonstration
    return true;
}

/**
 * Generate referral code
 * @returns {string} Referral code
 */
function generateReferralCode() {
    const prefix = 'MMT'; // Multi Metal Token
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}${random}`;
}

/**
 * Validate referral code format
 * @param {string} code - Referral code to validate
 * @returns {boolean} Validation result
 */
function validateReferralCode(code) {
    if (!code || typeof code !== 'string') {
        return false;
    }
    
    const referralRegex = /^MMT[A-Z0-9]{6}$/;
    return referralRegex.test(code);
}

module.exports = {
    hashPassword,
    verifyPassword,
    generateToken,
    generateRefreshToken,
    verifyToken,
    verifyRefreshToken,
    generateRandomToken,
    generateOTP,
    hashSensitiveData,
    generateDeviceFingerprint,
    validateEmail,
    validatePhone,
    validatePassword,
    generateSessionId,
    authenticateJWT,
    optionalAuth,
    generateAPIKey,
    validateAPIKey,
    checkAuthRateLimit,
    logAuthAttempt,
    generateResetToken,
    validateResetToken,
    generateReferralCode,
    validateReferralCode
};