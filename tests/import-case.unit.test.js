const fs = require('fs');
const path = require('path');

test('relative source imports match exact filesystem casing', () => {
  const root = path.resolve(__dirname, '..');
  const files = [path.join(root, 'index.js')];
  const walk = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.js')) files.push(full);
    }
  };
  walk(path.join(root, 'src'));
  const mismatches = [];
  for (const file of files) {
    for (const match of fs.readFileSync(file, 'utf8').matchAll(/require\(['"](\.[^'"]+)['"]\)/g)) {
      const resolved = require.resolve(path.resolve(path.dirname(file), match[1]));
      let directory = root;
      for (const segment of path.relative(root, resolved).split(path.sep)) {
        if (!fs.readdirSync(directory).includes(segment)) {
          mismatches.push(`${path.relative(root, file)}: ${match[1]}`);
          break;
        }
        directory = path.join(directory, segment);
      }
    }
  }
  expect(mismatches).toEqual([]);
});
