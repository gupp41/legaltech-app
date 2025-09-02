/**
 * Button Styling Utilities
 * Centralized button styling classes to reduce CSS duplication
 */

// ============================================================================
// BASE BUTTON STYLES
// ============================================================================

export const baseButtonStyles = {
  // Common base styles
  base: "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background",
  
  // Size variants
  sizes: {
    sm: "h-9 px-3 rounded-md",
    default: "h-10 py-2 px-4",
    lg: "h-11 px-8 rounded-md",
    xl: "h-12 px-10 rounded-lg",
    icon: "h-10 w-10"
  }
} as const

// ============================================================================
// BUTTON VARIANTS
// ============================================================================

export const buttonVariants = {
  // Primary buttons
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  primaryBlue: "bg-blue-600 text-white hover:bg-blue-700",
  primaryGreen: "bg-green-600 text-white hover:bg-green-700",
  primaryRed: "bg-red-600 text-white hover:bg-red-700",
  
  // Secondary buttons
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  secondaryGray: "bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700",
  
  // Outline buttons
  outline: "border border-input hover:bg-accent hover:text-accent-foreground",
  outlineBlue: "border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950",
  outlineGray: "border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800",
  
  // Ghost buttons
  ghost: "hover:bg-accent hover:text-accent-foreground",
  ghostBlue: "text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950",
  ghostGray: "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800",
  
  // Destructive buttons
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  destructiveOutline: "border border-destructive text-destructive hover:bg-destructive/10",
  
  // Link buttons
  link: "underline-offset-4 hover:underline text-primary",
  
  // Special buttons
  cta: "bg-white text-blue-600 hover:bg-gray-100 hover:text-blue-700 border-0 shadow-lg",
  ctaDark: "bg-blue-600 text-white hover:bg-blue-700 shadow-lg",
  floating: "fixed bottom-6 right-6 z-50 shadow-xl",
  
  // Status buttons
  success: "bg-green-600 text-white hover:bg-green-700",
  warning: "bg-yellow-600 text-white hover:bg-yellow-700",
  info: "bg-blue-600 text-white hover:bg-blue-700",
  error: "bg-red-600 text-white hover:bg-red-700"
} as const

// ============================================================================
// BUTTON COMPOSITION UTILITIES
// ============================================================================

/**
 * Compose button classes from base styles and variants
 */
export function composeButtonClasses(
  variant: keyof typeof buttonVariants,
  size: keyof typeof baseButtonStyles.sizes = 'default',
  additionalClasses: string = ''
): string {
  return [
    baseButtonStyles.base,
    baseButtonStyles.sizes[size],
    buttonVariants[variant],
    additionalClasses
  ].filter(Boolean).join(' ')
}

/**
 * Get button classes for common use cases
 */
export const commonButtonStyles = {
  // Navigation buttons
  navButton: composeButtonClasses('ghost', 'sm'),
  navButtonActive: composeButtonClasses('secondary', 'sm'),
  
  // Action buttons
  primaryAction: composeButtonClasses('primaryBlue', 'default'),
  secondaryAction: composeButtonClasses('outline', 'default'),
  destructiveAction: composeButtonClasses('destructive', 'default'),
  
  // Form buttons
  submitButton: composeButtonClasses('primaryBlue', 'lg'),
  cancelButton: composeButtonClasses('outline', 'default'),
  resetButton: composeButtonClasses('ghost', 'default'),
  
  // CTA buttons
  ctaButton: composeButtonClasses('cta', 'lg'),
  ctaButtonDark: composeButtonClasses('ctaDark', 'lg'),
  
  // Icon buttons
  iconButton: composeButtonClasses('ghost', 'icon'),
  iconButtonPrimary: composeButtonClasses('primary', 'icon'),
  
  // Status buttons
  successButton: composeButtonClasses('success', 'default'),
  warningButton: composeButtonClasses('warning', 'default'),
  errorButton: composeButtonClasses('error', 'default'),
  
  // Floating buttons
  floatingButton: composeButtonClasses('primary', 'icon', 'fixed bottom-6 right-6 z-50 shadow-xl'),
  
  // Mobile responsive buttons
  mobileButton: composeButtonClasses('primaryBlue', 'lg', 'w-full sm:w-auto'),
  mobileNavButton: composeButtonClasses('ghost', 'sm', 'w-full sm:w-auto')
} as const

// ============================================================================
// RESPONSIVE BUTTON UTILITIES
// ============================================================================

/**
 * Get responsive button classes
 */
export function getResponsiveButtonClasses(
  baseVariant: keyof typeof buttonVariants,
  size: keyof typeof baseButtonStyles.sizes = 'default',
  options: {
    fullWidthOnMobile?: boolean
    hideOnMobile?: boolean
    hideOnDesktop?: boolean
  } = {}
): string {
  const { fullWidthOnMobile = false, hideOnMobile = false, hideOnDesktop = false } = options
  
  const baseClasses = composeButtonClasses(baseVariant, size)
  const responsiveClasses = []
  
  if (fullWidthOnMobile) {
    responsiveClasses.push('w-full sm:w-auto')
  }
  
  if (hideOnMobile) {
    responsiveClasses.push('hidden sm:inline-flex')
  }
  
  if (hideOnDesktop) {
    responsiveClasses.push('sm:hidden')
  }
  
  return [baseClasses, ...responsiveClasses].filter(Boolean).join(' ')
}

// ============================================================================
// BUTTON GROUP UTILITIES
// ============================================================================

/**
 * Button group styles
 */
export const buttonGroupStyles = {
  container: "inline-flex rounded-md shadow-sm",
  button: "relative -ml-px first:ml-0 first:rounded-l-md last:rounded-r-md",
  buttonNotFirst: "rounded-l-none",
  buttonNotLast: "rounded-r-none",
  buttonMiddle: "rounded-none"
} as const

/**
 * Get button classes for button groups
 */
export function getButtonGroupClasses(
  variant: keyof typeof buttonVariants,
  size: keyof typeof baseButtonStyles.sizes = 'default',
  position: 'first' | 'middle' | 'last' | 'only' = 'only'
): string {
  const baseClasses = composeButtonClasses(variant, size)
  const groupClasses = []
  
  if (position === 'first') {
    groupClasses.push(buttonGroupStyles.buttonNotLast)
  } else if (position === 'last') {
    groupClasses.push(buttonGroupStyles.buttonNotFirst)
  } else if (position === 'middle') {
    groupClasses.push(buttonGroupStyles.buttonMiddle)
  }
  
  return [baseClasses, ...groupClasses].filter(Boolean).join(' ')
}

// ============================================================================
// ACCESSIBILITY UTILITIES
// ============================================================================

/**
 * Get accessible button props
 */
export function getAccessibleButtonProps(
  label: string,
  options: {
    disabled?: boolean
    loading?: boolean
    ariaDescribedBy?: string
  } = {}
) {
  const { disabled = false, loading = false, ariaDescribedBy } = options
  
  return {
    'aria-label': label,
    'aria-disabled': disabled || loading,
    'aria-describedby': ariaDescribedBy,
    disabled: disabled || loading,
    role: 'button'
  }
}

// ============================================================================
// EXPORT ALL UTILITIES
// ============================================================================

export const buttonUtils = {
  baseStyles: baseButtonStyles,
  variants: buttonVariants,
  common: commonButtonStyles,
  compose: composeButtonClasses,
  responsive: getResponsiveButtonClasses,
  group: {
    styles: buttonGroupStyles,
    getClasses: getButtonGroupClasses
  },
  accessibility: getAccessibleButtonProps
} as const
