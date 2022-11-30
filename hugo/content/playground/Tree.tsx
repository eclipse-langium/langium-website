/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

 import { AstNode } from "langium";
import React, { FC, useState } from "react";
import * as ReactDOM from "react-dom/client";
import { preprocessAstNode, TypeNode } from "./preprocess";
import { clsx } from "clsx";

export function render(root: AstNode) {
  const location = document.getElementById("syntax-tree")!;
  const data = preprocessAstNode(root);
  ReactDOM.createRoot(location).render(<Tree root={data} />);
}

interface TreeProps {
  root: TypeNode;
  className?: string;
}

const Tree: FC<TreeProps> = ({ root, className }) => {
  const [open, setOpen] = useState(true);
  switch (root.kind) {
    case "boolean":
    case "number":
    case "string":
      return (
        <span className={className}>
          <span className="colon">:&nbsp;</span>
          <span className="type">{root.kind}</span>
          <span className="equal">&nbsp;=&nbsp;</span>
          <span className="literal">
            {root.kind === "string" ? '"' + root.value + '"' : root.value}
          </span>
        </span>
      );
    case "object":
      return (
        <span className={className}>
          <span className="value" onClick={() => setOpen((prev) => !prev)}>
            <span className="type">{root.$type}</span>
          </span>
          <span className={clsx({ hidden: !open })}>
            <span className="opening-brace">(</span>
            <ul className="value-body">
              {root.properties.map((p, index) => (
                <TreeItem key={index} name={p.name} root={p.type} />
              ))}
            </ul>
            <div className="closing-brace">)</div>
          </span>
        </span>
      );
    case "array":
      return (
        <span className={className}>
          <span className="colon">:&nbsp;</span>
          <span className="opening-brace">[</span>
          <ul className="value-body">
            {root.children.map((c, index) => (
              <TreeItem key={index} root={c} />
            ))}
          </ul>
          <div className="closing-brace">]</div>
        </span>
      );
    case "reference":
      return (
        <span className={className}>
          <span className="colon">:&nbsp;</span>
          <span className="link">{root.type.$type}</span>
        </span>
      );
  }
  return <div>???</div>;
};

const TreeItem: FC<TreeProps & { name?: string }> = ({ root, name }) => {
  const [open, setOpen] = useState(() => true);
  return (
    <li className={"entry toggable"}>
      <span
        className={clsx("value", { hidden: !name })}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="property">{name}</span>
      </span>
      <Tree
        root={root}
        className={clsx({
          hidden: !open,
        })}
      />
    </li>
  );
};
