import { monaco } from "monaco-editor-wrapper/.";
import { AstNode } from "../langium-utils/langium-ast";

export interface DomainModelAstNode extends AstNode  {
    elements: PackageDeclaration[] | Entity[] | DataType[];
}


export interface PackageDeclaration {
    name: string;
    elements: DataType[];
}

export interface Entity {
    name: string;
    features: Feature[];
    superType?: Entity;
}

export interface Feature { 
    name: string;
    type: DataType;
    many: boolean;
}

export interface DataType {
    name: string;
}

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
} as monaco.languages.IMonarchLanguage;