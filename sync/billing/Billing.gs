/**
 * 帳票（見積書・発注書・請求書）をスプレッドシートの雛形で書いて PDF で発行する（Apps Script）。
 *
 * 使い方：雛形のスプレッドシート（『新見積書（ver2025-0212）』『発注書』『請求書』タブ）の
 *   「拡張機能 → Apps Script」にこのファイルを貼る。メニュー「帳票」から：
 *   1. 工程図から読み込む … 工程図の案件を選ぶと、宛先・件名・明細（金額の入った作業）を今のタブに書く
 *   2. PDFで発行 … NO（E/O/I-YYYYMM-NN）と発行日を入れ、今のタブを PDF にして Drive の「工程図_帳票PDF」に保存。
 *      『発行一覧』に記録し、工程図の帳票一覧にも登録する（請求書は読み込んだ作業を「請求済み」にする）
 *   3. 入力を空にする … 書いた所だけ消す（計算式・発行元・振込先はそのまま）
 *
 * 住所・振込先などは雛形のシートにだけあり、このコードには書かない（リポジトリが公開のため）。
 * 工程図（Firestore）への読み書きは、実行したアカウント（工程図のオーナー kei.n412）の権限で行う。
 */

const BL = {
  projectId: 'koutei-zu',
  workspaceId: 'liebe-asia-team',
  databaseId: 'default',
  folderName: '工程図_帳票PDF',
  logSheet: '発行一覧',
  timeZone: 'Asia/Ho_Chi_Minh',
};

/**
 * 雛形ごとの書き込み位置（1始まりの行・列記号）。
 * items: 明細の行の範囲と列（date は請求書だけ）。amountFormula: 金額の列に入れる式（空の行にだけ入れる）
 */
const BL_LAYOUTS = {
  estimate: {
    match: '見積', label: '見積書', prefix: 'E',
    no: 'BA4', date: 'BA6', to: 'E11', subject: 'M17',
    items: { from: 32, to: 45, name: 'E', qty: 'AG', unit: 'AO', amount: 'AZ' }, total: 'AZ49',
  },
  order: {
    match: '発注', label: '発注書', prefix: 'O',
    no: 'N5', date: 'N7', customer: 'K17', subject: 'D18',
    items: { from: 30, to: 39, name: 'B', qty: 'I', unit: 'J', amount: 'M' }, total: 'M43',
  },
  invoice: {
    match: '請求', label: '請求書', prefix: 'I',
    no: 'N5', date: 'N7', to: 'B12', subject: 'D18', deadline: 'D19',
    items: { from: 30, to: 39, date: 'B', name: 'C', qty: 'I', unit: 'J', amount: 'M' }, total: 'M43',
  },
};
const BL_LOG_HEADERS = ['発行日時', '種類', 'NO', '発行日', '宛先', '件名', '合計（税込）', 'PDF', 'タブ', '工程図の案件', '読み込んだ作業'];

function onOpen() {
  SpreadsheetApp.getUi().createMenu('帳票')
    .addItem('1. 工程図から読み込む（今のタブ）', 'blOpenImport')
    .addItem('2. PDFで発行（今のタブ）', 'blIssuePdf')
    .addSeparator()
    .addItem('入力を空にする（今のタブ）', 'blClearInputs')
    .addItem('発行一覧を開く', 'blOpenLog')
    .addToUi();
}

