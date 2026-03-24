/**
 * JSDoc Documentation Best Practices
 * Templates and examples for consistent code documentation
 */

/**
 * COMPONENT DOCUMENTATION TEMPLATE
 *
 * Use this template for all React components:
 *
 * @component
 * A brief one-line description of what the component does
 *
 * @description
 * A more detailed multi-line description explaining the component's
 * purpose, behavior, and relationship to other components
 *
 * @example
 * ```tsx
 * <YourComponent
 *   title="Example"
 *   onSubmit={handleSubmit}
 * />
 * ```
 *
 * @param {YourProps} props - The component props
 * @param {string} props.title - The title to display
 * @param {(data: any) => void} props.onSubmit - Callback when submitted
 *
 * @returns {React.ReactElement} The rendered component
 *
 * @throws {Error} When required prop is missing
 *
 * @see {@link RelatedComponent} for related functionality
 */

/**
 * HOOK DOCUMENTATION TEMPLATE
 *
 * Use this template for custom React hooks:
 *
 * @hook
 * A brief description of what the hook does
 *
 * @description
 * Detailed description of the hook's behavior and side effects
 *
 * @param {string} initialValue - Description of first parameter
 * @param {Object} options - Optional configuration object
 * @param {number} options.delay - Delay in milliseconds
 *
 * @returns {Object} The hook return value
 * @returns {any} return.data - The current data
 * @returns {(val: any) => void} return.setData - Function to update data
 * @returns {boolean} return.loading - Loading state
 *
 * @example
 * ```tsx
 * const { data, setData, loading } = useCustomHook('initial', { delay: 300 });
 * ```
 */

/**
 * UTILITY FUNCTION DOCUMENTATION TEMPLATE
 *
 * Use this template for utility/helper functions:
 *
 * A brief description of what the function does
 *
 * @param {string} input - Description of first parameter
 * @param {Object} options - Optional parameters
 * @param {boolean} [options.flag=false] - Optional flag parameter
 *
 * @returns {Promise<string>} Description of return value
 *
 * @throws {Error} When something goes wrong
 *
 * @example
 * ```ts
 * const result = await processData(input, { flag: true });
 * console.log(result);
 * ```
 *
 * @see {@link relatedFunction} for related functionality
 * @link https://example.com Documentation link
 */

/**
 * COMMON DOCSTRING PATTERNS
 */

// Pattern 1: Optional parameters with defaults
/**
 * @param {string} [name] - Optional name parameter
 * @param {string} [name='Default'] - Optional with default value
 */

// Pattern 2: Union types
/**
 * @param {'small' | 'medium' | 'large'} size - Size variant
 * @param {string | number | boolean} value - Multiple types
 */

// Pattern 3: Arrays
/**
 * @param {Array<string>} items - Array of strings
 * @param {string[]} tags - Alternative array syntax
 */

// Pattern 4: Function parameters
/**
 * @param {(event: Event) => void} onSubmit - Event handler function
 * @param {(data: any) => Promise<void>} asyncHandler - Async handler
 */

// Pattern 5: Complex objects
/**
 * @param {Object} config - Configuration object
 * @param {string} config.name - Name field
 * @param {number} config.value - Value field
 * @param {Array<{id: string, label: string}>} config.items - Array of items
 */

// Pattern 6: Deprecation warning
/**
 * @deprecated Use {@link newFunction} instead
 * This function is deprecated and will be removed in v3.0
 */

// Pattern 7: Type definitions
/**
 * @typedef {Object} Patient
 * @property {string} id - Patient ID
 * @property {string} name - Patient name
 * @property {number} age - Patient age
 */

// Pattern 8: Component props type
/**
 * @typedef {Object} ButtonProps
 * @property {string} label - Button label
 * @property {() => void} onClick - Click handler
 * @property {'primary' | 'secondary'} [variant='primary'] - Button variant
 * @property {boolean} [disabled=false] - Disabled state
 */

/**
 * DOCUMENTATION CHECKLIST
 * 
 * For Components:
 * - [ ] Component purpose and description
 * - [ ] @param for each prop
 * - [ ] @returns statement
 * - [ ] @example usage
 * - [ ] @throws for error conditions
 * - [ ] @see for related components
 * 
 * For Hooks:
 * - [ ] Hook purpose
 * - [ ] @param for each parameter
 * - [ ] @returns with all returned properties
 * - [ ] @example usage
 * - [ ] Dependencies documented
 * 
 * For Functions:
 * - [ ] Function purpose
 * - [ ] @param for each parameter
 * - [ ] @returns with type
 * - [ ] @throws for exceptions
 * - [ ] @example usage
 * - [ ] Side effects documented
 */
