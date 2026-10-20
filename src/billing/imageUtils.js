// 帳票に貼る画像の縮小（ブラウザ専用）。
// 画像は Firestore の帳票ドキュメントに dataURL で保存するため（1ドキュメント 1MB まで）、
// 長辺 1200px・JPEG 品質 0.8 に縮小し、それでも大きければ段階的に小さくする。

// 1枚あたりの目安上限（外観・内観の2枚＋本文で 1MB に収まるように）
export const IMAGE_MAX_BYTES = 380 * 1024;
// 帳票ドキュメント全体の上限（Firestore の 1MB に余裕を持たせる）
export const DOC_MAX_BYTES = 950 * 1024;

// 縮小の段階：[長辺px, JPEG品質]
const STEPS = [[1200, 0.8], [1200, 0.7], [1000, 0.7], [800, 0.7], [800, 0.6], [640, 0.6]];

export function dataUrlBytes(dataUrl) {
  const s = String(dataUrl || '');
  const i = s.indexOf(',');
  if (i < 0) return s.length;
  return Math.floor((s.length - i - 1) * 3 / 4); // base64 → バイト数
}
export function jsonBytes(obj) {
  return new Blob([JSON.stringify(obj)]).size;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('画像を読み込めませんでした（対応していない形式の可能性があります）'));
    img.src = src;
  });
}
function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('ファイルを読み込めませんでした'));
    r.readAsDataURL(file);
  });
}

// File / Blob → 縮小した JPEG の dataURL。IMAGE_MAX_BYTES に収まらなければエラー
export async function downscaleImage(file) {
  if (!file || !/^image\//.test(file.type || '')) throw new Error('画像ファイルを選んでください');
  const img = await loadImage(await readAsDataUrl(file));
  const w0 = img.naturalWidth || img.width, h0 = img.naturalHeight || img.height;
  if (!w0 || !h0) throw new Error('画像の大きさを読み取れませんでした');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  for (const [maxSide, quality] of STEPS) {
    const scale = Math.min(1, maxSide / Math.max(w0, h0));
    canvas.width = Math.round(w0 * scale);
    canvas.height = Math.round(h0 * scale);
    ctx.fillStyle = '#fff'; // 透過PNGの背景を白に
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const url = canvas.toDataURL('image/jpeg', quality);
    if (dataUrlBytes(url) <= IMAGE_MAX_BYTES) return url;
  }
  throw new Error('画像が大きすぎて保存できません（縮小しても上限を超えます）');
}
