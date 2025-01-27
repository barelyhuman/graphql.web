import { TypeNode, ValueNode } from './ast';
import { Kind } from './kind';
import { Maybe } from './types';

export function valueFromASTUntyped(
  node: ValueNode,
  variables?: Maybe<Record<string, any>>,
): unknown {
  switch (node.kind) {
    case Kind.NULL:
      return null;
    case Kind.INT:
      return parseInt(node.value, 10);
    case Kind.FLOAT:
      return parseFloat(node.value);
    case Kind.STRING:
    case Kind.ENUM:
    case Kind.BOOLEAN:
      return node.value;
    case Kind.LIST: {
      const values: unknown[] = [];
      for (const value of node.values)
        values.push(valueFromASTUntyped(value, variables));
      return values;
    }
    case Kind.OBJECT: {
      const obj = Object.create(null);
      for (const field of node.fields)
        obj[field.name.value] = valueFromASTUntyped(field.value, variables);
      return obj;
    }
    case Kind.VARIABLE:
      return variables && variables[node.name.value];
  }
}

export function valueFromTypeNode(
  node: ValueNode,
  type: TypeNode,
  variables?: Maybe<Record<string, any>>,
): unknown {
  if (node.kind === Kind.VARIABLE) {
    const variableName = node.name.value;
    return variables
      ? valueFromTypeNode(variables[variableName], type, variables)
      : undefined;
  } else if (type.kind === Kind.NON_NULL_TYPE) {
    return node.kind !== Kind.NULL
      ? valueFromTypeNode(node, type, variables)
      : undefined
  } else if (node.kind === Kind.NULL) {
    return null;
  } else if (type.kind === Kind.LIST_TYPE) {
    if (node.kind === Kind.LIST) {
      const values: unknown[] = [];
      for (const value of node.values) {
        const coerced = valueFromTypeNode(value, type.type, variables);
        if (coerced === undefined) {
          return undefined;
        } else {
          values.push(coerced);
        }
      }
      return values;
    }
  } else if (type.kind === Kind.NAMED_TYPE) {
    switch (type.name.value) {
      case 'Int':
      case 'Float':
      case 'String':
      case 'Bool':
        return type.name.value + 'Value' === node.kind
          ? valueFromASTUntyped(node, variables)
          : undefined;
      default:
        return valueFromASTUntyped(node, variables);
    }
  }
}
