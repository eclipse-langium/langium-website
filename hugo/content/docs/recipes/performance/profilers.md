---
title: "Profiling"
weight: 100
---

Profiling is the process of measuring the performance of your application to identify bottlenecks and optimize resource usage. In this section, we will explore Langium's profiling tools and techniques that can help you analyze the performance of your parsing process.

## Example file

I will assume that you will be using the `Hello World` example grammar for this tutorial. Furthermore, let's say you have a file `example.hello-world` with the following content:

```plain
person Langium
person Langium2
person Langium3
person Langium4
person Langium5
Hello LangiumWrong!
Hello Langium2!
Hello Langium3!
Hello Langium4!
Hello Langium5!
Hello Langium!
Hello Langium!
Hello Langium!
```

## What do we measure?

With Langium's built-in profilers, you can measure:

* the **parsing** process broken down by each grammar rule. Here, will see how much time was spent in each rule and how many times each rule was invoked

  ```plain
  Task parsing.hello-world executed in 1.69ms and ended at 2025-11-04T16:38:53.225Z
  ┌─────────┬────────────────────────┬───────┬────────┬───────────┐
  │ (index) │ Element                │ Count │ Self % │ Time (ms) │
  ├─────────┼────────────────────────┼───────┼────────┼───────────┤
  │ 0       │ 'hello-world.Model​'    │ 1     │ 48.54  │ 0.82      │
  │ 1       │ 'hello-world.Person​'   │ 5     │ 27.92  │ 0.47      │
  │ 2       │ 'hello-world.Greeting​' │ 8     │ 20.41  │ 0.34      │
  │ 3       │ 'hello-world'          │ 1     │ 3.14   │ 0.05      │
  └─────────┴────────────────────────┴───────┴────────┴───────────┘
  ```

* the **linking** process broken down by each cross-reference. Here, we will see how much time was spent resolving each reference and how many times each reference was resolved.

  ```plain
  Task linking.hello-world executed in 0.92ms and ended at 2025-11-04T16:38:53.228Z
  ┌─────────┬───────────────────────────────┬───────┬────────┬───────────┐
  │ (index) │ Element                       │ Count │ Self % │ Time (ms) │
  ├─────────┼───────────────────────────────┼───────┼────────┼───────────┤
  │ 0       │ 'hello-world.Greeting:person' │ 8     │ 67.22  │ 0.62      │
  │ 1       │ 'hello-world'                 │ 1     │ 32.78  │ 0.3       │
  └─────────┴───────────────────────────────┴───────┴────────┴───────────┘
  ```

* the **validation** process broken down by each grammar rule. TODO what exactly is measured here?

  ```plain
  Task validating.hello-world executed in 0.19ms and ended at 2025-11-04T16:38:53.229Z
  ┌─────────┬────────────────────────┬───────┬────────┬───────────┐
  │ (index) │ Element                │ Count │ Self % │ Time (ms) │
  ├─────────┼────────────────────────┼───────┼────────┼───────────┤
  │ 0       │ 'hello-world.Person'   │ 5     │ 60.83  │ 0.12      │
  │ 1       │ 'hello-world'          │ 1     │ 17.21  │ 0.03      │
  │ 2       │ 'hello-world.Model'    │ 1     │ 13.87  │ 0.03      │
  │ 3       │ 'hello-world.Greeting' │ 8     │ 8.09   │ 0.02      │
  └─────────┴────────────────────────┴───────┴────────┴───────────┘
  ```

## Enabling profiling

By default, profiling is disabled in Langium to avoid unnecessary performance overhead. To enable profiling, you need to modify your Langium services configuration. Here's how you can do it inside of the `module.ts`:

```ts
import { DeepPartial, DefaultLangiumProfiler, type Module, inject } from 'langium';

//...

// override your shared services
export const HelloWorldSharedModule: Module<HelloWorldSharedServices, DeepPartial<HelloWorldSharedServices>> = {
    profilers: {
        LangiumProfiler: () => new DefaultLangiumProfiler()
        //use () => new DefaultLangiumProfiler(new Set(['parsing', 'linking', 'validating']))
        //to enable only specific profilers
    }
}

//...
export function createHelloWorldServices(context: DefaultSharedModuleContext): {
    shared: LangiumSharedServices,
    HelloWorld: HelloWorldServices
} {
    const shared = inject(
        createDefaultSharedModule(context),
        HelloWorldGeneratedSharedModule,
        HelloWorldSharedModule //add this line
    );
    //...
}
```

## Using the profiler

Once profiling is enabled, the `LangiumProfiler` service is triggerd during the parsing, linking, and validation processes. After processing a file, the profiler will output the profiling results to the console as shown above.

```ts
const services = createHelloWorldServices(EmptyFileSystem);
const profiler = services.shared.profilers.LangiumProfiler!;
const parse = parseHelper<Model>(services.HelloWorld);

const result = await parse(`
person Langium
person Langium2
person Langium3
person Langium4
person Langium5
Hello LangiumWrong!
Hello Langium2!
Hello Langium3!
Hello Langium4!
Hello Langium5!
Hello Langium!
Hello Langium!
Hello Langium!
`);

//<-- look at your console!

// Access profiling data programmatically
profiler.getRecords("parsing").forEach(r => console.log(`Parsing record: ${r.identifier} took ${r.duration} ms`));
```
