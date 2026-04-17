/**
 * VoltCore ERP - Enhanced Dark Theme Helpers
 * Professional dark mode utilities for consistent styling
 */

export const darkTheme = {
  // Base colors
  background: {
    primary: '#0a0d12',
    secondary: '#161c24',
    tertiary: '#1a2332',
    hover: '#1e2838',
  },
  
  // Text colors
  text: {
    primary: '#e2e8f0',
    secondary: '#8899aa',
    tertiary: '#5a6878',
    muted: '#3a4858',
  },
  
  // Border colors
  border: {
    light: '#1e252e',
    default: '#252e3a',
    medium: '#2e3a48',
    strong: '#3a4858',
  },
  
  // Brand colors
  brand: {
    primary: '#f5a623',
    primaryHover: '#e8891a',
    primaryDark: '#d97706',
    secondary: '#00d4ff',
    accent: '#a78bfa',
  },
  
  // Status colors
  status: {
    success: {
      bg: 'rgba(0, 230, 118, 0.15)',
      text: '#00e676',
      border: 'rgba(0, 230, 118, 0.3)',
      icon: '#00e676',
    },
    warning: {
      bg: 'rgba(255, 171, 64, 0.15)',
      text: '#ffab40',
      border: 'rgba(255, 171, 64, 0.3)',
      icon: '#ffab40',
    },
    error: {
      bg: 'rgba(255, 61, 61, 0.15)',
      text: '#ff3d3d',
      border: 'rgba(255, 61, 61, 0.3)',
      icon: '#ff3d3d',
    },
    info: {
      bg: 'rgba(0, 212, 255, 0.15)',
      text: '#00d4ff',
      border: 'rgba(0, 212, 255, 0.3)',
      icon: '#00d4ff',
    },
    purple: {
      bg: 'rgba(167, 139, 250, 0.15)',
      text: '#a78bfa',
      border: 'rgba(167, 139, 250, 0.3)',
      icon: '#a78bfa',
    },
  },
  
  // Component-specific colors
  card: {
    background: '#161c24',
    border: '#252e3a',
    shadow: 'rgba(0, 0, 0, 0.3)',
    shadowHover: 'rgba(0, 0, 0, 0.4)',
  },
  
  input: {
    background: '#1a2332',
    backgroundHover: '#1e2838',
    border: '#2e3a48',
    borderHover: '#3a4858',
    borderFocus: '#f5a623',
    focusShadow: 'rgba(245, 166, 35, 0.15)',
  },
  
  button: {
    primary: {
      background: 'linear-gradient(135deg, #f5a623 0%, #e8891a 100%)',
      backgroundHover: 'linear-gradient(135deg, #e8891a 0%, #d97706 100%)',
      text: '#000000',
      shadow: 'rgba(245, 166, 35, 0.3)',
      shadowHover: 'rgba(245, 166, 35, 0.4)',
    },
    secondary: {
      background: '#1a2332',
      backgroundHover: '#1e2838',
      text: '#8899aa',
      textHover: '#e2e8f0',
      border: '#2e3a48',
      borderHover: '#f5a623',
    },
    ghost: {
      background: 'transparent',
      backgroundHover: '#1a2332',
      text: '#8899aa',
      textHover: '#e2e8f0',
    },
  },
  
  table: {
    headerBg: '#1a2332',
    headerText: '#8899aa',
    rowBorder: '#1e252e',
    rowHover: '#1a2028',
    stripedBg: '#181f2a',
  },
  
  // Module-specific accent colors
  modules: {
    employees: '#f5a623',
    attendance: '#00e676',
    payroll: '#00d4ff',
    projects: '#a78bfa',
    safety: '#ff3d3d',
    inventory: '#ffab40',
    timesheet: '#00d4ff',
    shifts: '#a78bfa',
  },
};

