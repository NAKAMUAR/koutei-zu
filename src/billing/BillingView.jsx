// 帳票ビュー：一覧・編集・お客様/案件からの自動入力・PDF出力（ブラウザ印刷）。
// データは storage の 'billingDocuments' キーに JSON 配列で保存（他マスタと同じ流儀）。
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Trash2, Edit2, Copy, Printer, X, FileText } from 'lucide-react';
import { storage } from '../firebase.js';
import BillingDocument from './BillingDocument.jsx';
import {
  DOC_TYPES, docTypeOf, blankDoc, blankItem, formatYen, formatJDate, computeTotals,
  CONDITION_SECTIONS, SCHEDULE_TIME_ROWS,
} from './billingUtils.js';

const STORAGE_KEY = 'billingDocuments';

export default function BillingView({ customerMaster, tasks, now, colors, fontJP, fontDisplay }) {
  const [docs, setDocs] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(null); // 編集中ドキュメント（null=一覧）
  const [filterType, setFilterType] = useState('all');

  // 購読
  useEffect(() => {
    const unsub = storage.subscribe(STORAGE_KEY, (val) => {
      if (!val) { setDocs([]); setLoaded(true); return; }
      try { const arr = JSON.parse(val); setDocs(Array.isArray(arr) ? arr : []); }
      catch (e) { setDocs([]); }
      setLoaded(true);
    });
    return () => unsub && unsub();
  }, []);

  const persist = (next) => {
    setDocs(next);
    storage.set(STORAGE_KEY, JSON.stringify(next)).catch(e => console.error('帳票保存エラー:', e));
  };

  const saveDoc = (doc) => {
    const stamped = { ...doc, updatedAt: Date.now() };
    const exists = docs.some(d => d.id === stamped.id);
    const next = exists ? docs.map(d => d.id === stamped.id ? stamped : d) : [stamped, ...docs];
    persist(next);
    return stamped;
  };
  const deleteDoc = (id) => {
    if (!confirm('この帳票を削除しますか？この操作は取り消せません。')) return;
    persist(docs.filter(d => d.id !== id));
    if (editing && editing.id === id) setEditing(null);
  };
  const duplicateDoc = (doc) => {
    const copy = { ...JSON.parse(JSON.stringify(doc)), id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, no: doc.no + '-copy', createdAt: Date.now(), updatedAt: Date.now() };
    persist([copy, ...docs]);
  };

  const createNew = (type) => setEditing(blankDoc(type, docs, now));

  if (editing) {
    return (
      <BillingEditor
        key={editing.id}
        initial={editing}
        customerMaster={customerMaster}
        tasks={tasks}
        onSave={(d) => { saveDoc(d); }}
        onSaveClose={(d) => { saveDoc(d); setEditing(null); }}
        onClose={() => setEditing(null)}
        onDelete={() => deleteDoc(editing.id)}
        existing={docs.some(d => d.id === editing.id)}
        colors={colors} fontJP={fontJP} fontDisplay={fontDisplay}
      />
    );
  }

  const visible = docs.filter(d => filterType === 'all' || d.type === filterType);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: '0.04em' }}>帳票（見積・発注・請求）</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {DOC_TYPES.map(t => (
            <button key={t.id} onClick={() => createNew(t.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 13, fontWeight: 500 }}>
              <Plus size={14} />{t.label}を新規作成
            </button>
          ))}
        </div>
      </div>

      {/* 種別フィルタ */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[{ id: 'all', label: 'すべて' }, ...DOC_TYPES].map(t => (
          <button key={t.id} onClick={() => setFilterType(t.id)}
            style={{ padding: '5px 12px', background: filterType === t.id ? '#1a1a1a' : 'transparent', color: filterType === t.id ? '#fff' : '#1a1a1a', border: `1px solid ${filterType === t.id ? '#1a1a1a' : colors.border}`, borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 12 }}>
            {t.label}
          </button>
        ))}
      </div>

      {!loaded ? (
        <div style={{ color: colors.textMute, fontSize: 13, padding: 24 }}>読み込み中…</div>
      ) : visible.length === 0 ? (
        <div style={{ color: colors.textMute, fontSize: 13, padding: 40, textAlign: 'center', border: `1px dashed ${colors.border}`, borderRadius: 6 }}>
          <FileText size={24} style={{ opacity: 0.4 }} /><div style={{ marginTop: 8 }}>帳票がまだありません。上のボタンから新規作成してください。</div>
        </div>
      ) : (
        <div style={{ border: `1px solid ${colors.border}`, borderRadius: 6, overflow: 'hidden' }}>
          {visible.map((d, i) => {
            const t = computeTotals(d);
            const dt = docTypeOf(d.type);
            return (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderTop: i ? `1px solid ${colors.border}` : 'none', background: '#fff' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: dt.accent, padding: '3px 8px', borderRadius: 3, flex: 'none', WebkitPrintColorAdjust: 'exact' }}>{dt.label}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.subject || '（件名未入力）'} <span style={{ color: colors.textMute, fontSize: 11, fontWeight: 400 }}>{d.to?.company || ''}</span></div>
                  <div style={{ fontSize: 11, color: colors.textMute, marginTop: 2 }}>NO {d.no} ・ {formatJDate(d.issueDate)}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, marginRight: 8 }}>{formatYen(t.total)}</div>
                <button onClick={() => setEditing(d)} title="編集" style={iconBtn(colors)}><Edit2 size={15} /></button>
                <button onClick={() => duplicateDoc(d)} title="複製" style={iconBtn(colors)}><Copy size={15} /></button>
                <button onClick={() => deleteDoc(d.id)} title="削除" style={iconBtn(colors)}><Trash2 size={15} /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function iconBtn(colors) {
  return { padding: '6px 8px', background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 4, cursor: 'pointer', color: colors.textMute, display: 'flex', alignItems: 'center' };
}

// ============ 編集 ============
function BillingEditor({ initial, customerMaster, tasks, onSave, onSaveClose, onClose, onDelete, existing, colors, fontJP, fontDisplay }) {
  const [doc, setDoc] = useState(initial);
  const [tab, setTab] = useState('basic');
  const isEstimate = doc.type === 'estimate';
  const isInvoice = doc.type === 'invoice';
  const isOrder = doc.type === 'order';
  const dt = docTypeOf(doc.type);

  const upd = (patch) => setDoc(d => ({ ...d, ...patch }));
  const updItem = (id, patch) => setDoc(d => ({ ...d, items: d.items.map(it => it.id === id ? { ...it, ...patch } : it) }));
  const addItem = () => setDoc(d => ({ ...d, items: [...d.items, blankItem(d.type)] }));
  const removeItem = (id) => setDoc(d => ({ ...d, items: d.items.filter(it => it.id !== id) }));

  // 案件候補（タスクから一意な案件名＋会社名）
  const projectOptions = useMemo(() => {
    const map = new Map();
    for (const t of (tasks || [])) {
      const p = (t.projectName || '').trim();
      if (!p || map.has(p)) continue;
      map.set(p, { projectName: p, company: t.companyName || '', contact: t.customerContact || '' });
    }
    return [...map.values()];
  }, [tasks]);

  // お客様マスタから該当エントリ
  const applyCustomer = (company) => {
    const ent = (customerMaster || []).find(c => c.company === company);
    const detail = ent ? { zip: ent.zip || '', address: ent.address || '', tel: ent.tel || ent.phone || '', rep: ent.rep || ent.representative || ent.daihyo || '' } : { zip: '', address: '', tel: '', rep: '' };
    if (doc.type === 'order') {
      // 発注書：お客様＝発行元（署名側）
      upd({ from: { ...doc.from, company, ...detail } });
    } else {
      upd({ to: { ...doc.to, company }, ...(isEstimate ? { schedule: { ...doc.schedule } } : {}) });
    }
  };

  const applyProject = (projectName) => {
    const p = projectOptions.find(o => o.projectName === projectName);
    if (!p) return;
    const patch = { subject: projectName };
    if (doc.type === 'order') {
      patch.from = { ...doc.from, company: p.company || doc.from.company };
    } else {
      patch.to = { ...doc.to, company: p.company || doc.to.company };
    }
    if (isEstimate) patch.schedule = { ...doc.schedule, projectName };
    upd(patch);
  };

  // 印刷（PDF出力）
  const handlePrint = () => { onSave(doc); window.print(); };

  const input = (props) => ({ padding: '7px 9px', border: `1px solid ${colors.border}`, borderRadius: 4, fontFamily: fontJP, fontSize: 13, color: colors.text, background: '#fff', boxSizing: 'border-box', width: '100%', ...props });
  const label = { fontSize: 11, color: colors.textMute, marginBottom: 3, display: 'block' };

  const tabs = isEstimate
    ? [['basic', '基本情報'], ['items', '明細'], ['conditions', '制作条件書'], ['schedule', '工程予定表'], ['angle', 'アングル']]
    : [['basic', '基本情報'], ['items', '明細']];

  return (
    <div>
      <PrintStyles />
      {/* ヘッダー操作 */}
      <div className="kz-no-print" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 13 }}><X size={15} />一覧へ戻る</button>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: dt.accent, padding: '4px 10px', borderRadius: 3, WebkitPrintColorAdjust: 'exact' }}>{dt.label}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={() => onSaveClose(doc)} style={{ padding: '8px 14px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 13, fontWeight: 500 }}>保存して閉じる</button>
          <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', background: dt.accent, color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 13, fontWeight: 600, WebkitPrintColorAdjust: 'exact' }}><Printer size={15} />PDF出力 / 印刷</button>
          {existing && <button onClick={onDelete} style={{ padding: '8px 12px', background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 4, cursor: 'pointer', color: '#c0392b', fontFamily: fontJP, fontSize: 13 }}><Trash2 size={15} /></button>}
        </div>
      </div>

      <div className="kz-no-print" style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* 左：フォーム */}
        <div style={{ flex: '1 1 440px', minWidth: 340 }}>
          {/* 自動入力 */}
          <div style={{ background: '#f3f7f1', border: `1px solid ${colors.border}`, borderRadius: 6, padding: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: colors.textMute, marginBottom: 6 }}>既存データから自動入力</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <select defaultValue="" onChange={(e) => { if (e.target.value) applyProject(e.target.value); e.target.value = ''; }} style={input({ width: 'auto', flex: '1 1 180px' })}>
                <option value="">案件から（件名・会社名）</option>
                {projectOptions.map(o => <option key={o.projectName} value={o.projectName}>{o.projectName}{o.company ? `（${o.company}）` : ''}</option>)}
              </select>
              <select defaultValue="" onChange={(e) => { if (e.target.value) applyCustomer(e.target.value); e.target.value = ''; }} style={input({ width: 'auto', flex: '1 1 180px' })}>
                <option value="">お客様マスタから</option>
                {(customerMaster || []).map(c => <option key={c.id} value={c.company}>{c.company}</option>)}
              </select>
            </div>
          </div>

          {/* タブ */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 14, flexWrap: 'wrap' }}>
            {tabs.map(([id, lb]) => (
              <button key={id} onClick={() => setTab(id)} style={{ padding: '6px 12px', background: tab === id ? '#1a1a1a' : 'transparent', color: tab === id ? '#fff' : '#1a1a1a', border: `1px solid ${tab === id ? '#1a1a1a' : colors.border}`, borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 12 }}>{lb}</button>
            ))}
          </div>

          {tab === 'basic' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Row>
                <Col><label style={label}>NO</label><input value={doc.no} onChange={e => upd({ no: e.target.value })} style={input()} /></Col>
                <Col><label style={label}>{isOrder ? '発効日' : '発行日'}</label><input type="date" value={doc.issueDate} onChange={e => upd({ issueDate: e.target.value })} style={input()} /></Col>
              </Row>
              <div><label style={label}>件名</label><input value={doc.subject} onChange={e => upd({ subject: e.target.value })} style={input()} /></div>

              {/* 宛先 */}
              {isOrder ? (
                <>
                  <div><label style={label}>宛先（御中）</label><input value={doc.to.company} onChange={e => upd({ to: { ...doc.to, company: e.target.value } })} style={input()} /></div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4 }}>発注者（お客様・署名捺印側）</div>
                  <div><label style={label}>会社名</label><input value={doc.from.company} onChange={e => upd({ from: { ...doc.from, company: e.target.value } })} style={input()} /></div>
                  <Row>
                    <Col><label style={label}>郵便番号</label><input value={doc.from.zip} onChange={e => upd({ from: { ...doc.from, zip: e.target.value } })} style={input()} /></Col>
                    <Col><label style={label}>電話番号</label><input value={doc.from.tel} onChange={e => upd({ from: { ...doc.from, tel: e.target.value } })} style={input()} /></Col>
                  </Row>
                  <div><label style={label}>住所</label><input value={doc.from.address} onChange={e => upd({ from: { ...doc.from, address: e.target.value } })} style={input()} /></div>
                  <div><label style={label}>代表者名</label><input value={doc.from.rep} onChange={e => upd({ from: { ...doc.from, rep: e.target.value } })} style={input()} /></div>
                </>
              ) : (
                <div><label style={label}>宛先 会社名（御中）</label><input value={doc.to.company} onChange={e => upd({ to: { ...doc.to, company: e.target.value } })} style={input()} /></div>
              )}

              {isEstimate && (
                <>
                  <div><label style={label}>制作条件</label><textarea value={doc.productionTerms} onChange={e => upd({ productionTerms: e.target.value })} style={input({ minHeight: 50, resize: 'vertical' })} /></div>
                  <Row>
                    <Col><label style={label}>支払条件</label><input value={doc.paymentTerms} onChange={e => upd({ paymentTerms: e.target.value })} style={input()} /></Col>
                    <Col><label style={label}>有効期限</label><input value={doc.validity} onChange={e => upd({ validity: e.target.value })} style={input()} /></Col>
                  </Row>
                </>
              )}
              {isInvoice && (
                <div><label style={label}>支払期限</label><input value={doc.paymentDeadline} onChange={e => upd({ paymentDeadline: e.target.value })} style={input()} /></div>
              )}

              {/* 発行元（自社） */}
              {!isOrder && (
                <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 10, marginTop: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>発行元（自社）</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input value={doc.from.company} onChange={e => upd({ from: { ...doc.from, company: e.target.value } })} placeholder="会社名" style={input()} />
                    <Row>
                      <Col><input value={doc.from.zip} onChange={e => upd({ from: { ...doc.from, zip: e.target.value } })} placeholder="郵便番号" style={input()} /></Col>
                      <Col><input value={doc.from.tel} onChange={e => upd({ from: { ...doc.from, tel: e.target.value } })} placeholder="電話" style={input()} /></Col>
                    </Row>
                    <input value={doc.from.address} onChange={e => upd({ from: { ...doc.from, address: e.target.value } })} placeholder="住所" style={input()} />
                    <Row>
                      <Col><input value={doc.from.person} onChange={e => upd({ from: { ...doc.from, person: e.target.value } })} placeholder="担当者" style={input()} /></Col>
                      {isInvoice && <Col><input value={doc.from.regNo} onChange={e => upd({ from: { ...doc.from, regNo: e.target.value } })} placeholder="登録番号" style={input()} /></Col>}
                    </Row>
                  </div>
                </div>
              )}

              <div><label style={label}>備考</label><textarea value={doc.note} onChange={e => upd({ note: e.target.value })} style={input({ minHeight: 50, resize: 'vertical' })} /></div>
              {isInvoice && (
                <div><label style={label}>振込先（1行ずつ）</label><textarea value={(doc.bankLines || []).join('\n')} onChange={e => upd({ bankLines: e.target.value.split('\n') })} style={input({ minHeight: 70, resize: 'vertical' })} /></div>
              )}
            </div>
          )}

          {tab === 'items' && (
            <ItemsEditor doc={doc} updItem={updItem} addItem={addItem} removeItem={removeItem} input={input} label={label} colors={colors} fontJP={fontJP} isInvoice={isInvoice} />
          )}

          {tab === 'conditions' && isEstimate && (
            <ConditionsEditor doc={doc} upd={upd} input={input} colors={colors} />
          )}

          {tab === 'schedule' && isEstimate && (
            <ScheduleEditor doc={doc} upd={upd} input={input} label={label} colors={colors} />
          )}

          {tab === 'angle' && isEstimate && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label style={label}>アングル（外観）見出し補足</label><input value={doc.angles.exteriorLabel} onChange={e => upd({ angles: { ...doc.angles, exteriorLabel: e.target.value } })} style={input()} placeholder="例：外観-目線" /></div>
              <div><label style={label}>アングル（外観）内容メモ</label><textarea value={doc.angles.exterior} onChange={e => upd({ angles: { ...doc.angles, exterior: e.target.value } })} style={input({ minHeight: 90, resize: 'vertical' })} /></div>
              <div><label style={label}>アングル（内観-目線）内容メモ</label><textarea value={doc.angles.interior} onChange={e => upd({ angles: { ...doc.angles, interior: e.target.value } })} style={input({ minHeight: 90, resize: 'vertical' })} /></div>
              <div style={{ fontSize: 11, color: colors.textMute }}>※ アングル参考画像の貼り付けは今後対応予定です。現状はテキストメモのみ。</div>
            </div>
          )}
        </div>

        {/* 右：プレビュー */}
        <div style={{ flex: '1 1 460px', minWidth: 320 }}>
          <div style={{ fontSize: 11, color: colors.textMute, marginBottom: 6 }}>プレビュー（このままPDF出力されます）</div>
          <PreviewScaler><BillingDocument doc={doc} /></PreviewScaler>
        </div>
      </div>

      {/* 印刷専用エリア（画面では非表示、印刷時のみ表示） */}
      <div id="kz-print-area"><BillingDocument doc={doc} /></div>
    </div>
  );
}

