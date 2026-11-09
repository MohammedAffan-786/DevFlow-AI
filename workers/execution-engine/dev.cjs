const os = require('node:os');
const path = require('node:path');

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

const preload = `--require="${__filename.replace(/\\/g, '/')}"`;
if (!process.env.NODE_OPTIONS?.includes(path.basename(__filename))) {
  process.env.NODE_OPTIONS = [process.env.NODE_OPTIONS, preload].filter(Boolean).join(' ');
}
