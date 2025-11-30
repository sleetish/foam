import { Logger } from '../utils/log';
import { createTestNote } from '../../test/test-utils';
import { createFilter } from './resource-filter';

Logger.setLevel('error');

describe('Resource Filter', () => {
  describe('Filter parameters', () => {
    it('should support the path regex', () => {
      const noteA = createTestNote({
        uri: '/path/to/foo.md',
        type: 'type-1',
      });
      const noteB = createTestNote({
        uri: 'note-b.md',
        type: '/path/to/bar.md',
      });

      const filter = createFilter({ path: 'foo' }, false);

      expect(filter(noteA)).toBeTruthy();
      expect(filter(noteB)).toBeFalsy();
    });

    it('should support expressions when code execution is enabled', () => {
      const noteA = createTestNote({
        uri: 'note-a.md',
        type: 'type-1',
      });
      const noteB = createTestNote({
        uri: 'note-b.md',
        type: 'type-2',
      });

      const filter = createFilter(
        {
          expression: 'resource.type === "type-1"',
        },
        true
      );
      expect(filter(noteA)).toBeTruthy();
      expect(filter(noteB)).toBeFalsy();
    });

    it('should not allow expressions when code execution is not enabled', () => {
      const noteA = createTestNote({
        uri: 'note-a.md',
        type: 'type-1',
      });
      const noteB = createTestNote({
        uri: 'note-b.md',
        type: 'type-2',
      });

      const filter = createFilter(
        {
          expression: 'resource.type === "type-1"',
        },
        false
      );
      expect(filter(noteA)).toBeTruthy();
      expect(filter(noteB)).toBeTruthy();
    });

    it('should support resource type', () => {
      const noteA = createTestNote({
        uri: 'note-a.md',
        type: 'type-1',
      });
      const noteB = createTestNote({
        uri: 'note-b.md',
        type: 'type-2',
      });

      const filter = createFilter(
        {
          type: 'type-1',
        },
        false
      );
      expect(filter(noteA)).toBeTruthy();
      expect(filter(noteB)).toBeFalsy();
    });

    it('should support resource title', () => {
      const noteA = createTestNote({
        uri: 'note-a.md',
        title: 'title-1',
      });
      const noteB = createTestNote({
        uri: 'note-b.md',
        title: 'title-2',
      });
      const noteC = createTestNote({
        uri: 'note-c.md',
        title: 'another title',
      });

      const filter = createFilter(
        {
          title: '^title',
        },
        false
      );
      expect(filter(noteA)).toBeTruthy();
      expect(filter(noteB)).toBeTruthy();
      expect(filter(noteC)).toBeFalsy();
    });
  });

  describe('Filter operators', () => {
    it('should support the OR operator', () => {
      const noteA = createTestNote({
        uri: 'note-a.md',
        type: 'type-1',
      });
      const noteB = createTestNote({
        uri: 'note-b.md',
        type: 'type-2',
      });

      const filter = createFilter(
        {
          or: [{ type: 'type-1' }, { type: 'type-2' }],
        },
        false
      );
      expect(filter(noteA)).toBeTruthy();
      expect(filter(noteB)).toBeTruthy();
    });
  });

  describe('Safe expression evaluator security', () => {
    it('should reject expressions with dangerous patterns like eval', () => {
      const note = createTestNote({
        uri: 'note.md',
        type: 'note',
      });

      // Malicious expression attempting to use eval
      const filter = createFilter(
        {
          expression: 'eval("process.exit()")',
        },
        true
      );

      // Should not crash and should return true (expression ignored due to invalid format)
      expect(filter(note)).toBeTruthy();
    });

    it('should reject expressions attempting prototype pollution', () => {
      const note = createTestNote({
        uri: 'note.md',
        type: 'note',
      });

      const filter = createFilter(
        {
          expression: 'resource.__proto__ === "note"',
        },
        true
      );

      // Should not crash and should return true (expression ignored due to dangerous property)
      expect(filter(note)).toBeTruthy();
    });

    it('should reject expressions attempting constructor access', () => {
      const note = createTestNote({
        uri: 'note.md',
        type: 'note',
      });

      const filter = createFilter(
        {
          expression: 'resource.constructor === "Function"',
        },
        true
      );

      // Should not crash and should return true (expression ignored due to dangerous property)
      expect(filter(note)).toBeTruthy();
    });

    it('should support !== operator', () => {
      const noteA = createTestNote({
        uri: 'note-a.md',
        type: 'draft',
      });
      const noteB = createTestNote({
        uri: 'note-b.md',
        type: 'published',
      });

      const filter = createFilter(
        {
          expression: 'resource.type !== "draft"',
        },
        true
      );
      expect(filter(noteA)).toBeFalsy();
      expect(filter(noteB)).toBeTruthy();
    });

    it('should handle nested property access safely', () => {
      const note = createTestNote({
        uri: '/path/to/note.md',
        type: 'note',
      });

      const filter = createFilter(
        {
          expression: 'resource.uri.path === "/path/to/note.md"',
        },
        true
      );
      expect(filter(note)).toBeTruthy();
    });

    it('should reject arbitrary code execution attempts', () => {
      const note = createTestNote({
        uri: 'note.md',
        type: 'note',
      });

      // Various code injection attempts that should all be rejected
      const maliciousExpressions = [
        'require("fs").readFileSync("/etc/passwd")',
        'process.env.SECRET',
        'this.constructor.constructor("return process")()',
        '(() => { require("child_process").exec("rm -rf /"); return true; })()',
        'Function("return this")()',
      ];

      for (const expr of maliciousExpressions) {
        const filter = createFilter({ expression: expr }, true);
        // Should not crash and should return true (invalid expressions are ignored)
        expect(filter(note)).toBeTruthy();
      }
    });
  });
});
