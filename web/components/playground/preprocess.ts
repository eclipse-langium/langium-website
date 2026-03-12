/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { AstNode, AstNodeLocator } from 'langium';

export interface Reference<T extends AstNode = AstNode> {
  ref?: T;
  $ref: string;
}

export interface ValueNodeBase {
  kind: 'object' | 'array' | 'string' | 'boolean' | 'number' | 'reference' | 'undefined';
}
export interface ObjectValueNode extends ValueNodeBase { kind: 'object'; properties: PropertyNode[]; }
export interface UndefinedValueNode extends ValueNodeBase { kind: 'undefined'; }
export interface ReferenceValueNode extends ValueNodeBase { kind: 'reference'; $text: string; }
export type PrimitiveValueKindMapping = { string: string; boolean: boolean; number: number; };
export interface PrimitiveValueNode<T extends 'number' | 'string' | 'boolean'> extends ValueNodeBase { kind: T; value: PrimitiveValueKindMapping[T]; }
export interface ArrayValueNode extends ValueNodeBase { kind: 'array'; children: ValueNode[]; }

export type ValueNode =
  | ObjectValueNode | ArrayValueNode
  | PrimitiveValueNode<'boolean'> | PrimitiveValueNode<'number'> | PrimitiveValueNode<'string'>
  | ReferenceValueNode | UndefinedValueNode;

export interface PropertyNode { name: string; type: ValueNode; }

export type AstValue = AstNode | AstNode[] | string | number | boolean | Reference | undefined;

export function preprocessAstNodeValue(valueOrValues: AstValue, locator: AstNodeLocator): ValueNode {
  if (Array.isArray(valueOrValues)) return preprocessArrayType(valueOrValues, locator);
  if (typeof valueOrValues === 'object' || typeof valueOrValues === 'undefined') {
    if (!valueOrValues) return { kind: 'undefined' };
    if ('$ref' in valueOrValues) return preprocessReferenceNode(valueOrValues, locator);
    return preprocessAstNodeObject(valueOrValues, locator);
  }
  if (typeof valueOrValues === 'string') return { kind: 'string', value: valueOrValues } as ValueNode;
  if (typeof valueOrValues === 'number') return { kind: 'number', value: valueOrValues } as ValueNode;
  return { kind: 'boolean', value: valueOrValues };
}

export function preprocessAstNodeObject(node: AstNode, locator: AstNodeLocator): ObjectValueNode {
  const properties: PropertyNode[] = Object.keys(node)
    .filter((n) => !n.startsWith('$'))
    .map((n) => ({
      name: n,
      type: preprocessAstNodeValue(((node as any)[n]) as AstValue, locator),
    }));
  return {
    kind: 'object',
    properties: [{ name: '$type', type: { kind: 'string', value: node.$type } }, ...properties],
  };
}

export function preprocessReferenceNode(node: Reference<AstNode>, _locator: AstNodeLocator): ReferenceValueNode {
  return node.$ref ? { kind: 'reference', $text: node.$ref } : { kind: 'reference', $text: '???' };
}

export function preprocessArrayType(nodes: AstNode[], locator: AstNodeLocator): ArrayValueNode {
  return { kind: 'array', children: nodes.map((n) => preprocessAstNodeValue(n, locator)) };
}
