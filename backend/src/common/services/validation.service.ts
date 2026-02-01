import { Injectable } from '@nestjs/common';
import { validate as validateUuid } from 'uuid';

@Injectable()
export class ValidationService {
  /**
   * Valida formato de email
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Valida força da senha
   */
  isValidPassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Senha deve ter pelo menos 8 caracteres');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Senha deve conter pelo menos uma letra maiúscula');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Senha deve conter pelo menos uma letra minúscula');
    }

    if (!/\d/.test(password)) {
      errors.push('Senha deve conter pelo menos um número');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Senha deve conter pelo menos um caractere especial');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Valida UUID
   */
  isValidUuid(uuid: string): boolean {
    return validateUuid(uuid);
  }

  /**
   * Valida ID (UUID ou string customizada)
   * Aceita UUIDs válidos ou strings alfanuméricas com hífens
   */
  isValidId(id: string): boolean {
    if (!id || typeof id !== 'string') return false;
    // Aceita UUID
    if (validateUuid(id)) return true;
    // Aceita strings alfanuméricas com hífens (ex: photobook-default, format-30x30)
    const customIdRegex = /^[a-zA-Z0-9-_]+$/;
    return customIdRegex.test(id) && id.length >= 1 && id.length <= 100;
  }

  /**
   * Valida slug de tenant
   */
  isValidTenantSlug(slug: string): boolean {
    const slugRegex = /^[a-z0-9-]+$/;
    return slugRegex.test(slug) && slug.length >= 3 && slug.length <= 50;
  }

  /**
   * Sanitiza string para slug
   */
  sanitizeSlug(input: string): string {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Valida telefone brasileiro
   */
  isValidBrazilianPhone(phone: string): boolean {
    const phoneRegex = /^\+55\d{2}9?\d{8}$/;
    return phoneRegex.test(phone.replace(/\D/g, ''));
  }

  /**
   * Valida CPF
   */
  isValidCPF(cpf: string): boolean {
    const cleanCpf = cpf.replace(/\D/g, '');
    
    if (cleanCpf.length !== 11 || /^(\d)\1{10}$/.test(cleanCpf)) {
      return false;
    }

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanCpf.charAt(i)) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCpf.charAt(9))) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanCpf.charAt(i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCpf.charAt(10))) return false;

    return true;
  }

  /**
   * Valida CNPJ
   */
  isValidCNPJ(cnpj: string): boolean {
    const cleanCnpj = cnpj.replace(/\D/g, '');
    
    if (cleanCnpj.length !== 14 || /^(\d)\1{13}$/.test(cleanCnpj)) {
      return false;
    }

    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const weights2 = [6, 7, 8, 9, 2, 3, 4, 5, 6, 7, 8, 9];

    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cleanCnpj.charAt(i)) * weights1[i];
    }
    let remainder = sum % 11;
    const digit1 = remainder < 2 ? 0 : 11 - remainder;

    sum = 0;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cleanCnpj.charAt(i)) * weights2[i];
    }
    remainder = sum % 11;
    const digit2 = remainder < 2 ? 0 : 11 - remainder;

    return digit1 === parseInt(cleanCnpj.charAt(12)) && digit2 === parseInt(cleanCnpj.charAt(13));
  }
}