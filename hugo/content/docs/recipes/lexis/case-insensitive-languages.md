---
title: "Case-insensitive languages"
weight: 100
---

* case-insensitive languages are more suitable for beginners, because they don't have to worry about the case of identifiers and keywords
* there are basically two options you can choose from:
  * you can either make Langium case-insensitive by configuration
  * or you can include case-insensitivity only where you need it

## Case-insensitive Langium

* to make Langium case-insensitive, you have to set the `caseInsensitive` option in the `LangiumConfig` object

## Case-insensitivity on demand

* if you want to include case-insensitivity only where you need it, you can use the `i` flag inside of your grammar regexes
* do not forget to adjust your scoping as well!