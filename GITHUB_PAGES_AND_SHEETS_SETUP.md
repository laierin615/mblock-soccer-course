# mBlock 足球機器人課程網站部署說明

## 這個網域是永久的嗎？

不是。`trycloudflare.com` 是 Cloudflare Quick Tunnel 的臨時預覽網址。電腦關機、終端機停止、tunnel 中斷後，網址就可能失效。

## 可以放到 GitHub 嗎？

可以。這份網站是純靜態 HTML，可以直接放到 GitHub Pages。

目前已發布：

- GitHub repo: https://github.com/laierin615/mblock-soccer-course
- GitHub Pages: https://laierin615.github.io/mblock-soccer-course/

## GitHub Pages 步驟

1. 在 GitHub 建立 repository，例如 `mblock-soccer-course`。
2. 把 `outputs` 資料夾內這些檔案上傳到 repository 根目錄：
   - `index.html`
   - `mblock_soccer_12_lessons.html`
   - `google-apps-script-backend.gs`
   - `mblock_soccer_google_sheet_backend.xlsx`
3. 到 GitHub repository 的 `Settings` → `Pages`。
4. Source 選 `Deploy from a branch`。
5. Branch 選 `main`，資料夾選 `/root`。
6. 等待網址產生，通常格式是：
   `https://你的帳號.github.io/mblock-soccer-course/`

## Google Sheet 後台步驟

1. 將 `mblock_soccer_google_sheet_backend.xlsx` 上傳到 Google Drive。
2. 用 Google Sheets 開啟，另存或轉成 Google 試算表。
3. 在試算表中打開 `Extensions` → `Apps Script`。
4. 貼上 `google-apps-script-backend.gs` 的全部內容。
5. 按 `Deploy` → `New deployment`。
6. 類型選 `Web app`。
7. Execute as 選 `Me`。
8. Who has access 選 `Anyone with the link`。
9. 部署後複製 Web App URL。
10. 回到課程網站 → `GitHub 與 Google Sheet` → 貼上 Web App URL → 按 `儲存設定`。
11. 老師輸入計分密碼 `543861`，按 `初始化後台`。
12. 看到「後台初始化完成」後，球隊、球員與計分資料就會寫入 Google Sheet。

## 老師計分密碼

- 預設老師計分密碼：`543861`
- 網站不會儲存明文密碼；送出分數前會先轉成 SHA-256 雜湊。
- Apps Script 會比對 Google Sheet `Settings` 分頁中的 `teacherPasswordHash`。
- 預設雜湊值：
  `6d60392b6d56e300f7c5e8f94415bc675e971037881b673a799a545a91191f04`
- 如果之後要改密碼，請先用 SHA-256 產生新密碼雜湊，再把 `Settings` 分頁的 `teacherPasswordHash` 改成新值。

## 學生資料提醒

網站若放在公開 GitHub Pages，請不要登錄學生真實姓名、電話、完整班級座號等個資。建議使用暱稱、組內代號或背號。
