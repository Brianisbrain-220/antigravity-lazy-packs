---
name: antigravity-obsidian
description: 在 AntiGravity 連接 Obsidian MCP (MCPVault)。說「連接 Obsidian」「設定 Obsidian」時載入。
---

# 連接 Obsidian（AntiGravity 版）

## 步驟

### 1. 找到 vault
尋找 Obsidian vault 的實體路徑時，AI 應遵循以下優先順序以實現免發問自動識別：
- **優先讀取全域 MCP 設定檔**：檢查 `C:\Users\<使用者>\.gemini\config\mcp_config.json` 中 `"obsidian"` 區塊的 `"args"`，首個參數即為目前作用中的 Vault 實體路徑。
- **讀取專案規則檔**：檢查專案根目錄下 `ANTIGRAVITY.md` 中的 `Obsidian vault：` 路徑。
- **檢查本機常見同步目錄**：
  - `C:\Users\<使用者>\SynologyDrive\Secondbrain` (Synology Drive)
  - `C:\Users\<使用者>\OneDrive\文件\Secondbrain`
  - `C:\Users\<使用者>\Documents\<vault 名稱>`
  - `G:\我的雲端硬碟\<vault 名稱>`

### 2. 安裝 MCPVault
在命令提示字元或 PowerShell 中執行安裝：
```powershell
npm.cmd install -g @bitbonsai/mcpvault
where.exe mcpvault
```
常見路徑為：
`C:\Users\<你>\AppData\Roaming\npm\mcpvault.cmd`

### 3. 註冊 Obsidian MCP
請依 AntiGravity 實際 MCP 設定方式加入設定檔：
```json
"obsidian": {
  "type": "local",
  "command": [
    "C:\\Users\\<你>\\AppData\\Roaming\\npm\\mcpvault.cmd",
    "C:\\Users\\<你>\\OneDrive\\文件\\Secondbrain"
  ],
  "enabled": true
}
```

如果使用 command / args 分開的格式：
```json
{
  "command": "C:\\Users\\<你>\\AppData\\Roaming\\npm\\mcpvault.cmd",
  "args": ["C:\\Users\\<你>\\OneDrive\\文件\\Secondbrain"]
}
```

### 4. 驗證
重新啟動 AntiGravity，先測試讀取 vault 根目錄，並測試建立與讀回一篇測試筆記。

⚠️ 安全提醒：請勿將你的實體 vault 路徑或任何敏感筆記內容 commit 到公開儲存庫中。
