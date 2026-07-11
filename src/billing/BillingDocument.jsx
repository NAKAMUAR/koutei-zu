// 帳票のA4描画（画面プレビュー兼・印刷/PDF出力用）。
// 入力UIは持たず、doc の内容を忠実にレンダリングするだけ。
// デザインは元のExcel/PDF帳票に準拠（上下の色帯・字間広めの大見出し・白地＋色アンダーラインの明細・細罫線の集計）。
import {
  DOC_TYPES, docTypeOf, docFontCss, formatYen, formatJDate, lineAmount, computeTotals,
  CONDITION_SECTIONS, SCHEDULE_TIME_ROWS,
} from './billingUtils.js';
import rebegLogo from './rebeg-logo.png';

// フォントは doc.font（編集画面で変更可）から docFontCss で決まる。
// 既定はExcel帳票に準拠：見積書=BIZ UDPGothic／発注書・請求書=M PLUS 1p。
const exact = { WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' };
const LINE = '#e2e0d8';       // 細罫線
const TITLE_COLOR = '#434343'; // 大見出し・ヘッダー下線の色（Excelのタイトル色）

// ===== 3種の帳票で「おおまかな位置」を揃えるための共通寸法 =====
// タイトル行 → 宛先・情報ブロック → 明細表 → 合計 → 備考 の各開始位置が
// 種別によらず同じになるよう、可変部分は固定の最小高さで確保する。
const INFO_BLOCK_MIN_MM = 69;   // 宛先＋情報欄＋発行元ブロック（一番項目の多い見積書に合わせる）
const TOTALS_BLOCK_MIN_MM = 34; // 合計欄（請求書のグリッド／見積・発注の3段の高い方に合わせる）
const ITEM_MIN_ROWS = 10;       // 明細の最低行数（全種別共通）

// A4 1ページ。上下に色帯（Excelの上下余白 約20mm・帯1行ぶんに合わせる）。
function Page({ children, first, accentBar, font }) {
  return (
    <div
      className="kz-doc-page"
      style={{
        width: '210mm', minHeight: '297mm', boxSizing: 'border-box',
        background: '#fff', color: '#1a1a1a', fontFamily: font || "'Noto Sans JP', sans-serif",
        position: 'relative', overflow: 'hidden', padding: 0, margin: '0 auto',
        ...(first ? {} : { pageBreakBefore: 'always', breakBefore: 'page' }),
        ...exact,
      }}>
      {accentBar && <div style={{ height: '5.5mm', background: accentBar, margin: '8mm 0 0', ...exact }} />}
      <div style={{ padding: '6mm 11mm 20mm' }}>{children}</div>
      {accentBar && <div style={{ position: 'absolute', bottom: '8mm', left: 0, right: 0, height: '5.5mm', background: accentBar, ...exact }} />}
    </div>
  );
}

// 情報欄（件名・支払条件など）：グレー背景なし、細い下罫線のみ（Excelは10-11pt・行高21pt）
function Field({ label, children, w = 84 }) {
  return (
    <div style={{ display: 'flex', borderBottom: `1px solid ${LINE}`, padding: '5px 0' }}>
      <div style={{ width: w, flex: 'none', fontSize: 12, color: '#333', paddingTop: 1 }}>{label}</div>
      <div style={{ flex: 1, fontSize: 12, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{children}</div>
    </div>
  );
}

// 合計金額（情報欄の下に大きく。Excelは14pt・非太字＋（税込）9pt）
function TotalLine({ total }) {
  return (
    <div style={{ display: 'flex', marginTop: 10, alignItems: 'baseline', gap: 14, borderBottom: `1px solid ${LINE}`, paddingBottom: 8 }}>
      <span style={{ fontSize: 12.5, color: '#333' }}>合計金額</span>
      <span style={{ fontSize: 18, fontWeight: 500 }}>{formatYen(total)}</span>
      <span style={{ fontSize: 11.5, color: '#666' }}>（税込）</span>
    </div>
  );
}

// 発行元（自社）ブロック：ロゴ＋会社情報（会社名14pt相当・詳細10pt相当）
function FromBlock({ from, showReg }) {
  return (
    <div style={{ fontSize: 12, lineHeight: 1.7 }}>
      <img src={rebegLogo} alt="re-beg" style={{ width: '38mm', display: 'block', marginBottom: 6 }} />
      <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 3, color: TITLE_COLOR }}>{from.company || '株式会社リーベグ'}</div>
      {from.zip ? <div>〒{from.zip}</div> : null}
      {from.address ? <div>{from.address}</div> : null}
      {from.tel ? <div style={{ marginTop: 4 }}>電話：{from.tel}</div> : null}
      {from.person ? <div>担当：{from.person}</div> : null}
      {showReg && from.regNo ? <div style={{ marginTop: 4 }}>登録番号：{from.regNo}</div> : null}
    </div>
  );
}

// 大見出し（Excelは36pt・太字・#434343。全角スペース入りタイトル）
function Title({ text }) {
  return <h2 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '0.22em', margin: 0, lineHeight: 1.15, color: TITLE_COLOR }}>{text}</h2>;
}