// ============ 純ロジック ============
/** タブ名 → 種類（'estimate' / 'order' / 'invoice'）。雛形のタブでなければ null */
function blTypeOfSheetName_(name) {
  const n = String(name || '');
  for (const k of Object.keys(BL_LAYOUTS)) if (n.indexOf(BL_LAYOUTS[k].match) >= 0) return k;
  return null;
}
function blPad2_(n) { return ('0' + n).slice(-2); }
function blYmd_(d) { return Utilities.formatDate(d, BL.timeZone, 'yyyy-MM-dd'); }
/** 次の NO：同じ種類・同じ年月の最大の連番＋1（アプリの帳票と同じ書き方 E-202611-01） */
function blNextNo_(type, existingNos, now) {
  const ym = Utilities.formatDate(now, BL.timeZone, 'yyyyMM');
  const head = BL_LAYOUTS[type].prefix + '-' + ym + '-';
  let max = 0;
  (existingNos || []).forEach(no => {
    const s = String(no || '');
    if (s.indexOf(head) !== 0) return;
    const m = s.slice(head.length).match(/^(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return head + blPad2_(max + 1);
}
function blNum_(v) {
  const n = parseFloat(String(v == null ? '' : v).replace(/[,，¥円\s]/g, ''));
  return isFinite(n) ? n : 0;
}
function blProjectKey_(t) { return String(t.projectNameInternal || t.projectName || '').trim(); }
/** 金額の入った作業を案件ごとにまとめる → [{ key, name, company, tasks, total, open（未請求の数） }]（新しい順） */
function blProjectsFromTasks_(tasks) {
  const map = {};
  (tasks || []).forEach(t => {
    if (!t || blNum_(t.stepAmount) <= 0) return;
    const key = blProjectKey_(t);
    if (!key) return;
    if (!map[key]) map[key] = { key, name: String(t.projectName || key), company: String(t.companyName || ''), tasks: [], total: 0, open: 0, last: 0 };
    const p = map[key];
    p.tasks.push(t);
    p.total += blNum_(t.stepAmount);
    if (!t.invoiceCheckedAt) p.open++;
    p.last = Math.max(p.last, Number(t.completedAt || t.createdAt || 0));
    if (!p.company && t.companyName) p.company = String(t.companyName);
  });
  return Object.keys(map).map(k => map[k]).sort((a, b) => (b.open > 0) - (a.open > 0) || b.last - a.last);
}
/** 作業 → 明細の1行 { date, name, qty, unit, taskId } */
function blItemOf_(t) {
  const vp = String(t.viewpointNameExternal || t.viewpointName || '').trim();
  const step = String(t.stepName || '').trim();
  const name = String(t.stepDeliveryNameOverride || '').trim() || [vp, step].filter(Boolean).join(' ');
  return { date: String(t.stepCompletedDate || ''), name: name || blProjectKey_(t), qty: 1, unit: blNum_(t.stepAmount), taskId: t.id };
}
/** 案件の作業 → 明細（請求書は未請求だけ。includeBilled で全部）。並びは完了日・登録順 */
function blItemsForProject_(project, type, includeBilled) {
  const list = project.tasks.filter(t => includeBilled || type !== 'invoice' || !t.invoiceCheckedAt);
  return list.slice().sort((a, b) => String(a.stepCompletedDate || '').localeCompare(String(b.stepCompletedDate || '')) || (a.createdAt || 0) - (b.createdAt || 0)).map(blItemOf_);
}
/** 列記号 → 番号（'A'→1、'AZ'→52） */
function blCol_(letters) {
  let n = 0;
  String(letters).toUpperCase().split('').forEach(c => { n = n * 26 + (c.charCodeAt(0) - 64); });
  return n;
}
/** 'BA4' → { row: 4, col: 53 } */
function blCell_(a1) {
  const m = String(a1).match(/^([A-Z]+)(\d+)$/);
  return { row: parseInt(m[2], 10), col: blCol_(m[1]) };
}
/** 書く場所と値の一覧（純ロジック）：[{ a1, value }]。明細は行数を超えたら最後の行に「ほか N件」とまとめる */
function blPlanFill_(type, data) {
  const L = BL_LAYOUTS[type];
  const out = [];
  const put = (a1, value) => { if (a1) out.push({ a1, value }); };
  if (type === 'order') put(L.customer, data.company || '');
  else put(L.to, data.company || '');
  put(L.subject, data.subject || '');
  const rows = L.items.to - L.items.from + 1;
  let items = (data.items || []).slice();
  if (items.length > rows) {
    const rest = items.slice(rows - 1);
    items = items.slice(0, rows - 1).concat([{ date: '', name: 'ほか ' + rest.length + '件（' + rest.map(i => i.name).join('・').slice(0, 60) + '）', qty: 1, unit: rest.reduce((s, i) => s + i.qty * i.unit, 0) }]);
  }
  for (let i = 0; i < rows; i++) {
    const r = L.items.from + i;
    const it = items[i];
    if (L.items.date) put(L.items.date + r, it ? it.date : '');
    put(L.items.name + r, it ? it.name : '');
    put(L.items.qty + r, it ? it.qty : '');
    put(L.items.unit + r, it ? it.unit : '');
  }
  return out;
}
/** 入力を空にする場所（計算式・発行元はそのまま） */
function blInputCells_(type) {
  const L = BL_LAYOUTS[type];
  const cells = [L.no, L.date, L.to, L.customer, L.subject, L.deadline].filter(Boolean);
  for (let r = L.items.from; r <= L.items.to; r++) {
    ['date', 'name', 'qty', 'unit'].forEach(k => { if (L.items[k]) cells.push(L.items[k] + r); });
  }
  return cells;
}
/** 帳票 → 工程図の帳票一覧（data/bill_{id}）に入れる形 */
function blAppDoc_(type, f, now) {
  const items = (f.items || []).filter(i => i.name || i.unit).map((i, n) => {
    const it = { id: 'item_' + now.getTime() + '_' + n, name: i.name, qty: String(i.qty), unit: String(i.unit) };
    if (type === 'invoice') { it.date = i.date || ''; it.taxRate = 10; it.reduced = false; }
    return it;
  });
  const doc = {
    id: 'doc_' + now.getTime() + '_' + Math.random().toString(36).slice(2, 8),
    type, no: f.no, issueDate: f.issueDate, subject: f.subject || '',
    to: { company: type === 'order' ? '株式会社リーベグ' : (f.company || ''), honorific: '御中', zip: '', address: '', tel: '', rep: '' },
    from: type === 'order' ? { company: f.company || '', zip: '', address: '', tel: '', person: '', regNo: '', rep: '' } : { company: '株式会社リーベグ', zip: '', address: '', tel: '', person: '', regNo: '' },
    items, note: '', pdfUrl: f.pdfUrl || '', source: 'sheet',
    createdAt: now.getTime(), updatedAt: now.getTime(),
  };
  if (type === 'invoice') {
    doc.paymentDeadline = f.deadline || '';
    doc.bankLines = [];
    doc.status = 'sent';
    doc.sentDate = f.issueDate;
    doc.paidDate = '';
    doc.salesRowIds = [];
  }
  return doc;
}

// ============ シートの読み書き ============
function blActive_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  const type = blTypeOfSheetName_(sheet.getName());
  if (!type) throw new Error('見積書・発注書・請求書のタブを開いてから押してください（今のタブ：' + sheet.getName() + '）');
  return { ss, sheet, type };
}
function blReadItems_(sheet, type) {
  const L = BL_LAYOUTS[type];
  const items = [];
  for (let r = L.items.from; r <= L.items.to; r++) {
    const name = String(sheet.getRange(L.items.name + r).getValue() || '').trim();
    const unit = blNum_(sheet.getRange(L.items.unit + r).getValue());
    const qtyRaw = sheet.getRange(L.items.qty + r).getValue();
    const qty = qtyRaw === '' ? (unit ? 1 : 0) : blNum_(qtyRaw);
    const dv = L.items.date ? sheet.getRange(L.items.date + r).getValue() : '';
    const date = dv instanceof Date ? blYmd_(dv) : String(dv || '');
    if (name || unit) items.push({ date, name, qty, unit });
  }
  return items;
}
/** 明細を書いた行で、金額の列が空なら「数量×単価」の式を入れる（発注書は4行分しか式が無いため） */
function blEnsureAmountFormulas_(sheet, type) {
  const L = BL_LAYOUTS[type];
  for (let r = L.items.from; r <= L.items.to; r++) {
    const name = String(sheet.getRange(L.items.name + r).getValue() || '').trim();
    const amt = sheet.getRange(L.items.amount + r);
    if (name && !amt.getFormula() && amt.getValue() === '') amt.setFormula('=IF(' + L.items.qty + r + '<>"",' + L.items.qty + r + '*' + L.items.unit + r + ',)');
  }
}

// ============ Firestore（工程図）============
function blBase_() { return 'https://firestore.googleapis.com/v1/projects/' + BL.projectId + '/databases/' + BL.databaseId + '/documents'; }
function blFetch_(url, method, body) {
  const res = UrlFetchApp.fetch(url, {
    method, contentType: 'application/json', headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    payload: body ? JSON.stringify(body) : undefined, muteHttpExceptions: true,
  });
  const code = res.getResponseCode();
  if (code >= 300) throw new Error('工程図への接続に失敗（' + code + '）：' + res.getContentText().slice(0, 300));
  const text = res.getContentText();
  return text ? JSON.parse(text) : {};
}
function blDecode_(v) {
  if (!v || typeof v !== 'object') return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return !!v.booleanValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return ((v.arrayValue && v.arrayValue.values) || []).map(blDecode_);
  if ('mapValue' in v) return blDecodeFields_(v.mapValue.fields);
  return null;
}
function blDecodeFields_(fields) {
  const out = {};
  Object.keys(fields || {}).forEach(k => { out[k] = blDecode_(fields[k]); });
  return out;
}
function blEncode_(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(blEncode_) } };
  const f = {};
  Object.keys(v).forEach(k => { f[k] = blEncode_(v[k]); });
  return { mapValue: { fields: f } };
}
/** 工程図の作業（金額の確認に使う項目だけ） */
function blListTasks_() {
  const mask = ['projectName', 'projectNameInternal', 'companyName', 'viewpointName', 'viewpointNameExternal', 'stepName', 'stepAmount',
    'stepCompletedDate', 'stepDeliveryNameOverride', 'invoiceCheckedAt', 'completedAt', 'createdAt', 'status'];
  const q = mask.map(f => 'mask.fieldPaths=' + f).join('&');
  const out = [];
  let token = '';
  do {
    const j = blFetch_(blBase_() + '/workspaces/' + BL.workspaceId + '/tasks?pageSize=300&' + q + (token ? '&pageToken=' + encodeURIComponent(token) : ''), 'get');
    (j.documents || []).forEach(d => { const t = blDecodeFields_(d.fields); t.id = d.name.split('/').pop(); out.push(t); });
    token = j.nextPageToken || '';
  } while (token);
  return out;
}
/** 工程図の帳票の NO（data/bill_*） */
function blListAppNos_() {
  const parent = blBase_().replace(/\/documents$/, '') + '/documents/workspaces/' + BL.workspaceId;
  const name = 'projects/' + BL.projectId + '/databases/' + BL.databaseId + '/documents/workspaces/' + BL.workspaceId + '/data/';
  const body = { structuredQuery: {
    from: [{ collectionId: 'data' }], select: { fields: [{ fieldPath: 'value' }] },
    where: { compositeFilter: { op: 'AND', filters: [
      { fieldFilter: { field: { fieldPath: '__name__' }, op: 'GREATER_THAN_OR_EQUAL', value: { referenceValue: name + 'bill_' } } },
      { fieldFilter: { field: { fieldPath: '__name__' }, op: 'LESS_THAN', value: { referenceValue: name + 'bill_' } } },
    ] } },
  } };
  const res = blFetch_(parent + ':runQuery', 'post', body);
  const nos = [];
  (Array.isArray(res) ? res : []).forEach(r => {
    if (!r.document) return;
    try { nos.push(JSON.parse(blDecodeFields_(r.document.fields).value).no); } catch (e) { /* 読めない帳票は飛ばす */ }
  });
  return nos;
}
function blSaveAppDoc_(doc) {
  const url = blBase_() + '/workspaces/' + BL.workspaceId + '/data/bill_' + doc.id;
  blFetch_(url, 'patch', { fields: { value: blEncode_(JSON.stringify(doc)), updatedAt: blEncode_(Date.now()) } });
}
function blMarkInvoiced_(taskIds, at) {
  (taskIds || []).forEach(id => {
    const url = blBase_() + '/workspaces/' + BL.workspaceId + '/tasks/' + id + '?updateMask.fieldPaths=invoiceCheckedAt';
    blFetch_(url, 'patch', { fields: { invoiceCheckedAt: blEncode_(at) } });
  });
}

// ============ メニュー：1. 工程図から読み込む ============
function blOpenImport() {
  const a = blActive_();
  const projects = blProjectsFromTasks_(blListTasks_());
  const list = projects.slice(0, 300).map(p => ({ key: p.key, name: p.name, company: p.company, count: p.tasks.length, open: p.open, total: Math.round(p.total) }));
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const html = '<style>body{font-family:sans-serif;font-size:13px}input{font-size:13px}.r{padding:6px 4px;border-bottom:1px solid #eee;cursor:pointer}.r:hover{background:#f3f7f1}.m{color:#888;font-size:11px}</style>' +
    '<input id="q" placeholder="社内案件名・案件名・会社名で絞り込み" style="width:100%;padding:6px;box-sizing:border-box">' +
    (a.type === 'invoice' ? '<label style="display:block;margin:6px 0"><input type="checkbox" id="all"> 請求済みの作業も入れる</label>' : '') +
    '<div id="l" style="max-height:360px;overflow:auto;margin-top:6px"></div><div id="s" class="m" style="margin-top:6px"></div>' +
    '<script>' +
    'const P=' + JSON.stringify(list).replace(/</g, '\\u003c') + ';' +
    'const L=document.getElementById("l"),S=document.getElementById("s"),Q=document.getElementById("q");' +
    'function row(p){const d=document.createElement("div");d.className="r";' +
    'const b=document.createElement("b");b.textContent=p.key;d.appendChild(b);' +
    'd.appendChild(document.createTextNode(" "+(p.name!==p.key?p.name:"")+" "));' +
    'const m=document.createElement("span");m.className="m";m.textContent=p.company+"・"+p.count+"件・¥"+p.total.toLocaleString()+(p.open?"・未請求 "+p.open+"件":"");d.appendChild(m);' +
    'd.addEventListener("click",()=>go(p.key));return d}' +
    'function draw(){const q=Q.value.toLowerCase();L.innerHTML="";const hit=P.filter(p=>!q||(p.key+" "+p.name+" "+p.company).toLowerCase().includes(q));' +
    'hit.forEach(p=>L.appendChild(row(p)));if(!hit.length)L.textContent="該当なし（金額の入った作業がある案件だけ出ます）"}' +
    'function go(k){S.textContent="書き込み中…";const all=document.getElementById("all");' +
    'google.script.run.withSuccessHandler(m=>{S.textContent=m;setTimeout(()=>google.script.host.close(),1200)})' +
    '.withFailureHandler(x=>{S.textContent="失敗："+x.message}).blImportProject(k,!!(all&&all.checked))}' +
    'Q.addEventListener("input",draw);draw();' +
    '</script>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(560).setHeight(480), '工程図から読み込む（' + esc(BL_LAYOUTS[a.type].label) + '）');
}
/** ダイアログから呼ぶ（名前の末尾に _ を付けない） */
function blImportProject(key, includeBilled) {
  const a = blActive_();
  const p = blProjectsFromTasks_(blListTasks_()).find(x => x.key === key);
  if (!p) throw new Error('案件が見つかりません：' + key);
  const items = blItemsForProject_(p, a.type, includeBilled);
  const subject = p.name && p.name !== p.key ? p.name + '（' + p.key + '）' : p.key;
  blPlanFill_(a.type, { company: p.company, subject, items }).forEach(c => a.sheet.getRange(c.a1).setValue(c.value));
  blEnsureAmountFormulas_(a.sheet, a.type);
  // 発行のときに「請求済み」にする作業を覚えておく（タブごと）
  PropertiesService.getDocumentProperties().setProperty('bl_import_' + a.sheet.getSheetId(), JSON.stringify({ key, taskIds: items.map(i => i.taskId).filter(Boolean) }));
  return key + ' の明細を ' + items.length + '件 書きました';
}

// ============ メニュー：2. PDFで発行 ============
function blIssuePdf() {
  const a = blActive_();
  const L = BL_LAYOUTS[a.type];
  const ui = SpreadsheetApp.getUi();
  const now = new Date();
  const items = blReadItems_(a.sheet, a.type);
  if (!items.length) { ui.alert('明細が空です。「工程図から読み込む」か、明細の行に書いてから押してください。'); return; }
  const company = String(a.sheet.getRange(a.type === 'order' ? L.customer : L.to).getValue() || '').trim();
  const subject = String(a.sheet.getRange(L.subject).getValue() || '').trim();
  if (!company || !subject) {
    const go = ui.alert('宛先か件名が空です。このまま発行しますか？', ui.ButtonSet.YES_NO);
    if (go !== ui.Button.YES) return;
  }
  // NO と発行日（空のときだけ入れる）
  const log = blLogSheet_(a.ss);
  let no = String(a.sheet.getRange(L.no).getValue() || '').trim();
  if (!no) {
    let appNos = [];
    try { appNos = blListAppNos_(); } catch (e) { /* 工程図に届かなくても、発行一覧だけで番号を決める */ }
    const logNos = log.getLastRow() > 1 ? log.getRange(2, 3, log.getLastRow() - 1, 1).getValues().map(r => r[0]) : [];
    no = blNextNo_(a.type, appNos.concat(logNos), now);
    a.sheet.getRange(L.no).setValue(no);
  }
  const dateCell = a.sheet.getRange(L.date);
  if (dateCell.getValue() === '') dateCell.setValue(new Date(blYmd_(now) + 'T00:00:00'));
  const dv = dateCell.getValue();
  const issueDate = dv instanceof Date ? blYmd_(dv) : String(dv);
  blEnsureAmountFormulas_(a.sheet, a.type);
  SpreadsheetApp.flush();
  const total = blNum_(a.sheet.getRange(L.total).getValue());

  // PDF にして Drive に保存
  const pdf = blExportPdf_(a.ss, a.sheet, [L.label, no, company, subject].filter(Boolean).join('_').replace(/[\\/:*?"<>|]/g, '') + '.pdf');
  const url = pdf.getUrl();

  // 工程図：帳票一覧に登録、請求書なら読み込んだ作業を請求済みに
  const prop = PropertiesService.getDocumentProperties().getProperty('bl_import_' + a.sheet.getSheetId());
  const imported = prop ? JSON.parse(prop) : null;
  const notes = [];
  try {
    const deadlineV = L.deadline ? a.sheet.getRange(L.deadline).getValue() : '';
    blSaveAppDoc_(blAppDoc_(a.type, { no, issueDate, company, subject, items, pdfUrl: url, deadline: deadlineV instanceof Date ? blYmd_(deadlineV) : String(deadlineV || '') }, now));
    notes.push('工程図の帳票一覧に登録しました');
    if (a.type === 'invoice' && imported && imported.taskIds.length) {
      blMarkInvoiced_(imported.taskIds, now.getTime());
      notes.push('工程図の作業 ' + imported.taskIds.length + '件を「請求済み」にしました');
    }
  } catch (e) {
    notes.push('工程図への登録はできませんでした（PDF は保存済み）：' + (e && e.message || e));
  }
  log.appendRow([now, L.label, no, issueDate, company, subject, total, url, a.sheet.getName(), imported ? imported.key : '', imported ? imported.taskIds.length : '']);
  PropertiesService.getDocumentProperties().deleteProperty('bl_import_' + a.sheet.getSheetId());

  const html = '<div style="font-family:sans-serif;font-size:13px;line-height:1.8">' + L.label + ' ' + no + ' を発行しました（合計 ¥' + Math.round(total).toLocaleString() + '）。<br>' +
    '<a href="' + url + '" target="_blank">PDF を開く</a><br><span style="color:#666">' + notes.join('<br>') + '</span></div>';
  ui.showModalDialog(HtmlService.createHtmlOutput(html).setWidth(420).setHeight(200), 'PDFで発行');
}
function blFolder_(ss) {
  const file = DriveApp.getFileById(ss.getId());
  const parents = file.getParents();
  const parent = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
  const it = parent.getFoldersByName(BL.folderName);
  return it.hasNext() ? it.next() : parent.createFolder(BL.folderName);
}
/** そのタブだけを A4 縦・幅に合わせて PDF にする */
function blExportPdf_(ss, sheet, fileName) {
  const url = 'https://docs.google.com/spreadsheets/d/' + ss.getId() + '/export?format=pdf&gid=' + sheet.getSheetId() +
    '&size=A4&portrait=true&fitw=true&gridlines=false&printtitle=false&sheetnames=false&pagenum=UNDEFINED&fzr=false' +
    '&top_margin=0.4&bottom_margin=0.4&left_margin=0.4&right_margin=0.4&horizontal_alignment=CENTER';
  const res = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
  if (res.getResponseCode() >= 300) throw new Error('PDF にできませんでした（' + res.getResponseCode() + '）');
  return blFolder_(ss).createFile(res.getBlob().setName(fileName));
}
function blLogSheet_(ss) {
  let s = ss.getSheetByName(BL.logSheet);
  if (!s) {
    s = ss.insertSheet(BL.logSheet);
    s.getRange(1, 1, 1, BL_LOG_HEADERS.length).setValues([BL_LOG_HEADERS]).setFontWeight('bold').setBackground('#eef1f5');
    s.setFrozenRows(1);
  }
  return s;
}

// ============ メニュー：入力を空にする・発行一覧 ============
function blClearInputs() {
  const a = blActive_();
  const ui = SpreadsheetApp.getUi();
  if (ui.alert('「' + a.sheet.getName() + '」の NO・発行日・宛先・件名・明細を空にします。よろしいですか？', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  blInputCells_(a.type).forEach(c => a.sheet.getRange(c).clearContent());
  PropertiesService.getDocumentProperties().deleteProperty('bl_import_' + a.sheet.getSheetId());
}
function blOpenLog() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setActiveSheet(blLogSheet_(ss));
}
