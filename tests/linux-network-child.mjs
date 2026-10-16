// Runs only inside a fresh network namespace; drops root before loading Firebase.
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { networkInterfaces } from 'node:os';
assert.equal(process.platform, 'linux');
assert.equal(process.getuid(), 0, 'Network namespace initialization requires root');
const [uidText, gidText, firebase, ...args] = process.argv.slice(2);
assert.match(uidText || '', /^[1-9][0-9]*$/);
assert.match(gidText || '', /^[0-9]+$/);
assert.ok(firebase?.startsWith('/'), 'Use an absolute Firebase executable');
execFileSync('ip', ['link', 'set', 'lo', 'up']);
const links = JSON.parse(execFileSync('ip', ['-j', 'link', 'show'], {encoding:'utf8'}));
assert.deepEqual(links.map(link => link.ifname), ['lo'], 'Refuse a namespace with external network interfaces');
for (const addresses of Object.values(networkInterfaces())) for (const address of addresses) assert.equal(address.internal, true);
for (const family of ['-4','-6']) {
  const routes = JSON.parse(execFileSync('ip', [family, '-j', 'route', 'show'], {encoding:'utf8'}));
  assert.equal(routes.length, 0, 'Refuse a namespace with network routes');
}
// No capabilities, supplementary groups or privilege escalation remain in the test tree.
const child = spawn('setpriv', ['--reuid',uidText,'--regid',gidText,'--clear-groups','--bounding-set=-all',
  '--inh-caps=-all','--ambient-caps=-all','--no-new-privs',firebase,...args], {env:process.env, stdio:'inherit'});
child.on('error', error => { console.error(error); process.exitCode=1; });
child.on('exit', (code,signal) => { process.exitCode=signal ? 130 : code ?? 1; });
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => child.kill(signal));
