Prism.languages.langium = {
    comment: [
        {
            pattern: /\/\*[\s\S]*?\*\//,
            greedy: true
        },
        {
            pattern: /\/\/[^\n\r]*/,
            greedy: true
        }
    ],
    regex: {
        pattern: /\/(?![*+?])(?:[^\r\n\[/\\]|\\.|\[(?:[^\r\n\]\\]|\\.)*\])+\//,
        greedy: true
    },
    string: {
        pattern: /"(\\.|[^"\\])*"|'(\\.|[^'\\])*'/,
        greedy: true
    },
    keyword: {
        pattern: /\b(interface|fragment|terminal|boolean|current|extends|grammar|returns|bigint|hidden|import|infers|number|string|entry|false|infer|Date|true|type|with)\b/
    },
    property: {
        pattern: /\b[a-z][\w]*(?==|\?=|\+=|\??:|>)\b/
    },
    entity: {
        pattern: /\b[A-Z][\w]*\b/
    }
};
