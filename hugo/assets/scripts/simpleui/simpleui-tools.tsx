import { AstNode } from "../langium-utils/langium-ast";

export interface SimpleUIAstNode extends AstNode {
    bodyElements: Array<BodyElement>;
    headElements: Array<any>;
    jsFunctions: Array<any>;
    parameters: Array<any>;
}

export interface BodyElement {
    classes: Array<CSSClasses>;
    styles: Array<string>;
    $type: string;
}

export interface CSSClasses {
    classNames: Array<string>;
}

export interface InlineCSS {
    properties: Array<CSSProperty>;
}

export interface CSSProperty {
    property: string;
}

export const defaultText = `title 'Langium SimpleUI Demo'
icon 'https://langium.org/assets/nib.svg'
topbar 'Langium SimpleUI Demo' navlinks: auto styles[background-color: '#dcabdf', font-size: '17px', text-color: '#f2f2f2']

linebreak

div classes[flex-container, center]  {
    div classes[border, border--hidden] {
        div classes[center] {
            heading level: 1 'Welcome to our Demo Page for' styles[text-color: 'grey']
           
        } 
        div classes[center]{        
             image 'https://user-images.githubusercontent.com/68400102/150516517-7da9423e-7d0e-4605-91c7-d7693ccd3c28.png' styles[width: '20%', height: "20%"] 
        }     
    }
}

linebreak
section Introduction 'SimpleUI Introduction' {
    usecomponent card("Welcome to our example page", 
    "      
    This example page of SimpleUI (a DSL build with Langium), 
    shows what is possible with Langium. 
    This DSL combines HTML, CSS and JavaScript into one simple language.
    It also has cool extra features like components that you can 
    define once and then reuse like this card you are seeing right now!
    ")
}

section Showcase 'Feature Showcase' {
    div classes[flex-container, center] {
        div classes[border, border--hidden, shadow] styles[width: '70%'] {

            heading level: 4 "Function Showcase"
            linebreak
            section {
                paragraph "A simple calculator"
                textbox textBoxOne placeholder: "1" 
                paragraph "+"
                textbox textBoxTwo placeholder: "2" 
                linebreak
                button  'Calculate' { onClick: calculate(getTextbox(textBoxOne), getTextbox(textBoxTwo)) } classes[border] 
            }

            linebreak

            section {
                paragraph "I can also add images with alt"
                image "https://langium.org/assets/langium_logo_w_nib.svg" alt: "Langium Logo" styles[width: '40%', height: "40%"] 
            }
            section {
                paragraph "Links are also supported"
                link "https://langium.org/" text: "Langium"
            }
            
        }
    }
}


linebreak

paragraph "Built with ❤️ and" classes[center] styles[text-color: "rgba(38,136,140)", font-size: '24px'] 
div classes[center]{        
    image 'https://langium.org/assets/langium_logo_w_nib.svg' alt: "Langium Logo" styles[width: '10%', height: "10%"] 
}

linebreak

function buttonClick() {
    popup 'and Popups to view '
    popup 'also more things in one Function!'
}

function calculate(numberOne: number, numberTwo: number){
    popup $[numberOne] + $[numberTwo]
}

component card (header: string, content: string){
    div classes[flex-container, center] {
        div classes[border, border--hidden, shadow] styles[width: '70%'] {
            heading level: 4 $[header]
            paragraph $[content]
        }
    }
}
`;



export const syntaxHighlighting = {
    keywords: [
        'alt:','auto','background-color','button','classes','component','div','fixed','font-size','footer','function','getTextbox','heading','height','icon','image','label:','labelafter','level:','linebreak','link','navlinks:','number','onClick:','paragraph','placeholder:','popup','section','string','styles','text-color','text:','textbox','title','topbar','usecomponent','width'
    ],
    operators: [
        '-',',',':','*','/','+'
    ],
    symbols:  /-|,|:|\(|\)|\[|\]|\{|\}|\*|\/|\+|\$\[/,

    tokenizer: {
        initial: [
            { regex: /[_a-zA-Z][\w_]*/, action: { cases: { '@keywords': {"token":"keyword"}, '@default': {"token":"ID"} }} },
            { regex: /[0-9]+/, action: {"token":"number"} },
            { regex: /"[^"]*"|'[^']*'/, action: {"token":"string"} },
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
