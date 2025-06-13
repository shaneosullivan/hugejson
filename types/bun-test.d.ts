declare module "bun:test" {
  interface Expect {
    toBe(expected: any): void;
    toThrow(expected?: string | RegExp | Error): void;
    toContain(expected: any): void;
    not: {
      toBe(expected: any): void;
      toThrow(expected?: string | RegExp | Error): void;
      toContain(expected: any): void;
    };
  }

  export function expect(actual: any): Expect;
  export function describe(name: string, fn: () => void): void;
  export function it(name: string, fn: () => void): void;
  export function test(name: string, fn: () => void): void;
}