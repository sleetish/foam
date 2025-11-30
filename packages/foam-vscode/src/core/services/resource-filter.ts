import { negate } from 'lodash';
import { Resource } from '../model/note';
import { Logger } from '../utils/log';

export interface FilterDescriptor
  extends FilterDescriptorOp,
    FilterDescriptorParam {}

interface FilterDescriptorOp {
  and?: FilterDescriptor[];
  or?: FilterDescriptor[];
  not?: FilterDescriptor;
}

interface FilterDescriptorParam {
  /**
   * A regex of the path to include
   */
  path?: string;

  /**
   * A tag
   */
  tag?: string;

  /**
   * A note type
   */
  type?: string;

  /**
   * The title of the note
   */
  title?: string;

  /**
   * An expression to evaluate to JS, use `resource` to reference the resource object.
   * Only simple property access and comparison expressions are supported for security.
   * Example: 'resource.type === "note"' or 'resource.title !== "draft"'
   */
  expression?: string;
}

type ResourceFilter = (r: Resource) => boolean;

/**
 * Validates and parses a safe expression.
 * Only allows simple expressions in the format:
 * - resource.property === "value"
 * - resource.property !== "value"
 * - resource.property.subproperty === "value"
 *
 * @param expression The expression to validate
 * @returns A function that evaluates the expression safely, or undefined if invalid
 */
function createSafeExpressionEvaluator(
  expression: string
): ((resource: Resource) => boolean) | undefined {
  // Pattern for safe expressions: resource.property[.subproperty] operator "value"
  // Supports ===, !==, ==, != operators
  const safeExpressionPattern =
    /^\s*resource\.([\w.]+)\s*(===|!==|==|!=)\s*"([^"\\]*(?:\\.[^"\\]*)*)"\s*$/;

  const match = expression.match(safeExpressionPattern);
  if (!match) {
    Logger.warn(
      `Filter expression "${expression}" does not match safe expression pattern. ` +
        `Only expressions like 'resource.property === "value"' are allowed.`
    );
    return undefined;
  }

  const [, propertyPath, operator, value] = match;
  const properties = propertyPath.split('.');

  // Disallow access to potentially dangerous properties
  const dangerousProperties = [
    'constructor',
    '__proto__',
    'prototype',
    'toString',
    'valueOf',
  ];
  if (properties.some(prop => dangerousProperties.includes(prop))) {
    Logger.warn(`Filter expression contains disallowed property access.`);
    return undefined;
  }

  return (resource: Resource): boolean => {
    let current: unknown = resource;

    for (const prop of properties) {
      if (current === null || current === undefined) {
        return false;
      }
      // Safe property access on unknown type
      current = (current as Record<string, unknown>)[prop];
    }

    // Convert to string for comparison (handles undefined and other types)
    const resourceValue = String(current ?? '');
    const compareValue = value.replace(/\\"/g, '"'); // Unescape quotes

    switch (operator) {
      case '===':
      case '==':
        return resourceValue === compareValue;
      case '!==':
      case '!=':
        return resourceValue !== compareValue;
      default:
        return false;
    }
  };
}

export function createFilter(
  filter: FilterDescriptor,
  enableCode: boolean
): ResourceFilter {
  filter = filter ?? {};
  const expressionFn =
    enableCode && filter.expression
      ? createSafeExpressionEvaluator(filter.expression)
      : undefined;
  return resource => {
    if (expressionFn && !expressionFn(resource)) {
      return false;
    }
    if (filter.path && !resource.uri.path.match(filter.path)) {
      return false;
    }
    if (filter.type && resource.type !== filter.type) {
      return false;
    }
    if (filter.title && !resource.title.match(filter.title)) {
      return false;
    }
    if (filter.and) {
      return filter.and
        .map(pred => createFilter(pred, enableCode))
        .every(fn => fn(resource));
    }
    if (filter.or) {
      return filter.or
        .map(pred => createFilter(pred, enableCode))
        .some(fn => fn(resource));
    }
    if (filter.not) {
      return negate(createFilter(filter.not, enableCode))(resource);
    }
    return true;
  };
}
