import keyring
import gkeepapi
from config import setup_logger, KEEP_EMAIL, ANDROID_ID

logger = setup_logger("KeepSyncEngine")

class KeepSyncEngine:
    def __init__(self):
        self.keep = gkeepapi.Keep()
        
    def login_and_sync(self):
        if not KEEP_EMAIL or KEEP_EMAIL == "your_email@gmail.com":
            raise ValueError("請先於 .env 中設定 KEEP_EMAIL")
            
        master_token = keyring.get_password("keep-manager", KEEP_EMAIL)
        if not master_token:
            raise ValueError(f"於 Credential Manager 中找不到 {KEEP_EMAIL} 的 Master Token，請執行 bootstrap_token.py")
            
        logger.info(f"Authenticating with {KEEP_EMAIL}...")
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
