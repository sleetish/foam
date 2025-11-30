/**
 * Escapes HTML special characters to prevent XSS attacks.
 * This function should be used when inserting user-generated content
 * into HTML templates.
 *
 * @param text The text to escape
 * @returns The escaped text safe for HTML insertion
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
