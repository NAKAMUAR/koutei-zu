// 帳票のA4描画（画面プレビュー兼・印刷/PDF出力用）。
// 入力UIは持たず、doc の内容を忠実にレンダリングするだけ。
// デザインは元のExcel/PDF帳票に準拠（上下の色帯・字間広めの大見出し・白地＋色アンダーラインの明細・細罫線の集計）。
import React from 'react';
import {
  DOC_TYPES, docTypeOf, formatYen, formatJDate, lineAmount, computeTotals,
  CONDITION_SECTIONS, SCHEDULE_TIME_ROWS,
} from './billingUtils.js';
import rebegLogo from './rebeg-logo.png';

const FONT = "'Noto Sans JP', sans-serif";
const exact = { WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' };
const LINE = '#e2e0d8';   // 細罫線
const LABEL = '#777';     // ラベル文字色

// A4 1ページ。上下に色帯（上下に白マージンを残す）。
function Page({ children, first, accentBar }) {
  return (
    <div
      className="kz-doc-page"
      style={{
        width: '210mm', minHeight: '297mm', boxSizing: 'border-box',
        background: '#fff', color: '#1a1a1a', fontFamily: FONT,
        position: 'relative', overflow: 'hidden', padding: 0, margin: '0 auto',
        ...(first ? {} : { pageBreakBefore: 'always', breakBefore: 'page' }),
        ...exact,
      }}>
      {accentBar && <div style={{ height: '6mm', background: accentBar, margin: '9mm 0 0', ...exact }} />}
      <div style={{ padding: '10mm 16mm 22mm' }}>{children}</div>
      {accentBar && <div style={{ position: 'absolute', bottom: '9mm', left: 0, right: 0, height: '6mm', background: accentBar, ...exact }} />}
    </div>
  );
}

// 情報欄（件名・支払条件など）：グレー背景なし、細い下罫線のみ
function Field({ label, children, w = 76 }) {
  return (
    <div style={{ display: 'flex', borderBottom: `1px solid ${LINE}`, padding: '7px 0' }}>
      <div style={{ width: w, flex: 'none', fontSize: 11, color: LABEL, paddingTop: 1 }}>{label}</div>
      <div style={{ flex: 1, fontSize: 12, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

// 合計金額（情報欄の下に大きく）
function TotalLine({ total }) {
  return (
    <div style={{ display: 'flex', marginTop: 14, alignItems: 'baseline', gap: 14 }}>
      <span style={{ fontSize: 12, color: '#555' }}>合計金額</span>
      <span style={{ fontSize: 22, fontWeight: 700 }}>{formatYen(total)}</span>
      <span style={{ fontSize: 11, color: '#888' }}>（税込）</span>
    </div>
  );
}

// 発行元（自社）ブロック：ロゴ＋会社情報
function FromBlock({ from, showReg }) {
  return (
    <div style={{ fontSize: 11, lineHeight: 1.75 }}>
      <img src={rebegLogo} alt="re-beg" style={{ width: '42mm', display: 'block', marginBottom: 8 }} />
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>{from.company || '株式会社リーベグ'}</div>
      {from.zip ? <div>〒{from.zip}</div> : null}
      {from.address ? <div>{from.address}</div> : null}
      {from.tel ? <div style={{ marginTop: 5 }}>電話：{from.tel}</div> : null}
      {from.person ? <div>担当：{from.person}</div> : null}
      {showReg && from.regNo ? <div style={{ marginTop: 5 }}>登録番号：{from.regNo}</div> : null}
    </div>
  );
}

function Title({ text }) {
  return <h2 style={{ fontSize: 31, fontWeight: 700, letterSpacing: '0.22em', margin: 0, lineHeight: 1.1 }}>{text}</h2>;
}

function NoBlock({ doc, dateLabel = '発行日' }) {
  return (
    <div style={{ fontSize: 12, minWidth: 160, paddingTop: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}><span style={{ color: '#666' }}>NO：</span><span style={{ minWidth: 70 }}>{doc.no}</span></div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}><span style={{ color: '#666' }}>{dateLabel}：</span><span style={{ minWidth: 70 }}>{formatJDate(doc.issueDate)}</span></div>
    </div>
  );
}

// 宛先（御中）
function ToLine({ company, centered }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, borderBottom: '1px solid #9a9a9a', paddingBottom: 5, minWidth: 280 }}>
      <span style={{ fontSize: 17, fontWeight: 700, flex: 1, textAlign: centered ? 'center' : 'left' }}>{company || '　'}</span>
      <span style={{ fontSize: 13, fontWeight: 700 }}>御中</span>
    </div>
  );
}

// ===== 明細テーブル：白地ヘッダー＋色付き太アンダーライン =====
function ItemsTable({ doc }) {
  const isInvoice = doc.type === 'invoice';
  const isOrder = doc.type === 'order';
  const rows = doc.items || [];
  const minRows = isInvoice ? 10 : isOrder ? 10 : 13;
  const filled = rows.slice();
  while (filled.length < minRows) filled.push({ id: 'pad' + filled.length, _pad: true });
  const accent = docTypeOf(doc.type).accent;
  const head = { padding: '7px 8px', fontSize: 11.5, fontWeight: 600, color: '#333', borderBottom: `2.5px solid ${accent}`, textAlign: 'center', whiteSpace: 'nowrap' };
  const cell = { borderBottom: `1px solid #ececec`, padding: '7px 8px', fontSize: 11.5, height: 24 };
  const sep = { borderLeft: '1px solid #f0eee8' };
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
      <thead>
        <tr>
          {isInvoice && <th style={{ ...head, width: '13%' }}>日付</th>}
          <th style={{ ...head, textAlign: 'left' }}>項目</th>
          <th style={{ ...head, width: '11%' }}>数量</th>
          <th style={{ ...head, width: '16%' }}>単価</th>
          <th style={{ ...head, width: '18%' }}>金額</th>
        </tr>
      </thead>
      <tbody>
        {filled.map((it, i) => (
          <tr key={it.id || i}>
            {isInvoice && <td style={{ ...cell, textAlign: 'center', color: '#444' }}>{it._pad ? '' : (it.date ? formatJDate(it.date).slice(5, 10) : '')}</td>}
            <td style={{ ...cell, textAlign: 'left' }}>
              {it._pad ? '' : <>{it.reduced ? <span style={{ marginRight: 4 }}>*</span> : null}{it.name}</>}
            </td>
            <td style={{ ...cell, ...sep, textAlign: 'center' }}>{it._pad ? '' : (it.qty !== '' && it.qty != null ? it.qty : '')}</td>
            <td style={{ ...cell, ...sep, textAlign: 'right' }}>{it._pad || (it.unit === '' || it.unit == null) ? '' : formatYen(it.unit)}</td>
            <td style={{ ...cell, ...sep, textAlign: 'right' }}>{it._pad ? '' : formatYen(lineAmount(it))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// 見積・発注の合計ブロック（右寄せ・白地・細罫線）
function SimpleTotals({ doc }) {
  const t = computeTotals(doc);
  const row = (label, val, strong, last) => (
    <div style={{ display: 'flex', borderBottom: last ? 'none' : `1px solid ${LINE}` }}>
      <div style={{ flex: 1, padding: '10px 12px', fontSize: 12, textAlign: 'center', color: '#444', borderRight: `1px solid ${LINE}` }}>{label}</div>
      <div style={{ width: 150, padding: '10px 14px', fontSize: strong ? 14 : 12, fontWeight: strong ? 700 : 400, textAlign: 'right' }}>{formatYen(val)}</div>
    </div>
  );
  return (
    <div style={{ width: 330, marginLeft: 'auto', marginTop: 18, border: `1px solid ${LINE}` }}>
      {row('小計', t.subtotal)}
      {row('消費税（TAX/10%）', t.tax)}
      {row('合計金額（消費税込）', t.total, true, true)}
    </div>
  );
}

// 請求書の税額サマリー（軽減税率対応）
function InvoiceTotals({ doc }) {
  const t = computeTotals(doc);
  const pair = (label, val, head, lastCol) => (
    <div style={{ flex: 1, display: 'flex', borderRight: lastCol ? 'none' : `1px solid ${LINE}` }}>
      <div style={{ flex: 1, padding: '9px 8px', fontSize: 11, color: '#444', textAlign: 'center' }}>{label}</div>
      <div style={{ width: 78, padding: '9px 8px', fontSize: 11, textAlign: 'right', borderLeft: `1px solid ${LINE}` }}>{formatYen(val)}</div>
    </div>
  );
  return (
    <div style={{ marginTop: 12, border: `1px solid ${LINE}` }}>
      <div style={{ display: 'flex', borderBottom: `1px solid ${LINE}` }}>
        {pair('8％対象項目', t.base8)}
        {pair('10％対象項目', t.base10)}
        {pair('小計', t.subtotal, false, true)}
      </div>
      <div style={{ display: 'flex', borderBottom: `1px solid ${LINE}` }}>
        {pair('消費税（8％）', t.tax8)}
        {pair('消費税（10％）', t.tax10)}
        {pair('消費税（合計）', t.taxTotal, false, true)}
      </div>
      <div style={{ display: 'flex' }}>
        <div style={{ flex: 2, borderRight: `1px solid ${LINE}` }} />
        <div style={{ flex: 1, display: 'flex', background: '#eef3e8', ...exact }}>
          <div style={{ flex: 1, padding: '11px 10px', fontSize: 12.5, fontWeight: 700, textAlign: 'center' }}>合計金額(消費税込)</div>
          <div style={{ width: 78, padding: '11px 8px', fontSize: 14, fontWeight: 700, textAlign: 'right', borderLeft: `1px solid ${LINE}` }}>{formatYen(t.total)}</div>
        </div>
      </div>
    </div>
  );
}

function NoteBlock({ title = '備考', lines }) {
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ fontSize: 11, color: '#666', borderBottom: '1px solid #ccc', paddingBottom: 4, marginBottom: 7 }}>{title}</div>
      <div style={{ fontSize: 10.5, lineHeight: 1.8, whiteSpace: 'pre-wrap', color: '#333' }}>
        {Array.isArray(lines) ? lines.map((l, i) => <div key={i}>{l}</div>) : lines}
      </div>
    </div>
  );
}

// ===== 1ページ目（共通骨格を種別で出し分け） =====
function EstimatePage1({ doc }) {
  const t = computeTotals(doc);
  return (
    <Page first accentBar="#3a3a3a">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Title text="御 見 積 書" />
        <NoBlock doc={doc} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 26, gap: 24 }}>
        <div style={{ flex: 1, maxWidth: 330 }}>
          <ToLine company={doc.to.company} />
          <div style={{ fontSize: 11, margin: '12px 0 6px', color: '#444' }}>下記のとおり、御見積り申し上げます。</div>
          <Field label="件名">{doc.subject}</Field>
          <Field label="制作条件">{doc.productionTerms}</Field>
          <Field label="支払条件">{doc.paymentTerms}</Field>
          <Field label="有効期限">{doc.validity}</Field>
          <TotalLine total={t.total} />
        </div>
        <div style={{ width: 240, flex: 'none' }}>
          <FromBlock from={doc.from} />
        </div>
      </div>
      <div style={{ marginTop: 24 }}>
        <ItemsTable doc={doc} />
        <SimpleTotals doc={doc} />
      </div>
      <NoteBlock lines={doc.note} />
    </Page>
  );
}

function OrderPage1({ doc }) {
  const t = computeTotals(doc);
  const f = doc.from || {};
  return (
    <Page first accentBar="#3a7bd5">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Title text="発 注 書" />
        <NoBlock doc={doc} dateLabel="発効日" />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 26, gap: 24 }}>
        <div style={{ flex: 1, maxWidth: 340 }}>
          <ToLine company={doc.to.company || '株式会社リーベグ'} centered />
          <div style={{ fontSize: 11, margin: '12px 0 6px', color: '#444' }}>下記のとおり、御発注申し上げます。</div>
          <Field label="件名">{doc.subject}</Field>
          <TotalLine total={t.total} />
        </div>
        <div style={{ width: 240, flex: 'none', fontSize: 11.5, lineHeight: 1.95 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{f.company || '※お客様会社名'}</div>
          <div>{f.zip ? `〒${f.zip}` : '※〒000-000-000（郵便番号）'}</div>
          <div>{f.address || '※住所'}</div>
          <div>{f.tel ? `電話：${f.tel}` : '※電話番号'}</div>
          <div>{f.rep || '※代表者名'}</div>
          <div style={{ color: '#c0392b', marginTop: 10 }}>署名と捺印をお願いします。</div>
        </div>
      </div>
      <div style={{ marginTop: 24 }}>
        <ItemsTable doc={doc} />
        <SimpleTotals doc={doc} />
      </div>
      <NoteBlock lines={doc.note} />
    </Page>
  );
}

function InvoicePage1({ doc }) {
  const t = computeTotals(doc);
  return (
    <Page first accentBar="#8bc34a">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Title text="御 請 求 書" />
        <NoBlock doc={doc} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 26, gap: 24 }}>
        <div style={{ flex: 1, maxWidth: 330 }}>
          <ToLine company={doc.to.company} />
          <div style={{ fontSize: 11, margin: '12px 0 6px', color: '#444' }}>下記のとおり、ご請求申し上げます</div>
          <Field label="件名">{doc.subject}</Field>
          <Field label="支払期限">{doc.paymentDeadline}</Field>
          <TotalLine total={t.total} />
        </div>
        <div style={{ width: 240, flex: 'none' }}>
          <FromBlock from={doc.from} showReg />
        </div>
      </div>
      <div style={{ marginTop: 22 }}>
        <ItemsTable doc={doc} />
        <div style={{ fontSize: 10, color: '#666', marginTop: 5 }}>* 軽減税率対象</div>
        <InvoiceTotals doc={doc} />
      </div>
      <NoteBlock lines={[...(doc.note ? [doc.note] : []), ...(doc.bankLines || [])]} />
    </Page>
  );
}

