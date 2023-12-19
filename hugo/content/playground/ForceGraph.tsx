import { AstNode } from "langium";
import { convertASTtoGraph } from "langium-ast-helper";
import React from "react";
import { ForceGraph3D } from "react-force-graph";
import { toHex } from "./preprocess";
import * as ReactDOM from "react-dom/client";

export let grammarRoot: ReactDOM.Root;

export function renderForceGraph(isVisible: boolean, grammar?: AstNode) {
    const location = document.getElementById("forcegraph-root")!;
    console.log("Rendering ForceGraph", isVisible, grammar);

    if (!isVisible) {
        location.classList.remove("visible");
        return;
    }
    
    if (!grammarRoot) {
        // create a fresh root, if not already present
        grammarRoot = ReactDOM.createRoot(location);
    }

    if (isVisible && grammar) {
        // the follow code is taken from https://github.com/TypeFox/language-engineering-visualization/blob/main/packages/visuals/src/index.ts
        const graphData = convertASTtoGraph(grammar);
        location.classList.add("visible");
        const gData = {
            nodes: graphData.nodes.map(node => ({
                id: (node as unknown as { $__dotID: string }).$__dotID,
                nodeType: node.$type,
                node
            })),
            links: graphData.edges.map(edge => ({
                source: (edge.from as unknown as { $__dotID: string }).$__dotID,
                target: (edge.to as unknown as { $__dotID: string }).$__dotID
            }))
        };

        return grammarRoot.render(
            <ForceGraph3D
                showNavInfo={false}
                width={window.innerWidth}
                height={window.innerHeight}
                graphData={gData}
                nodeColor={node => toHex((node as any).nodeType)}
                nodeLabel={node => (node as any).node.name ? `${(node as any).nodeType} - ${(node as any).node.name}` : (node as any).nodeType}
            />
        );

    }
}