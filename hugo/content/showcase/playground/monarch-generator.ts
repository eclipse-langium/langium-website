import * as langium from "langium";
import { stream } from "langium/src/utils/stream";
import {
  getTerminalParts,
  isCommentTerminal,
  isRegexToken,
  isTerminalRule,
  terminalRegex,
  TerminalRule,
} from "langium";
  
  /**
   * Generates a Monarch highlighting grammar file's contents, based on the passed Langium grammar
   * @param grammar Langium grammar to use in generating this Monarch syntax highlighting file content
   * @param config Langium Config to also use during generation
   * @returns Generated Monarch syntax highlighting file content
   */
  export function generateMonarch(grammar: langium.Grammar, id: string) {
  const symbols = getSymbols(grammar);
  const regex = /[{}[\]()]/;
  const operators = symbols.filter((s) => !regex.test(s));

  // build absract monarch grammar representation
  const monarchGrammar: IMonarchLanguage = {
    languageDefinition: {
      keywords: getKeywords(grammar),
      operators,
      symbols,
      tokenPostfix: "." + id, // category appended to all tokens
    },
    tokenizer: getTokenizerStates(grammar)
  };

  // return concrete monarch grammar representation
  return monarchGrammar;
}

/**
 * Gets Monarch tokenizer states from a Langium grammar
 * @param grammar Langium grammar to source tokenizer states from
 * @returns Array of tokenizer states
 */
function getTokenizerStates(grammar: langium.Grammar): ITokens {
  return {
    keywords: getTerminalRules(grammar),
    whitespace: getWhitespaceRules(grammar),
    comment: getCommentRules(grammar)
  }
}

/**
 * Extracts Monarch token name from a Langium terminal rule, using either name or type.
 * @param rule Rule to convert to a Monarch token name
 * @returns Returns the equivalent monarch token name, or the original rule name
 */
function getMonarchTokenName(rule: TerminalRule): string {
  if (rule.name.toLowerCase() === "string") {
    // string is clarified as a terminal by name, but not necessarily by type
    return "string";
  } else if (rule.type) {
    // use rule type
    return rule.type.name;
  } else {
    // fallback to the original name
    return rule.name;
  }
}


export interface IAction {
	// an action is either a group of actions
	group?: FuzzyAction[]

	// or a function that returns a fresh action
	test?: (id: string, matches: string[], state: string, eos: boolean) => FuzzyAction
	case_values?: FuzzyAction[]

	// or it is a declarative action with a token value and various other attributes
	token?: string
	tokenSubst?: boolean
	next?: string
	nextEmbedded?: string
	bracket?: MonarchBracket
	log?: string
	switchTo?: string
	goBack?: number
	transform?: (states: string[]) => string[]

	parser?: IMonarchParserAction
}

function getWhitespaceRules(grammar: langium.Grammar): IMonarchLanguageRule[] {
  const rules: IMonarchLanguageRule[] = [];
  for (const rule of grammar.rules) {
    if (isTerminalRule(rule) && isRegexToken(rule.definition)) {
      const regex = new RegExp(terminalRegex(rule));

      if (!isCommentTerminal(rule) && !regex.test(" ")) {
        // skip rules that are not comments or whitespace
        continue;
      }

      // token name is either comment or whitespace
      const tokenName = isCommentTerminal(rule) ? "comment" : "white";

      const part = getTerminalParts(terminalRegex(rule))[0];

      // check if this is a comment terminal w/ a start & end sequence (multi-line)
      if (part.start !== "" && part.end !== "" && isCommentTerminal(rule)) {
        // state-based comment rule, only add push to jump into it
        rules.push({
          regex: new RegExp(part.start.replace("/", "\\/")),
          action: { token: tokenName, next: "@" + tokenName },
        });
      } else {
        // single regex rule, generally for whitespace
        rules.push({
          regex: rule.definition.regex,
          action: { token: tokenName },
        });
      }
    }
  }
  return rules;
}

/**
 * Gets comment state rules from the Langium grammar.
 * Accounts for multi-line comments, but without nesting.
 * @param grammar Langium grammar to extract comment rules from
 * @returns Array of Monarch comment rules
 */