function Row({ children }) { return <div style={{ display: 'flex', gap: 10 }}>{children}</div>; }
function Col({ children }) { return <div style={{ flex: 1, minWidth: 0 }}>{children}</div>; }

// プレビューを横幅に合わせて縮小表示。
// transform: scale はレイアウト上の占有領域を変えないため、外枠の高さを縮小後の高さに明示設定して余白を防ぐ。
function PreviewScaler({ children }) {
  const wrapRef = useRef(null);
  const innerRef = useRef(null);
  const [scale, setScale] = useState(0.5);
  const [innerH, setInnerH] = useState(0);
  useEffect(() => {
    const wrap = wrapRef.current, inner = innerRef.current;
    if (!wrap || !inner) return;
    const A4W = 793.7; // 210mm @96dpi
    const recalc = () => {
      const w = wrap.clientWidth - 20; // padding 分
      setScale(Math.min(1, w / A4W));
      setInnerH(inner.offsetHeight);
    };
    recalc();
    const ro = new ResizeObserver(recalc);
    ro.observe(wrap);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [children]);
  return (
    <div style={{ width: '100%', border: '1px solid #e0e0e0', background: '#e9e7e0', padding: 10, borderRadius: 4, boxSizing: 'border-box' }}>
      <div ref={wrapRef} style={{ width: '100%', overflow: 'hidden', height: innerH ? innerH * scale : undefined }}>
        <div ref={innerRef} style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: 793.7 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ---- 明細編集 ----
function ItemsEditor({ doc, updItem, addItem, removeItem, input, label, colors, fontJP, isInvoice }) {
  const t = computeTotals(doc);
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {doc.items.map((it, idx) => (
          <div key={it.id} style={{ border: `1px solid ${colors.border}`, borderRadius: 5, padding: 10, background: '#fff' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: colors.textMute }}>#{idx + 1}</span>
              {isInvoice && (
                <>
                  <input type="date" value={it.date || ''} onChange={e => updItem(it.id, { date: e.target.value })} style={input({ width: 'auto' })} />
                  <select value={it.taxRate} onChange={e => updItem(it.id, { taxRate: Number(e.target.value), reduced: Number(e.target.value) === 8 })} style={input({ width: 'auto' })}>
                    <option value={10}>10%</option>
                    <option value={8}>8%(軽減)</option>
                  </select>
                </>
              )}
              <button onClick={() => removeItem(it.id)} style={{ marginLeft: 'auto', padding: '4px 8px', background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 4, cursor: 'pointer', color: '#c0392b' }}><Trash2 size={14} /></button>
            </div>
            <input value={it.name} onChange={e => updItem(it.id, { name: e.target.value })} placeholder="項目名" style={input({ marginBottom: 8 })} />
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}><label style={label}>数量</label><input value={it.qty} onChange={e => updItem(it.id, { qty: e.target.value })} placeholder="数量" style={input()} inputMode="decimal" /></div>
              <div style={{ flex: 1 }}><label style={label}>単価</label><input value={it.unit} onChange={e => updItem(it.id, { unit: e.target.value })} placeholder="単価" style={input()} inputMode="numeric" /></div>
              <div style={{ flex: 1 }}><label style={label}>金額</label><div style={{ ...input(), background: '#f7f6f2', textAlign: 'right' }}>{formatYen((parseFloat(it.qty) || 0) * (parseFloat(it.unit) || 0))}</div></div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={addItem} style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', background: 'transparent', border: `1px dashed ${colors.border}`, borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 13, width: '100%', justifyContent: 'center' }}><Plus size={14} />明細行を追加</button>
      <div style={{ marginTop: 14, padding: 12, background: '#f7f6f2', borderRadius: 5, fontSize: 13 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}><span>小計</span><span>{formatYen(t.subtotal)}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}><span>消費税</span><span>{formatYen(isInvoice ? t.taxTotal : t.tax)}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontWeight: 700, fontSize: 15 }}><span>合計（税込）</span><span>{formatYen(t.total)}</span></div>
      </div>
    </div>
  );
}

// ---- 制作条件書 編集 ----
function ConditionsEditor({ doc, upd, input, colors }) {
  const cond = doc.conditions || {};
  const setRow = (key, patch) => upd({ conditions: { ...cond, [key]: { ...(cond[key] || { selected: null, note: '' }), ...patch } } });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {CONDITION_SECTIONS.map(sec => (
        <div key={sec.title}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{sec.title}</div>
          {sec.rows.map(row => {
            const sel = cond[row.key] || {};
            return (
              <div key={row.key} style={{ marginBottom: 10, borderBottom: `1px solid ${colors.border}`, paddingBottom: 8 }}>
                <div style={{ fontSize: 12, marginBottom: 5 }}>{row.label}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 5 }}>
                  {row.options.map((op, i) => (
                    <button key={i} onClick={() => setRow(row.key, { selected: sel.selected === i ? null : i })}
                      style={{ padding: '4px 10px', fontSize: 12, borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', border: `1px solid ${sel.selected === i ? '#1a1a1a' : colors.border}`, background: sel.selected === i ? '#1a1a1a' : '#fff', color: sel.selected === i ? '#fff' : '#1a1a1a' }}>
                      {op}
                    </button>
                  ))}
                </div>
                <input value={sel.note || ''} onChange={e => setRow(row.key, { note: e.target.value })} placeholder="※制作補足情報" style={input()} />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ---- 工程予定表 編集 ----
function ScheduleEditor({ doc, upd, input, label, colors }) {
  const s = doc.schedule || {};
  const setS = (patch) => upd({ schedule: { ...s, ...patch } });
  const setCol = (i, patch) => setS({ columns: s.columns.map((c, ci) => ci === i ? { ...c, ...patch } : c) });
  const toggleTime = (i, tr) => {
    const c = s.columns[i];
    const times = { ...(c.times || {}) };
    if (times[tr]) delete times[tr]; else times[tr] = true;
    setCol(i, { times });
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Row>
        <Col><label style={label}>制作案件名</label><input value={s.projectName} onChange={e => setS({ projectName: e.target.value })} style={input()} /></Col>
        <Col><label style={label}>制作内容</label><input value={s.content} onChange={e => setS({ content: e.target.value })} style={input()} /></Col>
      </Row>
      <Row>
        <Col><label style={label}>制作概要</label><input value={s.overview} onChange={e => setS({ overview: e.target.value })} style={input()} /></Col>
        <Col><label style={label}>制作条件</label><input value={s.conditions} onChange={e => setS({ conditions: e.target.value })} style={input()} /></Col>
      </Row>
      <div><label style={label}>特記事項</label><input value={s.special} onChange={e => setS({ special: e.target.value })} style={input()} /></div>

      <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6 }}>工程（各列の日付・完了予定時間）</div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 10 }}>
          <thead>
            <tr>
              <th style={{ border: `1px solid ${colors.border}`, padding: 4, position: 'sticky', left: 0, background: '#f7f6f2' }}>時間＼工程</th>
              {(s.columns || []).map((c, i) => (
                <th key={i} style={{ border: `1px solid ${colors.border}`, padding: 4, minWidth: 90 }}>
                  <div style={{ fontSize: 9, marginBottom: 3 }}>{c.label}</div>
                  <input type="date" value={c.date || ''} onChange={e => setCol(i, { date: e.target.value })} style={{ width: '100%', fontSize: 9, border: `1px solid ${colors.border}`, borderRadius: 3, padding: 2 }} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SCHEDULE_TIME_ROWS.map(tr => (
              <tr key={tr}>
                <td style={{ border: `1px solid ${colors.border}`, padding: '2px 6px', textAlign: 'right', position: 'sticky', left: 0, background: '#faf9f5' }}>{tr}</td>
                {(s.columns || []).map((c, i) => (
                  <td key={i} style={{ border: `1px solid ${colors.border}`, textAlign: 'center', padding: 2 }}>
                    <input type="checkbox" checked={!!(c.times || {})[tr]} onChange={() => toggleTime(i, tr)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div><label style={label}>備考</label><textarea value={s.note} onChange={e => setS({ note: e.target.value })} style={input({ minHeight: 40, resize: 'vertical' })} /></div>
      <div><label style={label}>特殊規定</label><textarea value={s.specialRule} onChange={e => setS({ specialRule: e.target.value })} style={input({ minHeight: 40, resize: 'vertical' })} /></div>
    </div>
  );
}

// 印刷用スタイル（このビューが表示されている間だけ有効）
function PrintStyles() {
  return (
    <style>{`
      #kz-print-area { position: absolute; left: -99999px; top: 0; }
      @media print {
        body { margin: 0 !important; background: #fff !important; }
        body * { visibility: hidden !important; }
        #kz-print-area, #kz-print-area * { visibility: visible !important; }
        #kz-print-area { position: absolute !important; left: 0 !important; top: 0 !important; }
        .kz-no-print { display: none !important; }
        .kz-doc-page { box-shadow: none !important; margin: 0 !important; }
      }
      @page { size: A4; margin: 0; }
    `}</style>
  );
}
