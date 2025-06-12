// Empty fs module for browser compatibility with jq-web
module.exports = {
  readFile: () => {},
  writeFile: () => {},
  existsSync: () => false,
  readFileSync: () => '',
  writeFileSync: () => {},
  promises: {
    readFile: () => Promise.resolve(''),
    writeFile: () => Promise.resolve(),
  }
};