function getCommentRules(grammar: langium.Grammar): IMonarchLanguageRule[] {
  const rules: IMonarchLanguageRule[] = [];
  for (const rule of grammar.rules) {
    if (
      isTerminalRule(rule) &&
      isCommentTerminal(rule) &&
      isRegexToken(rule.definition)
    ) {
      const tokenName = "comment";
      const part = getTerminalParts(terminalRegex(rule))[0];
      if (part.start !== "" && part.end !== "") {
        // rules to manage comment start/end
        // rule order matters

        const start = part.start.replace("/", "\\/");
        const end = part.end.replace("/", "\\/");

        // 1st, add anything that's not in the start sequence
        rules.push({
          regex: `[^${start}]+`,
          action: { token: tokenName },
        });

        // 2nd, end of sequence, pop this state, keeping others on the stack
        rules.push({
          regex: end,
          action: { token: tokenName, next: "@pop" },
        });

        // 3rd, otherwise, start sequence characters are OK in this state
        rules.push({
          regex: `[${start}]`,
          action: { token: tokenName },
        });
      }
    }
  }
  return rules;
}

/**
 * Retrieves non-comment terminal rules, creating associated actions for them
 * @param grammar Grammar to get non-comment terminals from
 * @returns Array of Rules to add to a Monarch tokenizer state
 */
function getTerminalRules(grammar: langium.Grammar): IMonarchLanguageRule[] {
  const rules: IMonarchLanguageRule[] = [];
  for (const rule of grammar.rules) {
    if (
      isTerminalRule(rule) &&
      !isCommentTerminal(rule) &&
      isRegexToken(rule.definition)
    ) {
      const regex = new RegExp(terminalRegex(rule));

      if (regex.test(" ")) {
        // disallow terminal rules that match whitespace
        continue;
      }

      const tokenName = getMonarchTokenName(rule);
      // default action...
      let action: IMonarchLanguageAction | any[] = { token: tokenName };
/*
      if (getKeywords(grammar).some((keyword) => regex.test(keyword))) {
        // this rule overlaps with at least one keyword
        // add case so keywords aren't tagged incorrectly as this token type
        action = [
          {
            guard: "@keywords",
            action: { token: "keyword" },
          },
          {
            guard: "@default",
            action, // include default action from above
          },
        ];
      }
*/
      rules.push({
        regex: new RegExp(rule.definition.regex),
        action,
      });
    }
  }
  return rules;
}

/**
 * Keyword regex for matching keyword terminals, or for only collecting symbol terminals
 */
const KeywordRegex = /[A-Za-z]/;

/**
 * Retrieves keywords from the current grammar
 * @param grammar Grammar to get keywords from
 * @returns Array of keywords
 */
function getKeywords(grammar: langium.Grammar): string[] {
  return collectKeywords(grammar).filter((kw) => KeywordRegex.test(kw));
}

/**
 * Retrieve symbols from langium grammar
 * @param grammar Grammar to get symbols from
 * @returns Array of symbols, effective inverse of getKeywords
 */
function getSymbols(grammar: langium.Grammar): string[] {
  return collectKeywords(grammar).filter((kw) => !KeywordRegex.test(kw));
}

export function collectKeywords(grammar: langium.Grammar): string[] {
  const keywords = new Set<string>();

  for (const rule of stream(grammar.rules).filter(langium.isParserRule)) {
    collectElementKeywords(rule.definition, keywords);
  }

  return Array.from(keywords).sort((a, b) => a.localeCompare(b));
}

function collectElementKeywords(
  element: langium.AbstractElement,
  keywords: Set<string>
) {
  if (
    langium.isAlternatives(element) ||
    langium.isGroup(element) ||
    langium.isUnorderedGroup(element)
  ) {
    for (const item of element.elements) {
      collectElementKeywords(item, keywords);
    }
  } else if (langium.isAssignment(element)) {
    collectElementKeywords(element.terminal, keywords);
  } else if (langium.isKeyword(element)) {
    keywords.add(element.value);
  }
}

export interface IMonarchLanguage {
	/** map from string to ILanguageRule[] */
	tokenizer: ITokens
	/** is the language case insensitive? */
	ignoreCase?: boolean
	/** is the language unicode-aware? (i.e., /\u{1D306}/) */
	unicode?: boolean
	/** if no match in the tokenizer assign this token class */
	defaultToken?: string
	/** for example [['{','}','delimiter.curly']] */
	brackets?: IMonarchLanguageBracket[]
	/** start symbol in the tokenizer (by default the first entry is used) */
	start?: string

	[attr: string]: any
}

