// マスタ管理ビュー（お客様・従業員・ステップ種類・残業・欠勤・祝日・会社表示順）。App.jsx から分割。
import { useState, useEffect, useRef } from 'react';
import { useApp } from '../appContext.js';
import { ChevronDown, ChevronUp, GripVertical, Plus, Search, Trash2, X } from 'lucide-react';
import { VN_LUNAR_HOLIDAYS, dayName, expandHolidayDates, fmtMD, fmtYMD, getProjectColor, vietnamHolidayCandidates } from '../lib/utils.js';
import { TimeSelect } from '../components/common.jsx';

function MasterView() {
  const {
    colors, fontJP, fontDisplay, settings, assigneeList, usedCompanies,
    customerMaster, saveCustomerMaster, employeeMaster, saveEmployeeMaster,
    stepTypeMaster, saveStepTypeMaster,
    addOvertime, removeOvertime, addAbsence, removeAbsence, addHolidays, removeHoliday,
    saveCompanyOrder,
  } = useApp();
  // ローカル下書き（入力中の値）。props が更新されたら同期する
  const [customers, setCustomers] = useState(customerMaster);
  const [employees, setEmployees] = useState(employeeMaster);
  const [stepTypes, setStepTypes] = useState(stepTypeMaster || []);
  useEffect(() => { setCustomers(customerMaster); }, [customerMaster]);
  useEffect(() => { setEmployees(employeeMaster); }, [employeeMaster]);
  useEffect(() => { setStepTypes(stepTypeMaster || []); }, [stepTypeMaster]);

  // 表示切替：お客様設定 / 従業員設定 / 会社の表示順（進行中案件のタブと同じ要領）
  const [masterTab, setMasterTab] = useState('customer');
  // お客様マスタの検索（会社名・お客様担当者名で絞り込み）
  const [customerSearch, setCustomerSearch] = useState('');
  const customerQ = customerSearch.trim().toLowerCase();
  const filteredCustomers = customerQ
    ? customers.filter(c =>
        (c.company || '').toLowerCase().includes(customerQ) ||
        (c.contacts || []).some(ct => (ct.name || '').toLowerCase().includes(customerQ)))
    : customers;
  // 会社名をあいうえお順（日本語ロケール）で表示
  const sortedCustomers = [...filteredCustomers].sort((a, b) => (a.company || '').localeCompare(b.company || '', 'ja'));

  // お客様マスタの折り畳み状態（会社ごと）。初回は全て閉じた状態にする
  const [collapsedCustomers, setCollapsedCustomers] = useState(() => new Set());
  const didInitCustCollapse = useRef(false);
  useEffect(() => {
    if (!didInitCustCollapse.current && customers.length > 0) {
      setCollapsedCustomers(new Set(customers.map(c => c.id)));
      didInitCustCollapse.current = true;
    }
  }, [customers.length]);
  const toggleCustomer = (id) => setCollapsedCustomers(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const newId = (p) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  // お客様マスタ（会社ごとに担当者をまとめる）
  const commitCustomers = (next) => { setCustomers(next); saveCustomerMaster(next); };
  const addCompany = () => commitCustomers([...customers, { id: newId('cust'), company: '', contacts: [{ id: newId('cc'), name: '' }] }]);
  const removeCompany = (cid) => commitCustomers(customers.filter(c => c.id !== cid));
  const setCompanyField = (cid, field, val) => setCustomers(cs => cs.map(c => c.id === cid ? { ...c, [field]: val } : c));
  const addContact = (cid) => commitCustomers(customers.map(c => c.id === cid ? { ...c, contacts: [...(c.contacts || []), { id: newId('cc'), name: '' }] } : c));
  const removeContact = (cid, ctid) => commitCustomers(customers.map(c => c.id === cid ? { ...c, contacts: (c.contacts || []).filter(ct => ct.id !== ctid) } : c));
  const setContactField = (cid, ctid, field, val) => setCustomers(cs => cs.map(c => c.id === cid ? { ...c, contacts: (c.contacts || []).map(ct => ct.id === ctid ? { ...ct, [field]: val } : ct) } : c));
  const commitCustomersNow = () => saveCustomerMaster(customers);

  // 従業員マスタ
  const addEmployee = () => { const next = [...employees, { id: newId('emp'), name: '', role: '' }]; setEmployees(next); saveEmployeeMaster(next); };
  const setEmployeeField = (id, field, val) => setEmployees(es => es.map(e => e.id === id ? { ...e, [field]: val } : e));
  const commitEmployees = () => saveEmployeeMaster(employees);
  const removeEmployee = (id) => { const next = employees.filter(e => e.id !== id); setEmployees(next); saveEmployeeMaster(next); };
  // 並び順の変更（この順がカレンダー・担当者別・サマリーの表示順になる）
  const moveEmployee = (id, dir) => {
    const i = employees.findIndex(e => e.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= employees.length) return;
    const next = [...employees];
    [next[i], next[j]] = [next[j], next[i]];
    setEmployees(next);
    saveEmployeeMaster(next);
  };
  // ドラッグ＆ドロップで並び替え（つまみ部分をドラッグ → 行へドロップ）
  const [empDragSrc, setEmpDragSrc] = useState(null);
  const [empDragOver, setEmpDragOver] = useState(null);
  const reorderEmployees = (srcId, targetId) => {
    if (!srcId || srcId === targetId) return;
    const src = employees.find(e => e.id === srcId);
    if (!src) return;
    const rest = employees.filter(e => e.id !== srcId);
    const ti = rest.findIndex(e => e.id === targetId);
    const next = ti < 0 ? [...rest, src] : [...rest.slice(0, ti), src, ...rest.slice(ti)];
    setEmployees(next);
    saveEmployeeMaster(next);
  };

  // ステップ種類マスタ（新規案件のステップ・プルダウンの選択肢）
  const commitStepTypes = (next) => { setStepTypes(next); saveStepTypeMaster(next); };
  const addStepType = () => commitStepTypes([...stepTypes, { id: newId('st'), label: '', paid: true, deliveryBase: '', numbered: false }]);
  const removeStepType = (id) => commitStepTypes(stepTypes.filter(s => s.id !== id));
  const setStepTypeField = (id, field, val) => setStepTypes(ss => ss.map(s => s.id === id ? { ...s, [field]: val } : s));
  const commitStepTypesNow = () => saveStepTypeMaster(stepTypes);
  const moveStepType = (id, dir) => {
    const i = stepTypes.findIndex(s => s.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= stepTypes.length) return;
    const next = [...stepTypes];
    [next[i], next[j]] = [next[j], next[i]];
    commitStepTypes(next);
  };

  const inputStyle = {
    width: '100%', padding: '8px 10px', boxSizing: 'border-box',
    border: `1px solid ${colors.border}`, borderRadius: 4,
    fontFamily: fontJP, fontSize: 13, background: '#fff', color: colors.text, outline: 'none',
  };
  const labelStyle = { fontSize: 11, color: colors.textMute, marginBottom: 4, letterSpacing: '0.05em' };
  const addBtnStyle = {
    background: colors.accentSoft, border: `1px solid ${colors.accent}`,
    padding: '8px 14px', borderRadius: 4, cursor: 'pointer',
    fontFamily: fontJP, fontSize: 12, color: colors.accent, fontWeight: 600,
    display: 'flex', alignItems: 'center', gap: 6,
  };
  const delBtnStyle = {
    background: 'transparent', border: `1px solid ${colors.border}`,
    padding: 8, borderRadius: 4, cursor: 'pointer', color: colors.textMute,
    display: 'flex', alignItems: 'center', flexShrink: 0,
  };
  const cardStyle = {
    background: colors.surface, border: `1px solid ${colors.border}`,
    borderRadius: 6, padding: 24, marginBottom: 28,
  };

  return (
    <div style={{ maxWidth: 880 }}>
      {/* 表示切替：お客様設定 / 従業員設定 / 会社の表示順 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {[{ id: 'customer', label: 'お客様設定' }, { id: 'employee', label: '従業員設定' }, { id: 'stepType', label: 'ステップ設定' }, { id: 'companyOrder', label: '会社の表示順' }, { id: 'holiday', label: 'ベトナムの祝日' }].map(t => (
          <button key={t.id} type="button" onClick={() => setMasterTab(t.id)}
            style={{
              padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 13, fontWeight: 600,
              background: masterTab === t.id ? colors.text : 'transparent',
              color: masterTab === t.id ? '#fff' : colors.textMute,
              border: `1px solid ${masterTab === t.id ? colors.text : colors.border}`,
            }}>{t.label}</button>
        ))}
      </div>

      {masterTab === 'customer' && (<>
      {/* お客様マスタ（会社ごとに担当者をぶら下げる） */}
      <section style={cardStyle}>
        <h2 style={{ fontFamily: fontDisplay, fontSize: 18, margin: '0 0 4px 0', fontWeight: 500 }}>お客様マスタ</h2>
        <p style={{ fontSize: 12, color: colors.textMute, margin: '0 0 16px 0' }}>
          会社ごとに、お客様担当者を複数登録できます。案件入力時の「会社名」「お客様担当者」の候補に表示されます（会社を選ぶとその会社の担当者が出ます）。
        </p>

        {/* 検索欄（会社名・お客様担当者名で絞り込み） */}
        {customers.length > 0 && (
          <div style={{ position: 'relative', marginBottom: 16, maxWidth: 480 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: colors.textMute, display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
              <Search size={15} />
            </span>
            <input type="text" value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="会社名・お客様担当者で検索"
              style={{
                width: '100%', padding: '9px 32px 9px 32px', boxSizing: 'border-box',
                border: `1px solid ${colors.border}`, borderRadius: 4,
                fontFamily: fontJP, fontSize: 13, background: '#fff', color: colors.text, outline: 'none',
              }} />
            {customerSearch && (
              <button type="button" onClick={() => setCustomerSearch('')}
                title="検索をクリア"
                style={{
                  position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                  background: 'transparent', border: 'none', cursor: 'pointer', color: colors.textMute,
                  display: 'flex', alignItems: 'center', padding: 2,
                }}>
                <X size={15} />
              </button>
            )}
          </div>
        )}

        {/* 全て開く / 全て閉じる */}
        {customers.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            <button type="button" onClick={() => setCollapsedCustomers(new Set(sortedCustomers.map(c => c.id)))}
              style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '4px 10px', background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 12, color: colors.textMute }}>
              <ChevronDown size={13} />全て閉じる
            </button>
            <button type="button" onClick={() => setCollapsedCustomers(new Set())}
              style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '4px 10px', background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 12, color: colors.textMute }}>
              <ChevronUp size={13} />全て開く
            </button>
          </div>
        )}

        {customers.length === 0 && (
          <div style={{ fontSize: 12, color: colors.textMute, padding: '4px 2px 12px' }}>
            まだ登録がありません。「＋ 会社を追加」から登録してください。
          </div>
        )}
        {customers.length > 0 && filteredCustomers.length === 0 && (
          <div style={{ fontSize: 12, color: colors.textMute, padding: '4px 2px 12px' }}>
            「{customerSearch}」に一致する会社・お客様担当者は見つかりませんでした。
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {sortedCustomers.map(c => {
            const isCollapsed = collapsedCustomers.has(c.id);
            // 会社情報の入力欄（ラベル＋テキスト）
            const companyField = (label, field, placeholder, span = 1, type = 'text') => (
              <div style={{ gridColumn: `span ${span}` }}>
                <div style={labelStyle}>{label}</div>
                <input type={type} value={c[field] || ''}
                  onChange={(e) => setCompanyField(c.id, field, e.target.value)}
                  onBlur={commitCustomersNow}
                  placeholder={placeholder} style={inputStyle} />
              </div>
            );
            return (
            <div key={c.id} style={{ border: `1px solid ${colors.border}`, borderRadius: 6, overflow: 'hidden' }}>
              {/* 会社名ヘッダー */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: '#f3efe4', padding: '10px 12px' }}>
                <button type="button" onClick={() => toggleCustomer(c.id)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: colors.textMute, display: 'flex', alignItems: 'center', flexShrink: 0 }}
                  title={isCollapsed ? '展開' : '折りたたみ'}>
                  {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </button>
                <span style={{ fontSize: 11, fontWeight: 700, color: colors.textMute, flexShrink: 0 }}>会社</span>
                <input type="text" value={c.company || ''}
                  onChange={(e) => setCompanyField(c.id, 'company', e.target.value)}
                  onBlur={commitCustomersNow}
                  placeholder="例: リノべる株式会社"
                  style={{ ...inputStyle, flex: 1, fontWeight: 600 }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: colors.textMute, flexShrink: 0 }}>契約形態</span>
                <select value={c.contractType || 'labo'}
                  onChange={(e) => commitCustomers(customers.map(x => x.id === c.id ? { ...x, contractType: e.target.value } : x))}
                  title="ラボ＝会社名でグループ表示／オフショア＝進行中案件一覧で「オフショア（その他）」に集約（会社名は各案件に表示）。売上区分の①（オフショア/ラボ）にも反映されます。"
                  style={{ ...inputStyle, width: 'auto', flex: '0 0 110px', fontWeight: 600 }}>
                  <option value="labo">ラボ</option>
                  <option value="offshore">オフショア</option>
                </select>
                <span style={{ fontSize: 11, fontWeight: 700, color: colors.textMute, flexShrink: 0 }}>売上区分</span>
                <select value={c.salesArea || 'domestic'}
                  onChange={(e) => commitCustomers(customers.map(x => x.id === c.id ? { ...x, salesArea: e.target.value } : x))}
                  title="売上登録表への自動連携で使う売上区分の②（国内/国際）。契約形態（①オフショア/ラボ）と組み合わせて区分（例：オフショア国内売上）が決まります。既存の売上行の区分は変わりません（新規連携分に反映）。"
                  style={{ ...inputStyle, width: 'auto', flex: '0 0 100px', fontWeight: 600 }}>
                  <option value="domestic">国内</option>
                  <option value="intl">国際</option>
                </select>
                {isCollapsed && (
                  <span style={{ fontSize: 11, color: colors.textMute, flexShrink: 0 }}>担当者{(c.contacts || []).length}名</span>
                )}
                <button type="button" onClick={() => removeCompany(c.id)}
                  style={{ ...delBtnStyle, display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', fontSize: 11, fontFamily: fontJP }}
                  title="この会社を削除">
                  <Trash2 size={13} /> 会社削除
                </button>
              </div>
              {!isCollapsed && (<>
              {/* 会社情報 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, padding: 12, borderBottom: `1px solid ${colors.border}`, background: '#fbfaf6' }}>
                {companyField('代表者名', 'representative', '例: 山田 太郎')}
                {companyField('電話番号（代表）', 'phone', '例: 052-123-4567', 1, 'tel')}
                {companyField('郵便番号', 'postalCode', '例: 460-0008')}
                {companyField('住所', 'address', '例: 愛知県名古屋市中区栄1-2-3', 3)}
                {companyField('ホームページURL', 'websiteUrl', '例: https://example.co.jp', 3, 'url')}
                {companyField('支店住所１', 'branchAddress1', '', 2)}
                {companyField('支店電話番号１', 'branchPhone1', '', 1, 'tel')}
                {companyField('支店住所２', 'branchAddress2', '', 2)}
                {companyField('支店電話番号２', 'branchPhone2', '', 1, 'tel')}
              </div>
              {/* 担当者リスト */}
              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(c.contacts || []).length === 0 && (
                  <div style={{ fontSize: 11, color: colors.textMute }}>担当者が未登録です。</div>
                )}
                {(c.contacts || []).length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr 1fr 1.4fr 34px', gap: 8, paddingLeft: 8 }}>
                    <div style={labelStyle}>担当者名</div>
                    <div style={labelStyle}>支店名</div>
                    <div style={labelStyle}>電話番号1（社用）</div>
                    <div style={labelStyle}>電話番号2（個人）</div>
                    <div style={labelStyle}>メールアドレス</div>
                    <div />
                  </div>
                )}
                {(c.contacts || []).map(ct => (
                  <div key={ct.id} style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr 1fr 1.4fr 34px', gap: 8, alignItems: 'center', paddingLeft: 8 }}>
                    <input type="text" value={ct.name || ''}
                      onChange={(e) => setContactField(c.id, ct.id, 'name', e.target.value)}
                      onBlur={commitCustomersNow}
                      placeholder="例: 山田様" style={inputStyle} />
                    <input type="text" value={ct.branchName || ''}
                      onChange={(e) => setContactField(c.id, ct.id, 'branchName', e.target.value)}
                      onBlur={commitCustomersNow}
                      placeholder="例: 名古屋支店" style={inputStyle} />
                    <input type="tel" value={ct.phone || ''}
                      onChange={(e) => setContactField(c.id, ct.id, 'phone', e.target.value)}
                      onBlur={commitCustomersNow}
                      placeholder="例: 052-123-4567" style={inputStyle} />
                    <input type="tel" value={ct.phone2 || ''}
                      onChange={(e) => setContactField(c.id, ct.id, 'phone2', e.target.value)}
                      onBlur={commitCustomersNow}
                      placeholder="例: 090-1234-5678" style={inputStyle} />
                    <input type="text" value={ct.email || ''}
                      onChange={(e) => setContactField(c.id, ct.id, 'email', e.target.value)}
                      onBlur={commitCustomersNow}
                      placeholder="例: yamada@example.co.jp" style={inputStyle} />
                    <button type="button" onClick={() => removeContact(c.id, ct.id)} style={delBtnStyle} title="この担当者を削除">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => addContact(c.id)}
                  style={{ alignSelf: 'flex-start', background: '#fff', border: `1px dashed ${colors.border}`, padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 11, color: colors.textMute, display: 'flex', alignItems: 'center', gap: 4, marginLeft: 8 }}>
                  <Plus size={12} /> 担当者を追加
                </button>
              </div>
              </>)}
            </div>
            );
          })}
        </div>
        <button type="button" onClick={addCompany} style={{ ...addBtnStyle, marginTop: 16 }}>
          <Plus size={14} /> 会社を追加
        </button>
      </section>

      </>)}

      {masterTab === 'companyOrder' && (<>
      {/* 会社の表示順設定（独立タブ） */}
      <CompanyOrderView
        companyOrder={settings?.companyOrder || []} saveCompanyOrder={saveCompanyOrder}
        usedCompanies={usedCompanies || []}
        colors={colors} fontJP={fontJP} fontDisplay={fontDisplay} />
      </>)}

      {masterTab === 'employee' && (<>
      {/* 従業員マスタ */}
      <section style={cardStyle}>
        <h2 style={{ fontFamily: fontDisplay, fontSize: 18, margin: '0 0 4px 0', fontWeight: 500 }}>従業員マスタ</h2>
        <p style={{ fontSize: 12, color: colors.textMute, margin: '0 0 16px 0' }}>
          制作担当者（従業員）を登録します。案件入力時の「担当者」の候補に表示されます。<br />
          ここでの並び順が、カレンダー・担当者別・サマリーの担当者の表示順になります（つまみをドラッグ＆ドロップ、または▲▼で変更）。
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '0 2px' }}>
            <div style={{ width: 48, flexShrink: 0, ...labelStyle }}>順</div>
            <div style={{ flex: '1 1 0', ...labelStyle }}>氏名</div>
            <div style={{ flex: '1 1 0', ...labelStyle }}>役割・備考</div>
            <div style={{ width: 34, flexShrink: 0 }} />
          </div>
          {employees.length === 0 && (
            <div style={{ fontSize: 12, color: colors.textMute, padding: '8px 2px' }}>
              まだ登録がありません。「＋ 従業員を追加」から登録してください。
            </div>
          )}
          {employees.map((e, ei) => (
            <div key={e.id}
              onDragOver={(ev) => { if (empDragSrc && empDragSrc !== e.id) { ev.preventDefault(); ev.dataTransfer.dropEffect = 'move'; if (empDragOver !== e.id) setEmpDragOver(e.id); } }}
              onDragLeave={() => { if (empDragOver === e.id) setEmpDragOver(null); }}
              onDrop={(ev) => { ev.preventDefault(); if (empDragSrc) reorderEmployees(empDragSrc, e.id); setEmpDragSrc(null); setEmpDragOver(null); }}
              style={{
                display: 'flex', gap: 10, alignItems: 'center',
                borderRadius: 4, padding: 2,
                opacity: empDragSrc === e.id ? 0.5 : 1,
                boxShadow: empDragOver === e.id && empDragSrc && empDragSrc !== e.id ? `0 0 0 2px ${colors.accent} inset` : 'none',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: 48, flexShrink: 0 }}>
                <span draggable
                  onDragStart={(ev) => { ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', e.id); setEmpDragSrc(e.id); }}
                  onDragEnd={() => { setEmpDragSrc(null); setEmpDragOver(null); }}
                  title="ドラッグして並び替え"
                  style={{ cursor: 'grab', color: colors.textMute, display: 'flex' }}>
                  <GripVertical size={14} />
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <button type="button" onClick={() => moveEmployee(e.id, -1)} disabled={ei === 0}
                    style={{
                      background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 2,
                      padding: '1px 4px', cursor: ei === 0 ? 'not-allowed' : 'pointer',
                      color: ei === 0 ? '#ccc' : colors.textMute,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }} title="上へ（表示順を前にする）">
                    <ChevronUp size={11} />
                  </button>
                  <button type="button" onClick={() => moveEmployee(e.id, 1)} disabled={ei === employees.length - 1}
                    style={{
                      background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 2,
                      padding: '1px 4px', cursor: ei === employees.length - 1 ? 'not-allowed' : 'pointer',
                      color: ei === employees.length - 1 ? '#ccc' : colors.textMute,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }} title="下へ（表示順を後にする）">
                    <ChevronDown size={11} />
                  </button>
                </div>
              </div>
              <input type="text" value={e.name || ''}
                onChange={(ev) => setEmployeeField(e.id, 'name', ev.target.value)}
                onBlur={commitEmployees}
                placeholder="例: 田中" style={{ ...inputStyle, flex: '1 1 0' }} />
              <input type="text" value={e.role || ''}
                onChange={(ev) => setEmployeeField(e.id, 'role', ev.target.value)}
                onBlur={commitEmployees}
                placeholder="例: パース担当 / 主任" style={{ ...inputStyle, flex: '1 1 0' }} />
              <button type="button" onClick={() => removeEmployee(e.id)} style={delBtnStyle} title="この行を削除">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addEmployee} style={{ ...addBtnStyle, marginTop: 14 }}>
          <Plus size={14} /> 従業員を追加
        </button>
      </section>

      {/* 残業の登録（稼働枠の追加） */}
      <section style={cardStyle}>
        <OvertimeManager
          overtimes={settings?.overtimes || []} assigneeList={assigneeList}
          settings={settings}
          onAdd={addOvertime} onRemove={removeOvertime}
          colors={colors} fontJP={fontJP} />
      </section>

      {/* 欠勤・休日・不在の登録（対応不可日） */}
      <section style={cardStyle}>
        <AbsenceManager
          absences={settings?.absences || []} assigneeList={assigneeList}
          onAdd={addAbsence} onRemove={removeAbsence}
          colors={colors} fontJP={fontJP} />
      </section>

      </>)}

      {masterTab === 'stepType' && (<>
      {/* ステップ種類マスタ（新規案件のステップ・プルダウンの選択肢） */}
      <section style={cardStyle}>
        <h2 style={{ fontFamily: fontDisplay, fontSize: 18, margin: '0 0 4px 0', fontWeight: 500 }}>ステップ設定</h2>
        <p style={{ fontSize: 12, color: colors.textMute, margin: '0 0 16px 0' }}>
          新規案件の「ステップ（種類）」プルダウンの選択肢を編集します。<br />
          ・<b>有料</b>のステップは金額欄が表示され、<b>無料</b>のステップは金額を反映しません。<br />
          ・<b>納品名ベース</b>（例：白色・色付）が同じステップは、上から順に連番の納品名になります（1つ目＝ベースそのまま、2つ目以降＝色付2・色付3…）。<br />
          ・<b>回数あり</b>にすると、同じ種類を複数入れたとき「1回目・2回目…」が自動で付きます（例：カラー変更1回目（有料））。
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '0 2px' }}>
            <div style={{ width: 30, flexShrink: 0, ...labelStyle }}>順</div>
            <div style={{ flex: '2 1 0', ...labelStyle }}>名称（（有料）/（無料）を含む素の名称）</div>
            <div style={{ width: 84, flexShrink: 0, ...labelStyle }}>有料/無料</div>
            <div style={{ width: 96, flexShrink: 0, ...labelStyle }}>納品名ベース</div>
            <div style={{ width: 72, flexShrink: 0, ...labelStyle }}>回数</div>
            <div style={{ width: 34, flexShrink: 0 }} />
          </div>
          {stepTypes.length === 0 && (
            <div style={{ fontSize: 12, color: colors.textMute, padding: '8px 2px' }}>
              まだ登録がありません。「＋ ステップ種類を追加」から登録してください。
            </div>
          )}
          {stepTypes.map((s, si) => (
            <div key={s.id} style={{ display: 'flex', gap: 8, alignItems: 'center', borderRadius: 4, padding: 2 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, width: 30, flexShrink: 0 }}>
                <button type="button" onClick={() => moveStepType(s.id, -1)} disabled={si === 0}
                  style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 2, padding: '1px 4px', cursor: si === 0 ? 'not-allowed' : 'pointer', color: si === 0 ? '#ccc' : colors.textMute, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="上へ">
                  <ChevronUp size={11} />
                </button>
                <button type="button" onClick={() => moveStepType(s.id, 1)} disabled={si === stepTypes.length - 1}
                  style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 2, padding: '1px 4px', cursor: si === stepTypes.length - 1 ? 'not-allowed' : 'pointer', color: si === stepTypes.length - 1 ? '#ccc' : colors.textMute, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="下へ">
                  <ChevronDown size={11} />
                </button>
              </div>
              <input type="text" value={s.label || ''}
                onChange={(ev) => setStepTypeField(s.id, 'label', ev.target.value)}
                onBlur={commitStepTypesNow}
                placeholder="例: カラー変更（有料）" style={{ ...inputStyle, flex: '2 1 0' }} />
              <select value={s.paid ? 'paid' : 'free'}
                onChange={(ev) => commitStepTypes(stepTypes.map(x => x.id === s.id ? { ...x, paid: ev.target.value === 'paid' } : x))}
                style={{ ...inputStyle, width: 84, flexShrink: 0, cursor: 'pointer' }} title="有料＝金額欄あり / 無料＝金額を反映しない">
                <option value="paid">有料</option>
                <option value="free">無料</option>
              </select>
              <input type="text" value={s.deliveryBase || ''}
                onChange={(ev) => setStepTypeField(s.id, 'deliveryBase', ev.target.value)}
                onBlur={commitStepTypesNow}
                placeholder="例: 色付" style={{ ...inputStyle, width: 96, flexShrink: 0 }} title="納品名のベース。同じベースのステップで連番を共有します（例：色付→色付2）" />
              <label style={{ width: 72, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: colors.text, cursor: 'pointer' }} title="同じ種類を複数入れたとき「1回目・2回目…」を自動で付ける">
                <input type="checkbox" checked={!!s.numbered}
                  onChange={(ev) => commitStepTypes(stepTypes.map(x => x.id === s.id ? { ...x, numbered: ev.target.checked } : x))} />
                回数
              </label>
              <button type="button" onClick={() => removeStepType(s.id)} style={delBtnStyle} title="この行を削除">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addStepType} style={{ ...addBtnStyle, marginTop: 14 }}>
          <Plus size={14} /> ステップ種類を追加
        </button>
      </section>

      </>)}

      {masterTab === 'holiday' && (<>
      {/* ベトナムの祝日（全体共通の休み・独立タブ） */}
      <section style={cardStyle}>
        <HolidayManager
          holidays={settings?.holidays || []}
          onAdd={addHolidays} onRemove={removeHoliday}
          colors={colors} fontJP={fontJP} />
      </section>
      </>)}
    </div>
  );
}

