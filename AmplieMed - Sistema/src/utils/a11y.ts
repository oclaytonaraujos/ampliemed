/**
 * Accessibility (ARIA) utilities and helpers
 * Ensures components are accessible to screen readers and keyboard navigation
 */

import type { ReactNode } from 'react';

export interface AriaProps {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  'aria-required'?: boolean;
  'aria-disabled'?: boolean;
  'aria-checked'?: boolean;
  'aria-expanded'?: boolean;
  'aria-hidden'?: boolean;
  role?: string;
  tabIndex?: number;
}

/**
 * Button accessibility props
 */
export const buttonA11y = {
  /**
   * Primary action button (e.g., "Submit")
   */
  primary: (label: string): AriaProps => ({
    'aria-label': label,
    role: 'button',
    tabIndex: 0,
  }),

  /**
   * Icon-only button (must have aria-label)
   */
  icon: (label: string): AriaProps => ({
    'aria-label': label,
    'aria-hidden': 'false',
  }),

  /**
   * Disabled button state
   */
  disabled: (): AriaProps => ({
    'aria-disabled': true,
  }),
};

/**
 * Form field accessibility props
 */
export const formA11y = {
  /**
   * Text input field
   */
  textInput: (label: string, error?: string): AriaProps => ({
    'aria-label': label,
    'aria-invalid': !!error,
    'aria-describedby': error ? `${label}-error` : undefined,
    required: true,
  }),

  /**
   * Checkbox input
   */
  checkbox: (label: string, checked: boolean): AriaProps => ({
    'aria-label': label,
    'aria-checked': checked,
    role: 'checkbox',
  }),

  /**
   * Select dropdown
   */
  select: (label: string): AriaProps => ({
    'aria-label': label,
    role: 'combobox',
  }),

  /**
   * Textarea field
   */
  textarea: (label: string, error?: string): AriaProps => ({
    'aria-label': label,
    'aria-invalid': !!error,
    'aria-describedby': error ? `${label}-error` : undefined,
  }),
};

/**
 * Navigation and landmark accessibility
 */
export const navigationA11y = {
  /**
   * Main navigation
   */
  nav: (): AriaProps => ({
    role: 'navigation',
    'aria-label': 'Main navigation',
  }),

  /**
   * Sidebar navigation
   */
  sidebar: (): AriaProps => ({
    role: 'navigation',
    'aria-label': 'Sidebar',
  }),

  /**
   * Breadcrumb navigation
   */
  breadcrumb: (): AriaProps => ({
    role: 'navigation',
    'aria-label': 'Breadcrumb',
  }),

  /**
   * Tab navigation
   */
  tabs: (): AriaProps => ({
    role: 'tablist',
  }),

  tab: (selected: boolean, label: string): AriaProps => ({
    role: 'tab',
    'aria-selected': selected,
    'aria-label': label,
    tabIndex: selected ? 0 : -1,
  }),
};

/**
 * Dialog/Modal accessibility
 */
export const dialogA11y = {
  /**
   * Modal dialog
   */
  modal: (title: string): AriaProps => ({
    role: 'dialog',
    'aria-modal': true,
    'aria-labelledby': `${title}-title`,
  }),

  /**
   * Alert dialog
   */
  alert: (message: string): AriaProps => ({
    role: 'alertdialog',
    'aria-label': message,
  }),
};

/**
 * Live region for dynamic content updates
 */
export const liveRegionA11y = {
  /**
   * Polite live region (waits for pause to announce)
   */
  polite: (label: string): AriaProps => ({
    role: 'status',
    'aria-live': 'polite',
    'aria-label': label,
  }),

  /**
   * Assertive live region (announces immediately)
   */
  assertive: (label: string): AriaProps => ({
    role: 'alert',
    'aria-live': 'assertive',
    'aria-label': label,
  }),
};

/**
 * List accessibility
 */
export const listA11y = {
  /**
   * Unordered list
   */
  ul: (): AriaProps => ({
    role: 'list',
  }),

  /**
   * Ordered list
   */
  ol: (): AriaProps => ({
    role: 'list',
  }),

  /**
   * List item
   */
  li: (label?: string): AriaProps => ({
    role: 'listitem',
    'aria-label': label,
  }),
};

/**
 * Skip navigation link
 * @example
 * <a href="#main-content" {...skipLink()}>Skip to main content</a>
 */
export function skipLink(): AriaProps & { style: React.CSSProperties } {
  return {
    style: {
      position: 'absolute',
      top: -40,
      left: 0,
      background: '#000',
      color: '#fff',
      padding: '8px',
      zIndex: 100,
    },
    tabIndex: 0,
  };
}

/**
 * Announce content to screen readers
 * @param message The message to announce
 * @param priority 'polite' or 'assertive'
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const div = document.createElement('div');
  div.setAttribute('role', 'status');
  div.setAttribute('aria-live', priority);
  div.setAttribute('aria-atomic', 'true');
  div.style.position = 'absolute';
  div.style.left = '-10000px';
  div.textContent = message;

  document.body.appendChild(div);

  setTimeout(() => {
    document.body.removeChild(div);
  }, 1000);
}

/**
 * Returns proper keyboard handler for custom button-like elements
 */
export function createKeyboardHandler(
  handler: () => void,
  keys: ('Enter' | 'Space')[] = ['Enter', 'Space']
) {
  return (event: React.KeyboardEvent) => {
    if (keys.includes(event.key as any)) {
      event.preventDefault();
      handler();
    }
  };
}
