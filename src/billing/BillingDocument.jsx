// 帳票のA4描画（画面プレビュー兼・印刷/PDF出力用）。
// 入力UIは持たず、doc の内容を忠実にレンダリングするだけ。
import React from 'react';
import {
  DOC_TYPES, docTypeOf, formatYen, formatJDate, lineAmount, computeTotals,
  CONDITION_SECTIONS, SCHEDULE_TIME_ROWS,
} from './billingUtils.js';

const FONT = "'Noto Sans JP', sans-serif";
const exact = { WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' };

// A4 1ページ。printScale はプレビュー縮小用（印刷時は 1）
function Page({ children, first, accentBar }) {
  return (
    <div
      className="kz-doc-page"
      style={{
        width: '210mm', minHeight: '297mm', boxSizing: 'border-box',
        background: '#fff', color: '#1a1a1a', fontFamily: FONT,
        position: 'relative', overflow: 'hidden',
        padding: 0, margin: '0 auto',
        ...(first ? {} : { pageBreakBefore: 'always', breakBefore: 'page' }),
        ...exact,
      }}>
      {accentBar && (
        <>
          <div style={{ height: '7mm', background: accentBar, ...exact }} />
        </>
      )}
      <div style={{ padding: '8mm 14mm 14mm' }}>{children}</div>
      {accentBar && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '7mm', background: accentBar, ...exact }} />
      )}
    </div>
  );
}

function Field({ label, children, w = 70 }) {
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid #d8d8d8' }}>
      <div style={{ width: w, flex: 'none', background: '#f3f1ea', padding: '6px 8px', fontSize: 11, color: '#555', display: 'flex', alignItems: 'center', ...exact }}>{label}</div>
      <div style={{ flex: 1, padding: '6px 10px', fontSize: 12, whiteSpace: 'pre-wrap', minHeight: 16, lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}

// 発行元（自社）ブロック
function FromBlock({ from, showReg }) {
  return (
    <div style={{ fontSize: 11, lineHeight: 1.7 }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{from.company || '株式会社リーベグ'}</div>
      {from.zip ? <div>〒{from.zip}</div> : null}
      {from.address ? <div>{from.address}</div> : null}
      {from.tel ? <div style={{ marginTop: 4 }}>電話：{from.tel}</div> : null}
      {from.person ? <div>担当：{from.person}</div> : null}
      {showReg && from.regNo ? <div style={{ marginTop: 4 }}>登録番号：{from.regNo}</div> : null}
    </div>
  );
}

function Title({ text, size = 30 }) {
  return <h2 style={{ fontSize: size, fontWeight: 700, letterSpacing: '0.18em', margin: 0 }}>{text}</h2>;
}

function NoBlock({ doc, dateLabel = '発行日' }) {
  return (
    <div style={{ textAlign: 'left', fontSize: 12, minWidth: 150 }}>
      <div style={{ display: 'flex', gap: 6 }}><span style={{ color: '#666' }}>NO：</span><span>{doc.no}</span></div>
      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}><span style={{ color: '#666' }}>{dateLabel}：</span><span>{formatJDate(doc.issueDate)}</span></div>
    </div>
  );
}

// 宛先（御中）
function ToLine({ to, big }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, borderBottom: '1.5px solid #1a1a1a', paddingBottom: 4, minWidth: 280 }}>
      <span style={{ fontSize: big ? 18 : 16, fontWeight: 700, flex: 1 }}>{to.company || '　'}</span>
      <span style={{ fontSize: 13, fontWeight: 700 }}>{to.honorific || '御中'}</span>
    </div>
  );
}

