// tsx calls os.userInfo() while initializing its temporary workspace. Some
// Windows environments return ENOMEM from that OS lookup, even though Node
// itself can run normally. Use the current Windows profile as a safe fallback.
const os = require('node:os');

try {
  os.userInfo();
} catch {
  os.userInfo = () => ({
    username: process.env.USERNAME || process.env.USER || 'devflow',
    uid: -1,
    gid: -1,
    shell: null,
    homedir: process.env.USERPROFILE || process.cwd(),
  });
}

require('tsx/cjs');
require('./src/server.ts');
