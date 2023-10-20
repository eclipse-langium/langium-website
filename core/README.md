# core/

We utilize [monaco-editor-wrapper](https://www.npmjs.com/package/monaco-editor-wrapper) and [@typefox/monaco-editor-react](https://www.npmjs.com/package/@typefox/monaco-editor-react) to make the monaco-editor intgration a smoother experience.

This package provides utility `createUserConfig` that provides a fully specified user configuration to be used by either of the two packages. The other purpose is to bundle the code, so it can be integrated with hugo and remove the burden dealing with complex javascript in the hugo build process.
