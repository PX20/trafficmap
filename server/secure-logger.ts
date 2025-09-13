/**
 * Secure logging utility to prevent sensitive information exposure in production
 * 
 * SECURITY NOTE: This module ensures that debugging logs containing sensitive
 * information like session IDs, user PII, tokens, etc. are only shown in
 * development environments and are sanitized when necessary.
 */

const isDevelopment = process.env.NODE_ENV === 'development';

// Sensitive fields that should be redacted from logs
const SENSITIVE_FIELDS = [
  'sessionID',
  'session',
  'email',
  'sub',
  'access_token',
  'refresh_token',
  'id_token',
  'password',
  'secret',
  'key',
  'token',
  'authorization',
  'cookie',
  'first_name',
  'last_name',
  'profile_image_url'
];

/**
 * Sanitizes an object by redacting sensitive fields
 */
function sanitizeObject(obj: any, depth: number = 0): any {
  if (depth > 3) return '[Max Depth Reached]'; // Prevent infinite recursion
  
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map((item, index) => 
      index < 10 ? sanitizeObject(item, depth + 1) : '[...more items]'
    );
  }
  
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const keyLower = key.toLowerCase();
    const isSensitive = SENSITIVE_FIELDS.some(field => keyLower.includes(field));
    
    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Sanitizes user object for safe logging
 */
function sanitizeUser(user: any): any {
  if (!user) return user;
  
  return {
    authenticated: !!user,
    hasId: !!user.id,
    hasClaims: !!user.claims,
    hasSub: !!(user.claims && user.claims.sub),
    hasEmail: !!(user.claims && user.claims.email),
    userType: user.claims ? 'oauth' : user.id ? 'local' : 'unknown',
    expiresAt: user.expires_at ? '[TOKEN_EXPIRY]' : 'no expiry',
    isExpired: user.expires_at ? Math.floor(Date.now() / 1000) > user.expires_at : false,
    keys: Object.keys(user || {})
  };
}

/**
 * Secure logger that only shows debug information in development
 */
export const secureLogger = {
  /**
   * Logs authentication debugging information safely
   */
  authDebug: (message: string, data?: any) => {
    if (isDevelopment) {
      console.log(`🔐 [AUTH DEBUG] ${message}`);
      if (data) {
        if (data.user) {
          console.log('User:', sanitizeUser(data.user));
          delete data.user; // Remove user from remaining data
        }
        if (data.sessionID) {
          console.log('Session ID:', '[REDACTED_IN_LOGS]');
          delete data.sessionID;
        }
        // Log remaining data with sanitization
        if (Object.keys(data).length > 0) {
          console.log('Data:', sanitizeObject(data));
        }
      }
    }
  },

  /**
   * Logs authentication errors (visible in production but sanitized)
   */
  authError: (message: string, data?: any) => {
    console.error(`🚨 [AUTH ERROR] ${message}`);
    if (data && isDevelopment) {
      console.error('Error details:', sanitizeObject(data));
    } else if (data) {
      // In production, only log non-sensitive error information
      const safeData = {
        hasUser: !!data.user,
        errorType: data.error?.constructor?.name || 'Unknown',
        timestamp: new Date().toISOString()
      };
      console.error('Error context:', safeData);
    }
  },

  /**
   * Logs general debug information (development only)
   */
  debug: (message: string, data?: any) => {
    if (isDevelopment) {
      console.log(`🐛 [DEBUG] ${message}`);
      if (data) {
        console.log('Data:', sanitizeObject(data));
      }
    }
  },

  /**
   * Logs informational messages (production safe)
   */
  info: (message: string) => {
    console.log(`ℹ️ ${message}`);
  },

  /**
   * Logs warnings (production safe)
   */
  warn: (message: string, context?: string) => {
    console.warn(`⚠️ ${message}${context ? ` [Context: ${context}]` : ''}`);
  },

  /**
   * Logs errors (production safe)
   */
  error: (message: string, error?: any) => {
    console.error(`❌ ${message}`);
    if (error && isDevelopment) {
      console.error('Stack trace:', error.stack || error);
    } else if (error) {
      console.error('Error type:', error?.constructor?.name || 'Unknown');
    }
  }
};

/**
 * Creates a safe representation of request information for logging
 */
export function createSafeRequestInfo(req: any) {
  return {
    method: req.method,
    url: req.url ? req.url.split('?')[0] : 'unknown', // Remove query params
    hostname: req.hostname,
    userAgent: req.headers?.['user-agent'] ? '[USER_AGENT]' : 'none',
    hasSession: !!req.session,
    isAuthenticated: typeof req.isAuthenticated === 'function' ? req.isAuthenticated() : !!req.user,
    timestamp: new Date().toISOString()
  };
}

export default secureLogger;