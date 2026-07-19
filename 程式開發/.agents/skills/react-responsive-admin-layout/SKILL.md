---
name: react-responsive-admin-layout
description: "提供 React 專案標準的響應式後台版型 (Sidebar + Drawer + BottomNav) 開發指引，適用於各種管理系統後台開發，支援手機與桌機無縫切換。"
---

# React Responsive Admin Layout Skill

當開發新專案或是將現有系統升級為「管理後台」、「系統總覽」且要求支援「響應式設計 (RWD)」或「手機版介面」時，請載入並參考此技能。

## 1. 核心版型架構 (App.jsx)
為確保畫面在手機上不被截斷並支援下方導覽列，建議使用 `.app-layout` 搭配 `.main-wrapper` 的雙層架構：

```jsx
<div className="app-layout">
  {/* 手機版側邊欄遮罩 */}
  {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

  {/* 側邊導覽列 (桌機固定、手機為 Drawer) */}
  <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

  <div className="main-wrapper">
    {/* 手機版專用上方列 (含漢堡按鈕) */}
    <div className="mobile-topbar">
      <button className="hamburger-btn" onClick={() => setSidebarOpen(true)}>☰</button>
      <span className="mobile-title">管理系統</span>
    </div>

    {/* 主要內容區塊 */}
    <main className="main-content">
      {/* 切換頁面內容 */}
    </main>

    {/* 手機版專用下方導覽列 */}
    <BottomNav />
  </div>
</div>
```

## 2. 關鍵 CSS 配置 (index.css)
強烈建議使用 Flexbox 搭配 `100dvh` 來避免手機版瀏覽器網址列導致的捲動問題：

```css
.app-layout {
  display: flex;
  flex-direction: row;
  height: 100vh;
  height: 100dvh; /* 支援手機動態視窗高度 */
  overflow: hidden;
}

.main-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 28px 32px;
}

/* Flex 溢出防護 (文字過長不破版) */
.flex-text-truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
```

## 3. RWD 斷點設定
在 `@media (max-width: 1024px)` 斷點時進行以下切換：
1. 隱藏桌機版 `.sidebar`，將其改為絕對定位 (absolute/fixed) 的 Drawer 側邊欄。
2. 顯示 `.mobile-topbar` (提供漢堡選單呼叫 Sidebar)。
3. 顯示 `.bottom-nav`，並隱藏 Sidebar 內重複的主要選單項目。
4. 將 `.main-content` 的 padding 縮小以適應手機螢幕。

此技能可以有效節省開發響應式後台版型所需的 Token，並避免常見的 CSS Flex 溢出 (Overflow) 黑屏或破版問題。
