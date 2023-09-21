---
title: "Writing a Grammar"
weight: 0
---

{{< toc format=html >}}

In this tutorial we will be talking about writing a grammar for your language in Langium. As a motivating example, we'll be describing how to write a grammar for the MiniLogo language. If you're not familiar with MiniLogo, it's a smaller implementation of the Logo programming language. Logo itself is a lot like Turtle from Python. Ultimately, we'll be using MiniLogo to express drawing instructions that can be used to draw on a canvas.

We've already written an implementation of [MiniLogo on Github using Langium](https://github.com/eclipse-langium/langium-minilogo). This tutorial will be following along with this project, by walking through the grammar implementation step by step. Later tutorials will also follow along with MiniLogo to create an easy to follow series.

## Planning

Before we get started writing the grammar, we'll want to first identify a couple important aspects of our language. Namely, these are:

- The Semantic Domain
- The Concrete Syntax
  
The Semantic Domain describes the types of values that will be produced by evaluating our language. In the case of MiniLogo our semantic domain is going to have a single part, an updated drawing state that contains information on:

- position
- whether we're drawing or not
- color of the drawing stroke

We'll also be producing values and updating an environment as well, which are important to keep in mind.

Basically, a MiniLogo program can be considered equivalent to a series of transformations on some drawing context. This goal for MiniLogo will guide our design throughout these tutorials.

In addition, we'll want to get an idea of what our concrete syntax will be. This step can be done on paper if you like, but the overall goal is to get a feel for how you want the language to look. Your choice of concrete syntax will also drive your grammar's design. If your design is chosen well, it can simplify the way your grammar is constructed. If your syntax is complex, the grammar may also be complex as well. Not only this, but it's also important to try and strike a balance between syntax that is special to your language, and syntax that is at least somewhat shared with other languages. The more unfamiliar the language appears, the more likely your users will struggle trying to pick it up.

In our case, we're going to use a C-like concrete syntax. This will make it easy to understand the structure of our programs for most users. This is also chosen because it allows us to use curly braces to delimit blocks of code, which is quite easy to implement in Langium. You could also go for a Python style language, where whitespace has significance in determining which block some code belongs to. Unfortunately, this is not as easy to do out of the box with Langium, due to it ignoring whitespace by default, but it can be configured to work for such languages.

## Sketching the Grammar

