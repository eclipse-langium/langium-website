import { monaco } from "monaco-editor-wrapper/.";

export interface Command {
    name: 'penUp' | 'penDown' | 'move' | 'color';
    args: MoveArgs | ColorArgs | undefined;
}

export interface MoveArgs {
    x: number;
    y: number;
}

export interface ColorArgs {
    color?: string;
    r?: number;
    g?: number;
    b?: number;
}

export function getCommands(commands: any[]): Command[] {
    let result: Command[] = [];
    commands.map((command) => {
        switch (command.cmd) {
            case 'penUp':
                result.push({ name: 'penUp', args: undefined } as Command);
                break;
            case 'penDown':
                result.push({ name: 'penDown', args: undefined } as Command);
                break;
            case 'move':
                result.push({ name: 'move', args: { x: command.x, y: command.y } as MoveArgs} as Command);
                break;
            case 'color':
                result.push({ name: 'color', args: { color: command.color, r: command.r, g: command.g, b: command.b } as ColorArgs } as Command);
                break;

        }
    })
    return result;
}

export const syntaxHighlighting = {
    keywords: [
        'color', 'def', 'down', 'for', 'move', 'pen', 'to', 'up'
    ],
    operators: [
        '-', ',', '*', '/', '+', '='
    ],
    symbols: /-|,|\(|\)|\{|\}|\*|\/|\+|=/,

    tokenizer: {
        initial: [
            { regex: /#(\d|[a-fA-F]){3,6}/, action: { "token": "string" } },
            { regex: /[_a-zA-Z][\w_]*/, action: { cases: { '@keywords': { "token": "keyword" }, '@default': { "token": "string" } } } },
            { regex: /(?:(?:-?[0-9]+)?\.[0-9]+)|-?[0-9]+/, action: { "token": "number" } },
            { include: '@whitespace' },
            { regex: /@symbols/, action: { cases: { '@operators': { "token": "operator" }, '@default': { "token": "" } } } },
        ],
        whitespace: [
            { regex: /\s+/, action: { "token": "white" } },
            { regex: /\/\*/, action: { "token": "comment", "next": "@comment" } },
            { regex: /\/\/[^\n\r]*/, action: { "token": "comment" } },
        ],
        comment: [
            { regex: /[^\/\*]+/, action: { "token": "comment" } },
            { regex: /\*\//, action: { "token": "comment", "next": "@pop" } },
            { regex: /[\/\*]/, action: { "token": "comment" } },
        ],
    }
} as monaco.languages.IMonarchLanguage;

interface Example {
    index: number;
    name: string;
    code: string;
}

export const examples: Example[] = [{
    index: 0,
    name: "Langium Logo",
    code: `// Draws the langium logo in MiniLogo!
def langium() {
    // draw top portion
    // start
    move(230, 90)

    // upper part of logo
    pen(down)
    move(45, 40)    // 275, 130
    move(210, 0)    // 485, 130
    move(-37, 80)   // 448, 210
    move(-215, 0)   // 233, 210
    move(-43, -40)  // 190, 170
    move(40, -80)   // 275, 130
    pen(up)

    // lower part of logo
    move(-50, 103)
    pen(down)
    // starts @ 180, 193
    move(31, 30) // 211, 223

    // crease
    move(-61, 114) // 150, 337
    move(81, -102) // 231, 235

    move(205, 0)// 436, 235
    move(-60, 123) // 376, 358
    move(-86, 0) // 290, 358
    move(-241, 179) // 49, 537
    move(11, 17) // 60, 554
    move(-59, 27) // 1, 581
    move(180, -388)// 181, 193
    pen(up)
}

// program starts w/ pen UP and 0,0 position
// start off at 0,0

// calls the langium macro, drawing a version of the logo
color(#26888C)
langium()
`},
{
    index: 1,
    name: "Turtle",
    code : `
    // Draw the head with a given dimension, and option to flip along the y
    def drawHead(dimen, yFlip) {
        move(dimen / 2, 0)
        move(0, -dimen * yFlip)
        move(-dimen/2, -dimen/2 * yFlip)
        move(-dimen/2, dimen/2 * yFlip)
        move(0, dimen * yFlip)
        move(dimen / 2, 0)
    }
    
    // Draw a shell shape as an octagon
    def drawShellShape(dimen) {
        move(dimen / 2,0)
        move(dimen, dimen)
        move(0, dimen)
        move(-dimen, dimen)
        move(-dimen, 0)
        move(-dimen, -dimen)
        move(0, -dimen)
        move(dimen, -dimen)
        move(dimen / 2, 0)
    }
    
    // Helper function to move without painting
    def moveNoDraw(x,y) {
        pen(up)
        move(x,y)
        pen(down)
    }
    
    // Draws the total turtle shell with a series of smaller ones
    def drawShell() {
        for x = 1 to 6 {
            color(0, 255 / x, x * (255 / 5))
            drawShellShape(5 * x)
            moveNoDraw(0,-7)
        }
        color(128, 255, 128)
        drawShellShape(30)
    }
    
    // Draws a turtle leg, using a given x & y to allow rotating & flipping
    def drawLeg(x,y) {
        move(x * 0.5, y * 0.5)
        move(x, -y * 0.5)
        move(-x * 0.5, -y * 0.5)
        move(-x, y * 0.5)
    }
    
    // Draws the turtle's legs
    def drawLegs() {
        // top right
        moveNoDraw(25,10)
        drawLeg(25,25)
    
        // top left
        moveNoDraw(-50,0)
        drawLeg(-25,25)
    
        // bottom left
        moveNoDraw(0,70)
        drawLeg(-25,-25)
    
        // bottom right
        moveNoDraw(50,0)
        drawLeg(25,-25)
    }
    
    // Draws the tail as a smaller, inverted head
    def drawTail() {
        moveNoDraw(-25,10)
        drawHead(10,-1)
    }
    
    // Set starting pen position & color
    def setup() {
        // program starts w/ pen UP and 0,0 position
        // start off at 0,0
        move(250,250)
        pen(down)
        color(green)   
    }
    
    setup()
    
    // draw the turtle!
    drawShell()
    drawHead(20,1)
    drawLegs()
    drawTail()
    `},
];