# 資料更新核對筆記

## 2026-03-30 初步核對

### BofA 機構現金配置

已透過 BofA 官方 Weekly Market Recap Report 頁面核對 2026 年 3 月 Fund Manager Survey 摘要。頁面明確寫到：

> cash levels surge to 4.3 percent, marking the biggest monthly increase since COVID-19.

因此，網站低頻風險模組目前使用的 **4.3%** 仍與可公開確認的最新官方摘要一致，方向亦為風險偏好轉弱、現金配置上升。

來源頁面：
- https://business.bofa.com/en-us/content/market-strategies-insights/weekly-market-recap-report.html

### 目前待續核對項目

接下來仍需逐項確認：

1. 私人信用違約率是否有更新的公開可引用口徑。
2. Vanda 公開可用資訊是否需要更新說明文字或日期。
3. 重新檢查前端顯示的刷新時間、板塊擁擠度日期與社群 proxy 日期是否一致。

### 私人信用違約率

已透過 Fitch 官方頁面核對到更新後的最新公開口徑：**U.S. Private Credit Default Rate 在 2026 年 2 月的 trailing-12-month 讀數降至 5.4%**，低於 2026 年 1 月的 5.8%。同一頁也指出 **PMR default rate 為 9.1%**，低於前值 9.4%。

這表示若網站目前仍顯示 5.8%，則應更新為更近期的 **5.4%（TTM through Feb 2026）**；若保留較高口徑的全年/PMR 指標，則必須清楚標記口徑差異，避免把 5.4% TTM 與 9.2% 或 9.1% PMR/年度口徑混為一談。

來源頁面：
- https://www.fitchratings.com/research/corporate-finance/us-private-credit-defaults-ease-to-5-4-in-february-2026-18-03-2026

### 首頁 Hero 區版面檢查

已重新檢查網站預覽。原先被圈出的 hero 區右側強互動按鈕已改為較低干擾的靜態提示條，內容為「建議起點：先看板塊排名，再切到右側歷史視角」，整體資訊層級較為乾淨。期間曾因 `ArrowDownRight` 匯入被誤刪而觸發前端錯誤，現已修正並恢復正常渲染。

目前首頁可正常載入，板塊清單與歷史視角切換按鈕仍存在，未見 hero 區破版。

### 板塊擁擠度歷史視角互動測試

已在網站預覽中實際點擊右側 `Historical View` 區塊的「5 日變化軌跡」。測試結果顯示：

- 歷史視角標題已切換為「近 1 年 · 5 日變化軌跡」。
- 說明文字已同步更新為 5 日變化口徑。
- 下方折線圖亦同步切換為 5 日變化序列。
- 左側板塊排名清單與右側所選板塊（能源 XLE）仍保持同步，未出現互動中斷。

這表示用戶要求的「點擊查看擁擠度變化歷史趨勢」核心功能目前可正常運作。