// ============ 残業の登録（担当者ごとの稼働枠追加） ============
function OvertimeManager({ overtimes, assigneeList, settings, onAdd, onRemove, colors, fontJP }) {
  const { notify } = useApp();
  const todayStr = fmtYMD(new Date());
  const defaultStart = settings?.afternoonEnd || '17:00';
  const [o, setO] = useState({ assignee: '', startDate: todayStr, endDate: todayStr, startTime: defaultStart, endTime: '19:00', label: '' });
  const set = (k, v) => setO(p => ({ ...p, [k]: v }));
  const submit = () => {
    if (!o.assignee) { notify('担当者を選択してください', { type: 'error' }); return; }
    if (!o.startDate || !o.endDate) { notify('開始日・終了日を入力してください', { type: 'error' }); return; }
    if (o.endDate < o.startDate) { notify('終了日は開始日以降にしてください', { type: 'error' }); return; }
    if (!o.startTime || !o.endTime || o.startTime >= o.endTime) { notify('残業の時間帯が正しくありません', { type: 'error' }); return; }
    onAdd({
      assignee: o.assignee, startDate: o.startDate, endDate: o.endDate,
      startTime: o.startTime, endTime: o.endTime,
      label: (o.label || '').trim(),
    });
    setO(p => ({ ...p, label: '' }));
  };
  const inputStyle = { padding: '5px 8px', border: `1px solid ${colors.border}`, borderRadius: 3, fontFamily: fontJP, fontSize: 13, background: '#fff', color: colors.text };
  const sorted = [...overtimes].sort((x, y) => (y.startDate || '').localeCompare(x.startDate || ''));
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 4 }}>残業の登録（稼働枠の追加）</div>
      <div style={{ fontSize: 11, color: colors.textMute, marginBottom: 10 }}>
        担当者を選んで対応時間を追加します（例: 通常 {settings?.morningStart || '08:00'}〜{settings?.morningEnd || '12:00'}＋{settings?.afternoonStart || '13:00'}〜{settings?.afternoonEnd || '17:00'} ＋ 残業 17:00〜19:00）。追加した時間帯はスケジュール・カレンダーの稼働枠に反映されます。
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <select value={o.assignee} onChange={(e) => set('assignee', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
          <option value="">担当者を選択</option>
          {(assigneeList || []).map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <input type="date" value={o.startDate} onChange={(e) => set('startDate', e.target.value)} style={inputStyle} />
        <span style={{ fontSize: 12, color: colors.textMute }}>〜</span>
        <input type="date" value={o.endDate} onChange={(e) => set('endDate', e.target.value)} style={inputStyle} />
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: colors.textMute }}>
          残業
          <TimeSelect value={o.startTime} onChange={(v) => set('startTime', v)} colors={colors} fontJP={fontJP} />
          〜
          <TimeSelect value={o.endTime} onChange={(v) => set('endTime', v)} colors={colors} fontJP={fontJP} />
        </span>
        <input type="text" value={o.label} onChange={(e) => set('label', e.target.value)} placeholder="メモ（例: 納期対応）" style={{ ...inputStyle, flex: '1 1 140px', minWidth: 120 }} />
        <button type="button" onClick={submit}
          style={{ padding: '6px 14px', background: colors.accentSoft, border: `1px solid ${colors.accent}`, borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 12, color: colors.accent, fontWeight: 600 }}>
          追加
        </button>
      </div>
      {sorted.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sorted.map(ot => (
            <div key={ot.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 4, padding: '6px 10px', fontSize: 12, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, color: colors.text }}>{ot.assignee}</span>
              <span style={{ color: colors.textMute }}>
                {ot.startDate}{ot.endDate !== ot.startDate ? ` 〜 ${ot.endDate}` : ''}
              </span>
              <span style={{ background: '#e8f0e4', borderRadius: 10, padding: '1px 8px', color: '#3a5a40', fontWeight: 600 }}>
                残業 {ot.startTime}〜{ot.endTime}
              </span>
              {ot.label && <span style={{ color: colors.textMute }}>{ot.label}</span>}
              <button type="button" onClick={() => onRemove(ot.id)} title="削除"
                style={{ marginLeft: 'auto', background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 3, padding: '3px 6px', cursor: 'pointer', color: colors.textMute, display: 'flex', alignItems: 'center' }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ 欠勤・休日・不在の登録 ============
function AbsenceManager({ absences, assigneeList, onAdd, onRemove, colors, fontJP }) {
  const { notify } = useApp();
  const todayStr = fmtYMD(new Date());
  const [a, setA] = useState({ assignee: '', startDate: todayStr, endDate: todayStr, allDay: true, startTime: '13:00', endTime: '17:00', label: '' });
  const set = (k, v) => setA(p => ({ ...p, [k]: v }));
  const submit = () => {
    if (!a.assignee) { notify('担当者を選択してください', { type: 'error' }); return; }
    if (!a.startDate || !a.endDate) { notify('開始日・終了日を入力してください', { type: 'error' }); return; }
    if (a.endDate < a.startDate) { notify('終了日は開始日以降にしてください', { type: 'error' }); return; }
    if (!a.allDay && a.startTime >= a.endTime) { notify('不在の時間帯が正しくありません', { type: 'error' }); return; }
    onAdd({
      assignee: a.assignee, startDate: a.startDate, endDate: a.endDate,
      allDay: !!a.allDay,
      startTime: a.allDay ? '' : a.startTime,
      endTime: a.allDay ? '' : a.endTime,
      label: (a.label || '').trim(),
    });
    setA(p => ({ ...p, label: '' }));
  };
  const inputStyle = { padding: '5px 8px', border: `1px solid ${colors.border}`, borderRadius: 3, fontFamily: fontJP, fontSize: 13, background: '#fff', color: colors.text };
  const sorted = [...absences].sort((x, y) => (y.startDate || '').localeCompare(x.startDate || ''));
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 4 }}>欠勤・休日・不在の登録（対応不可日）</div>
      <div style={{ fontSize: 11, color: colors.textMute, marginBottom: 10 }}>
        対象者のカレンダー・スケジュールから対応不可の日（終日）または時間帯を除外します。カレンダーには「休／不在」と表示されます。
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <select value={a.assignee} onChange={(e) => set('assignee', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
          <option value="">担当者を選択</option>
          {(assigneeList || []).map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <input type="date" value={a.startDate} onChange={(e) => set('startDate', e.target.value)} style={inputStyle} />
        <span style={{ fontSize: 12, color: colors.textMute }}>〜</span>
        <input type="date" value={a.endDate} onChange={(e) => set('endDate', e.target.value)} style={inputStyle} />
        <label style={{ fontSize: 12, color: colors.text, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <input type="checkbox" checked={a.allDay} onChange={(e) => set('allDay', e.target.checked)} /> 終日
        </label>
        {!a.allDay && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: colors.textMute }}>
            不在
            <TimeSelect value={a.startTime} onChange={(v) => set('startTime', v)} colors={colors} fontJP={fontJP} />
            〜
            <TimeSelect value={a.endTime} onChange={(v) => set('endTime', v)} colors={colors} fontJP={fontJP} />
          </span>
        )}
        <input type="text" value={a.label} onChange={(e) => set('label', e.target.value)} placeholder="メモ（例: 有給・午後休）" style={{ ...inputStyle, flex: '1 1 140px', minWidth: 120 }} />
        <button type="button" onClick={submit}
          style={{ padding: '6px 14px', background: colors.accentSoft, border: `1px solid ${colors.accent}`, borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 12, color: colors.accent, fontWeight: 600 }}>
          追加
        </button>
      </div>
      {sorted.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sorted.map(ab => (
            <div key={ab.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 4, padding: '6px 10px', fontSize: 12, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, color: colors.text }}>{ab.assignee}</span>
              <span style={{ color: colors.textMute }}>
                {ab.startDate}{ab.endDate !== ab.startDate ? ` 〜 ${ab.endDate}` : ''}
              </span>
              <span style={{ background: '#eceae3', borderRadius: 10, padding: '1px 8px', color: colors.text }}>
                {ab.allDay ? '終日休み' : `不在 ${ab.startTime}〜${ab.endTime}`}
              </span>
              {ab.label && <span style={{ color: colors.textMute }}>{ab.label}</span>}
              <button type="button" onClick={() => onRemove(ab.id)} title="削除"
                style={{ marginLeft: 'auto', background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 3, padding: '3px 6px', cursor: 'pointer', color: colors.textMute, display: 'flex', alignItems: 'center' }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ ベトナムの祝日（全体共通の休み） ============
function HolidayManager({ holidays, onAdd, onRemove, colors, fontJP }) {
  const years = Object.keys(VN_LUNAR_HOLIDAYS).map(Number).sort((a, b) => a - b);
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(years.includes(thisYear) ? thisYear : years[0]);
  const [cands, setCands] = useState([]);
  const [manual, setManual] = useState({ date: fmtYMD(new Date()), label: '' });
  const have = new Set((holidays || []).map(h => h.date));
  const inputStyle = { padding: '5px 8px', border: `1px solid ${colors.border}`, borderRadius: 3, fontFamily: fontJP, fontSize: 13, background: '#fff', color: colors.text };

  const showCandidates = () => setCands(vietnamHolidayCandidates(year));
  const setCand = (i, k, v) => setCands(prev => prev.map((c, idx) => idx === i ? { ...c, [k]: v } : c));
  const sorted = [...(holidays || [])].sort((x, y) => (x.date || '').localeCompare(y.date || ''));
  const fmtDateJP = (ymd) => { const d = new Date(ymd + 'T00:00:00'); return isNaN(d.getTime()) ? '' : `${fmtMD(d)}（${dayName(d)}）`; };

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 4 }}>ベトナムの祝日（全体共通の休み）</div>
      <div style={{ fontSize: 11, color: colors.textMute, marginBottom: 10 }}>
        登録した日は全担当者の非稼働日（土日と同じ扱い）になり、スケジュール・カレンダーから除外されます。
        テト（旧正月）・フンヴオン王の命日は旧暦ベースで政府が毎年公式日程を発表するため「要確認」です。日付・日数を編集してから追加してください。
      </div>

      {/* 年ごとの候補を取り込む */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
        <select value={year} onChange={(e) => { setYear(Number(e.target.value)); setCands([]); }} style={{ ...inputStyle, cursor: 'pointer' }}>
          {years.map(y => <option key={y} value={y}>{y}年</option>)}
        </select>
        <button type="button" onClick={showCandidates}
          style={{ padding: '6px 14px', background: '#fff', border: `1px solid ${colors.accent}`, borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 12, color: colors.accent, fontWeight: 600 }}>
          {year}年の祝日候補を表示
        </button>
        {cands.length > 0 && (
          <button type="button" onClick={() => onAdd(cands)}
            style={{ padding: '6px 14px', background: colors.accentSoft, border: `1px solid ${colors.accent}`, borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 12, color: colors.accent, fontWeight: 600 }}>
            候補をまとめて追加
          </button>
        )}
      </div>

      {cands.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16, background: '#fbf9f4', border: `1px solid ${colors.border}`, borderRadius: 4, padding: 10 }}>
          {cands.map((c, i) => {
            const added = expandHolidayDates(c.date, c.days).every(d => have.has(d));
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12 }}>
                <input type="date" value={c.date} onChange={(e) => setCand(i, 'date', e.target.value)} style={inputStyle} />
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: colors.textMute }}>
                  <input type="number" min={1} max={14} value={c.days}
                    onChange={(e) => setCand(i, 'days', Math.max(1, parseInt(e.target.value, 10) || 1))}
                    style={{ ...inputStyle, width: 56 }} /> 日間
                </span>
                <span style={{ color: colors.text }}>{c.label}</span>
                {c.estimated && <span style={{ fontSize: 10, color: '#fff', background: '#c46a16', borderRadius: 8, padding: '1px 6px' }}>要確認</span>}
                {added
                  ? <span style={{ marginLeft: 'auto', fontSize: 11, color: colors.textMute }}>登録済み</span>
                  : <button type="button" onClick={() => onAdd([c])}
                      style={{ marginLeft: 'auto', padding: '4px 10px', background: colors.accentSoft, border: `1px solid ${colors.accent}`, borderRadius: 3, cursor: 'pointer', fontFamily: fontJP, fontSize: 11, color: colors.accent, fontWeight: 600 }}>
                      追加
                    </button>}
              </div>
            );
          })}
        </div>
      )}

      {/* 手動で1日追加 */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <input type="date" value={manual.date} onChange={(e) => setManual(p => ({ ...p, date: e.target.value }))} style={inputStyle} />
        <input type="text" value={manual.label} onChange={(e) => setManual(p => ({ ...p, label: e.target.value }))} placeholder="名称（任意・例: 臨時休業）" style={{ ...inputStyle, flex: '1 1 160px', minWidth: 120 }} />
        <button type="button" onClick={() => { if (manual.date) { onAdd([{ date: manual.date, days: 1, label: (manual.label || '').trim() }]); setManual(p => ({ ...p, label: '' })); } }}
          style={{ padding: '6px 14px', background: colors.accentSoft, border: `1px solid ${colors.accent}`, borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 12, color: colors.accent, fontWeight: 600 }}>
          手動で追加
        </button>
      </div>

      {/* 登録済み一覧 */}
      {sorted.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sorted.map(h => (
            <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 4, padding: '6px 10px', fontSize: 12, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, color: colors.text }}>{h.date}</span>
              <span style={{ color: colors.textMute }}>{fmtDateJP(h.date)}</span>
              {h.label && <span style={{ color: colors.textMute }}>{h.label}</span>}
              <button type="button" onClick={() => onRemove(h.id)} title="削除"
                style={{ marginLeft: 'auto', background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 3, padding: '3px 6px', cursor: 'pointer', color: colors.textMute, display: 'flex', alignItems: 'center' }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: colors.textMute }}>まだ祝日が登録されていません。</div>
      )}
    </div>
  );
}


