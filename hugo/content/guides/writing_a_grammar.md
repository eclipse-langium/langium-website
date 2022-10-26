---
title: "Writing your Grammar"
weight: 0
draft: true
---

In this guide will be talking about getting started writing your own grammar in Langium. As a motivating example, we'll be be describing how to write a grammar for the MiniLogo language. If you're not familiar with MiniLogo, it's a smaller implementation of the Logo programming language. Logo itself, if you're not already familiar with it, is a lot like Turtle from Python. Ultimately, we'll be using MiniLogo to express drawing instructions in a domain specific language.

We've already written an implemention of [MiniLogo on Github using Langium](https://github.com/langium/langium-minilogo). This guide will following along with this project, walking through the grammar implementation step. Later guides will also come back to MiniLogo, allowing it to be used as an incremental example throughout this series of guides.

## Planning

Before we get started writing the grammar, we'll want to first identify a couple important aspects.

- The Semantic Domain
- The Concrete Syntax
  
The Semantic Domain describes the types of values that will be produced by evaluating our language. In the case of MiniLogo our semantic domain is going to have a single part, an updated state that contains information on:

- position
- whether we're drawing or not
- color of the drawing stroke

Basically, a MiniLogo program can be considered equivalent to a series of transformations on some drawing context, and this is important to grasp, as it will guide our design later on (especially for generation).

In addition we'll want to get an idea of what we want our concrete syntax to look like. This step can be done on paper if you like, but the overall goal is to get a feel for how you want the language to look. Your coice of concrete syntax will also drive your grammar. If your design is chosen well, it can simplify the way your grammar is constructed. If your syntax is complex, the grammar will likely be complex as well. Not only this, but it's also important to try and strike a balance betwenen syntax that is special to your language, and syntax that is at least somewhat familiar to the users. The more unfamiliar the language appears, the more likely your users will struggle trying to pick it up.

In our case, we're going to use a C-like concrete syntax. This will make it easy to understand the structure of our programs for most users. This is also chosen because it allows us to use curly braces to delimit blocks of code, which is quite easy to do in Langium. You could also go for a Python style language, but then whitespace has significance in determing which block some code belongs to. This is not easy to do out of the box with Langium, due to it ignoring whitespace by default, but it can be setup.

## Sketching the Grammar

