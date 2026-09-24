// Wrapper that launches server.js as a child process with NODE_EXTRA_CA_CERTS
// set beforehand. Node only honors that variable if it's present when the
// process starts, so setting it on `this` process and requiring server.js
// directly would be too late — we spawn a fresh node process instead.
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const certPath = path.join(__dirname, 'certs', 'avast-root-ca.pem');
const env = Object.assign({}, process.env);
if (fs.existsSync(certPath)) {
  env.NODE_EXTRA_CA_CERTS = certPath;
}

const child = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
  stdio: 'inherit',
  env: env
});
child.on('exit', function (code) {
  process.exit(code === null ? 1 : code);
});
