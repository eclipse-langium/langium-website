---
title: Case-insensitive languages
weight: 100
---

Some programming languages such as SQL or Structured Text use case insensitivity to provide more flexibility when writing code. For example most SQL databases accept select statements starting with `select`, `SELECT` or even `SeLeCt`.

In case you want to provide your users the same flexibility with your language, there are different levels of case-insensitivity in Langium:

* You can make Langium's parser completely case insensitive using the language configuration
* You can include case-insensitivity for specific terminal rules
* You can make cross references case insensitive

All of these options can be enabled independent of one another.

## Case-insensitivity by configuration

To make Langium case-insensitive, you have to set the `caseInsensitive` option to `true` in the `LangiumConfig` object which is located in the `langium-config.json` file at the root of your Langium project. You can set this up for every single language.

```json5
{
    ...
    "languages": [
      {
        "id": "hello-world",
        "caseInsensitive": true, // <-- makes the specified language case insensitive
        ...
      },
      ...
    ],
    ...
}
```

## Case-insensitivity on demand

If you want to include case-insensitivity only where you need it, you can use the `i` flag inside of your grammar's regular expressions

```langium
// append `i` to any regex to make it case insensitive
terminal ID: /[A-Z]/i;
```

Note that regular expressions can only be used inside of terminal rules.

## Case-insensitivity for identifiers and cross-references

But be aware of that both ways will only take care of all the keywords in your grammar. If you want identifiers and cross-references to be case-insensitive as well, you have to adjust your scoping for each cross-reference case. This can be accomplished by setting the `caseInsensitive` option to `true` within the options when you are creating a new scope object.

There are several implementations of scopes. `MapScope` is very commonly used:

```ts
new MapScope(descriptions, parentScope, { caseInsensitive: true });
```
