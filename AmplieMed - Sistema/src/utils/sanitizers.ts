/**
 * Input sanitization and validation utilities
 * Prevents XSS attacks and data injection by sanitizing user input
 */

import DOMPurify from 'dompurify';

/**
 * Configuration for DOMPurify
 * Allows safe HTML elements while blocking dangerous ones
 */
const PURIFY_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br', 'p', 'ul', 'ol', 'li'],
  ALLOWED_ATTR: ['class'],
  KEEP_CONTENT: true,
  USE_PROFILES: { html: false, svg: false, mathMl: false },
};

/**
 * Sanitizes HTML/user input using DOMPurify
 * Removes potentially dangerous tags and attributes
 * @param input The input string to sanitize
 * @param config Optional custom DOMPurify configuration
 * @returns Sanitized string safe for HTML rendering
 *
 * @example
 * const input = '<script>alert("xss")</script>Hello';
 * const safe = sanitizeInput(input);
 * // Result: "Hello"
 */
export function sanitizeInput(input: string, config = PURIFY_CONFIG): string {
  if (typeof input !== 'string') return '';
  if (input.length === 0) return '';

  // Use DOMPurify for robust sanitization
  const sanitized = DOMPurify.sanitize(input, config);

  // Additional layer: remove common injection patterns
  return sanitized
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '')
    .trim();
}

/**
 * Strict sanitization for plain text only
 * Removes all HTML tags and special characters
 * @param input The input string to sanitize
 * @returns Plain text without any HTML
 *
 * @example
 * const input = '<div onclick="alert(1)">Click</div>';
 * const safe = sanitizeText(input);
 * // Result: "Click"
 */
export function sanitizeText(input: string): string {
  if (typeof input !== 'string') return '';

  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/**
 * Validates and sanitizes form data
 */
export interface ValidationError {
  field: string;
  message: string;
}

export interface FieldValidator {
  required?: boolean | string; // true or custom message
  minLength?: number | { value: number; message: string };
  maxLength?: number | { value: number; message: string };
  pattern?: RegExp | { value: RegExp; message: string };
  custom?: (value: any) => string | null; // null if valid, error message if invalid
}

export type ValidationSchema = Record<string, FieldValidator>;

/**
 * Validates data against schema and sanitizes strings
 */
export function validateAndSanitize(
  data: Record<string, any>,
  schema: ValidationSchema
): { errors: ValidationError[]; sanitized: Record<string, any>; isValid: boolean } {
  const errors: ValidationError[] = [];
  const sanitized: Record<string, any> = {};

  for (const [field, value] of Object.entries(data)) {
    const validator = schema[field];
    if (!validator) {
      sanitized[field] = value;
      continue;
    }

    // Sanitize if string
    const sanitizedValue = typeof value === 'string' ? sanitizeInput(value) : value;

    // Validate required
    if (validator.required) {
      const isEmpty =
        sanitizedValue === null ||
        sanitizedValue === undefined ||
        sanitizedValue === '';

      if (isEmpty) {
        const message =
          typeof validator.required === 'string'
            ? validator.required
            : `${field} é obrigatório`;
        errors.push({ field, message });
        continue;
      }
    }

    // Validate minLength
    if (validator.minLength !== undefined && typeof sanitizedValue === 'string') {
      const config =
        typeof validator.minLength === 'number'
          ? { value: validator.minLength, message: `Mínimo ${validator.minLength} caracteres` }
          : validator.minLength;

      if (sanitizedValue.length < config.value) {
        errors.push({ field, message: config.message });
      }
    }

    // Validate maxLength
    if (validator.maxLength !== undefined && typeof sanitizedValue === 'string') {
      const config =
        typeof validator.maxLength === 'number'
          ? { value: validator.maxLength, message: `Máximo ${validator.maxLength} caracteres` }
          : validator.maxLength;

      if (sanitizedValue.length > config.value) {
        errors.push({ field, message: config.message });
      }
    }

    // Validate pattern
    if (validator.pattern !== undefined && typeof sanitizedValue === 'string') {
      const config =
        validator.pattern instanceof RegExp
          ? { value: validator.pattern, message: `${field} tem formato inválido` }
          : validator.pattern;

      if (!config.value.test(sanitizedValue)) {
        errors.push({ field, message: config.message });
      }
    }

    // Custom validation
    if (validator.custom) {
      const customError = validator.custom(sanitizedValue);
      if (customError) {
        errors.push({ field, message: customError });
      }
    }

    sanitized[field] = sanitizedValue;
  }

  return {
    errors,
    sanitized,
    isValid: errors.length === 0,
  };
}

/**
 * Sanitizes all string values in an object recursively
 */
export function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') return sanitizeInput(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  return obj;
}