Now that we have an idea of our semantics and our concrete syntax, we can then start writing out a grammar. Conveniently, MiniLogo already has a grammar and concrete syntax described, and that in turn is based off of the [Logo programming language](https://el.media.mit.edu/logo-foundation/what_is_logo/logo_programming.html). [MiniLogo](https://web.engr.oregonstate.edu/~walkiner/teaching/cs381-wi21/minilogo.html) itself was designed by Eric Walkingshaw at Oregon State University, and was used to teach students. It's not something that we've created, but rather something that we found to be an ideal demonstration of Langium's capabilities, while also remaining friendly for newcomers.

As an aside, our version of MiniLogo will be an *approximation* of Dr. Walkingshaw's version. We won't adhere to it completely, and we won't be incorporating some elements, such as variable declarations.

To get started sketching the grammar we'll be using the **Hello World** example from the yeoman generator. You can read about how to get this setup in the [Getting Started](/docs/getting-started/) section of our docs. We'll be working with a fresh from the generator using only the defaults, and building up from that. We'll begin by modifying the default grammar file, and updating it to work for MiniLogo. You can find this file under **src/language/hello-world.langium** in your new project. If you used a name other than the default, the file will still be there, but using your custom name instead.

We'll be overriding the existing langium grammar file completely, so delete the old contents before we begin.

The first line that we'll then add is the declaration of our grammar.

```langium
grammar MiniLogo
```

This simply describes the name of the grammar that will be proceeding, and is required.

Next, we'll need to describe an entry rule. This will be a parser rule that must be matched first when recognizing a MiniLogo program. This rule is particularly special, because it will become the root of the resulting abstract syntax tree, which captures the essential structure of our program. For MiniLogo, our entry rule Will be `Model`. You could also make it `Program`, but whatever you choose it should capture the same notion. Regardless of your choice, this rule should match any number of Statements and/or Definitions to follow the MiniLogo specification.

```langium
entry Model: (stmts+=Stmt | defs+=Def)*;
```

Each instance of a statement will be stored under the `stmts` property as an element of an Array. The same will be done for Definitions using `defs` as well. Note the trailing `*` after the grouping, which means technically a program containing *nothing* is also a valid MiniLogo program.

To iterate on this a little bit further we'll need to describe what a Statement (Stmt) and a Definition (Def) are in the context of MiniLogo.

First, let's talk about **Definitions**. A definition corresponds to:

- a name
- a list of parameters
- a block of *statements*

And we want definitions to look like so in our concrete syntax:

```minilogo
def myDef() {
    ...
}
...
def anotherDef(x,y,z) {
    ...
}
```

We can recognize this concrete syntax, and capture the relevant information for our AST, with the following rule:

```langium
Def: 'def' name=ID '(' (params+=Param (',' params+=Param)*)? ')' Block;
```

As an additional note, much like regular expressions we use modifiers in our grammar to indicate that definitions can take any number of comma separated parameters.

You may be wondering what `Block` is as well. Block corresponds to a rule *fragment*, which is akin to a reusable rule body. It's not a rule itself, but an reusable piece that can be reused to complete rules. It's particularly handy when you find yourself writing the same pattern repeatedly, and want to factor it out.

```langium
fragment Block: '{' body+=Stmt* '}';
```

Then we have **Statements**, which consist of Commands or Macros. 

```langium
Stmt: Cmd | Macro;
```

A **Command** describes an action that transforms the drawing state (which connects to our semantic domain from before). The commands in MiniLogo can be expressed like so:

```langium
Cmd: Pen | Move | Color | For;
```

Where each command is also a separate rule:

- **Pen**: Corresponds to a command that turns on/off drawing
- **Move**: Updates the position of the pen (relatively)
- **Color**: Sets the stroke color of what is drawn
- **For**: A standard for loop control flow

These commands describe the essential drawing instructions that we will be representing. We'll go over those in a moment.

A statement can also be a **Macro**. A Macro has 2 distinct parts:

- a reference to a Definition (more on this shortly, think of it like a 'function' for now)
- a list of arguments to apply this definition to

In our concrete syntax, we want macros to look like this:

```minilogo
myMacro()
...
anotherMacro(1, 2, 3 * 3)
```

We can encode this in MiniLogo like so:

```langium
Macro:  def=[Def:ID] '(' (args+=Expr (',' args+=Expr)*)? ')';
```

In this case `def` will be a **Cross Reference** to an existing Definition. This is a special syntax that says *def will be assigned to a Definition object at runtime identified by an ID terminal token*. Although we haven't introduced this terminal yet, it's a simple rule that captures literal strings as tokens. It's also important to note that cross references implicitly utilize the `name` property to hookup the cross reference to the target object.

We also want to add the notion of a Parameter, which is quite simple to write in:

```langium
Param: name=ID;
```

As you may have guessed, by using the `name` property for a parameter, we're allowing Langium to automatically setup cross references for parameters as well.

## Adding Commands

For the commands, we'll go through each one, and show examples of the concrete syntax we're trying to capture:

**Pen** needs to have two modes, up and down. So it should capture syntax like this:

```minilogo
pen(up)
...
pen(down)
```

We can express this with the following parser rule.

```langium
Pen:    'pen' '(' mode=('up' | 'down') ')';
```

**Move** commands will take a pair of expressions, corresponding to the x and y components, and can look like so:

```minilogo
move(1,5)
...
move(x * 10, y * 10)
```

We haven't defined it yet, but we can use an **Expr** rule to represent where our expressions will go, and capture this command like this:

```langium
Move:   'move' '(' ex=Expr ',' ey=Expr ')';
```

We'll define expressions shortly.

Simple for loops can be defined too, which should look like this:

```minilogo
for x = 0 to 10 {
    ...
}
```

Again, we don't have **Expr** defined yet, but we can still use it here. Also, since we have a block of statements, we can reuse that `Block` fragment that was defined earlier.

```langium
For: 'for' var=Param '=' e1=Expr 'to' e2=Expr Block;
```

**Color** commands are the last one to add, and they'll change the stroke color in a few ways. The first is by setting the RGB components as integers directly:

```minilogo
color(128,64,255)
```

The second is by passing in the name of a stroke color:

```minilogo
color(blue)
```

The last is by passing a hexadecimal value:

```minilogo
color(#66CCFF)
...
color(#6cf)
```

The corresponding rule for this syntax is a special case where we have 3 different overloaded forms of the same command. To capture all of these forms, we can use two different sets of properties:

- r,g,b values for each color
- a single color value that can be either an ID or HEX

We can encode this like so:

```langium
Color:  'color' '(' ((r = Expr ',' g=Expr ',' b=Expr) | color=ID | color=HEX) ')';
```

What's interesting here is that the color & r,g,b properties are *both* optional. Since in either case only one or the other will be defined. With the two forms, this is enough information to quickly determine what kind of color command we have, and to handle it correctly later on.

## Adding Expressions

Now we're at the core of our language, **Expressions**. In MiniLogo we want to be able to express not only literal values, but also references and arithmetic operations such as addition, subtraction, multiplication, and division. When implementing expressions, we need to keep in mind that Langium is based off of Chevrotain, which produces top-down parsers. This means we have to watch out for cases that lead to left-recursion. In order to avoid this, we need to be careful not to define a rule with itself on the left-hand side. For example, something like `Expr: e1=Expr ...` would not work, because the parser would infinitely try to parse another expression forever.

However, we can work around this. We can introduce expressions and avoid left-recursion by writing them from the bottom up in terms of order of operations. We'll start with `Add` (which also includes subtraction):

```langium
Expr: Add;
```

Then writing a rule to handle the addition (and subtraction) case.

```langium
Add  infers Expr: 
    Mult ({infer BinExpr.e1=current} op=('+'|'-') e2=Mult)*;
```

To explain a bit, the `Add` rule introduces:

- a parser rule that produces an **Expr** instance (that's what the infers is doing here)
- starts by recognizing a `Mult` instance
- *then* if there's a binary operator to parse
  - rewrite this parsed object into a **BinExpr** that will *extend* **Expr** (that's what the second `{infer ...}` is doing)
  - also capture the first `Mult` under the `e1` property (that's what the `current` keyword refers to)
  - capture the operand +/-
  - capture the following `Mult` instance (the right hand side of our binary expression)
- *else* simply returns the result of `Mult` (the case where we don't have a binary expression)

We can then repeat this pattern with the `Mult` rule:

```langium
Mult infers Expr: 
    PrimExpr ({infer BinExpr.e1=current} op=('*'|'/') e2=PrimExpr)*;
```

Lastly we can then introduce `Primary` expressions, or `PrimExpr`. This rule will match all the primitive cases, such as literals, references, groupings, and negation.

```langium
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

By writing our parser rules first for Addition & Subtraction, and then later for Multiplication and Division, we can construct an abstract syntax text tree that will correctly preserve order of operations.

As a note, we could also write these rules *without using actions to rewrite our parse tree*. When we're talking about actions, we're talking about those cases of `{infer ...}`. However, then we'll get nodes like `Add` and `Mult`, instead of `Expr` and `BinaryExpr`. This is a tradeoff that is a bit tough to grasp at first in the grammar, but translates to a more sensible AST to work on later. This is especially helpful when we get to generation.

## Adding Terminals

Now that we're almost done with our grammar, we need to add in the terminal rules. Conveniently, the body of a terminal rule can be defined as a Javascript regular expression; sharing the same syntax. This makes it very clear to determine what our terminals should recognize.

```langium
// recognize a hexadecimal sequence, used to recognize colors for the 'Color' command
terminal HEX returns string:    /#(\d|[a-fA-F])+/;

// recognize an identifier
terminal ID returns string:     /[_a-zA-Z][\w_]*/;

// recognize an Integer (but represented via a 'number' type)
terminal INT returns number:    /-?[0-9]+/;
```

Then, lastly, we want to add *hidden terminals*. These will describe tokens that we want to parse and *discard* while parsing any input. Since we're adding whitespace & comments as hidden terminals, it's the same as saying we do *not* care about these tokens while parsing, but we do recognize that they are tokens; they just don't play a role in capturing the structure of our language.

```langium
hidden terminal WS:             /\s+/;
hidden terminal ML_COMMENT:     /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT:     /\/\/[^\n\r]*/;
```

And that's it, we're all set writing up the grammar for MiniLogo. To verify that we correctly implemented the grammar with no problems, we can run the following command in the project root:

```bash
npm run langium:generate
```

The generation should finish successfully, indicating that our grammar doesn't have any errors in it. In some cases, you may get warnings -- such as from unreachable rules in your grammar -- but these won't prevent the generation from completing successfully. Also, when we're referring to the generation, we're talking about the construction of the following from your grammar:

- a semantic model (that ASTs can be mapped onto)
- a parser that recognizes our language

With that, we have the beginnings of our very own language! Hopefully this gives a good idea of how to express a grammar in Langium, particularly with consideration to your concrete syntax & semantic domain. You can also consider the ways we can express cases that are left-recursive, like expressions, in an alternative fashion. Overall, our grammar should now be ready for the next step of [validation in the following tutorial](/tutorials/validation).
