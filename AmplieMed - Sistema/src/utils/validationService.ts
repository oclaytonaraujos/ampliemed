/**
 * AmplieMed — Validation Service
 * Sistema centralizado de validações para formulários médicos.
 */

// ─── CPF ─────────────────────────────────────────────────────────────────────

export function validateCPF(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11 || /^(\d)\1+$/.test(clean)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(clean[i]) * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(clean[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(clean[i]) * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === parseInt(clean[10]);
}

// ─── CNPJ ────────────────────────────────────────────────────────────────────

export function validateCNPJ(cnpj: string): boolean {
  const clean = cnpj.replace(/\D/g, '');
  if (clean.length !== 14 || /^(\d)\1+$/.test(clean)) return false;
  const calcDigit = (s: string, weights: number[]) => {
    const sum = s.split('').reduce((acc, d, i) => acc + parseInt(d) * weights[i], 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1 = calcDigit(clean.slice(0, 12), w1);
  const d2 = calcDigit(clean.slice(0, 13), w2);
  return d1 === parseInt(clean[12]) && d2 === parseInt(clean[13]);
}

// ─── CRM ─────────────────────────────────────────────────────────────────────

export function validateCRM(crm: string): boolean {
  return /^\d{4,7}\/[A-Z]{2}$/i.test(crm.trim());
}

// ─── E-mail ───────────────────────────────────────────────────────────────────

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// ─── Telefone ─────────────────────────────────────────────────────────────────

export function validatePhone(phone: string): boolean {
  const clean = phone.replace(/\D/g, '');
  return clean.length === 10 || clean.length === 11;
}

// ─── Data ────────────────────────────────────────────────────────────────────

export function validateDate(date: string): boolean {
  if (!date) return false;
  const d = new Date(date);
  return !isNaN(d.getTime());
}

export function validatePastDate(date: string): boolean {
  if (!validateDate(date)) return false;
  return new Date(date) <= new Date();
}

export function validateFutureDate(date: string): boolean {
  if (!validateDate(date)) return false;
  return new Date(date) > new Date();
}

// ─── CEP ─────────────────────────────────────────────────────────────────────

export function validateCEP(cep: string): boolean {
  return /^\d{5}-?\d{3}$/.test(cep.trim());
}

export async function fetchAddressByCEP(cep: string): Promise<{
  street: string; neighborhood: string; city: string; state: string;
} | null> {
  const clean = cep.replace(/\D/g, '');
  if (clean.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    const data = await res.json();
    if (data.erro) return null;
    return {
      street: data.logradouro || '',
      neighborhood: data.bairro || '',
      city: data.localidade || '',
      state: data.uf || '',
    };
  } catch {
    return null;
  }
}

// ─── Senha ────────────────────────────────────────────────────────────────────

export function validatePassword(password: string): {
  valid: boolean;
  strength: 'weak' | 'medium' | 'strong';
  messages: string[];
} {
  const messages: string[] = [];
  if (password.length < 8) messages.push('Mínimo de 8 caracteres');
  if (!/[A-Z]/.test(password)) messages.push('Pelo menos uma letra maiúscula');
  if (!/[a-z]/.test(password)) messages.push('Pelo menos uma letra minúscula');
  if (!/\d/.test(password)) messages.push('Pelo menos um número');
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) messages.push('Pelo menos um caractere especial');

  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (messages.length === 0) strength = 'strong';
  else if (messages.length <= 2) strength = 'medium';

  return { valid: messages.length === 0, strength, messages };
}

// ─── Máscaras ─────────────────────────────────────────────────────────────────

export const masks = {
  cpf: (v: string) => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').replace(/(-\d{2})\d+?$/, '$1'),
  cnpj: (v: string) => v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d)/, '$1-$2').replace(/(-\d{2})\d+?$/, '$1'),
  phone: (v: string) => { const d = v.replace(/\D/g, ''); return d.length === 11 ? d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3') : d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3'); },
  cep: (v: string) => v.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').replace(/(-\d{3})\d+?$/, '$1'),
  date: (v: string) => v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').replace(/(\d{2})(\d)/, '$1/$2').replace(/(\d{4})\d+?$/, '$1'),
  crm: (v: string) => v.replace(/[^0-9A-Za-z/]/g, '').toUpperCase(),
};

// ─── Form Validation Hook helper ─────────────────────────────────────────────

export type ValidationRule = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
  validator?: (value: string) => boolean;
  message?: string;
};

export type ValidationSchema = Record<string, ValidationRule>;

export function validateForm(
  data: Record<string, string>,
  schema: ValidationSchema
): Record<string, string> {
  const errors: Record<string, string> = {};

  Object.entries(schema).forEach(([field, rules]) => {
    const value = (data[field] || '').trim();

    if (rules.required && !value) {
      errors[field] = rules.message || 'Campo obrigatório';
      return;
    }

    if (!value) return; // not required and empty — skip other checks

    if (rules.minLength && value.length < rules.minLength) {
      errors[field] = rules.message || `Mínimo ${rules.minLength} caracteres`;
      return;
    }

    if (rules.maxLength && value.length > rules.maxLength) {
      errors[field] = rules.message || `Máximo ${rules.maxLength} caracteres`;
      return;
    }

    if (rules.pattern && !rules.pattern.test(value)) {
      errors[field] = rules.message || 'Formato inválido';
      return;
    }

    if (rules.validator && !rules.validator(value)) {
      errors[field] = rules.message || 'Valor inválido';
      return;
    }

    if (rules.custom) {
      const msg = rules.custom(value);
      if (msg) { errors[field] = msg; return; }
    }
  });

  return errors;
}

// ─── Schemas prontos ─────────────────────────────────────────────────────────

export const patientSchema: ValidationSchema = {
  name:     { required: true, minLength: 3, message: 'Nome deve ter no mínimo 3 caracteres' },
  cpf:      { required: true, validator: validateCPF, message: 'CPF inválido' },
  birthDate:{ required: true, validator: validatePastDate, message: 'Data de nascimento inválida' },
  phone:    { required: true, validator: validatePhone, message: 'Telefone inválido' },
  email:    { validator: validateEmail, message: 'E-mail inválido' },
  cep:      { validator: validateCEP, message: 'CEP inválido' },
};

export const professionalSchema: ValidationSchema = {
  name:      { required: true, minLength: 3 },
  crm:       { required: true, validator: validateCRM, message: 'CRM inválido (formato: 12345/UF)' },
  cpf:       { required: true, validator: validateCPF, message: 'CPF inválido' },
  email:     { required: true, validator: validateEmail, message: 'E-mail inválido' },
  phone:     { required: true, validator: validatePhone, message: 'Telefone inválido' },
  specialty: { required: true },
};

export const insuranceSchema: ValidationSchema = {
  name:  { required: true },
  cnpj:  { required: true, validator: validateCNPJ, message: 'CNPJ inválido' },
  email: { validator: validateEmail, message: 'E-mail inválido' },
  phone: { validator: validatePhone, message: 'Telefone inválido' },
};

export const userSchema: ValidationSchema = {
  name:  { required: true, minLength: 3 },
  email: { required: true, validator: validateEmail, message: 'E-mail inválido' },
  role:  { required: true },
};
