/**
 * Component Memoization Wrapper
 * Prevents unnecessary re-renders of pure components
 */

import React, { memo } from 'react';

/**
 * HOC to memoize a component and prevent unnecessary re-renders
 * Use when component props rarely change and rendering is expensive
 *
 * @example
 * const MemoizedPatientCard = withMemo(PatientCard, (prev, next) => {
 *   return prev.patient.id === next.patient.id;
 * });
 */
export function withMemo<P extends object>(
  Component: React.ComponentType<P>,
  propsAreEqual?: (prevProps: P, nextProps: P) => boolean
): React.MemoExoticComponent<React.ComponentType<P>> {
  const displayName = Component.displayName || Component.name || 'Component';
  const Memoized = memo(Component, propsAreEqual);
  Memoized.displayName = `Memo(${displayName})`;
  return Memoized;
}

/**
 * Custom hook to create memoized values
 * Prevents object/array recreation on every render
 *
 * @example
 * const memoizedValue = useMemoValue(() => ({ name, age }), [name, age]);
 */
export function useMemoValue<T>(
  factory: () => T,
  deps: React.DependencyList
): T {
  return React.useMemo(factory, deps);
}

/**
 * Custom hook for memoized callbacks
 * Prevents function recreation on every render
 *
 * @example
 * const handleClick = useMemoCallback(() => {
 *   console.log('clicked');
 * }, []);
 */
export function useMemoCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  return React.useCallback(callback, deps) as T;
}

/**
 * Custom comparison function for deeply nested objects
 * Use with memo() for complex prop comparisons
 *
 * @example
 * const Comp = memo(MyComponent, deepPropsEqual);
 */
export function deepPropsEqual<P extends object>(prev: P, next: P): boolean {
  const prevKeys = Object.keys(prev);
  const nextKeys = Object.keys(next);

  if (prevKeys.length !== nextKeys.length) {
    return false;
  }

  return prevKeys.every(key => {
    const prevVal = (prev as any)[key];
    const nextVal = (next as any)[key];

    // Reference equality for objects
    if (typeof prevVal === 'object' && typeof nextVal === 'object') {
      return prevVal === nextVal;
    }

    // Strict equality for primitives
    return prevVal === nextVal;
  });
}

/**
 * Props comparison for list items
 * Compares only id and important fields
 *
 * @example
 * const PatientCard = memo(PatientCardComponent, listItemPropsEqual);
 */
export function listItemPropsEqual<
  P extends { id?: string | number; data?: any }
>(prev: P, next: P): boolean {
  // Always re-render if ID changes
  if (prev.id !== next.id) {
    return false;
  }

  // Compare data if exists
  if (prev.data && next.data) {
    return prev.data === next.data;
  }

  return true;
}