// ===== 明細テーブル =====
function ItemsTable({ doc }) {
  const isInvoice = doc.type === 'invoice';
  const rows = doc.items || [];
  // 表示行数を最低数まで空行で埋める
  const minRows = isInvoice ? 9 : doc.type === 'order' ? 9 : 11;
  const filled = rows.slice();
  while (filled.length < minRows) filled.push({ id: 'pad' + filled.length, _pad: true });
  const cell = { borderBottom: '1px solid #e2e2e2', padding: '6px 8px', fontSize: 11.5, height: 22 };
  const headCell = { ...cell, background: '#3a3a3a', color: '#fff', fontWeight: 600, borderBottom: 'none', textAlign: 'center', ...exact };
  const accent = docTypeOf(doc.type).accent;
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
      <thead>
        <tr style={{ background: accent, ...exact }}>
          {isInvoice && <th style={{ ...headCell, background: accent, width: '14%' }}>日付</th>}
          <th style={{ ...headCell, background: accent, textAlign: 'left' }}>項目</th>
          <th style={{ ...headCell, background: accent, width: '12%' }}>数量</th>
          <th style={{ ...headCell, background: accent, width: '16%' }}>単価</th>
          <th style={{ ...headCell, background: accent, width: '18%' }}>金額</th>
        </tr>
      </thead>
      <tbody>
        {filled.map((it, i) => (
          <tr key={it.id || i}>
            {isInvoice && <td style={{ ...cell, textAlign: 'center', color: '#444' }}>{it._pad ? '' : (it.date ? formatJDate(it.date).slice(5) : '')}</td>}
            <td style={{ ...cell, textAlign: 'left' }}>
              {it._pad ? '' : <>{it.reduced ? <span style={{ marginRight: 4 }}>*</span> : null}{it.name}</>}
            </td>
            <td style={{ ...cell, textAlign: 'center' }}>{it._pad ? '' : (it.qty !== '' && it.qty != null ? it.qty : '')}</td>
            <td style={{ ...cell, textAlign: 'right' }}>{it._pad || (it.unit === '' || it.unit == null) ? '' : formatYen(it.unit)}</td>
            <td style={{ ...cell, textAlign: 'right' }}>{it._pad ? '' : formatYen(lineAmount(it))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// 見積・発注の合計ブロック（右寄せ3行）
function SimpleTotals({ doc }) {
  const t = computeTotals(doc);
  const row = (label, val, strong) => (
    <div style={{ display: 'flex', borderBottom: '1px solid #ddd' }}>
      <div style={{ flex: 1, background: '#f3f1ea', padding: '8px 12px', fontSize: 12, textAlign: 'center', ...exact }}>{label}</div>
      <div style={{ width: 150, padding: '8px 12px', fontSize: strong ? 14 : 12, fontWeight: strong ? 700 : 400, textAlign: 'right' }}>{formatYen(val)}</div>
    </div>
  );
  return (
    <div style={{ width: 320, marginLeft: 'auto', marginTop: 14 }}>
      {row('小計', t.subtotal)}
      {row('消費税（TAX/10%）', t.tax)}
      {row('合計金額（消費税込）', t.total, true)}
    </div>
  );
}

// 請求書の税額サマリー（軽減税率対応）
function InvoiceTotals({ doc }) {
  const t = computeTotals(doc);
  const box = (label, val, head) => (
    <div style={{ flex: 1, display: 'flex', borderRight: '1px solid #ddd' }}>
      <div style={{ flex: 1, padding: '8px 8px', fontSize: 11, background: head ? '#f3f1ea' : '#fff', ...exact }}>{label}</div>
      <div style={{ width: 70, padding: '8px 8px', fontSize: 11, textAlign: 'right' }}>{formatYen(val)}</div>
    </div>
  );
  return (
    <div style={{ marginTop: 10, border: '1px solid #ddd' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid #ddd' }}>
        {box('8％対象項目', t.base8, true)}
        {box('10％対象項目', t.base10, true)}
        {box('小計', t.subtotal, true)}
      </div>
      <div style={{ display: 'flex', borderBottom: '1px solid #ddd' }}>
        {box('消費税（8％）', t.tax8)}
        {box('消費税（10％）', t.tax10)}
        {box('消費税（合計）', t.taxTotal)}
      </div>
      <div style={{ display: 'flex', background: '#eef3e8', ...exact }}>
        <div style={{ flex: 1, padding: '10px 12px', fontSize: 13, fontWeight: 700, textAlign: 'right' }}>合計金額(消費税込)</div>
        <div style={{ width: 150, padding: '10px 12px', fontSize: 15, fontWeight: 700, textAlign: 'right' }}>{formatYen(t.total)}</div>
      </div>
    </div>
  );
}

function NoteBlock({ title = '備考', lines }) {
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 11, color: '#666', borderBottom: '1px solid #ccc', paddingBottom: 3, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 10.5, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: '#333' }}>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 22, gap: 20 }}>
        <div style={{ flex: 1, maxWidth: 320 }}>
          <ToLine to={doc.to} />
          <div style={{ fontSize: 11, margin: '10px 0 8px', color: '#444' }}>下記のとおり、御見積り申し上げます。</div>
          <Field label="件名">{doc.subject}</Field>
          <Field label="制作条件">{doc.productionTerms}</Field>
          <Field label="支払条件">{doc.paymentTerms}</Field>
          <Field label="有効期限">{doc.validity}</Field>
          <div style={{ display: 'flex', marginTop: 8, alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontSize: 12, color: '#555' }}>合計金額</span>
            <span style={{ fontSize: 20, fontWeight: 700 }}>{formatYen(t.total)}</span>
            <span style={{ fontSize: 11, color: '#777' }}>（税込）</span>
          </div>
        </div>
        <div style={{ width: 230, flex: 'none', paddingTop: 18 }}>
          <FromBlock from={doc.from} />
        </div>
      </div>
      <div style={{ marginTop: 18 }}>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 22, gap: 20 }}>
        <div style={{ flex: 1, maxWidth: 330 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, borderBottom: '1.5px solid #1a1a1a', paddingBottom: 4 }}>
            <span style={{ fontSize: 16, fontWeight: 700, flex: 1, textAlign: 'center' }}>{doc.to.company || '株式会社リーベグ'}</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>御中</span>
          </div>
          <div style={{ fontSize: 11, margin: '10px 0 8px', color: '#444' }}>下記のとおり、御発注申し上げます。</div>
          <Field label="件名">{doc.subject}</Field>
          <div style={{ display: 'flex', marginTop: 14, alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontSize: 12, color: '#555' }}>合計金額</span>
            <span style={{ fontSize: 18, fontWeight: 700 }}>{formatYen(t.total)}</span>
            <span style={{ fontSize: 11, color: '#777' }}>（税込）</span>
          </div>
        </div>
        <div style={{ width: 230, flex: 'none', fontSize: 11.5, lineHeight: 1.9 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{f.company || '※お客様会社名'}</div>
          <div>{f.zip ? `〒${f.zip}` : '※〒000-000-000（郵便番号）'}</div>
          <div>{f.address || '※住所'}</div>
          <div>{f.tel ? `電話：${f.tel}` : '※電話番号'}</div>
          <div>{f.rep || '※代表者名'}</div>
          <div style={{ color: '#c0392b', marginTop: 8 }}>署名と捺印をお願いします。</div>
        </div>
      </div>
      <div style={{ marginTop: 18 }}>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 22, gap: 20 }}>
        <div style={{ flex: 1, maxWidth: 320 }}>
          <ToLine to={doc.to} />
          <div style={{ fontSize: 11, margin: '10px 0 8px', color: '#444' }}>下記のとおり、ご請求申し上げます</div>
          <Field label="件名">{doc.subject}</Field>
          <Field label="支払期限">{doc.paymentDeadline}</Field>
          <div style={{ display: 'flex', marginTop: 12, alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontSize: 12, color: '#555' }}>合計金額</span>
            <span style={{ fontSize: 20, fontWeight: 700 }}>{formatYen(t.total)}</span>
            <span style={{ fontSize: 11, color: '#777' }}>（税込）</span>
          </div>
        </div>
        <div style={{ width: 230, flex: 'none', paddingTop: 18 }}>
          <FromBlock from={doc.from} showReg />
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <ItemsTable doc={doc} />
        <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>* 軽減税率対象</div>
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
        <span style={{ display: 'inline-block', background: '#4a6fa5', color: '#fff', padding: '6px 30px', fontSize: 15, fontWeight: 700, ...exact }}>制作スケジュール / 工程予定表①</span>
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
              <td key={i} style={{ border: '1px solid #ccc', padding: 3, textAlign: 'center', height: 24 }}>{c.date ? formatJDate(c.date).slice(5) : ''}</td>
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
          {SCHEDULE_TIME_ROWS.map((tr, ri) => (
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