/**
 * A rule is either a regular expression and an action
 * 		shorthands: [reg,act] == { regex: reg, action: act}
 *		and       : [reg,act,nxt] == { regex: reg, action: act{ next: nxt }}
 */
export type IShortMonarchLanguageRule1 = [string | RegExp, IMonarchLanguageAction]

export type IShortMonarchLanguageRule2 = [string | RegExp, IMonarchLanguageAction, string]

export interface IExpandedMonarchLanguageRule {
	/** match tokens */
	regex?: string | RegExp
	/** action to take on match */
	action?: IMonarchLanguageAction

	/** or an include rule. include all rules from the included state */
	include?: string
}

export type IMonarchLanguageRule = IShortMonarchLanguageRule1
	| IShortMonarchLanguageRule2
	| IExpandedMonarchLanguageRule


export type IMonarchParserAction = {
	open?: string[] | string
	close?: string[] | string
	start?: string[] | string
	end?: string[] | string
}

/**
 * An action is either an array of actions...
 * ... or a case statement with guards...
 * ... or a basic action with a token value.
 */
export type IShortMonarchLanguageAction = string

export interface IExpandedMonarchLanguageAction {
	/** array of actions for each parenthesized match group */
	group?: IMonarchLanguageAction[]
	/** map from string to ILanguageAction */
	cases?: Object
	/** token class (ie. css class) (or "@brackets" or "@rematch") */
	token?: string
	/** Directs how the parser will nest your tokens. */
	parser?: IMonarchParserAction
	/** the next state to push, or "@push", "@pop", "@popall" */
	next?: string
	/** switch to this state */
	switchTo?: string
	/** go back n characters in the stream */
	goBack?: number
	/** @open or @close */
	bracket?: string
	/** switch to embedded language (using the mimetype) or get out using "@pop" */
	nextEmbedded?: string
	/** log a message to the browser console window */
	log?: string
}

export type IMonarchLanguageAction = IShortMonarchLanguageAction
	| IExpandedMonarchLanguageAction
	| (IShortMonarchLanguageAction | IExpandedMonarchLanguageAction)[]

/** This interface can be shortened as an array, ie. ['{','}','delimiter.curly'] */
export interface IMonarchLanguageBracket {
	/** open bracket */
	open: string
	/** closing bracket */
	close: string
	/** token class */
	token: string
}

// Internal/compiled type definitions

export const enum MonarchBracket {
	None = 0,
	Open = 1,
	Close = -1
}

export interface ILexerMin {
	ignoreCase: boolean
	unicode: boolean
	defaultToken: string
	stateNames: { [stateName: string]: any }
	[attr: string]: any
}

export interface ITokens { [stateName: string]: IMonarchLanguageRule[] }

export interface ILexer extends ILexerMin {
	maxStack: number
	start: string | null
	ignoreCase: boolean
	unicode: boolean
	tokenTypes: Set<string>
	tokenizer: ITokens;
	brackets: IBracket[]
}

export interface IBracket {
	token: string
	open: string
	close: string
}

export type FuzzyAction = IAction | string

export interface IRule {
	regex: RegExp
	action: FuzzyAction
	matchOnlyAtLineStart: boolean
	name: string
}

export interface IAction {
	// an action is either a group of actions
	group?: FuzzyAction[]

	// or a function that returns a fresh action
	test?: (id: string, matches: string[], state: string, eos: boolean) => FuzzyAction
	case_values?: FuzzyAction[]

	// or it is a declarative action with a token value and various other attributes
	token?: string
	tokenSubst?: boolean
	next?: string
	nextEmbedded?: string
	bracket?: MonarchBracket
	log?: string
	switchTo?: string
	goBack?: number
	transform?: (states: string[]) => string[]

	parser?: IMonarchParserAction
}

export interface IBranch {
	name: string
	value: FuzzyAction
	test?: (id: string, matches: string[], state: string, eos: boolean) => boolean
}

export interface IAction {
	// an action is either a group of actions
	group?: FuzzyAction[]

	// or a function that returns a fresh action
	test?: (id: string, matches: string[], state: string, eos: boolean) => FuzzyAction
	case_values?: FuzzyAction[]

	// or it is a declarative action with a token value and various other attributes
	token?: string
	tokenSubst?: boolean
	next?: string
	nextEmbedded?: string
	bracket?: MonarchBracket
	log?: string
	switchTo?: string
	goBack?: number
	transform?: (states: string[]) => string[]

	parser?: IMonarchParserAction
}