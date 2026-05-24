const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const outputDirs = ['.next', '.next-prod'];

for (const dir of outputDirs) {
  const target = path.join(projectRoot, dir);
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
  }
}
