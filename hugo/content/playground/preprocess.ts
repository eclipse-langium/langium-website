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
/*
Data example:
{
  "nodes": [
    {"id": "Myriel", "group": 1},
    {"id": "Napoleon", "group": 1},
    {"id": "Mlle.Baptistine", "group": 1},
    {"id": "Mme.Magloire", "group": 1},
  }
}
*/
export function preprocessAstNodeToForceGraphData(
  node: ValueNode,
): any {
  const nodes: ForceGraphNode[] = [];

  Object.keys(node)
    .filter((n) => !n.startsWith("$"))
    .forEach((n) => {
      const valueOrValues = node[n] as
        | AstNode
        | AstNode[]
        | "string"
        | "number"
        | "boolean"
        | Reference;
      if (Array.isArray(valueOrValues)) {
        valueOrValues.forEach((v) => {
          if (typeof v === "object" && v !== null) {
            nodes.push({
              id: n,
              group: 1,
            });
          }
        });
      } else if (typeof valueOrValues === "object" && valueOrValues !== null) {
        nodes.push({
          id: n,
          group: 1,
        });
      }
    });

  return {
    nodes: nodes,
    links: [],
  };
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

/**
 * Produces an arbitrary (but deterministic) hex string from a given input string.
 * Used to map a given AST node to some color
 * 
 * @param v Value to convert to a hex color string
 * @returns A hex color string, #xxxxxx
 */
export function toHex(v: string): string {
  let hash = toHash(v);
  let rand = sfc32(hash, hash >> 2, hash << 2, hash & hash);
  // get 6 random characters
  let hex = '#';
  for (let i = 0; i < 6; i++) {
      hex += Math.floor(rand() * 100000 % 10);
  }
  return hex;
}

/**
* SFC32 (Simple Fast Counter PRNG)
* Produces a seeded function that returns pseudo-random numbers
*
* @param a 1st byte of seed
* @param b 2nd byte of seed
* @param c 3rd byte of seed
* @param d 4th byte of seed
* @returns A pseudo-random function generator, seeded using the given values
*/
function sfc32(a: number, b: number, c: number, d: number): () => number {
  return function() {
    // right shift assign all values
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ b >>> 9;
    b = c + (c << 3) | 0;
    c = c << 21 | c >>> 11;
    d = d + 1 | 0;
    t = t + d | 0;
    c = c + t | 0;
    return (t >>> 0) / 4294967296;
  }
}

/**
 * Produces a simple hash code for a given string
 * 
 * @param v String to convert to a hash code
 * @returns Numeric hash code
 */
function toHash(v: string): number {
  let hash = 0;
  for (let i = 0; i < v.length; i++) {
      const n = v.codePointAt(i) as number;
      hash = (hash << 2) - hash + n;
  }
  return hash;
}