import { AstNode } from "langium-ast-helper";
import { TreeNode } from "./d3tree";


export function getMainTreeNode(ast: AstNode): TreeNode {
    const astNode = getDomainModelAst(ast as DomainModelAstNode);
    // create a TreeNode a DataType
    const getDataTypeTreeNode = (d: DataType): TreeNode => {
        return {
            ...d,
            children: []
        }
    }

    // create a TreeNode from a PackageDeclaration
    const getPackageDeclarationTreeNode = (p: PackageDeclaration): TreeNode => {
        return {
            ...p,
            children: p.elements.map(e => getTreeNode(e))
        }
    }

    // create a TreeNode from any DomainModelElement
    const getTreeNode = (e: DomainModelElement): TreeNode => {
        switch(e.$type) {
            case 'DataType': return getDataTypeTreeNode(e as DataType);
            case 'Entity': return getEntityTreeNode(e as Entity);
            case 'PackageDeclaration': return getPackageDeclarationTreeNode(e as PackageDeclaration);
            default: return e as TreeNode;
        }
    }

    // create a TreeNode from an Entity
    const getEntityTreeNode = (entity: Entity): TreeNode => {

        // create a TreeNode from a Feature
        const getFeatureTreeNode = (feature: Feature): TreeNode => {
            return {
                name: `${feature.name}${feature.many ? '[]' : ''}`,
                $type: feature.$type,
                tags: feature.many ? ['many'] : [],
                children: [getDataTypeTreeNode(feature.type.ref)]
            }
        }

        // get all children of an Entity (including the supertype)
        const getChildren = (e: Entity): TreeNode[] => {
            const superType = astNode.entities.find(entity => entity.name === e.superType?.ref.name);
            const features = e.features.map(f => getFeatureTreeNode(f));

            const children: TreeNode[] = superType ? [...features, { 
                name:  superType.name, 
                $type: superType.$type,
                tags: ['supertype'],
                children: superType?.features.map(f => getFeatureTreeNode(f) )
            }] : features;

            return children;
        }
        
        return {
            ...entity,
            children: getChildren(entity)
        }
    }

    // create a TreeNode from all Entities in the ast
    const entities = astNode.entities.flatMap(e => getEntityTreeNode(e));
    // create a TreeNode from all DataTypes in the ast
    const datatypes = astNode.dataTypes.map(d => getDataTypeTreeNode(d));
    // create a TreeNode from all PackageDeclarations in the ast
    const packageDeclarations = astNode.packageDeclarations.map(p => getPackageDeclarationTreeNode(p));

    const children: TreeNode[] = [];

    // if datatypes exist, add them to the children
    if(datatypes.length > 0) {
        children.push({ name: 'DataTypes', $type: 'DataType', children: datatypes });
    }

    // if entities exist, add them to the children
    if(entities.length > 0) {
        children.push({name: 'Entities', $type: 'Entity', children: entities});
    }

    // if packageDeclarations exist, add them to the children
    if(packageDeclarations.length > 0) {
        children.push({name: 'Packages', $type: 'PackageDeclaration', children: packageDeclarations});
    }

    
    // return the root TreeNode
    return {
        name: astNode.$type,
        $type: astNode.$type,
        children: children
    }
}

/**
 * Returns a DomainModelAstNode from a given ast.
*/
export function getDomainModelAst(ast: DomainModelAstNode ): DomainModelAstNode {
    return {
        name: ast.name,
        $type: 'Domainmodel',
        elements: ast.elements,
        packageDeclarations: (ast.elements as DomainModelElement[]).filter(e => e.$type === 'PackageDeclaration') as PackageDeclaration[],
        entities: (ast.elements as DomainModelElement[]).filter(e => e.$type === 'Entity') as Entity[],
        dataTypes: (ast.elements as DomainModelElement[]).filter(e => e.$type === 'DataType') as DataType[],
    }
}

// a more accessible representation of the DomainModel Ast
export interface DomainModelAstNode extends AstNode, DomainModelElement {
    $type: 'Domainmodel';
    elements: DomainModelElementType[];

    packageDeclarations: PackageDeclaration[];
    entities: Entity[];
    dataTypes: DataType[];
}

export interface PackageDeclaration extends DomainModelElement  {
    $type: 'PackageDeclaration';
    elements: DomainModelElementType[];
}

export interface Entity extends DomainModelElement  {
    $type: 'Entity';
    features: Feature[];
    superType?: {
        ref: Entity
    }
}

export interface Feature extends DomainModelElement  { 
    $type: 'Feature';
    type: {
        ref: DataType
    };
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
