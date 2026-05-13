import { AlertCircle } from 'lucide-react';

interface FieldErrorProps {
  message?: string;
  className?: string;
}

/**
 * Inline field-level error message shown below an input.
 * Renders nothing when message is empty/undefined.
 */
export function FieldError({ message, className = '' }: FieldErrorProps) {
  if (!message) return null;
  return (
    <div className={`flex items-center gap-1 mt-1 ${className}`}>
      <AlertCircle size={11} className="text-[#ff3d3d] shrink-0" />
      <span className="text-[10px] text-[#ff3d3d] leading-tight">{message}</span>
    </div>
  );
}

/**
 * Returns className string to apply a red border to an input when there's an error.
 * Usage: className={`${baseInputCls} ${fieldBorderError(errors.name)}`}
 */
export function fieldBorderError(message?: string): string {
  return message ? 'border-[#ff3d3d]/60 focus:border-[#ff3d3d]' : '';
}
