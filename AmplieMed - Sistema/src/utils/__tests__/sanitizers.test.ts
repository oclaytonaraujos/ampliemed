import { describe, it, expect } from 'vitest';
import { sanitizeInput, validateAndSanitize } from '../sanitizers';
import { validateCPF, validateEmail, validatePhone } from '../validators';

describe('Sanitizers', () => {
  describe('sanitizeInput', () => {
    it('should remove script tags', () => {
      const input = '<script>alert("xss")</script>Hello';
      const result = sanitizeInput(input);
      expect(result).not.toContain('script');
    });

    it('should remove onclick handlers', () => {
      const input = '<div onclick="alert(1)">Click me</div>';
      const result = sanitizeInput(input);
      expect(result).not.toContain('onclick');
    });

    it('should remove javascript: URLs', () => {
      const input = '<a href="javascript:alert(1)">Click</a>';
      const result = sanitizeInput(input);
      expect(result).not.toContain('javascript:');
    });

    it('should preserve normal text', () => {
      const input = 'Normal patient name';
      const result = sanitizeInput(input);
      expect(result).toBe('Normal patient name');
    });

    it('should handle empty strings', () => {
      const result = sanitizeInput('');
      expect(result).toBe('');
    });
  });

  describe('validateAndSanitize', () => {
    const schema = {
      name: { required: true, type: 'string' },
      email: { required: true, type: 'email' },
    };

    it('should sanitize malicious input', () => {
      const data = {
        name: '<script>alert(1)</script>João',
        email: 'test@example.com',
      };
      const { sanitized } = validateAndSanitize(data, schema);
      expect(sanitized.name).not.toContain('script');
    });

    it('should detect missing required fields', () => {
      const data = { email: 'test@example.com' };
      const { errors } = validateAndSanitize(data, schema);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === 'name')).toBe(true);
    });
  });
});

describe('Validators', () => {
  describe('validateCPF', () => {
    it('should validate correct CPF format', () => {
      expect(validateCPF('111.444.777-35')).toBe(true);
    });

    it('should reject invalid CPF format', () => {
      expect(validateCPF('123.456.789-10')).toBe(false);
    });

    it('should reject CPF with repeated digits', () => {
      expect(validateCPF('111.111.111-11')).toBe(false);
    });

    it('should handle empty string', () => {
      expect(validateCPF('')).toBe(false);
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email', () => {
      expect(validateEmail('test@example.com')).toBe(true);
    });

    it('should reject invalid email without @', () => {
      expect(validateEmail('testexample.com')).toBe(false);
    });

    it('should reject email without domain', () => {
      expect(validateEmail('test@')).toBe(false);
    });
  });

  describe('validatePhone', () => {
    it('should validate Brazilian phone format', () => {
      expect(validatePhone('(11) 98765-4321')).toBe(true);
    });

    it('should validate phone without formatting', () => {
      expect(validatePhone('11987654321')).toBe(true);
    });

    it('should reject invalid phone', () => {
      expect(validatePhone('123')).toBe(false);
    });
  });
});