// ===== 見積 2枚目：制作条件書 =====
function CheckBox({ on }) {
  return (
    <span style={{ display: 'inline-flex', width: 12, height: 12, border: '1px solid #555', alignItems: 'center', justifyContent: 'center', flex: 'none', ...exact }}>
      {on ? <span style={{ fontSize: 10, lineHeight: 1, fontWeight: 700 }}>✓</span> : null}
    </span>
  );
}
function ConditionPage({ doc }) {
  const cond = doc.conditions || {};
  return (
    <Page accentBar="#3a3a3a">
      {CONDITION_SECTIONS.map(sec => (
        <div key={sec.title} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, borderBottom: '2px solid #1a1a1a', display: 'inline-block', paddingRight: 30, marginBottom: 6 }}>・ {sec.title}</div>
          {sec.rows.map(row => {
            const sel = cond[row.key] || {};
            return (
              <div key={row.key} style={{ border: '1px solid #d8d8d8', borderBottom: 'none', fontSize: 11 }}>
                <div style={{ display: 'flex', alignItems: 'stretch' }}>
                  <div style={{ width: 150, flex: 'none', padding: '6px 8px', borderRight: '1px solid #d8d8d8', display: 'flex', alignItems: 'center' }}>{row.label}</div>
                  {row.options.map((op, i) => (
                    <div key={i} style={{ flex: 1, padding: '6px 6px', borderRight: i < row.options.length - 1 ? '1px solid #eee' : 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <CheckBox on={sel.selected === i} /><span>{op}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', borderTop: '1px solid #eee', borderBottom: '1px solid #d8d8d8' }}>
                  <div style={{ width: 150, flex: 'none', padding: '4px 8px', borderRight: '1px solid #d8d8d8', color: '#888', fontSize: 10 }}>※制作補足情報</div>
                  <div style={{ flex: 1, padding: '4px 8px', fontSize: 10.5, whiteSpace: 'pre-wrap', minHeight: 14 }}>{sel.note || ''}</div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </Page>
  );
}

// ===== 見積 3枚目：工程予定表 =====
function SchedulePage({ doc }) {
  const s = doc.schedule || {};
  const cols = s.columns || [];
  const partyColor = (p) => p === 'client' ? '#dbe7f3' : '#dceadb';
  return (
    <Page accentBar="#3a3a3a">
      <div style={{ textAlign: 'center', margin: '4px 0 18px' }}>
        <span style={{ display: 'inline-block', background: '#4a6fa5', color: '#fff', padding: '7px 34px', fontSize: 15, fontWeight: 700, ...exact }}>制作スケジュール / 工程予定表①</span>
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, borderBottom: '2px solid #1a1a1a', display: 'inline-block', paddingRight: 30, marginBottom: 8 }}>・ 制作情報</div>
      <div style={{ border: '1px solid #d8d8d8', marginBottom: 16 }}>
        <div style={{ display: 'flex' }}>
          <SCell label="制作案件名" val={s.projectName} />
          <SCell label="制作内容" val={s.content} last />
        </div>
        <div style={{ display: 'flex', borderTop: '1px solid #d8d8d8' }}>
          <SCell label="制作概要" val={s.overview} />
          <SCell label="制作条件" val={s.conditions} last />
        </div>
        <div style={{ display: 'flex', borderTop: '1px solid #d8d8d8' }}>
          <SCell label="特記事項" val={s.special} full last />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, borderBottom: '2px solid #1a1a1a', paddingRight: 20 }}>・ 制作工程</span>
        <span style={{ fontSize: 10, background: '#dbe7f3', padding: '2px 8px', ...exact }}>お客様対応区分</span>
        <span style={{ fontSize: 10, background: '#dceadb', padding: '2px 8px', ...exact }}>当社対応区分</span>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: 9 }}>
        <tbody>
          <tr>
            <td style={{ width: 56, border: '1px solid #ccc', padding: 3, textAlign: 'center', background: '#f3f1ea', ...exact }}>日付</td>
            {cols.map((c, i) => (
              <td key={i} style={{ border: '1px solid #ccc', padding: 3, textAlign: 'center', height: 24 }}>{c.date ? formatJDate(c.date).slice(5, 10) : ''}</td>
            ))}
          </tr>
          <tr>
            <td style={{ border: '1px solid #ccc', padding: 3, textAlign: 'center', background: '#f3f1ea', ...exact }}>作業項目</td>
            {cols.map((c, i) => (
              <td key={i} style={{ border: '1px solid #ccc', padding: '6px 2px', textAlign: 'center', verticalAlign: 'middle', background: partyColor(c.party), height: 90, ...exact }}>
                <div style={{ writingMode: 'vertical-rl', margin: '0 auto', fontSize: 9, letterSpacing: 1 }}>{c.label}</div>
              </td>
            ))}
          </tr>
          {SCHEDULE_TIME_ROWS.map((tr) => (
            <tr key={tr}>
              <td style={{ border: '1px solid #ccc', padding: '1px 3px', textAlign: 'right', background: '#faf9f5', ...exact }}>{tr}</td>
              {cols.map((c, ci) => {
                const on = (c.times || {})[tr];
                return (
                  <td key={ci} style={{ border: '1px solid #ccc', textAlign: 'center', padding: 1 }}>
                    <span style={{ display: 'inline-flex', width: 9, height: 9, border: '1px solid #888', alignItems: 'center', justifyContent: 'center', ...exact }}>
                      {on ? <span style={{ width: 5, height: 5, background: '#444', ...exact }} /> : null}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ border: '1px solid #d8d8d8', borderTop: 'none', display: 'flex' }}>
        <div style={{ width: 56, flex: 'none', padding: 6, background: '#f3f1ea', fontSize: 10, ...exact }}>備考</div>
        <div style={{ flex: 1, padding: 6, fontSize: 10, whiteSpace: 'pre-wrap' }}>{s.note}</div>
      </div>
      <div style={{ border: '1px solid #d8d8d8', borderTop: 'none', display: 'flex' }}>
        <div style={{ width: 56, flex: 'none', padding: 6, background: '#f3f1ea', fontSize: 10, ...exact }}>特殊規定</div>
        <div style={{ flex: 1, padding: 6, fontSize: 10, whiteSpace: 'pre-wrap', minHeight: 30 }}>{s.specialRule}</div>
      </div>
    </Page>
  );
}
function SCell({ label, val, last, full }) {
  return (
    <div style={{ display: 'flex', flex: full ? '1 1 100%' : 1, borderRight: last ? 'none' : '1px solid #d8d8d8' }}>
      <div style={{ width: 80, flex: 'none', background: '#f3f1ea', padding: '6px 8px', fontSize: 10.5, ...exact }}>{label}</div>
      <div style={{ flex: 1, padding: '6px 8px', fontSize: 11, whiteSpace: 'pre-wrap', minHeight: 16 }}>{val}</div>
    </div>
  );
}

// ===== 見積 4枚目：アングル =====
function AnglePage({ doc }) {
  const a = doc.angles || {};
  const box = (label, val) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 700, borderBottom: '2px solid #1a1a1a', display: 'inline-block', paddingRight: 40, marginBottom: 8 }}>・ {label}</div>
      <div style={{ border: '1px solid #999', height: '110mm', padding: 8, fontSize: 11, whiteSpace: 'pre-wrap', boxSizing: 'border-box' }}>{val}</div>
    </div>
  );
  return (
    <Page accentBar="#3a3a3a">
      {box(`アングル（${a.exteriorLabel || ''}）`, a.exterior)}
      {box('アングル（内観-目線）', a.interior)}
    </Page>
  );
}

export default function BillingDocument({ doc }) {
  if (!doc) return null;
  if (doc.type === 'estimate') {
    return (
      <div>
        <EstimatePage1 doc={doc} />
        <ConditionPage doc={doc} />
        <SchedulePage doc={doc} />
        <AnglePage doc={doc} />
      </div>
    );
  }
  if (doc.type === 'order') return <div><OrderPage1 doc={doc} /></div>;
  return <div><InvoicePage1 doc={doc} /></div>;
}

export { DOC_TYPES };
