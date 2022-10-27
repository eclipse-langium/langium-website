---
title: "Building an Extension"
weight: 5
---

In this guide we'll be quickly going over how to build a VSIX extension (VSCode extension) for your Langium-based language. This will allow providing LSP support in VSCode for your language, syntax highlighting, and even code actions to resolve issues. We'll assume that you've already looked at the previous guides, particularly the bundling guide, so that you're ready to build an extension. At this point we assume that your language is also complete, and there are no issues running `npm run langium:generate` or `npm run build`. If there are, you'll want to correct those first.

With that being said, this is one of the more exciting facets of designing a language. At this stage we're ready to view our results in a full featured editor.

## Setting up the Scripts

To get started, you'll want to have a language expressed in the Langium, such as [Lox](https://github.com/langium/langium-lox) or [MiniLogo](https://github.com/langium/langium-minilogo). If you have been following along with these guides, you should already have something ready. If you don't you can also use the hello world language from the yeoman generator, presented in the [getting started](/docs/getting-started/) section.

Regardless of what language you're working with. You'll want to make sure you have the following scripts in your **package.json**.

```json
{
    ...,
    "vscode:prepublish": "npm run esbuild-base -- --minify && npm run lint",
    "esbuild-base": "esbuild ./src/extension.ts --bundle --outfile=out/main.js --external:vscode --format=cjs --platform=node",
    "lint": "eslint src --ext ts"
}
```

The `esbuild-base` script is particularly important, as it will be constructing the extension itself and giving it a certain name.

You'll also need to install `esbuild` if you haven't already.

```bash
npm i --save-dev esbuild
```

At this point we're ready to generate are extension. To bundle the extension, we need the VS Code Extension Manager (`vsce`). If you haven't already, make sure to download this from npm via `npm install -g vsce`. Once you have that installed, you can invoke it like so from the root of our project.

```bash
vsce package
```

You should now see a VSIX extension file in the root of your project. The name of this file will correspond with the **name** and **version** properties listed in your **package.json**. For MiniLogo, this was called **minilogo-0.1.0.vsix**.

For installing the extension, you can right click the extension itself, and select "Install VSIX Extension" at the bottom of the list. You should see a small indication that your VSIX extension has been successfully installed. You can verify this by going to your extensions tab and looking at the enabled extensions, where you should find the name of your language (again corresponding to the **name** property in your package.json). Assuming the extension is enabled and working correctly, you can open any file that ends in the extensions registered for your language, and you should immediately observe highlighting. Interaction with your language should show that syntax errors are recognized, and other LSP functionalities are working as intended (such as renaming of symbols).

You may also notice that your extension may not have an icon to start with. This is a small thing that we can fix real quickly here, just so that we have something nice to show off to everyone else. This is as simple as adding a small PNG icon somewhere in your project repo, such as the root. You'll also want to set the **icon** property in your package.json with the path to this icon. When you regenerate your extension & reinstall it, you should get an icon that is the same as the one that you packaged it with.

And that's it, at this point you have a functional extension you can use. After some testing, and improvments, you could even publish it.

As a quick aside, it's important to keep the extensions that your language recognizes up to date in both your **package.json** and your **langium-config.json**. If you do make changes to your extensions, it's a good idea to double check that these are both synced up, and to do a full rebuild to get those changes into your extension.

And that's it for building an extension. In the next guide, we'll be setting up [Langium + Monaco in the web](/guides/langium_and_monaco).
