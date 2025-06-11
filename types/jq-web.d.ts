declare module 'jq-web' {
  interface JqInstance {
    json(data: any, query: string): any;
  }

  const jq: JqInstance;
  export default jq;
}