Now that we have an idea of what our language means and how it will look, we can then start writing out a grammar. Conveniently, MiniLogo already has a concrete syntax described, and that in turn is based off of the [Logo programming language](https://el.media.mit.edu/logo-foundation/what_is_logo/logo_programming.html). As for [MiniLogo](https://web.engr.oregonstate.edu/~walkiner/teaching/cs381-wi21/minilogo.html), it was designed by Eric Walkingshaw at Oregon State University, and was used to teach students in Computer Science courses about Programming Language theory.

As an aside, our version of MiniLogo will be an *approximation* of Dr. Walkingshaw's version. We won't adhere to it completely, and we won't be incorporating some elements such as variable declarations.

To get started sketching the grammar we'll be using the **Hello World** example from the yeoman generator. You can read about how to get this setup in the [Getting Started](/docs/getting-started/) section of our docs. We'll be working with a vanilla installation, and building up from that. We'll begin by modifying the default grammar file, and updating it to work for MiniLogo. You can find this file under **src/language-server/hello-world.langium**. If you used a name other than the default, the file will still be there, but using your custom name instead.

We'll be overriding the existing langium grammar file completely, so delete the old grammar before we begin. The first line that we'll then add is the declaration of our grammar.

```antlr
grammar MiniLogo
```

This simply describes the grammar that will be proceeding, and is required.

Next, we'll need to describe an entry rule. This will be a parser rule that must be matched first when recognizing a MiniLogo program. This rule is particularly special, because it will become the root of an abstract syntax tree, which captures the essential structure of our program. For MiniLogo, our entry rule Will be `Model`. You could also make it `Program`, but whatever you choose it should capture the same notion. Regardless of your choice of name, this rule will match any number of Statements and/or Definitions.

```antlr
entry Model: (stmts+=Stmt | defs+=Def)*;
```

Each instance of a statement will be stored under the `stmts` property as an element of an Array. The same will be done for Definitions using `defs` as well. Note the trailing `*` after the grouping, which means technically a program containing *nothing* is also a valid MiniLogo program.

To iterate on this little bit further we'll need to describe what a Statement (Stmt) and a Definition (Def) are in the context of MiniLogo.

First, let's talk about **Definitions**. A definition corresponds to:

- a name
- a list of parameters
- a block of *statements*

We want this to look like so in our concrete syntax:

```
def myDef() {
    ...
}
...
def anotherDef(x,y,z) {
    ...
}
```

And we can capture this with the following rule:

```antlr
Def:    'def' name=ID '(' (params+=Param (',' params+=Param)*)? ')' Block;
```

As an additional note, much like regular expressions we use modifiers in our grammar to indicate that definitions can take *any number of comma separated parameters*.

You may be wondering what `Block` is as well, and that's fair point. Block corresponds to a rule *fragment*, which is akin to a reusable rule body. It's not a rule itself, but an incomplete piece that can be reused to help complete other rules. It's particularly handy when you find yourself writing the same pattern repatedly, and want to factor it out.

```antlr
fragment Block: '{' body+=Stmt* '}';
```

Then, we can move onto **Statements**, which consist of Commands or Macros. A Command describes an action that transforms the drawing state (which connects to our semantic domain from before). The commands in MiniLogo can be expressed like so:

```antlr
Cmd:    Pen | Move | Color | For;
```

- **Pen**: Corresponds to a command that turns on/off drawing
- **Move**: Updates the position of the pen (relatively)
- **Color**: Sets the stroke color of what is drawn
- **For**: A standard for loop control flow

These commands are quite simple, but very helpful for actually describing the drawing instructions that we will be representing. We'll go over those in a moment.

The other half of a Statement consists of a **Macro**. A Macro has 2 distinct parts:

- a reference to a Definition (more on this shortly, think of it like a 'function' for now)
- a list of arguments to apply this definition to

In our concrete syntax, we want macros to look like this:

```
myMacro()
...
anotherMacro(1, 2, 3 * 3)
```

We can encode this in MiniLogo like so:

```antlr
Macro:  def=[Def:ID] '(' (args+=Expr (',' args+=Expr)*)? ')';
```

In this case `def` will be a **Cross Reference** to an existing Definition. This is a special syntax that essentially says *def will be assigned to a Definition instance at runtime, identified by an ID terminal token*. Although we haven't introduced this terminal yet, it's just a simple rule that captures literal strings as tokens. It's also important to note that cross references implicitly utilize the `name` property to match the cross ref, which lines up nicely with our Definition rule from before.

We also want to add the notion of a Parameter, which is quite simple to write in:

```antlr
Param: name=ID;
```

As you may have guessed, by using the `name` property for a parameter, we're allowing Langium to automatically setup cross references later on if we want to reference these elsewhere.

## Adding Commands

For the commands, we'll go through each one, and show examples of the concrete syntax we're trying to capture:

**Pen** needs to have to two modes, up and down. So it should capture syntax like this:

```
pen(up)
...
pen(down)
```

We can capture this with the following parser rule.

```antlr
Pen:    'pen' '(' mode=('up' | 'down') ')';
```

**Move** commands will take a pair of expressions, corresopnding to the x and y components, and can look like so:

```
move(1,5)
...
move(x * 10, y * 10)
```

We haven't defined it yet, but we can use an **Expr** rule to represent where our expressions will go, and capture this command like this:

```antlr
Move:   'move' '(' ex=Expr ',' ey=Expr ')';
```

Simple for loops can be defined too, which should look like this:

```
for x = 0 to 10 {
    ...
}
```

Again, we don't have **Expr** defined yet, but we can still use it here. Also, since we have a block of statements, we can reuse that `Block` fragment that was defined earlier.

```antlr
For:    'for' var=Param '=' e1=Expr 'to' e2=Expr Block;
```

**Color** commands are the last one to add, and they'll change the stroke color in a few ways. The first is by setting the RGB components as integers directly:

```
color(128,64,255)
```

The second is by passing in the name of a stroke color:

```
color(blue)
```

The last is by passing a hexadecimal value:

```
color(#66CCFF)
...
color(#6cf)
```

This is a special case, where we have 3 different overloaded forms of the same command. To capture all of these forms, we can use two different sets of properties:

- r,g,b values for each color
- a single color value that can be either an ID or HEX

We can encode this like so:

```antlr
Color:  'color' '(' ((r = Expr ',' g=Expr ',' b=Expr) | color=ID | color=HEX) ')';
```

What's interesting here is that the color & r,g,b properties are optional. Since in either case only one set or the other will be defined. We can use this information to quickly determine what kind of color command we have, and to utilize it correctly later on.

## Addding Expressions

Then we get to the core of our language, **Expressions**. In MiniLogo we want to be able to express arithmetic operations such as addition, subtraction, multiplication, and division. When implementing expressions, we need to keep in mind that Langium is based off of Chevrotain, which produces top-down parsers. This means we have to watch our for cases that lead to left-recursion. In order to avoid this, we need to be careful not to define a rule with itself on the lefthand side. For example, something like `Expr: e1=Expr ...` would not work, because the parser would infinitely try to parse another expression.

We can introduce expressions and avoid left-recursion by writing them from the bottom up in terms of order of operations.

```antlr
Expr: Add;
```

Then writing a rule to handle the addition (and subtraction) case.

```antlr
Add  infers Expr: 
    Mult     ({infer BinExpr.e1=current} op=('+'|'-') e2=Mult)*;
```

This rule introduces:

- a parser rule that produces an **Expr** instance (that's what the infers is doing here)
- starts by recognizing a Mult instance
- *then* if there's a binary operator to parse
  - rewrite this parsed object into a **BinExpr** that will *extend* **Expr** (that's what the second `{infer ...}` is doing)
  - also capture the first `Mult` under the `e1` property (that's what the `current` keyword refers to)
  - capture the operand +/-
  - capture the following `Mult` instance

We can then repeat this pattern with the `Mult` rule:

```antlr
Mult infers Expr: 
    PrimExpr ({infer BinExpr.e1=current} op=('*'|'/') e2=PrimExpr)*;
```

Lastly we can then introduce the primary (or primitive) expressions.

```antlr
PrimExpr: Lit | Ref | Group | NegExpr;

// literal int
Lit:        val=INT;
// cross-reference to a parameter
Ref:        val=[Param:ID];
// grouped expression with parentheses
Group:      '(' ge=Expr ')';
// negated expression
NegExpr:    '-' ne=Expr;
```

By constructing our structure first for Addition & Subtraction, and then later for Multiplication and Division, we can construct an abstract syntax text tree that will correctly preserve order of operations.

As a note, we could also write these rules *without using actions to rewrite our parse tree*, which are those cases of `{infer ...}`. However, then we'll get nodes like `Add` and `Mult`, instead of `Expr` and `BinaryExpr`. This is a tradeoff that is a bit tough to grasp at first in the grammar, but translates to a more sensible AST to work on later.

## Adding Terminals

Now we're almost done with our grammar, we just need to add in the terminal rules. Conveniently, the body of a terminal rule can be defined as a Javascript regular expression; sharing the same syntax. This makes it very clear to determine what our terminals should recognize.

```antlr
// recognize a hexadecimal sequence, used to recognize colors for the 'Color' command
terminal HEX returns string:    /#(\d|[a-fA-F])+/;

// recognize an identifier
terminal ID returns string:     /[_a-zA-Z][\w_]*/;

// recognize an Integer (but represented via a 'number' type)
terminal INT returns number:    /-?[0-9]+/;
```

Then, lastly, we want to add *hidden terminals*. These will describe tokens that we want to parse and *discard* while parsing any input. Since we're adding whitespace & comments as hidden terminals, it's the same as saying we do *not* care about these tokens while parsing, but we do recognize that they are valid tokens; they just don't play a role in our structure.

```antlr
hidden terminal WS:             /\s+/;
hidden terminal ML_COMMENT:     /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT:     /\/\/[^\n\r]*/;
```

And that's it, we're all set writing up the grammar for MiniLogo. To verify that we correctly implemented the grammar with no problems, we can run the following command in the project root
```
npm run langium:generate
```

The generation should finish successfully, indicating that our grammar doesn't have any errors in it. In some cases, you may get warnings, but these shouldn't prevent the generation from completing successfully. Also, in this context when we're referring to the generation, we're talking about the construction of the following from you grammar:

- a semantic model (that ASTs can be mapped onto)
- a parser that recognizes our language

With that, we have the beginnigns of our very own language. Hopefully this gives a good idea of how to express a grammar in Langium, particularly with consideration to your concrete syntax & semantic domain. You can also consider the ways we can express cases that are often left-recursive, like expressions, in an alternative fashion. Overall, our grammar should now be ready for the next step of validation.
