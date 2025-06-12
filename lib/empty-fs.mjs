// Empty fs module for browser compatibility with jq-web
export default {};
export const readFile = () => {};
export const writeFile = () => {};
export const existsSync = () => false;
export const readFileSync = () => '';
export const writeFileSync = () => {};