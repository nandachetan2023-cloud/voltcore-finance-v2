/**
 * Shared form validation utilities.
 * Provides per-field error state management and a reusable FieldError component.
 */

export type FieldErrors = Record<string, string>;

/**
 * Validate a set of rules and return a map of field → error message.
 * Rules are evaluated in order; first failing rule per field wins.
 *
 * Usage:
 *   const errors = validateFields([
 *     { field: 'name',  value: form.name,  label: 'Name' },
 *     { field: 'email', value: form.email, label: 'Email', rules: [{ test: isEmail, message: 'Invalid email' }] },
 *   ]);
 */
export interface FieldRule {
  test: (value: any) => boolean;
  message: string;
}

export interface FieldSpec {
  field: string;
  value: any;
  label: string;
  required?: boolean;          // default true — checks for empty string / null / undefined / 0
  rules?: FieldRule[];         // additional custom rules run after required check
}

export function validateFields(specs: FieldSpec[]): FieldErrors {
  const errors: FieldErrors = {};

  for (const spec of specs) {
    const required = spec.required !== false; // default true

    if (required) {
      const isEmpty =
        spec.value === null ||
        spec.value === undefined ||
        (typeof spec.value === 'string' && spec.value.trim() === '') ||
        (typeof spec.value === 'number' && isNaN(spec.value));

      if (isEmpty) {
        errors[spec.field] = `${spec.label} is required`;
        continue; // skip further rules for this field
      }
    }

    if (spec.rules) {
      for (const rule of spec.rules) {
        if (!rule.test(spec.value)) {
          errors[spec.field] = rule.message;
          break;
        }
      }
    }
  }

  return errors;
}

/** Returns true when there are no errors */
export function isValid(errors: FieldErrors): boolean {
  return Object.keys(errors).length === 0;
}

/** Merge new errors into existing state (useful for partial re-validation) */
export function mergeErrors(existing: FieldErrors, incoming: FieldErrors): FieldErrors {
  return { ...existing, ...incoming };
}

/** Clear a single field's error */
export function clearError(errors: FieldErrors, field: string): FieldErrors {
  const next = { ...errors };
  delete next[field];
  return next;
}