// ============ 会社の表示順設定ページ（機能③） ============
function CompanyOrderView({ companyOrder, saveCompanyOrder, usedCompanies, colors, fontJP, fontDisplay }) {
  const { notify } = useApp();
  const order = (companyOrder || []).map(c => (c || '').trim()).filter(Boolean);
  // タスクに存在するが未登録の会社
  const unregistered = usedCompanies.filter(c => !order.includes(c)).sort((a, b) => a.localeCompare(b, 'ja'));
  const [newName, setNewName] = useState('');
  const [dragSrc, setDragSrc] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const move = (name, dir) => {
    const idx = order.indexOf(name);
    if (idx < 0) return;
    const sw = dir === 'up' ? idx - 1 : idx + 1;
    if (sw < 0 || sw >= order.length) return;
    const next = [...order];
    [next[idx], next[sw]] = [next[sw], next[idx]];
    saveCompanyOrder(next);
  };
  const reorder = (src, target) => {
    if (src === target) return;
    const filtered = order.filter(n => n !== src);
    const ti = filtered.indexOf(target);
    const next = ti < 0 ? [...filtered, src] : [...filtered.slice(0, ti), src, ...filtered.slice(ti)];
    saveCompanyOrder(next);
  };
  const add = (name) => {
    const n = (name || '').trim();
    if (!n) return;
    if (order.includes(n)) { notify('すでに登録されています', { type: 'error' }); return; }
    saveCompanyOrder([...order, n]);
    setNewName('');
  };
  const remove = (name) => saveCompanyOrder(order.filter(n => n !== name));

  const rowBase = {
    display: 'flex', alignItems: 'center', gap: 10, background: '#fff',
    border: `1px solid ${colors.border}`, borderRadius: 5, padding: '9px 12px',
  };
  const miniBtn = (disabled) => ({
    background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 2, padding: '1px 5px',
    cursor: disabled ? 'not-allowed' : 'pointer', color: disabled ? '#ccc' : colors.textMute, display: 'flex',
  });

  return (
    <div style={{ maxWidth: 620 }}>
      <h2 style={{ fontFamily: fontDisplay, fontSize: 20, margin: '0 0 6px 0', fontWeight: 500 }}>会社の表示順</h2>
      <p style={{ fontSize: 12, color: colors.textMute, margin: '0 0 18px 0' }}>
        進行中案件・担当者別の「会社グループ」の上からの並び順を設定します。ドラッグまたは↑↓で並び替え。
        スケジュール計算（カレンダー等）には影響しません。
      </p>

      <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 6, padding: 18, marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>並び順（登録済み）</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {order.length === 0 && <div style={{ fontSize: 12, color: colors.textMute }}>登録された会社がありません。</div>}
          {order.map((c, i) => (
            <div key={c}
              draggable
              onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDragSrc(c); }}
              onDragOver={(e) => { if (dragSrc && dragSrc !== c) { e.preventDefault(); setDragOver(c); } }}
              onDrop={(e) => { e.preventDefault(); if (dragSrc) reorder(dragSrc, c); setDragSrc(null); setDragOver(null); }}
              onDragEnd={() => { setDragSrc(null); setDragOver(null); }}
              style={{
                ...rowBase,
                opacity: dragSrc === c ? 0.5 : 1,
                boxShadow: dragOver === c && dragSrc && dragSrc !== c ? `0 0 0 2px ${colors.accent} inset` : 'none',
              }}>
              <span style={{ cursor: 'grab', color: colors.textMute, display: 'flex' }}><GripVertical size={14} /></span>
              <span style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0, background: getProjectColor(c), color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700,
              }}>{i + 1}</span>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{c}</span>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <button type="button" onClick={() => move(c, 'up')} disabled={i === 0} style={miniBtn(i === 0)} title="上へ"><ChevronUp size={11} /></button>
                  <button type="button" onClick={() => move(c, 'down')} disabled={i === order.length - 1} style={miniBtn(i === order.length - 1)} title="下へ"><ChevronDown size={11} /></button>
                </div>
                <button type="button" onClick={() => remove(c)} title="リストから外す"
                  style={{ background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 3, padding: 6, cursor: 'pointer', color: colors.textMute, display: 'flex' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') add(newName); }}
            placeholder="会社名を入力（まだ案件が無い会社も登録可）"
            style={{ flex: 1, padding: '8px 10px', border: `1px solid ${colors.border}`, borderRadius: 4, fontFamily: fontJP, fontSize: 13, boxSizing: 'border-box' }} />
          <button type="button" onClick={() => add(newName)}
            style={{ background: colors.accentSoft, border: `1px solid ${colors.accent}`, color: colors.accent, fontWeight: 600, padding: '8px 14px', borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
            <Plus size={14} /> 会社を追加
          </button>
        </div>
      </div>

      {unregistered.length > 0 && (
        <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 6, padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>未登録の会社（案件に存在）</div>
          <div style={{ fontSize: 11, color: colors.textMute, marginBottom: 10 }}>
            並び順に未登録のため、登録済みの後ろ（オフショアより前・名前順）に表示されます。「登録」で並び順に加えられます。
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {unregistered.map(c => (
              <div key={c} style={rowBase}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, background: getProjectColor(c), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>—</span>
                <span style={{ fontSize: 13 }}>{c}</span>
                <span style={{ fontSize: 10, color: colors.textMute, background: '#eceae3', borderRadius: 8, padding: '1px 7px' }}>未登録</span>
                <button type="button" onClick={() => add(c)} title="並び順に登録"
                  style={{ marginLeft: 'auto', background: '#fff', border: `1px solid ${colors.accent}`, color: colors.accent, fontWeight: 600, padding: '5px 12px', borderRadius: 4, cursor: 'pointer', fontFamily: fontJP, fontSize: 12 }}>
                  登録
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export { MasterView, OvertimeManager, AbsenceManager, HolidayManager, CompanyOrderView };