// Helper function to get status styles
export function getStatusStyles(status: string) {
  const normalized = status.toLowerCase().replace(/[_\s-]/g, '');
  
  const statusMap: Record<string, any> = {
    active: darkTheme.status.success,
    present: darkTheme.status.success,
    completed: darkTheme.status.success,
    approved: darkTheme.status.success,
    ontrack: darkTheme.status.success,
    
    pending: darkTheme.status.warning,
    processing: darkTheme.status.warning,
    inprogress: darkTheme.status.warning,
    late: darkTheme.status.warning,
    atrisk: darkTheme.status.warning,
    
    inactive: darkTheme.status.error,
    absent: darkTheme.status.error,
    rejected: darkTheme.status.error,
    failed: darkTheme.status.error,
    delayed: darkTheme.status.error,
    separated: darkTheme.status.error,
    
    onleave: darkTheme.status.info,
    halfday: darkTheme.status.info,
    holiday: darkTheme.status.purple,
    noticeperiod: darkTheme.status.warning,
  };
  
  return statusMap[normalized] || {
    bg: 'rgba(136, 153, 170, 0.15)',
    text: '#8899aa',
    border: 'rgba(136, 153, 170, 0.3)',
    icon: '#8899aa',
  };
}

// Helper function for badge classes
export function getBadgeClass(variant: 'success' | 'warning' | 'error' | 'info' | 'purple' | 'default' = 'default') {
  const variants = {
    success: 'bg-[rgba(0,230,118,0.15)] text-[#00e676] border-[rgba(0,230,118,0.3)]',
    warning: 'bg-[rgba(255,171,64,0.15)] text-[#ffab40] border-[rgba(255,171,64,0.3)]',
    error: 'bg-[rgba(255,61,61,0.15)] text-[#ff3d3d] border-[rgba(255,61,61,0.3)]',
    info: 'bg-[rgba(0,212,255,0.15)] text-[#00d4ff] border-[rgba(0,212,255,0.3)]',
    purple: 'bg-[rgba(167,139,250,0.15)] text-[#a78bfa] border-[rgba(167,139,250,0.3)]',
    default: 'bg-[rgba(136,153,170,0.15)] text-[#8899aa] border-[rgba(136,153,170,0.3)]',
  };
  
  return variants[variant];
}

// Helper function for button classes
export function getButtonClass(variant: 'primary' | 'secondary' | 'ghost' = 'primary', size: 'sm' | 'md' | 'lg' = 'md') {
  const baseClass = 'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200';
  
  const variantClasses = {
    primary: 'bg-gradient-to-br from-[#f5a623] to-[#e8891a] text-black shadow-lg shadow-[rgba(245,166,35,0.3)] hover:from-[#e8891a] hover:to-[#d97706] hover:shadow-xl hover:shadow-[rgba(245,166,35,0.4)] hover:-translate-y-0.5 active:translate-y-0',
    secondary: 'bg-[#1a2332] text-[#8899aa] border-[1.5px] border-[#2e3a48] hover:text-[#e2e8f0] hover:border-[#f5a623] hover:bg-[#1e2838] hover:shadow-lg hover:shadow-[rgba(245,166,35,0.15)]',
    ghost: 'bg-transparent text-[#8899aa] hover:bg-[#1a2332] hover:text-[#e2e8f0]',
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  
  return `${baseClass} ${variantClasses[variant]} ${sizeClasses[size]}`;
}

// Helper function for input classes
export function getInputClass(hasError = false) {
  const baseClass = 'w-full bg-[#1a2332] border-[1.5px] rounded-lg px-3.5 py-2.5 text-[#e2e8f0] text-sm transition-all duration-200 outline-none placeholder:text-[#5a6878]';
  const normalClass = 'border-[#2e3a48] hover:border-[#3a4858] hover:bg-[#1e2838] focus:border-[#f5a623] focus:bg-[#1e2838] focus:shadow-[0_0_0_3px_rgba(245,166,35,0.15)]';
  const errorClass = 'border-[#ff3d3d] focus:border-[#ff3d3d] focus:shadow-[0_0_0_3px_rgba(255,61,61,0.15)]';
  
  return `${baseClass} ${hasError ? errorClass : normalClass}`;
}

// Helper function for card classes
export function getCardClass(hoverable = true) {
  const baseClass = 'bg-[#161c24] border border-[#252e3a] rounded-xl p-5 shadow-lg shadow-black/30';
  const hoverClass = hoverable ? 'transition-all duration-200 hover:shadow-xl hover:shadow-black/40 hover:-translate-y-0.5 hover:border-[#2e3a48]' : '';
  
  return `${baseClass} ${hoverClass}`;
}

// Helper to get module color
export function getModuleColor(module: string): string {
  const normalized = module.toLowerCase().replace(/[_\s-]/g, '');
  return darkTheme.modules[normalized as keyof typeof darkTheme.modules] || darkTheme.brand.primary;
}
