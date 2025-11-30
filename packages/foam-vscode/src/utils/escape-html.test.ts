import { escapeHtml } from './escape-html';

describe('escapeHtml', () => {
  it('should escape ampersands', () => {
    expect(escapeHtml('foo & bar')).toBe('foo &amp; bar');
  });

  it('should escape less than signs', () => {
    expect(escapeHtml('foo < bar')).toBe('foo &lt; bar');
  });

  it('should escape greater than signs', () => {
    expect(escapeHtml('foo > bar')).toBe('foo &gt; bar');
  });

  it('should escape double quotes', () => {
    expect(escapeHtml('foo "bar"')).toBe('foo &quot;bar&quot;');
  });

  it('should escape single quotes', () => {
    expect(escapeHtml("foo 'bar'")).toBe('foo &#39;bar&#39;');
  });

  it('should escape all special characters together', () => {
    expect(escapeHtml('<script>alert("XSS")</script>')).toBe(
      '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
    );
  });

  it('should handle empty strings', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('should not modify strings without special characters', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World');
  });

  it('should handle strings with only special characters', () => {
    expect(escapeHtml('<>&"\'')).toBe('&lt;&gt;&amp;&quot;&#39;');
  });

  it('should prevent XSS via wikilink injection', () => {
    // This simulates a malicious wikilink name
    const maliciousInput = '<img src=x onerror=alert("XSS")>';
    const escaped = escapeHtml(maliciousInput);
    expect(escaped).not.toContain('<');
    expect(escaped).not.toContain('>');
    expect(escaped).toBe('&lt;img src=x onerror=alert(&quot;XSS&quot;)&gt;');
  });

  it('should prevent XSS via tag injection', () => {
    const maliciousTag = '#<script>alert(1)</script>';
    const escaped = escapeHtml(maliciousTag);
    expect(escaped).toBe('#&lt;script&gt;alert(1)&lt;/script&gt;');
  });
});
