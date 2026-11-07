'use strict';

/**
 * 把扩展打包成 .tmlext（带 manifest.json 的 zip）。零依赖，仅需 Node 内置模块。
 * 用法：node build.js [输出文件名]
 */
const fs = require('fs');
const path = require('path');

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c >>> 0;
    }
    crc32.table = table;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function buildZip(entries, outPath) {
  const chunks = [];
  const central = [];
  let offset = 0;
  for (const e of entries) {
    const nameBuf = Buffer.from(e.name, 'utf-8');
    const crc = crc32(e.data);
    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);   // 不压缩（store）
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(e.data.length, 18);
    local.writeUInt32LE(e.data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    chunks.push(local, nameBuf, e.data);

    const cdr = Buffer.alloc(46 + nameBuf.length);
    cdr.writeUInt32LE(0x02014b50, 0);
    cdr.writeUInt16LE(20, 4);
    cdr.writeUInt16LE(20, 6);
    cdr.writeUInt16LE(0, 8);
    cdr.writeUInt16LE(0, 10);
    cdr.writeUInt16LE(0, 12);
    cdr.writeUInt16LE(0, 14);
    cdr.writeUInt32LE(crc, 16);
    cdr.writeUInt32LE(e.data.length, 20);
    cdr.writeUInt32LE(e.data.length, 24);
    cdr.writeUInt16LE(nameBuf.length, 28);
    cdr.writeUInt16LE(0, 30);
    cdr.writeUInt16LE(0, 32);
    cdr.writeUInt16LE(0, 34);
    cdr.writeUInt16LE(0, 36);
    cdr.writeUInt32LE(0, 38);
    cdr.writeUInt32LE(offset, 42);
    central.push(Buffer.concat([cdr, nameBuf]));
    offset += local.length + nameBuf.length + e.data.length;
  }
  let centralSize = 0;
  const centralBuf = Buffer.concat(central.map((c) => { centralSize += c.length; return c; }));
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  fs.writeFileSync(outPath, Buffer.concat([...chunks, centralBuf, end]));
}

const here = __dirname;
const manifest = JSON.parse(fs.readFileSync(path.join(here, 'manifest.json'), 'utf-8'));
const extId = manifest.id || 'extension';
const out = process.argv[2] || (extId + '.tmlext');
const names = ['manifest.json', 'main.js', 'tml.js'];
const entries = names.map((n) => ({ name: n, data: fs.readFileSync(path.join(here, n)) }));
buildZip(entries, out);
console.log('已打包: ' + out);
