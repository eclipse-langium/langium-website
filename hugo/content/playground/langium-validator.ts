import { ValidationAcceptor, GrammarAST } from 'langium';

export function checkLeftRecursion(grammar: GrammarAST.Grammar, accept: ValidationAcceptor): void {
    const parserRules = grammar.rules.filter(rule => rule.$type === "ParserRule").map(rule => rule as GrammarAST.ParserRule);
    const graph = new Map<GrammarAST.ParserRule, Set<GrammarAST.ParserRule>>();
    for (const rule of parserRules) {
        fromParserRule(rule, graph);
    }
    detectLeftRecursion(graph, accept);
}
function fromParserRule(rule: GrammarAST.ParserRule, graph: Map<GrammarAST.ParserRule, Set<GrammarAST.ParserRule>>): void {
    return fromAbstractElement(rule, rule.definition, graph);
}
function fromAbstractElement(from: GrammarAST.ParserRule, element: GrammarAST.AbstractElement, graph: Map<GrammarAST.ParserRule, Set<GrammarAST.ParserRule>>): void {
    if (element.$type === "RuleCall") {
        const ref = (element as GrammarAST.RuleCall).rule.ref;
        if (ref?.$type === "ParserRule") {
            if (!graph.has(from)) {
                graph.set(from, new Set());
            }
            graph.get(from)!.add(ref);
        }
    } else if (element.$type === "Group") {
        const first = (element as GrammarAST.Group).elements[0];
        if (first) {
            fromAbstractElement(from, first, graph);
        }
    } else if (element.$type === "Alternatives") {
        (element as GrammarAST.Alternatives).elements.forEach(e => {
            fromAbstractElement(from, e, graph);
        });
    } else if (element.$type === "UnorderedGroup") {
        (element as GrammarAST.UnorderedGroup).elements.forEach(e => {
            fromAbstractElement(from, e, graph);
        });
    } else if (element.$type === "Assignment") {
        const terminal = (element as GrammarAST.Assignment).terminal;
        if (terminal) {
            fromAbstractElement(from, terminal, graph);
        }
    }
}
function detectLeftRecursion(graph: Map<GrammarAST.ParserRule, Set<GrammarAST.ParserRule>>, accept: ValidationAcceptor): void {
    const accepted = new Set<GrammarAST.ParserRule>();
    const visited = new Set<GrammarAST.ParserRule>();
    const path = new Array<GrammarAST.ParserRule>();

    const visit = (rule: GrammarAST.ParserRule) => {
        const ruleIndex = path.indexOf(rule);
        if (ruleIndex !== -1) {
            for (let index = ruleIndex; index < path.length; index++) {
                const pathRule = path[index];
                if (accepted.has(pathRule)) {
                    continue;
                }
                accepted.add(pathRule);
                accept('error', `Left recursion detected in rule ${pathRule.name}`, {
                    node: pathRule,
                    property: 'name'
                });
            }
            return;
        }
        if (visited.has(rule)) {
            return;
        }
        visited.add(rule);
        path.push(rule);
        const neighbors = graph.get(rule) ?? [];
        for (const neighbor of neighbors) {
            visit(neighbor);
        }
        path.pop();
    };

    for (const rule of graph.keys()) {
        visit(rule);
    }
}