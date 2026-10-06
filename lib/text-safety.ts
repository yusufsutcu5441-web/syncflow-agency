/**
 * Character classes that must never reach logs, webhooks or downstream UIs.
 *
 * They are built from code points at runtime instead of being written as regex literals on purpose: raw invisible
 * characters in source files are exactly how "Trojan Source" attacks hide, and editors, formatters and some tools
 * silently rewrite or strip them. Built this way the source stays plain ASCII.
 */

const chars = (from: number, to: number = from) => (from === to ? String.fromCharCode(from) : `${String.fromCharCode(from)}-${String.fromCharCode(to)}`);

/** C0 control characters except tab (9), line feed (10) and carriage return (13), plus DEL (127). */
const CONTROL = `[${chars(0, 8)}${chars(11, 12)}${chars(14, 31)}${chars(127)}]`;

/** Zero-width characters, bidirectional embedding/override/isolate controls, line/paragraph separators and the BOM. */
const INVISIBLE = `[${chars(0x200b, 0x200f)}${chars(0x2028, 0x202e)}${chars(0x2060, 0x2069)}${chars(0xfeff)}]`;

const CONTROL_ALL = new RegExp(CONTROL, 'g');
const CONTROL_ONE = new RegExp(CONTROL);
const INVISIBLE_ALL = new RegExp(INVISIBLE, 'g');

export const hasControlChars = (value: string): boolean => CONTROL_ONE.test(value);
export const stripControlChars = (value: string): string => value.replace(CONTROL_ALL, '');
export const stripInvisibleChars = (value: string): string => value.replace(INVISIBLE_ALL, '');

/** JSON.stringify leaves U+2028/U+2029 alone; escape them so the output is also safe inside any script context. */
export const escapeLineSeparators = (json: string): string =>
  json.split(String.fromCharCode(0x2028)).join('\\u2028').split(String.fromCharCode(0x2029)).join('\\u2029');
