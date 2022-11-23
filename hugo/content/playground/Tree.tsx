import { AstNode, Reference } from "langium";
import React from "react";

export function render(root: AstNode) {
  const location = document.getElementById("syntax-tree")!;
  const data = preprocessAstNode(root);
  window['ReactDOM'].createRoot(location).render(<Tree root={data} />);
}

interface TreeProps {
  root: TypeNode;
}

const Tree = ({ root }: TreeProps) => {
  const [open, setOpen] = window['React'].useState(true);
  switch (root.kind) {
    case "boolean":
    case "number":
    case "string":
      return (
        <>
          <span className="colon">:&nbsp;</span>
          <span className="type">{root.kind}</span>
          <span className="equal">&nbsp;=&nbsp;</span>
          <span className="literal">
            {root.kind === "string" ? '"' + root.value + '"' : root.value}
          </span>
        </>
      );
    case "object":
      return (
        <>
          <span className="value" onClick={() => setOpen((prev) => !prev)}>
            <span className="type">{root.$type}</span>
          </span>
          {open && (
            <>
              <span className="opening-brace">(</span>
              <ul className="value-body">
                {root.properties.map((p, index) => (
                  <TreeItem key={index} name={p.name} root={p.type} />
                ))}
              </ul>
              <div className="closing-brace">)</div>
            </>
          )}
        </>
      );
    case "array":
      return (
        <>
          <span className="colon">:&nbsp;</span>
          <span className="opening-brace">[</span>
          <ul className="value-body">
            {root.children.map((c, index) => (
              <TreeItem key={index} root={c} />
            ))}
          </ul>
          <div className="closing-brace">]</div>
        </>
      );
    case "reference":
      return (
        <>
          <span className="colon">:&nbsp;</span>
          <span className="link">{root.type.$type}</span>
        </>
      );
  }
  return <div>???</div>;
};

const TreeItem = ({ root, name }: TreeProps & { name?: string }) => {
  const [open, setOpen] = window['React'].useState(true);
  return (
    <li className={"entry toggable"}>
      {name && (
        <span className="value" onClick={() => setOpen((prev) => !prev)}>
          <span className="property">{name}</span>
        </span>
      )}
      {open && <Tree root={root} />}
    </li>
  );
};

export interface TypeNodeBase {
  kind: "object" | "array" | "string" | "boolean" | "number" | "reference";
}
export interface SimpleType extends TypeNodeBase {
  kind: "object";
  $type: string;
  properties: PropertyNode[];
}
export interface ReferenceType extends TypeNodeBase {
  kind: "reference";
  $text: string;
  type: SimpleType;
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

export function preprocessAstNode(node: AstNode): SimpleType {
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
      if (Array.isArray(valueOrValues)) {
        return {
          name: n,
          type: preprocessArrayType(valueOrValues),
        } as PropertyNode;
      } else if (typeof valueOrValues === "object") {
        if ("$refText" in valueOrValues) {
          return {
            name: n,
            type: preprocessReferenceNode(valueOrValues),
          } as PropertyNode;
        }
        return {
          name: n,
          type: preprocessAstNode(valueOrValues),
        } as PropertyNode;
      } else if (typeof valueOrValues === "string") {
        return {
          name: n,
          type: {
            kind: "string",
            value: valueOrValues,
          },
        } as PropertyNode;
      } else if (typeof valueOrValues === "number") {
        return {
          name: n,
          type: {
            kind: "number",
            value: valueOrValues,
          },
        } as PropertyNode;
      } else {
        return {
          name: n,
          type: {
            kind: "boolean",
            value: valueOrValues,
          },
        } as PropertyNode;
      }
    });
  return {
    kind: "object",
    $type: node.$type,
    properties,
  };
}

export function preprocessReferenceNode(
  node: Reference<AstNode>
): ReferenceType {
  return {
    kind: "reference",
    $text: node.$refText,
    type: preprocessAstNode(node.ref!),
  };
}

export function preprocessArrayType(nodes: AstNode[]): ArrayType {
  const children = nodes.map(preprocessAstNode);
  return {
    kind: "array",
    children,
  };
}
