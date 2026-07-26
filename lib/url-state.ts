/**
 * Encoding calculator state to the query string and back.
 *
 * Calculator inputs live in the URL so every result is a shareable link that
 * restores on load. Values are normalised to bare numeric strings — no `$`, no
 * commas, no `%` — which keeps the URL clean and, because only digits, a dot,
 * and a minus survive, keeps anything a stranger crafts into the URL from
 * reaching the calculator as anything but a number.
 *
 * This module is framework-free and never persists anything; the URL is the
 * only store, and it lives on the user's device.
 */

/** Strip a value down to the characters a number can be made of. */
export function cleanNumeric(value: string): string {
  return value.replace(/[^0-9.\-]/g, '');
}

/**
 * Build a query string from calculator state, dropping empty values so the URL
 * never carries `?balance=&apr=`.
 */
export function encodeState(state: Readonly<Record<string, string>>): string {
  const params = new URLSearchParams();
  for (const key of Object.keys(state).sort()) {
    const value = state[key];
    if (value === undefined) continue;
    const cleaned = cleanNumeric(value);
    if (cleaned !== '') params.set(key, cleaned);
  }
  return params.toString();
}

/**
 * Read the given keys out of a query string, returning only those actually
 * present and non-empty. The caller merges the result over its defaults, so a
 * partial or empty URL still produces a full scenario.
 */
export function decodeState<K extends string>(
  search: string | URLSearchParams,
  keys: readonly K[],
): Partial<Record<K, string>> {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  const out: Partial<Record<K, string>> = {};
  for (const key of keys) {
    const raw = params.get(key);
    if (raw === null) continue;
    const cleaned = cleanNumeric(raw);
    if (cleaned !== '') out[key] = cleaned;
  }
  return out;
}

/**
 * Flatten Next's `searchParams` shape — where a repeated key is an array — down
 * to a single string per key, taking the first occurrence.
 */
export function firstValues(
  searchParams: Readonly<Record<string, string | string[] | undefined>>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(searchParams)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (typeof first === 'string') out[key] = first;
  }
  return out;
}

/** Merge decoded URL values over a set of defaults to get a complete scenario. */
export function withDefaults<K extends string>(
  defaults: Readonly<Record<K, string>>,
  decoded: Partial<Record<K, string>>,
): Record<K, string> {
  const out: Record<K, string> = { ...defaults };
  for (const key of Object.keys(decoded) as K[]) {
    const value = decoded[key];
    if (value !== undefined) out[key] = value;
  }
  return out;
}
