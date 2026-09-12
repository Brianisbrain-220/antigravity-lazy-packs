import keyring
import gkeepapi
from config import setup_logger, KEEP_EMAIL, ANDROID_ID

logger = setup_logger("KeepSyncEngine")

class KeepSyncEngine:
    def __init__(self):
        self.keep = gkeepapi.Keep()
        
    def login_and_sync(self):
        if not KEEP_EMAIL or KEEP_EMAIL == "your_email@gmail.com":
            raise ValueError("請先在 .env 中設定 KEEP_EMAIL")
            
        master_token = keyring.get_password("keep-manager", KEEP_EMAIL)
        if not master_token:
            raise ValueError(f"在 Credential Manager 中找不到 {KEEP_EMAIL} 的 Master Token。請先執行 bootstrap_token.py")
            
        logger.info(f"Authenticating with {KEEP_EMAIL}...")
        self.keep.resume(KEEP_EMAIL, master_token, state=None, sync=True)
        # R6: We need to use the consistent android_id if resume supports it, or authenticate.
        # Actually gkeepapi's resume() might not take device_id, but we can set it if needed.
        # In resume(), there's no device_id arg. It is only in authenticate(..., device_id=...).
        # BUT resume() is just loading state and syncing. Let's stick to resume or authenticate.
        # Wait, if we use resume without state, it does a full sync. If we want device_id, we can manually authenticate.
        # Let's use authenticate(email, master_token, device_id)
        # gkeepapi's authenticate() checks if password starts with 'aas_et/' to skip gpsoauth.perform_master_login.
        
        # Let's ensure authenticate works with master token.
        try:
            self.keep.authenticate(KEEP_EMAIL, master_token, device_id=ANDROID_ID)
        except gkeepapi.exception.LoginException as e:
            logger.error("Authentication failed.")
            raise e
            
        logger.info("Syncing with Keep server...")
        self.keep.sync()
        return self.keep
        
    def sync(self):
        logger.info("Executing sync()...")
        self.keep.sync()