function NoBlock({ doc, dateLabel = '発行日' }) {
  return (
    <div style={{ fontSize: 12.5, minWidth: 170, paddingTop: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}><span style={{ color: '#555' }}>NO：</span><span style={{ minWidth: 76 }}>{doc.no}</span></div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 7 }}><span style={{ color: '#555' }}>{dateLabel}：</span><span style={{ minWidth: 76 }}>{formatJDate(doc.issueDate)}</span></div>
    </div>
  );
}

// 宛先（御中）。Excelは会社名16pt太字・御中11pt太字・下罫線
function ToLine({ company, centered }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, borderBottom: '1px solid #9a9a9a', paddingBottom: 5, minWidth: 300 }}>
      <span style={{ fontSize: 20, fontWeight: 700, flex: 1, textAlign: centered ? 'center' : 'left' }}>{company || '　'}</span>
      <span style={{ fontSize: 14, fontWeight: 700 }}>御中</span>
    </div>
  );
}

// ===== 明細テーブル：白地ヘッダー＋太アンダーライン =====
// Excelの構成に準拠：見積書14行・発注書/請求書10行。請求書のみ先頭に「日付」列。
// 列幅もExcelの列構成（項目≒半分・数量1列・単価3列・金額3列）に合わせる。
function ItemsTable({ doc }) {
  const rows = doc.items || [];
  const isInvoice = doc.type === 'invoice';
  const minRows = ITEM_MIN_ROWS; // 全種別共通（位置を揃える）。行が増えた場合はそのまま伸びる
  const filled = rows.slice();
  while (filled.length < minRows) filled.push({ id: 'pad' + filled.length, _pad: true });
  const head = { padding: '6px 8px', fontSize: 12, fontWeight: 600, color: '#333', borderBottom: `2.5px solid ${TITLE_COLOR}`, textAlign: 'center', whiteSpace: 'nowrap' };
  const cell = { borderBottom: `1px solid #ececec`, padding: '5px 8px', fontSize: 12, height: 22 };
  const sep = { borderLeft: '1px solid #f0eee8' };
  const shortDate = (s) => { const [, m, d] = (s || '').split('-').map(Number); return (m && d) ? `${m}/${d}` : ''; };
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
      <thead>
        <tr>
          {isInvoice && <th style={{ ...head, width: '9%' }}>日付</th>}
          <th style={{ ...head, textAlign: 'left' }}>項目</th>
          <th style={{ ...head, width: '8%' }}>数量</th>
          <th style={{ ...head, width: isInvoice ? '17%' : '19%' }}>単価</th>
          <th style={{ ...head, width: isInvoice ? '18%' : '20%' }}>金額</th>
        </tr>
      </thead>
      <tbody>
        {filled.map((it, i) => (
          <tr key={it.id || i}>
            {isInvoice && <td style={{ ...cell, textAlign: 'center' }}>{it._pad ? '' : shortDate(it.date)}</td>}
            <td style={{ ...cell, ...(isInvoice ? sep : {}), textAlign: 'left' }}>
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

// 合計ブロック（見積書・発注書）：右寄せ・白地・細罫線。
// Excelの「小計／消費税（TAX/10%）／合計金額（消費税込）」3段（行高37.5pt・値12pt）に合わせる。
function SimpleTotals({ doc }) {
  const t = computeTotals(doc);
  const row = (label, val, strong, last) => (
    <div key={label} style={{ display: 'flex', borderBottom: last ? 'none' : `1px solid ${LINE}` }}>
      <div style={{ flex: 1, padding: '10px 8px', fontSize: 12, textAlign: 'center', color: '#444', borderRight: `1px solid ${LINE}`, display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap' }}>{label}</div>
      <div style={{ width: 150, padding: '10px 14px', fontSize: 15, fontWeight: strong ? 700 : 400, textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>{formatYen(val)}</div>
    </div>
  );
  return (
    <div style={{ width: 330, marginLeft: 'auto', marginTop: 12, border: `1px solid ${LINE}` }}>
      {row('小計', t.subtotal)}
      {row('消費税（TAX/10%）', t.tax)}
      {row('合計金額（消費税込）', t.total, true, true)}
    </div>
  );
}

// 合計ブロック（請求書）：Excelの請求書と同じ3列構成を常時表示。
// ［8％対象項目｜消費税(8%)］［10％対象項目｜消費税(10%)］［小計｜消費税(合計)｜合計金額(税込)］
function InvoiceTotals({ doc }) {
  const t = computeTotals(doc);
  const lab = { border: '1px solid #cfcdc5', padding: '8px 8px', fontSize: 11.5, textAlign: 'center', color: '#444', background: '#fff', whiteSpace: 'nowrap' };
  const val = { border: '1px solid #cfcdc5', padding: '8px 10px', fontSize: 12.5, textAlign: 'right' };
  const none = { border: 'none' };
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 11, color: '#555', marginBottom: 3 }}>　*　軽減税率対象</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '14%' }} /><col style={{ width: '12%' }} />
          <col style={{ width: '14%' }} /><col style={{ width: '12%' }} />
          <col style={{ width: '18%' }} /><col style={{ width: '15%' }} />
        </colgroup>
        <tbody>
          <tr>
            <td style={lab}>8％対象項目</td><td style={val}>{formatYen(t.base8)}</td>
            <td style={lab}>10％対象項目</td><td style={val}>{formatYen(t.base10)}</td>
            <td style={lab}>小計</td><td style={val}>{formatYen(t.subtotal)}</td>
          </tr>
          <tr>
            <td style={lab}>消費税（8％）</td><td style={val}>{formatYen(t.tax8)}</td>
            <td style={lab}>消費税（10％）</td><td style={val}>{formatYen(t.tax10)}</td>
            <td style={lab}>消費税（合計）</td><td style={val}>{formatYen(t.taxTotal)}</td>
          </tr>
          <tr>
            <td style={none} colSpan={4}></td>
            <td style={{ ...lab, background: '#efefef', ...exact }}>合計金額（消費税込）</td>
            <td style={{ ...val, fontWeight: 700 }}>{formatYen(t.total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function NoteBlock({ title = '備考', lines }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 12, color: '#333', borderBottom: '1px solid #ccc', paddingBottom: 4, marginBottom: 6 }}>　{title}</div>
      <div style={{ fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: '#333' }}>
        {Array.isArray(lines) ? lines.map((l, i) => <div key={i}>{l}</div>) : lines}
      </div>
    </div>
  );
}

// ===== 1ページ目（共通骨格を種別で出し分け） =====
function EstimatePage1({ doc }) {
  const t = computeTotals(doc);
  return (
    <Page first accentBar={docTypeOf('estimate').accent} font={docFontCss(doc)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Title text="御 見 積 書" />
        <NoBlock doc={doc} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18, gap: 24, minHeight: `${INFO_BLOCK_MIN_MM}mm`, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, maxWidth: 340 }}>
          <ToLine company={doc.to.company} />
          <div style={{ fontSize: 12.5, margin: '10px 0 4px', color: '#333' }}>下記のとおり、御見積り申し上げます。</div>
          <Field label="件名">{doc.subject}</Field>
          <Field label="制作条件">{doc.productionTerms}</Field>
          <Field label="支払条件">{doc.paymentTerms}</Field>
          <Field label="有効期限">{doc.validity}</Field>
          <TotalLine total={t.total} />
        </div>
        <div style={{ width: 250, flex: 'none' }}>
          <FromBlock from={doc.from} />
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        <ItemsTable doc={doc} />
        <div style={{ minHeight: `${TOTALS_BLOCK_MIN_MM}mm` }}>
          <SimpleTotals doc={doc} />
        </div>
      </div>
      <NoteBlock lines={doc.note} />
    </Page>
  );
}

// 発注書：見積書と同じフォーム。宛先（御中）＝発注先（リーベグ）、右側＝発注者（お客様・署名捺印側）
function OrderPage1({ doc }) {
  const t = computeTotals(doc);
  const f = doc.from || {};
  return (
    <Page first accentBar={docTypeOf('order').accent} font={docFontCss(doc)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Title text="発 注 書" />
        <NoBlock doc={doc} dateLabel="発効日" />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18, gap: 24, minHeight: `${INFO_BLOCK_MIN_MM}mm`, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, maxWidth: 340 }}>
          <ToLine company={doc.to.company || '株式会社リーベグ'} centered />
          <div style={{ fontSize: 12.5, margin: '10px 0 4px', color: '#333' }}>下記のとおり、御発注申し上げます。</div>
          <Field label="件名">{doc.subject}</Field>
          <Field label="支払条件">{doc.paymentTerms}</Field>
          <TotalLine total={t.total} />
        </div>
        <div style={{ width: 250, flex: 'none', fontSize: 12, lineHeight: 1.7 }}>
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 3, color: TITLE_COLOR }}>{f.company || '※お客様会社名'}</div>
          <div>{f.zip ? `〒${f.zip}` : '※〒000-0000（郵便番号）'}</div>
          <div>{f.address || '※住所'}</div>
          <div style={{ marginTop: 4 }}>{f.tel ? `電話：${f.tel}` : '※電話番号'}</div>
          <div>{f.rep || '※代表者名'}</div>
          <div style={{ color: '#ff0000', marginTop: 10, fontSize: 12, textAlign: 'right' }}>署名と捺印をお願いします。</div>
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        <ItemsTable doc={doc} />
        <div style={{ minHeight: `${TOTALS_BLOCK_MIN_MM}mm` }}>
          <SimpleTotals doc={doc} />
        </div>
      </div>
      <NoteBlock lines={doc.note} />
    </Page>
  );
}

