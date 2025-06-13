import { describe, it, expect } from "bun:test";
import { stringify } from "../lib/iterativeStringify";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

describe("iterativeStringify", () => {
  describe("primitive values", () => {
    it("should handle null", () => {
      expect(stringify(null)).toBe("null");
      expect(stringify(null)).toBe(JSON.stringify(null));
    });

    it("should handle undefined", () => {
      expect(stringify(undefined as any)).toBe("null");
    });

    it("should handle boolean values", () => {
      expect(stringify(true)).toBe("true");
      expect(stringify(false)).toBe("false");
      expect(stringify(true)).toBe(JSON.stringify(true));
      expect(stringify(false)).toBe(JSON.stringify(false));
    });

    it("should handle numbers", () => {
      expect(stringify(0)).toBe("0");
      expect(stringify(42)).toBe("42");
      expect(stringify(-42)).toBe("-42");
      expect(stringify(3.14)).toBe("3.14");
      expect(stringify(-3.14)).toBe("-3.14");

      expect(stringify(0)).toBe(JSON.stringify(0));
      expect(stringify(42)).toBe(JSON.stringify(42));
      expect(stringify(-42)).toBe(JSON.stringify(-42));
      expect(stringify(3.14)).toBe(JSON.stringify(3.14));
    });

    it("should handle special numbers", () => {
      expect(stringify(NaN)).toBe("null");
      expect(stringify(Infinity)).toBe("null");
      expect(stringify(-Infinity)).toBe("null");

      expect(stringify(NaN)).toBe(JSON.stringify(NaN));
      expect(stringify(Infinity)).toBe(JSON.stringify(Infinity));
      expect(stringify(-Infinity)).toBe(JSON.stringify(-Infinity));
    });

    it("should handle strings", () => {
      expect(stringify("hello")).toBe('"hello"');
      expect(stringify("")).toBe('""');
      expect(stringify("hello")).toBe(JSON.stringify("hello"));
      expect(stringify("")).toBe(JSON.stringify(""));
    });
  });

  describe("string escaping", () => {
    it("should escape quotes", () => {
      expect(stringify('hello "world"')).toBe('"hello \\"world\\""');
      expect(stringify('hello "world"')).toBe(JSON.stringify('hello "world"'));
    });

    it("should escape backslashes", () => {
      expect(stringify("hello\\world")).toBe('"hello\\\\world"');
      expect(stringify("hello\\world")).toBe(JSON.stringify("hello\\world"));
    });

    it("should escape newlines", () => {
      expect(stringify("hello\nworld")).toBe('"hello\\nworld"');
      expect(stringify("hello\nworld")).toBe(JSON.stringify("hello\nworld"));
    });

    it("should escape carriage returns", () => {
      expect(stringify("hello\rworld")).toBe('"hello\\rworld"');
      expect(stringify("hello\rworld")).toBe(JSON.stringify("hello\rworld"));
    });

    it("should escape tabs", () => {
      expect(stringify("hello\tworld")).toBe('"hello\\tworld"');
      expect(stringify("hello\tworld")).toBe(JSON.stringify("hello\tworld"));
    });

    it("should escape backspace", () => {
      expect(stringify("hello\bworld")).toBe('"hello\\bworld"');
      expect(stringify("hello\bworld")).toBe(JSON.stringify("hello\bworld"));
    });

    it("should escape form feed", () => {
      expect(stringify("hello\fworld")).toBe('"hello\\fworld"');
      expect(stringify("hello\fworld")).toBe(JSON.stringify("hello\fworld"));
    });

    it("should handle complex escape combinations", () => {
      const complexString = 'hello\n"world"\t\\foo\r\nbar';
      expect(stringify(complexString)).toBe(JSON.stringify(complexString));
    });
  });

  describe("arrays", () => {
    it("should handle empty arrays", () => {
      expect(stringify([])).toBe("[]");
      expect(stringify([])).toBe(JSON.stringify([]));
    });

    it("should handle single element arrays", () => {
      expect(stringify([1])).toBe("[1]");
      expect(stringify(["hello"])).toBe('["hello"]');
      expect(stringify([true])).toBe("[true]");
      expect(stringify([null])).toBe("[null]");

      expect(stringify([1])).toBe(JSON.stringify([1]));
      expect(stringify(["hello"])).toBe(JSON.stringify(["hello"]));
      expect(stringify([true])).toBe(JSON.stringify([true]));
      expect(stringify([null])).toBe(JSON.stringify([null]));
    });

    it("should handle multiple element arrays", () => {
      expect(stringify([1, 2, 3])).toBe("[1,2,3]");
      expect(stringify(["a", "b", "c"])).toBe('["a","b","c"]');
      expect(stringify([1, "hello", true, null])).toBe('[1,"hello",true,null]');

      expect(stringify([1, 2, 3])).toBe(JSON.stringify([1, 2, 3]));
      expect(stringify(["a", "b", "c"])).toBe(JSON.stringify(["a", "b", "c"]));
      expect(stringify([1, "hello", true, null])).toBe(
        JSON.stringify([1, "hello", true, null])
      );
    });

    it("should handle nested arrays", () => {
      expect(
        stringify([
          [1, 2],
          [3, 4],
        ])
      ).toBe("[[1,2],[3,4]]");
      expect(stringify([1, [2, [3, 4]], 5])).toBe("[1,[2,[3,4]],5]");

      expect(
        stringify([
          [1, 2],
          [3, 4],
        ])
      ).toBe(
        JSON.stringify([
          [1, 2],
          [3, 4],
        ])
      );
      expect(stringify([1, [2, [3, 4]], 5])).toBe(
        JSON.stringify([1, [2, [3, 4]], 5])
      );
    });

    it("should handle arrays with mixed types", () => {
      const mixed = [1, "hello", true, null, [2, 3], { key: "value" }];
      const result = stringify(mixed);
      const expected = JSON.stringify(mixed);
      expect(result).toBe(expected);
    });
  });

  describe("objects", () => {
    it("should handle empty objects", () => {
      expect(stringify({})).toBe("{}");
      expect(stringify({})).toBe(JSON.stringify({}));
    });

    it("should handle single property objects", () => {
      expect(stringify({ key: "value" })).toBe('{"key":"value"}');
      expect(stringify({ num: 42 })).toBe('{"num":42}');
      expect(stringify({ bool: true })).toBe('{"bool":true}');
      expect(stringify({ nil: null })).toBe('{"nil":null}');

      expect(stringify({ key: "value" })).toBe(
        JSON.stringify({ key: "value" })
      );
      expect(stringify({ num: 42 })).toBe(JSON.stringify({ num: 42 }));
      expect(stringify({ bool: true })).toBe(JSON.stringify({ bool: true }));
      expect(stringify({ nil: null })).toBe(JSON.stringify({ nil: null }));
    });

    it("should handle multiple property objects", () => {
      const obj = { a: 1, b: "hello", c: true, d: null };
      const result = stringify(obj);
      const expected = JSON.stringify(obj);
      expect(result).toBe(expected);
    });

    it("should handle nested objects", () => {
      const nested = {
        user: {
          name: "John",
          details: {
            age: 30,
            active: true,
          },
        },
      };
      const result = stringify(nested);
      const expected = JSON.stringify(nested);
      expect(result).toBe(expected);
    });

    it("should handle objects with special key names", () => {
      const obj = {
        "": "empty key",
        "key with spaces": "value",
        'key"with"quotes': "value",
        "key\nwith\nnewlines": "value",
      };
      const result = stringify(obj);
      const expected = JSON.stringify(obj);
      expect(result).toBe(expected);
    });
  });

  describe("complex nested structures", () => {
    it("should handle arrays of objects", () => {
      const data = [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
        { id: 3, name: "Charlie" },
      ];
      const result = stringify(data);
      const expected = JSON.stringify(data);
      expect(result).toBe(expected);
    });

    it("should handle objects with arrays", () => {
      const data = {
        users: ["Alice", "Bob", "Charlie"],
        scores: [95, 87, 92],
        active: true,
      };
      const result = stringify(data);
      const expected = JSON.stringify(data);
      expect(result).toBe(expected);
    });

    it("should handle deeply nested structures", () => {
      const data = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  data: [1, 2, 3],
                  more: {
                    level6: "deep value",
                  },
                },
              },
            },
          },
        },
      };
      const result = stringify(data);
      const expected = JSON.stringify(data);
      expect(result).toBe(expected);
    });
  });

  describe("circular references", () => {
    it("should throw error for circular object references", () => {
      const obj: any = { name: "test" };
      obj.self = obj;

      expect(() => stringify(obj)).toThrow(
        "Converting circular structure to JSON"
      );
    });

    it("should throw error for circular array references", () => {
      const arr: any = [1, 2, 3];
      arr.push(arr);

      expect(() => stringify(arr)).toThrow(
        "Converting circular structure to JSON"
      );
    });

    it("should throw error for indirect circular references", () => {
      const obj1: any = { name: "obj1" };
      const obj2: any = { name: "obj2" };
      obj1.ref = obj2;
      obj2.ref = obj1;

      expect(() => stringify(obj1)).toThrow(
        "Converting circular structure to JSON"
      );
    });
  });

  describe("performance and memory tests", () => {
    it("should handle large flat arrays", () => {
      const largeArray = new Array(10000).fill(0).map((_, i) => i);
      const result = stringify(largeArray);
      const expected = JSON.stringify(largeArray);
      expect(result).toBe(expected);
    });

    it("should handle large flat objects", () => {
      const largeObject: any = {};
      for (let i = 0; i < 1000; i++) {
        largeObject[`key${i}`] = `value${i}`;
      }
      const result = stringify(largeObject);
      const expected = JSON.stringify(largeObject);
      expect(result).toBe(expected);
    });

    it("should handle moderately deep structures", () => {
      // Create a structure that's deep enough to test but not cause stack overflow
      let current: any = { value: 0 };
      const root = current;

      for (let i = 1; i < 100; i++) {
        current.next = { value: i };
        current = current.next;
      }

      const result = stringify(root);
      const expected = JSON.stringify(root);
      expect(result).toBe(expected);
    });
  });

  describe("edge cases", () => {
    it("should handle objects with numeric keys", () => {
      const obj = { 0: "zero", 1: "one", 2: "two" };
      const result = stringify(obj);
      const expected = JSON.stringify(obj);
      expect(result).toBe(expected);
    });

    it("should handle arrays with sparse elements", () => {
      const arr = [1, undefined, 3, undefined, 5]; // sparse array (explicit undefined instead of holes)
      const result = stringify(arr as any); // Cast to any to allow undefined in JsonValue context
      const expected = JSON.stringify(arr);
      expect(result).toBe(expected);
    });

    it("should handle mixed object and array nesting", () => {
      const data = {
        users: [
          { name: "Alice", hobbies: ["reading", "swimming"] },
          { name: "Bob", hobbies: ["gaming", "cooking"] },
        ],
        metadata: {
          total: 2,
          tags: ["active", "verified"],
        },
      };
      const result = stringify(data);
      const expected = JSON.stringify(data);
      expect(result).toBe(expected);
    });

    it("should handle empty strings as keys", () => {
      const obj = { "": "empty key", " ": "space key", normal: "normal key" };
      const result = stringify(obj);
      const expected = JSON.stringify(obj);
      expect(result).toBe(expected);
    });
  });

  describe("comparison with JSON.stringify", () => {
    const testCases = [
      null,
      true,
      false,
      0,
      42,
      -42,
      3.14,
      "",
      "hello",
      [],
      [1, 2, 3],
      {},
      { key: "value" },
      { a: 1, b: [2, 3], c: { d: 4 } },
      [{ a: 1 }, { b: 2 }],
      { users: [{ name: "Alice" }, { name: "Bob" }] },
    ];

    testCases.forEach((testCase, index) => {
      it(`should match JSON.stringify for test case ${index}`, () => {
        const result = stringify(testCase as JsonValue);
        const expected = JSON.stringify(testCase);
        expect(result).toBe(expected);
      });
    });
  });

  describe("indentation and formatting", () => {
    it("should handle indentation with zero spaces", () => {
      const data = [[[1, 2]]];
      const result = stringify(data, 0);

      expect(result).toBe(`[[[
1,
2
]]]`);
    });
  });

  describe("stress tests", () => {
    it("should handle very deep nesting without stack overflow", () => {
      // Create a very deep structure that would cause regular recursion to fail
      let current: any = { value: "leaf" };

      for (let i = 0; i < 10000; i++) {
        current = { level: i, child: current };
      }

      // This should not throw a stack overflow error
      expect(() => stringify(current)).not.toThrow();

      // Verify it produces valid JSON
      const result = stringify(current);
      expect(result).toContain('"value":"leaf"');
      expect(result).toContain('"level":0');
    });

    it("should handle wide structures with many properties", () => {
      const wideObject: any = {};
      const wideArray: any = [];

      for (let i = 0; i < 10000; i++) {
        wideObject[`prop${i}`] = i;
        wideArray.push(i);
      }

      expect(() => stringify(wideObject)).not.toThrow();
      expect(() => stringify(wideArray)).not.toThrow();

      const objResult = stringify(wideObject);
      const arrResult = stringify(wideArray);

      expect(objResult).toContain('"prop0":0');
      expect(objResult).toContain('"prop9999":9999');
      expect(arrResult).toContain("[0,1,2");
      expect(arrResult).toContain("9999]");
    });
  });
});
