export function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function phonesMatch(left: string, right: string): boolean {
  const leftDigits = normalizePhoneDigits(left);
  const rightDigits = normalizePhoneDigits(right);

  if (!leftDigits || !rightDigits) {
    return false;
  }

  if (leftDigits === rightDigits) {
    return true;
  }

  const minLength = 10;
  if (leftDigits.length >= minLength && rightDigits.length >= minLength) {
    return leftDigits.slice(-minLength) === rightDigits.slice(-minLength);
  }

  return false;
}
