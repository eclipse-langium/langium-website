import { ValidationAcceptor, GrammarAST } from 'langium';

export function checkLeftRecursion(grammar: GrammarAST.Grammar, accept: ValidationAcceptor): void {
    const parserRules = grammar.rules.filter(GrammarAST.isParserRule).map(rule => rule as GrammarAST.ParserRule);
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
    if (GrammarAST.isRuleCall(element)) {
        const ref = (element as GrammarAST.RuleCall).rule.ref;
        if (GrammarAST.isParserRule(ref)) {
            if (!graph.has(from)) {
                graph.set(from, new Set());
            }
            graph.get(from)!.add(ref);
        }
    } else if (GrammarAST.isGroup(element)) {
        const first = (element as GrammarAST.Group).elements[0];
        if (first) {
            fromAbstractElement(from, first, graph);
        }
    } else if (GrammarAST.isAlternatives(element)) {
        (element as GrammarAST.Alternatives).elements.forEach(e => {
            fromAbstractElement(from, e, graph);
        });
    } else if (GrammarAST.isUnorderedGroup(element)) {
        (element as GrammarAST.UnorderedGroup).elements.forEach(e => {
            fromAbstractElement(from, e, graph);
        });
    } else if (GrammarAST.isAssignment(element)) {
        const terminal = (element as GrammarAST.Assignment).terminal;
        if (terminal) {
            fromAbstractElement(from, terminal, graph);
        }
    } else if (GrammarAST.isInfixRule(element)) {
        const infix = element as GrammarAST.InfixRule;
        fromAbstractElement(from, infix.call, graph);
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