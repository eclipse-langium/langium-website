/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { AstNode } from "langium";
import { AstNodeLocator } from "langium/lib/workspace/ast-node-locator";

/**
 * Represents a serialized version of a reference to an AstNode
 */
export interface Reference<T extends AstNode = AstNode> {
  ref?: T;
  $ref: string
}

export interface ValueNodeBase {
  kind: "object" | "array" | "string" | "boolean" | "number" | "reference" | "undefined";
}
export interface ObjectValueNode extends ValueNodeBase {
  kind: "object";
  properties: PropertyNode[];
}

export interface UndefinedValueNode extends ValueNodeBase {
  kind: "undefined";
}

export interface ReferenceValueNode extends ValueNodeBase {
  kind: "reference";
  $text: string;
}
export type PrimitiveValueKindMapping = {
  string: string;
  boolean: boolean;
  number: number;
};
export interface PrimitiveValueNode<T extends "number" | "string" | "boolean">
  extends ValueNodeBase {
  kind: T;
  value: PrimitiveValueKindMapping[T];
}

export interface ArrayValueNode extends ValueNodeBase {
  kind: "array";
  children: ValueNode[];
}

export type ValueNode =
  | ObjectValueNode
  | ArrayValueNode
  | PrimitiveValueNode<"boolean">
  | PrimitiveValueNode<"number">
  | PrimitiveValueNode<"string">
  | ReferenceValueNode
  | UndefinedValueNode;

export interface PropertyNode {
  name: string;
  type: ValueNode;
}
export function preprocessAstNodeValue(
  valueOrValues:
    | AstNode
    | AstNode[]
    | string
    | number
    | boolean
    | Reference
    | undefined,
  locator: AstNodeLocator
): ValueNode {
  if (Array.isArray(valueOrValues)) {
    return preprocessArrayType(valueOrValues, locator);
  } else if (typeof valueOrValues === "object" || typeof valueOrValues === "undefined") {
    if(!valueOrValues) {
      return {kind: "undefined"};
    } else if ("$ref" in valueOrValues) {
      return preprocessReferenceNode(valueOrValues, locator);
    }
    return preprocessAstNodeObject(valueOrValues, locator);
  } else if (typeof valueOrValues === "string") {
    return {
      kind: "string",
      value: valueOrValues,
    } as ValueNode;
  } else if (typeof valueOrValues === "number") {
    return {
      kind: "number",
      value: valueOrValues,
    } as ValueNode;
  } else {
    return {
      kind: "boolean",
      value: valueOrValues,
    };
  }
}
export function preprocessAstNodeObject(
  node: AstNode,
  locator: AstNodeLocator
): ObjectValueNode {
  const properties: PropertyNode[] = Object.keys(node)
    .filter((n) => !n.startsWith("$"))
    .map((n) => {
      const valueOrValues = node[n] as
        | AstNode
        | AstNode[]
        | "string"
        | "number"
        | "boolean"
        | Reference;
      return {
        name: n,
        type: preprocessAstNodeValue(valueOrValues, locator),
      } as PropertyNode;
    });
  return {
    kind: "object",
    properties: [
      {
        name: "$type",
        type: {
          kind: "string",
          value: node.$type,
        },
      },
      ...properties,
    ],
  };
}

export function preprocessReferenceNode(
  node: Reference<AstNode>,
  locator: AstNodeLocator
): ReferenceValueNode {
  // check to display a valid reference, when present
  return node.$ref
    ? {
        kind: "reference",
        $text: node.$ref
      }
    : {
        kind: "reference",
        $text: "???",
      };
}

export function preprocessArrayType(
  nodes: AstNode[],
  locator: AstNodeLocator
): ArrayValueNode {
  const children = nodes.map((n) => preprocessAstNodeValue(n, locator));
  return {
    kind: "array",
    children,
  };
}
