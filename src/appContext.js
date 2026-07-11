// アプリ共有コンテキスト。
// App.jsx が保持する「共有データ（tasks / scheduled / settings / now など）」と
// 「タスク操作ハンドラ（handleEdit / completeProject など）」をビューへ渡すための仕組み。
// props のバケツリレーを避けるため、ビュー・カード類は useApp() で直接取得する。
// ※ コンポーネント固有の値（group や task、フォーム state など）は従来どおり props で渡すこと。
import { createContext, useContext } from 'react';

const AppCtx = createContext(null);

function useApp() {
  const v = useContext(AppCtx);
  if (!v) throw new Error('useApp() は <AppCtx.Provider> の内側でのみ使えます');
  return v;
}

export { AppCtx, useApp };