// 請求書：見積書と同じフォーム（件名・支払期限の情報欄＋共通明細表＋共通合計欄＋備考に振込先）
function InvoicePage1({ doc }) {
  const t = computeTotals(doc);
  return (
    <Page first accentBar={docTypeOf('invoice').accent} font={docFontCss(doc)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Title text="御 請 求 書" />
        <NoBlock doc={doc} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18, gap: 24, minHeight: `${INFO_BLOCK_MIN_MM}mm`, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, maxWidth: 340 }}>
          <ToLine company={doc.to.company} />
          <div style={{ fontSize: 12.5, margin: '10px 0 4px', color: '#333' }}>下記のとおり、ご請求申し上げます</div>
          <Field label="件名">{doc.subject}</Field>
          <Field label="支払期限">{doc.paymentDeadline}</Field>
          <TotalLine total={t.total} />
        </div>
        <div style={{ width: 250, flex: 'none' }}>
          <FromBlock from={doc.from} showReg />
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        <ItemsTable doc={doc} />
        <div style={{ minHeight: `${TOTALS_BLOCK_MIN_MM}mm` }}>
          <InvoiceTotals doc={doc} />
        </div>
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
    <Page accentBar={docTypeOf('estimate').accent} font={docFontCss(doc)}>
      {CONDITION_SECTIONS.map(sec => (
        <div key={sec.title} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, borderBottom: '2px solid #1a1a1a', display: 'inline-block', paddingRight: 36, marginBottom: 5 }}>　・ {sec.title}</div>
          {sec.rows.map(row => {
            const sel = cond[row.key] || {};
            return (
              <div key={row.key} style={{ border: '1px solid #d8d8d8', borderBottom: 'none', fontSize: 12 }}>
                <div style={{ display: 'flex', alignItems: 'stretch' }}>
                  <div style={{ width: 160, flex: 'none', padding: '5px 8px', borderRight: '1px solid #d8d8d8', display: 'flex', alignItems: 'center', background: '#f3f3f3', fontSize: 12, ...exact }}>{row.label}</div>
                  {row.options.map((op, i) => (
                    <div key={i} style={{ flex: 1, padding: '5px 6px', borderRight: i < row.options.length - 1 ? '1px solid #eee' : 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckBox on={sel.selected === i} /><span>{op}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', borderTop: '1px solid #eee', borderBottom: '1px solid #d8d8d8' }}>
                  <div style={{ width: 160, flex: 'none', padding: '3px 8px', borderRight: '1px solid #d8d8d8', color: '#666', fontSize: 11, background: '#f3f3f3', ...exact }}>※制作補足情報</div>
                  <div style={{ flex: 1, padding: '3px 8px', fontSize: 11.5, whiteSpace: 'pre-wrap', minHeight: 14 }}>{sel.note || ''}</div>
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
  // Excelの区分色（お客様=水色 #CFE2F3・当社=薄緑 #D9EAD3）・見出し帯は青 #3D85C6
  const partyColor = (p) => p === 'client' ? '#cfe2f3' : '#d9ead3';
  return (
    <Page accentBar={docTypeOf('estimate').accent} font={docFontCss(doc)}>
      <div style={{ textAlign: 'center', margin: '4px 0 20px' }}>
        <span style={{ display: 'inline-block', background: '#3d85c6', color: '#fff', padding: '9px 44px', fontSize: 19, fontWeight: 700, ...exact }}>制作スケジュール / 工程予定表①</span>
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, borderBottom: '2px solid #1a1a1a', display: 'inline-block', paddingRight: 36, marginBottom: 8 }}>　・ 制作情報</div>
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
        <span style={{ fontSize: 15, fontWeight: 600, borderBottom: '2px solid #1a1a1a', paddingRight: 24 }}>　・ 制作工程</span>
        <span style={{ fontSize: 11, fontWeight: 700, background: '#cfe2f3', padding: '3px 10px', ...exact }}>お客様対応区分</span>
        <span style={{ fontSize: 11, fontWeight: 700, background: '#d9ead3', padding: '3px 10px', ...exact }}>当社対応区分</span>
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
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontSize: 15, fontWeight: 600, borderBottom: '2px solid #1a1a1a', display: 'inline-block', paddingRight: 44, marginBottom: 8 }}>　・ {label}</div>
      <div style={{ border: '1px solid #999', height: '110mm', padding: 8, fontSize: 12, whiteSpace: 'pre-wrap', boxSizing: 'border-box' }}>{val}</div>
    </div>
  );
  return (
    <Page accentBar={docTypeOf('estimate').accent} font={docFontCss(doc)}>
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
