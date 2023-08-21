
import { AstNode } from "../langium-utils/langium-ast";
import { TreeNode } from "./d3tree";


export function getTreeNode(ast: AstNode): TreeNode {
    const astNode = getDomainModelAst(ast as DomainModelAstNode);
    
    console.log(astNode.elements.find(entity => entity.name === "HasAuthor"))
    const packageDeclarations = astNode.packageDeclarations.map(p => {
        const result: TreeNode = {
            ...p,
            children: p.elements
        }
        return result;
    });

    const datatypes = astNode.dataTypes.map(d => {
        const children: TreeNode[] = [];
        const result: TreeNode = {
            ...d,
            children: children
        }
        return result;
    });

    const getEntityTreeNode = (entity: Entity): TreeNode => {
        const getCildren = (e: Entity): TreeNode[] => {
            /*
                Doesn't work because e.superType returns a unresolved reference
                const child = astNode.entities.find(entity => entity.name === e.superType?.name);
            */
            const children: TreeNode[] = e.superType ? [{ 
                name: 'extends', 
                $type: e.$type,
                // you can only extend one entity
                children: []
            }] : [];

            return children;
        }
        const result: TreeNode = {
            ...entity,
            children: getCildren(entity)
        }
        return result;
    }

    const entities = astNode.entities.map(e => { return getEntityTreeNode(e); });
  
    const children: TreeNode[] = [
        {name: 'DataTypes', $type: 'DataType', children: datatypes},
        {name: 'Entities', $type: 'Entity', children: entities},
        {name: 'Packages', $type: 'PackageDeclaration', children: packageDeclarations},
    ];
    
    const result: TreeNode = {
        name: astNode.$type,
        $type: astNode.$type,
        children: children
    }
    return result;
}

export function getDomainModelAst(ast: DomainModelAstNode ): DomainModelAstNode {
    const result: DomainModelAstNode = {
        name: ast.name,
        $type: 'Domainmodel',
        elements: ast.elements,
        packageDeclarations: (ast.elements as DomainModelElement[]).filter(e => e.$type === 'PackageDeclaration') as PackageDeclaration[],
        entities: (ast.elements as DomainModelElement[]).filter(e => e.$type === 'Entity') as Entity[],
        dataTypes: (ast.elements as DomainModelElement[]).filter(e => e.$type === 'DataType') as DataType[],
    }
    return result;
}

export interface DomainModelAstNode extends AstNode, DomainModelElement {
    $type: 'Domainmodel';
    elements: DomainModelElementType[];

    packageDeclarations: PackageDeclaration[];
    entities: Entity[];
    dataTypes: DataType[];
}

export interface PackageDeclaration extends DomainModelElement  {
    $type: 'PackageDeclaration';
    elements: DataType[];
}

export interface Entity extends DomainModelElement  {
    $type: 'Entity';
    features: Feature[];
    superType?: Entity;
}

export interface Feature extends DomainModelElement  { 
    $type: 'Feature';
    type: DataType;
    many: boolean;
}

export interface DataType extends DomainModelElement {
    $type: 'DataType';
}

export interface DomainModelElement {
    $type: string;
    name: string;
}

// create a union type of all possible DomainModelElement types
export type DomainModelElementType = PackageDeclaration | Entity | DataType | Feature | DomainModelAstNode;

// create a union type of all possible DomainModelElement types names (string)
export type DomainModelElementTypeNames = DomainModelElementType['$type'];

export const example = `// Define all datatypes
datatype String
datatype Int
datatype Decimal

package big {
    datatype Int
    datatype Decimal
}

package complex {
    datatype Date
}

// Define all entities 
entity Blog {
    title: String
    date: complex.Date
    many posts: Post
}

entity HasAuthor {
    author: String
}

entity Post extends HasAuthor {
    title: String
    content: String
    many comments: Comment
}

entity Comment extends HasAuthor {
    content: String
}
`;

export const syntaxHighlighting =  {
    keywords: [
        'datatype','entity','extends','many','package'
    ],
    operators: [
        '.',':'
    ],
    symbols:  /\.|:|\{|\}/,

    tokenizer: {
        initial: [
            { regex: /[_a-zA-Z][\w_]*/, action: { cases: { '@keywords': {"token":"keyword"}, '@default': {"token":"ID"} }} },
            { include: '@whitespace' },
            { regex: /@symbols/, action: { cases: { '@operators': {"token":"operator"}, '@default': {"token":""} }} },
        ],
        whitespace: [
            { regex: /\s+/, action: {"token":"white"} },
            { regex: /\/\*/, action: {"token":"comment","next":"@comment"} },
            { regex: /\/\/[^\n\r]*/, action: {"token":"comment"} },
        ],
        comment: [
            { regex: /[^\/\*]+/, action: {"token":"comment"} },
            { regex: /\*\//, action: {"token":"comment","next":"@pop"} },
            { regex: /[\/\*]/, action: {"token":"comment"} },
        ],
    }
};