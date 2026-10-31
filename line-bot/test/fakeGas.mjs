// テスト用：Apps Script・Firestore・Discord・Gemini の偽物を用意して line-bot/dist/Code.gs を動かす。
// 使い方: const g = createFakeGas({ tasks, dataDocs, props, now }); g.ctx.doPost(...)
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const CODE = readFileSync(new URL('../dist/Code.gs', import.meta.url), 'utf8');

const toVal = (v) => {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toVal) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toVal(x)])) } };
};
const fromVal = (v) => {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromVal);
  return null;
};
const resp = (code, body) => ({ getResponseCode: () => code, getContentText: () => (typeof body === 'string' ? body : JSON.stringify(body)) });

export function createFakeGas({ tasks = [], dataDocs = {}, props = {}, now }) {
  const state = {
    now,
    firestoreQueries: [],   // { field, op, value }
    discord: [],            // { method, path, json, multipart, auth }
    geminiRequests: [],     // 送られた body
    gemini: null,           // (body) => { code, body }
    discordStatus: 200,
    firestoreFail: false,  // true で Firestore が 403 を返す
  };
  const RealDate = Date;
  class FakeDate extends RealDate {
    constructor(...a) { if (a.length === 0) super(state.now); else super(...a); }
    static now() { return state.now; }
  }

  function firestore(req) {
    if (!req.headers['X-Goog-User-Project']) throw new Error('X-Goog-User-Project がありません');
    if (state.firestoreFail) return resp(403, '{"error":"PERMISSION_DENIED_*x*"}');
    if (req.url.endsWith(':runQuery')) {
      const f = JSON.parse(req.payload).structuredQuery.where.fieldFilter;
      const field = f.field.fieldPath;
      const value = fromVal(f.value);
      state.firestoreQueries.push({ field, op: f.op, value });
      const hit = tasks.filter((t) => {
        if (f.op === 'EQUAL') return t[field] === value;
        if (f.op === 'GREATER_THAN_OR_EQUAL') return typeof t[field] === 'number' && t[field] >= value;
        if (f.op === 'IN') return value.includes(t[field]);
        throw new Error('未対応の条件 ' + f.op);
      });
      return resp(200, hit.map((t) => ({ document: { name: 'x/' + t.id, fields: toVal(t).mapValue.fields } })));
    }
    if (req.url.endsWith(':batchGet')) {
      return resp(200, JSON.parse(req.payload).documents.map((name) => {
        const k = name.slice(name.lastIndexOf('/') + 1);
        return k in dataDocs ? { found: { name, fields: { value: { stringValue: dataDocs[k] } } } } : { missing: name };
      }));
    }
    throw new Error('unexpected ' + req.url);
  }

  function fetch(url, opt = {}) {
    if (url.startsWith('https://discord.com/api/v10')) {
      const path = url.slice('https://discord.com/api/v10'.length);
      const method = (opt.method || 'get').toLowerCase();
      const rec = { method, path, auth: opt.headers && opt.headers.Authorization };
      if (opt.payload && typeof opt.payload === 'object') rec.multipart = opt.payload;
      else if (opt.payload) rec.json = JSON.parse(opt.payload);
      state.discord.push(rec);
      if (path === '/applications/@me') return resp(200, { id: 'APP1' });
      return resp(state.discordStatus, method === 'patch' || method === 'post' ? { id: 'm' + state.discord.length } : []);
    }
    if (url.startsWith('https://generativelanguage.googleapis.com/')) {
      const body = JSON.parse(opt.payload);
      state.geminiRequests.push({ url, key: opt.headers['x-goog-api-key'], body });
      const r = state.gemini(body, state.geminiRequests.length);
      return resp(r.code || 200, r.body);
    }
    throw new Error('unexpected fetch ' + url);
  }

  const store = { ...props };
  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    Date: FakeDate,
    UrlFetchApp: { fetch, fetchAll: (reqs) => reqs.map(firestore) },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: (k) => store[k] ?? null, setProperty: (k, v) => { store[k] = String(v); }, deleteProperty: (k) => { delete store[k]; },
    }) },
    CacheService: { getScriptCache: () => ({ get: () => null, put() {}, remove() {} }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (s) => { const o = { s, mime: 'text/plain', setMimeType(m) { o.mime = m; return o; } }; return o; },
    },
    ScriptApp: { getOAuthToken: () => 'oauth', getProjectTriggers: () => [], deleteTrigger() {}, newTrigger() { throw new Error('not used'); } },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      newBlob: (data, type, name) => {
        const b = { data, type, name, setDataFromString(s, cs) { b.data = s; b.charset = cs; return b; } };
        return b;
      },
    },
  };
  vm.createContext(ctx);
  vm.runInContext(CODE, ctx);
  return { ctx, state, props: store };
}
