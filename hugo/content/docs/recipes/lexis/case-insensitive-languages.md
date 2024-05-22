---
title: Case-insensitive languages
weight: 100
---

Case-insensitive languages are more suitable for beginners, because they don't have to worry about the case of identifiers and keywords.

In Langium, there are basically two options you can choose from:

* you can either make Langium case-insensitive by configuration
* or you can include case-insensitivity only where you need it

In both ways you need to take care of identifiers and cross-references.

## Case-insensitivity by Langium

To make Langium case-insensitive, you have to set the `caseInsensitive` option to `true` in the `LangiumConfig` object which is located in the `langium-config.json` file at the root of your Langium project. You can set this up for every single language.

```json
{
    "projectName": "HelloWorld",
    "languages": [{
        "id": "hello-world",
        "caseInsensitive": true, //here
        //...
    }],
    //...
}
```

## Case-insensitivity on demand

If you want to include case-insensitivity only where you need it, you can use the `i` flag inside of your grammar's regular expressions

```ts
//instead of
Rule: 'keyword';
//use
Rule: /keyword/i;
```

## Case-insensitivity for identifiers and cross-references

But be aware of that both ways will only take care of all the keywords in your grammar. If you want identifiers and cross-references to be case-insensitive as well, you have to adjust your scoping for each cross-reference case. This can be accomplished by setting the `caseInsensitive` option to `true` within the options when you are creating a new scope object.

There are several implementations of scopes. One is `MapScope`:

```ts
new MapScope(descriptions, parentScope, {caseInsensitive: true});
```
