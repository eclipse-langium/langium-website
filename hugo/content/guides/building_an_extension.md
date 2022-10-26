---
title: "Building an Extension"
weight: 5
---

And this guy will be talking about building a yes I ask extension for your language implemented in Langum. This assumes that you've already looked at the previous guides discussing how to write your grammar, perform validation, Justin you're silly, generation, and also basically bundling. At this point we assume that your language is essentially complete, but you just need to be able to construct an extension and being able to actually added into something like VS code to actually view how it works in real time. This is one of the more exciting faces of designing a language, as it allows you to not only view your own handiwork but really see how your language support works in a full featured editor.

To get started, do you wanna have a language expressed in the Langham injury from work. Have you been following along with his tutorials, you should already have something ready. If you don't you can also check out the human generator to get a hell world example going, and that will work just fine. You can also fall along using one of our previously written languages, like Langham locks, or Langum mini logo. In either case your scripts for any of these languages or even the default Halloween old one, should include a VS code: pre-publish script. This script just runs your build and lengths to make sure that everything looks OK it's, it's not going to build our extension for us, But it is the first step and being able to write extension. You should also have the lint script as well or the written for you, but if you don't will pointed out right below here.

```
"vscode:prepublish": "npm run esbuild-base -- --minify && npm run lint",
"lint": "eslint src --ext ts",
```

In addition to this to Scripps, you also want to add an ES build – script. Skip this particular important because this will actually be constructing the extension itself and giving it a certain name, so I was setting the format, platform cetera. We can add this like so:

```
"esbuild-base": "esbuild ./src/extension.ts --bundle --outfile=out/main.js --external:vscode --format=cjs --platform=node"
```

 this point, we're about ready to generate are extension. If you're wondering with this extension that he has parlors, don't worry too much about it as it is already in place for you by default Langum. However, if you do some specific customizations to how the language client works, you could modify this extension.es file to be able to make those changes.

No, the bundle the extension, we need the VS Code Extension Manager (vsce). We can also down this from NPM, and in this example were using version to turn 11th of zero. What's the obviously, producing your extension is a simple as running the following.

```bash
vsce package
```

Assuming all is well this command will run your VS code: pre-publish script, followed by your yes build base script, and lastly running your lunch script. At the end you should see, and the route of your project, a small the SIX file corresponds to your visual studio extension. For many logo this one is called mini logo – 0.10 David SIX. Note that the name of your extension corresponds directly to the name property in your package to Jason towards the version property in your package by JSON. Updating either of these will update the extension name as well, Which is quite handy.

For installing the extension, you can right click the extension itself, and select "Install VSIX Extension" at the bottom of the list. This point you should see a small indication of the bottom right corner of the screen that your VSIX in extension has been successfully installed. You can verify this by going to your extensions tab looking at the enabled extensions, where you should find the name of your language (Again corresponding to the name of your package that Jason Close parentheses closing parentheses). But you may notice that your extension may not have an icon to start with. This is a small thing that we can fix real quickly here, just so that we have something nice to show off to everyone else.

This is a simple as adding some small PNG icon to the root of your project repo. You also want to add this icon into the icon property of your package to Jason. Then when you regenerate your extension, you should get an icon that is the same as the one that you packaged. And that's it, at this point you have a functional extension you can try out by opening any file that matches the Extensions that are listed for your language. I don't know this, but it has a fancy icon to. All that's left is to actually publisher extension to the store. However that is something that we won't cover here.

As a quick aside, it's important that if you were language can have other extensions besides the default one that you want to add those into your package Jason as well. You're also want to make sure to add the same extensions into your language – config that Jason file. Otherwise, the language server won't actually pick up these new files with this new extension, they'll just use the pre-existing ones. So you want to keep this in mind, and keep both of these files in sync with regards to the extensions that are actually legitimate for your language. Also, it goes without saying, but make sure that you choose a unique or relative unique extension, let's do end up conflicting with another language server that also supports the same extension but for a totally different language. And practice this is not usually a problem, but it's something you want to be able to pay attention to in case it comes up.

And that's it. In the next guide, We'll be talking about running Langum and Monaco in the web.