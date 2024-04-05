---
title: "Generate the AST"
weight: 500
url: /docs/learn/workflow/generate_ast
---

{{<mermaid>}}
graph TB
  Model-->persons
  Model-->greetings
  
  persons-->P1[Person]
  P1 --> H1('person')
  P1 --> N1[name]
  N1 --> NL1('John')
  
  persons-->P2[Person]
  P2 --> H2('person')
  P2 --> N2[name]
  N2 --> NL2('Jane')

  greetings-->G1[Greeting]
  G1 --> KW1('hello')
  G1 --> PRef1[Ref]
  G1 --> EM1('!')
  PRef1 --> QM1{?}

  greetings-->G2[Greeting]
  G2 --> KW2('hello')
  G2 --> PRef2[Ref]
  G2 --> EM2('!')
  PRef2 --> QM2{?}
{{</mermaid>}}