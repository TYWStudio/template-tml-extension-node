'use strict';

/**
 * TML Extension API v1 — Node 宿主 SDK（运行时：node）。
 * 扩展是宿主外的独立进程，通过 stdin/stdout 的 NDJSON 交换白名单方法。
 * 详见启动器「设置 → 其他 → 拓展」或 https://mtr.tywmc.cn
 */
const readline = require('readline');

class TmlError extends Error {
  constructor(code, message) {
    super(`[${code}] ${message}`);
    this.code = code;
  }
}

class TmlClient {
  constructor() {
    this._nextId = 2;
    this._pending = new Map();          // id -> { resolve, reject }
    this._eventHandlers = [];
    this.permissions = [];
    this.privateDir = '';
    this.extId = '';
    this._ready = false;
    this._stop = false;
  }

  _send(obj) {
    process.stdout.write(JSON.stringify(obj) + '\n');
  }

  _call(method, params) {
    return new Promise((resolve, reject) => {
      const id = this._nextId++;
      this._pending.set(id, { resolve, reject });
      this._send({ id, method, params: params || {} });
      setTimeout(() => {
        if (this._pending.has(id)) {
          this._pending.delete(id);
          reject(new TmlError(-32000, 'host timeout: ' + method));
        }
      }, 5000);
    });
  }

  _loop() {
    const rl = readline.createInterface({ input: process.stdin });
    rl.on('line', (line) => {
      line = (line || '').trim();
      if (!line) return;
      let msg;
      try { msg = JSON.parse(line); } catch (e) { return; }
      if (!msg || typeof msg !== 'object') return;

      if (msg.method) {
        if (msg.method === 'initialize') {
          const p = msg.params || {};
          this.extId = p.extId || '';
          this.privateDir = p.privateDir || '';
          this.permissions = p.permissions || [];
          this._send({ id: msg.id, result: { ready: true } });
          this._ready = true;
          return;
        }
        if (msg.method === 'shutdown') { this._stop = true; process.exit(0); return; }
        if (msg.method === 'event') {
          const params = msg.params || {};
          this._eventHandlers.forEach((cb) => {
            try { cb(params.type, params.data || {}); } catch (e) { /* ignore */ }
          });
          return;
        }
        return;
      }

      if (msg.id !== undefined && (msg.result !== undefined || msg.error !== undefined)) {
        const slot = this._pending.get(msg.id);
        if (slot) {
          this._pending.delete(msg.id);
          if (msg.error) slot.reject(new TmlError(msg.error.code, msg.error.message));
          else slot.resolve(msg.result);
        }
      }
    });
  }

  run(mainFn) {
    this._loop();
    const wait = () => new Promise((r) => setTimeout(r, 50));
    (async () => {
      while (!this._ready && !this._stop) await wait();
      if (!this._ready) return;
      try { await mainFn(this); } finally {
        while (!this._stop) await wait();
      }
    })();
  }

  log(message, level = 'info') { return this._call('log', { level, message }); }
  toast(message) { return this._call('toast', { message }); }
  hostInfo() { return this._call('host.info'); }
  listInstances() { return this._call('instances.list').then((r) => (r.instances || [])); }
  subscribe(types) { return this._call('event.subscribe', { types }).then((r) => (r.accepted || [])); }
  storageGet(key) { return this._call('storage.get', { key }).then((r) => r.value); }
  storageSet(key, value) { return this._call('storage.set', { key, value }); }
  settingsGet(key) { return this._call('settings.get', { key }).then((r) => r.value); }
  settingsSet(key, value) { return this._call('settings.set', { key, value }); }
  onEvent(cb) { this._eventHandlers.push(cb); }
}

module.exports = { TmlClient, TmlError };
