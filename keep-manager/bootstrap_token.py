import keyring
import gpsoauth
import gkeepapi
from config import KEEP_EMAIL, ANDROID_ID

def main():
    if not KEEP_EMAIL or KEEP_EMAIL == "your_email@gmail.com":
        print("請先在 .env 檔案中設定您的 KEEP_EMAIL")
        return

    print("=== Google Keep Master Token 獲取精靈 ===")
    print(f"目前帳號: {KEEP_EMAIL}")
    print(f"Android ID: {ANDROID_ID}")
    print("\n請開啟以下網址並登入您的 Google 帳號 (這會產生一組 oauth_token)：")
    print("https://accounts.google.com/EmbeddedSetup")
    print("\n登入完成後，您會在網頁底部看到一個 'I agree' 按鈕。")
    print("右鍵檢查網頁(F12) -> 切換到 Application (或 Storage) -> Cookies -> accounts.google.com")
    print("尋找名為 'oauth_token' 的 Cookie 值並貼到下方。")
    
    oauth_token = input("請輸入 oauth_token (通常以 oauth2_4/ 開頭): ").strip()
    
    if not oauth_token:
        print("未輸入 token，取消操作。")
        return
        
    print("\n正在使用 gpsoauth 交換 Master Token...")
    # gpsoauth.exchange_token takes (email, oauth_token, android_id)
    response = gpsoauth.exchange_token(KEEP_EMAIL, oauth_token, ANDROID_ID)
    
    if "Token" not in response:
        print("交換失敗，回應內容：")
        print(response)
        return
        
    master_token = response["Token"]
    
    print("\n取得 Master Token 成功！正在驗證 Keep 登入...")
    
    keep = gkeepapi.Keep()
    try:
        keep.authenticate(KEEP_EMAIL, master_token, device_id=ANDROID_ID)
        print("Google Keep 驗證成功！")
        
        # Save to Windows Credential Manager
        keyring.set_password("keep-manager", KEEP_EMAIL, master_token)
        print("Master Token 已安全儲存至 Windows 認證管理員 (Credential Manager)。")
        print("您可以關閉此視窗並準備執行自動化分類。")
    except Exception as e:
        print(f"Keep 驗證失敗: {e}")

if __name__ == "__main__":
    main()
