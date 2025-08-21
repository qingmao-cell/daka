# ⏱️ Daka – 工数管理 Web アプリ

Daka は **個人やチームの作業時間を記録・可視化する** Web アプリです。  
日々の打刻をシンプルに入力し、工数の把握や効率改善に役立ちます。

## ✨ 主な機能
- 📝 **打刻入力**
  - 日付・作業内容・工数を簡単に記録
- 📊 **工数一覧 & 集計**
  - 記録したデータをリスト表示
  - 日別・週別・月別での集計を確認
- 🔍 **フィルタ & 検索**
  - プロジェクトやタグごとに工数を抽出
- 🎯 **将来的な拡張予定**
  - ユーザー認証 & 個別アカウント管理
  - CSV / Excel 出力
  - チーム単位での工数集計

## 🛠️ 技術スタック
- **Frontend**: Next.js / React
- **Styling**: Tailwind CSS
- **Database**: （もし Prisma / SQLite / PostgreSQL を使ってたらここに追記）
- **Deployment**: Vercel

## 🚀 デモ
👉 （ここに Vercel デプロイ URL を貼る）

## 📂 プロジェクト構成
daka/
├─ app/             # Next.js ページ
├─ components/      # UI コンポーネント
├─ lib/             # データ操作ロジック
├─ public/          # 静的ファイル
└─ README.md
## ⚙️ セットアップ方法
```bash
# リポジトリをクローン
git clone https://github.com/qingmao-cell/daka.git
cd daka

# パッケージをインストール
npm install

# 環境変数を設定 (.env) 必要に応じて
# 例: DATABASE_URL=xxx

# 開発サーバーを起動
npm run dev
```

http://localhost:3000 でアプリを確認できます。
