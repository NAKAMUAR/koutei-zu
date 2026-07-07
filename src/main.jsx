import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// 描画中に例外が起きても真っ白にせず、再読み込みできる画面を出すための保険。
// これが無いと React 全体がアンマウントされ画面が真っ白になる。
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('画面の描画でエラーが発生しました:', error, info);
  }
  render() {
    if (this.state.error) {
      const wrap = {
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: '#faf8f3', padding: 20,
        fontFamily: "'Noto Sans JP', sans-serif", color: '#1a1a1a',
      };
      const card = {
        maxWidth: 420, width: '100%', textAlign: 'center', background: '#fff',
        border: '1px solid #e8e3d6', borderRadius: 6, padding: '36px 32px',
      };
      const btn = {
        marginTop: 20, padding: '10px 20px', background: '#1a1a1a', color: '#fff',
        border: 'none', borderRadius: 4, cursor: 'pointer',
        fontFamily: "'Noto Sans JP', sans-serif", fontSize: 14, fontWeight: 600,
      };
      return (
        <div style={wrap}>
          <div style={card}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>
              画面の読み込みでエラーが発生しました
            </div>
            <div style={{ fontSize: 12.5, color: '#6b6b6b', lineHeight: 1.7 }}>
              一時的な不具合の可能性があります。<br />
              再読み込みしても直らない場合は管理者へご連絡ください。
            </div>
            <button style={btn} onClick={() => window.location.reload()}>
              再読み込み
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
