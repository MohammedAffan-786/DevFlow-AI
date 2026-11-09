// Node 24 on some Windows environments fails os.userInfo() inside tsx before
// the test entrypoint loads. tsx uses geteuid only to name its temp directory.
if (process.platform === 'win32' && typeof process.geteuid !== 'function') {
  process.geteuid = () => 0;
}

if (process.platform === 'win32') {
  const preload = `--require=${__filename.replace(/\\/g, '/')}`;
  if (!process.env.NODE_OPTIONS?.includes(__filename)) {
    process.env.NODE_OPTIONS = [process.env.NODE_OPTIONS, preload].filter(Boolean).join(' ');
  }
}
