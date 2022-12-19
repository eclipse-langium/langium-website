/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { AstNode, Reference } from "langium";
import { AstNodeLocator } from "langium/lib/workspace/ast-node-locator";

export interface TypeNodeBase {
  kind: "object" | "array" | "string" | "boolean" | "number" | "reference";
}
export interface SimpleType extends TypeNodeBase {
  kind: "object";
  properties: PropertyNode[];
}
export interface ReferenceType extends TypeNodeBase {
  kind: "reference";
  $text: string;
  type?: SimpleType;
}
export type PrimitiveMapping = {
  string: string;
  boolean: boolean;
  number: number;
};
export interface PrimitiveType<T extends "number" | "string" | "boolean">
  extends TypeNodeBase {
  kind: T;
  value: PrimitiveMapping[T];
}

export interface ArrayType extends TypeNodeBase {
  kind: "array";
  children: TypeNode[];
}

export type TypeNode =
  | SimpleType
  | ArrayType
  | PrimitiveType<"boolean">
  | PrimitiveType<"number">
  | PrimitiveType<"string">
  | ReferenceType;

export interface PropertyNode {
  name: string;
  type: TypeNode;
}

export function preprocessAstNodeValue(valueOrValues: AstNode
  | AstNode[]
  | "string"
  | "number"
  | "boolean"
  | Reference, locator: AstNodeLocator): TypeNode {
  if (Array.isArray(valueOrValues)) {
    return preprocessArrayType(valueOrValues, locator);
  } else if (typeof valueOrValues === "object") {
    if (valueOrValues && "$refText" in valueOrValues) {
      return preprocessReferenceNode(valueOrValues, locator);
    }
    return preprocessAstNodeObject(valueOrValues, locator);
  } else if (typeof valueOrValues === "string") {
    return {
      kind: "string",
      value: valueOrValues,
    } as TypeNode;
  } else if (typeof valueOrValues === "number") {
    return {
        kind: "number",
        value: valueOrValues,
      } as TypeNode;
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
): SimpleType {
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
          type: preprocessAstNodeValue(valueOrValues, locator)
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
): ReferenceType {
  return node.ref ? {
    kind: "reference",
    $text: locator.getAstNodePath(node.ref!),
    type: preprocessAstNodeObject(node.ref!, locator),
  } : {
    kind: "reference",
    $text: "???"
  };
}

export function preprocessArrayType(
  nodes: AstNode[],
  locator: AstNodeLocator
): ArrayType {
  const children = nodes.map((n) => preprocessAstNodeValue(n, locator));
  return {
    kind: "array",
    children
  };
}
