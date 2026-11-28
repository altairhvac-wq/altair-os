/**
 * Characters that cannot be seen. Named by code point, so no source file has
 * to hold one: control characters, zero-width characters, the soft hyphen and
 * the direction overrides. They are used to split a word past a filter or to
 * make text read differently from what it says.
 */
const INVISIBLE_RANGES: readonly (readonly [number, number])[] = [
  [0x0000, 0x0008],
  [0x000b, 0x000c],
  [0x000e, 0x001f],
  [0x007f, 0x007f],
  [0x00ad, 0x00ad],
  [0x200b, 0x200f],
  [0x202a, 0x202e],
  [0x2060, 0x2069],
  [0xfeff, 0xfeff],
];

function isInvisible(codePoint: number): boolean {
  return INVISIBLE_RANGES.some(([from, to]) => codePoint >= from && codePoint <= to);
}

/** True when the text holds a character that cannot be seen. Tabs and line breaks are fine. */
export function hasInvisibleCharacters(value: string): boolean {
  for (const character of value) {
    if (isInvisible(character.codePointAt(0) ?? 0)) return true;
  }
  return false;
}

/** The text with every unseeable character removed. */
export function stripInvisibleCharacters(value: string): string {
  let out = "";
  for (const character of value) {
    if (!isInvisible(character.codePointAt(0) ?? 0)) out += character;
  }
  return out;
}
