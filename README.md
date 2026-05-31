# ＱuickDot

一個可直接打開的本機快速筆記原型，資料會儲存在瀏覽器 `localStorage`。

## 功能

- Weekly Log：查看所選日期所在週的任務、事件、筆記
- Daily Log：查看所選日期當天的任務、事件、筆記
- 編輯紀錄：修改既有紀錄內容
- 完成排序：週紀錄中已完成項目會自動排到最後
- 子項目：在既有項目下新增、完成、刪除一層子項目
- 複製紀錄：把同一筆紀錄複製到另一個日期
- Monthly Log：查看目前月份的所有記錄、本月任務與重要事項
- Future Log：集中查看下個月以後的任務與事件
- 任務狀態：完成、重要、遷移
- 符號說明：查看既有符號代表的意義
- 月曆導覽：快速切換日期並看到有紀錄的日子
- 搜尋：依文字快速找到紀錄或子項目
- PWA：可加入手機/平板主畫面，並支援離線開啟
- Supabase 同步：登入同一帳號後在手機、平板、電腦同步資料
- 健康檢查：查看本機資料量、待同步佇列、PWA 狀態與最近同步錯誤
- 管理後台：管理員可查看全站統計與最近同步錯誤，不顯示使用者筆記內容

## 使用方式

直接用瀏覽器打開 `index.html`。

若瀏覽器限制本機檔案功能，也可以在資料夾中啟動簡單伺服器：

```bash
python3 -m http.server 5173
```

然後開啟 `http://localhost:5173`。

## PWA 安裝

PWA 需要透過 `http://localhost`、區網網址或正式 HTTPS 網址開啟；直接用 `file://` 開啟時無法註冊離線快取。

1. 啟動伺服器：`python3 -m http.server 5173`
2. 用瀏覽器開啟 `http://localhost:5173`
3. 手機和平板可透過瀏覽器選單使用「加入主畫面」
4. 第一次成功開啟後，核心檔案會被快取，之後可離線開啟

## Supabase 同步設定

1. 在 Supabase 建立專案
2. 到 SQL Editor 執行 `supabase-schema.sql`
3. 到 Project Settings 複製 Project URL 和 anon/publishable key
4. 編輯 `supabase-config.js`

```js
window.QUICKDOT_SUPABASE = {
  url: "https://your-project.supabase.co",
  anonKey: "your-anon-or-publishable-key",
};
```

5. 重新部署到 Netlify
6. 在 App 按「同步」，用 Email/密碼註冊或登入

登入同一個帳號後，可以使用「同步最新」、「上傳本機」或「下載雲端」讓多台裝置保持一致。

同步已支援差異佇列與逐筆合併：離線時的新增、編輯、刪除會先保留在本機，恢復連線後優先同步單筆變更。新版 schema 會使用 `quickdot_entries` 作為主要同步表，舊版 `quickdot_user_data` 仍保留作為相容 fallback。

### 密碼重設

若使用 Supabase 的 Reset password 信件，請到 Supabase Dashboard：

1. 開啟 Authentication -> URL Configuration
2. 將 Site URL 設為正式網址，例如 `https://你的網站名稱.netlify.app`
3. 在 Redirect URLs 加入：
   - `https://你的網站名稱.netlify.app/index.html`
   - `https://你的網站名稱.netlify.app/*`
4. 儲存後重新寄送 Reset password 信

不要把 Site URL 留成 `http://localhost:5173`，否則使用者點信件時會回到自己的電腦 localhost，造成 `ERR_CONNECTION_REFUSED`。

App 的同步設定已提供「忘記密碼」按鈕，重設信導回 QuickDot 後會跳出「設定新密碼」視窗。

刪除同步採用 tombstone 保留機制：已刪除紀錄會保留一段時間協助多裝置合併，超過 90 天且已不在待同步佇列中的刪除紀錄會自動清理，避免資料越用越大。

同步錯誤會先保留在本機 `quickdot-sync-errors-v1`，登入後會嘗試寫入 Supabase 的 `quickdot_sync_errors` 表，方便日後排查大量使用者同步問題。這些診斷資料只保存安全欄位，不會記錄密碼。

## 管理後台

開啟 `admin.html` 可以進入只讀型管理後台。後台資料由 Supabase RPC 提供，會在資料庫端檢查 `quickdot_admins` 管理員清單，不只依賴前端判斷。

目前 schema 已將 `boyce3892846@gmail.com` 設為管理員。請先確認這個 Email 已在 Supabase Auth 註冊，並重新執行 `supabase-schema.sql`，才會建立管理員表、統計 RPC 與權限設定。

後台目前顯示：

- 總使用者、今日新增使用者
- 7 日活躍使用者
- 目前紀錄數與刪除保留數
- 24 小時同步變更與同步錯誤
- 最近同步錯誤列表

後台不會讀取或顯示使用者筆記內容。

## 健康檢查

開啟 `health.html` 可以檢查：

- 本機紀錄數、刪除保留紀錄與資料版本
- 待同步變更、最後同步時間與本機錯誤佇列
- Service Worker 與 Cache API 是否可用

也可以在 App 的齒輪設定中點「開啟健康檢查」。

## 開發與打包

程式已拆成多個模組：`constants.js`、`i18n.js`、`state.js`、`dom.js`、`dates.js`、`storage.js`、`sync.js`、`entries.js`、`render-*.js`、`app-events.js`、`app.js`。

檢查語法、必要檔案、script 載入順序與 Service Worker 快取清單：

```bash
npm run check
```

產生 Netlify Drop 用的 `quickdot-deploy.zip`：

```bash
npm run package
```
