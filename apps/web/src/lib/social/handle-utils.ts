/**
 * Instagram handle extraction utility.
 * Sanitizes URLs, query parameters, and '@' symbols to obtain clean handle.
 */
export function extractInstagramHandle(input: string): string {
  const trimmed = input.trim();
  // Match full Instagram URLs: https://www.instagram.com/natgeo/?hl=en -> natgeo
  const urlMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9._]+)\/?/i);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }
  // Remove leading @ or query strings
  return trimmed.replace(/^@/, '').split('?')[0].replace(/\/$/, '');
}
