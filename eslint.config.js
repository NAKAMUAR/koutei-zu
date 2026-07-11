// ESLint 設定（フラット構成）。`npm run check` / `npm run build`（prebuild）で必ず実行される。
// このリポジトリの UI 品質ルール（docs/07_UI設計原則.md）を機械的に守らせるためのゲート。
// ルールを緩めたい場合は、先に docs/07_UI設計原則.md の該当項目を更新して理由を残すこと。
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'node_modules/**', 'sync/**'] },
  {
    files: ['src/**/*.{js,jsx}', '*.js'],
    plugins: { react, 'react-hooks': reactHooks },
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      // --- 壊れたコードを検出（import 忘れ・タイポは build では検出されない） ---
      'no-undef': 'error',
      'react/jsx-no-undef': 'error',
      'react/jsx-uses-vars': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'no-dupe-keys': 'error',
      'no-dupe-args': 'error',
      'no-unreachable': 'error',
      'valid-typeof': 'error',
      'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_', ignoreRestSiblings: true }],

      // --- UI設計原則（docs/07_UI設計原則.md）---
      // 原則1: ネイティブダイアログ禁止。確認は ConfirmModal / useDialogs、通知はトーストを使う。
      'no-alert': 'warn', // TODO(改善#1完了時に 'error' へ)
      // 原則5: 日時入力は共通 DateTimeField に統一（datetime-local は入力しづらい環境があるため禁止）。
      'no-restricted-syntax': [
        'warn', // TODO(改善#5完了時に 'error' へ)
        {
          selector: "Literal[value='datetime-local']",
          message: '日時入力は components/common.jsx の DateTimeField を使ってください（datetime-local 禁止・UI設計原則5）',
        },
      ],
      // 原則8: 巨大ファイル禁止。ビューは分割を保つ（App.jsx のみ状態管理の集約のため上限が別）。
      'max-lines': ['error', { max: 1800, skipBlankLines: false, skipComments: false }],
    },
  },
  {
    files: ['src/App.jsx'],
    rules: {
      // App.jsx は状態管理・ハンドラの集約点のため上限を別枠にする（これ以上は増やさない）
      'max-lines': ['error', { max: 2600, skipBlankLines: false, skipComments: false }],
    },
  },
];
