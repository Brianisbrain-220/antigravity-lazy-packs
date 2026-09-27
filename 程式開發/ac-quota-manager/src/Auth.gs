/**
 * @version v1.0.0
 * Auth and Account Management.
 */

function requireOwnerContext_() {
  if (Session.getEffectiveUser().getEmail() !== Session.getActiveUser().getEmail()) {
    throw new Error('FORBIDDEN: Must be executed by the script owner');
  }
}

function hashPassword_(password, salt) {
  let h = salt + password;
  for (let i = 0; i < 500; i++) {
    const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h, Utilities.Charset.UTF_8);
    h = rawHash.map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2, '0')).join('');
  }
  return h;
}

function adminSetup() {
  requireOwnerContext_();
  
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('SPREADSHEET_ID')) {
    console.error('SPREADSHEET_ID is not set in ScriptProperties.');
    return;
  }
  
  checkAndMigrateDb_();
  
  const sysConfig = readTable_('系統設定');
  const addConfig = (key, val, desc) => {
    if (!sysConfig.find(r => r['鍵'] === key)) {
      appendRecord_('系統設定', {
        '鍵': key,
        '值': val,
        '說明': desc,
        '更新時間': Utilities.formatDate(new Date(), 'Asia/Taipei', "yyyy-MM-dd'T'HH:mm:ssXXX")
      });
    }
  };
  addConfig('SYSTEM_VERSION', 'v1.0.0', '系統版本號');
  addConfig('DEFAULT_BASE_HOURS', '16', '預設基本配額時數');
  addConfig('BILLING_UNIT_MINUTES', '60', '計費單位(分鐘)');
  
  const accStr = props.getProperty('ADMIN_ACCOUNTS');
  if (!accStr) {
    const initialPw = Utilities.getUuid().substring(0, 12);
    const salt = Utilities.getUuid();
    const hash = hashPassword_(initialPw, salt);
    
    const accounts = {
      'brian': {
        displayName: 'Brian',
        role: 'SUPER',
        salt: salt,
        hash: hash,
        mustChange: true,
        active: true
      }
    };
    props.setProperty('ADMIN_ACCOUNTS', JSON.stringify(accounts));
    console.log('--- INITIAL ADMIN ACCOUNT SETUP ---');
    console.log('Username: brian');
    console.log('Password: ' + initialPw);
    console.log('Please login and change your password immediately.');
    console.log('-----------------------------------');
  } else {
    console.log('ADMIN_ACCOUNTS already exists. Run checkAndMigrateDb_ done.');
  }
}

function login(username, password) {
  const cache = CacheService.getScriptCache();
  const failKey = 'LOGIN_FAIL_' + username;
  const failCountStr = cache.get(failKey);
  const failCount = failCountStr ? parseInt(failCountStr, 10) : 0;
  
  if (failCount >= 5) {
    writeAudit_('SYSTEM', 'LOGIN_LOCKED', 'Auth', username, null, { failCount });
    throw new Error('FORBIDDEN: Account locked. Try again in 15 minutes.');
  }
  
  const props = PropertiesService.getScriptProperties();
  const accStr = props.getProperty('ADMIN_ACCOUNTS');
  if (!accStr) {
    throw new Error('FORBIDDEN: 帳號或密碼錯誤');
  }
  
  const accounts = JSON.parse(accStr);
  const user = accounts[username];
  
  if (!user || !user.active) {
    cache.put(failKey, (failCount + 1).toString(), 900); // 15 mins
    writeAudit_('SYSTEM', 'LOGIN_FAIL', 'Auth', username, null, null);
    throw new Error('FORBIDDEN: 帳號或密碼錯誤');
  }
  
  const h = hashPassword_(password, user.salt);
  if (h !== user.hash) {
    cache.put(failKey, (failCount + 1).toString(), 900);
    writeAudit_('SYSTEM', 'LOGIN_FAIL', 'Auth', username, null, null);
    throw new Error('FORBIDDEN: 帳號或密碼錯誤');
  }
  
  cache.remove(failKey);
  
  const token = Utilities.getUuid();
  const sessionData = {
    username: username,
    displayName: user.displayName,
    role: user.role
  };
  cache.put('SESS_' + token, JSON.stringify(sessionData), 21600); // 6 hours
  
  return {
    ok: true,
    token: token,
    displayName: user.displayName,
    role: user.role,
    mustChange: user.mustChange,
    _version: 'v1.0.0'
  };
}

function logout(token) {
  if (token) {
    CacheService.getScriptCache().remove('SESS_' + token);
  }
  return { ok: true, _version: 'v1.0.0' };
}

function getSession_(token) {
  if (!token) throw new Error('SESSION_EXPIRED');
  const sessionStr = CacheService.getScriptCache().get('SESS_' + token);
  if (!sessionStr) throw new Error('SESSION_EXPIRED');
  
  const session = JSON.parse(sessionStr);
  const props = PropertiesService.getScriptProperties();
  const accounts = JSON.parse(props.getProperty('ADMIN_ACCOUNTS'));
  const user = accounts[session.username];
  
  if (!user || !user.active) {
    CacheService.getScriptCache().remove('SESS_' + token);
    throw new Error('SESSION_EXPIRED');
  }
  return session;
}

function requireAdmin_(token) {
  const session = getSession_(token);
  return session;
}

function requireSuper_(token) {
  const session = getSession_(token);
  if (session.role !== 'SUPER') {
    throw new Error('FORBIDDEN: Super admin only');
  }
  return session;
}

function changePassword(token, oldPw, newPw) {
  const session = requireAdmin_(token);
  if (newPw.length < 8) {
    throw new Error('VALIDATION: Password must be at least 8 characters');
  }
  
  const props = PropertiesService.getScriptProperties();
  withLock_(() => {
    const accounts = JSON.parse(props.getProperty('ADMIN_ACCOUNTS'));
    const user = accounts[session.username];
    
    if (hashPassword_(oldPw, user.salt) !== user.hash) {
      throw new Error('FORBIDDEN: 舊密碼錯誤');
    }
    
    user.salt = Utilities.getUuid();
    user.hash = hashPassword_(newPw, user.salt);
    user.mustChange = false;
    
    props.setProperty('ADMIN_ACCOUNTS', JSON.stringify(accounts));
    writeAudit_(session.displayName, 'CHANGE_PASSWORD', 'Auth', session.username, null, null);
  });
  
  return { ok: true, _version: 'v1.0.0' };
}

// SUPER funcs
function superListAccounts(token) {
  requireSuper_(token);
  const props = PropertiesService.getScriptProperties();
  const accounts = JSON.parse(props.getProperty('ADMIN_ACCOUNTS') || '{}');
  
  const list = Object.keys(accounts).map(uname => {
    const a = accounts[uname];
    return {
      username: uname,
      displayName: a.displayName,
      role: a.role,
      active: a.active,
      mustChange: a.mustChange
    };
  });
  return { ok: true, data: list, _version: 'v1.0.0' };
}

function superCreateAccount(token, username, displayName, role) {
  const session = requireSuper_(token);
  if (role !== 'SUPER' && role !== 'ADMIN') throw new Error('VALIDATION: Invalid role');
  if (!username || !displayName) throw new Error('VALIDATION: Required fields missing');
  
  const initialPw = Utilities.getUuid().substring(0, 12);
  let resPw = '';
  
  const props = PropertiesService.getScriptProperties();
  withLock_(() => {
    const accounts = JSON.parse(props.getProperty('ADMIN_ACCOUNTS') || '{}');
    if (accounts[username]) {
      throw new Error('CONFLICT: Username already exists');
    }
    
    const salt = Utilities.getUuid();
    const hash = hashPassword_(initialPw, salt);
    
    accounts[username] = {
      displayName,
      role,
      salt,
      hash,
      mustChange: true,
      active: true
    };
    
    props.setProperty('ADMIN_ACCOUNTS', JSON.stringify(accounts));
    writeAudit_(session.displayName, 'CREATE_ACCOUNT', 'Auth', username, null, { displayName, role });
    resPw = initialPw;
  });
  
  return { ok: true, initialPassword: resPw, _version: 'v1.0.0' };
}

function superResetPassword(token, targetUsername) {
  const session = requireSuper_(token);
  const initialPw = Utilities.getUuid().substring(0, 12);
  let resPw = '';
  
  const props = PropertiesService.getScriptProperties();
  withLock_(() => {
    const accounts = JSON.parse(props.getProperty('ADMIN_ACCOUNTS') || '{}');
    if (!accounts[targetUsername]) throw new Error('NOT_FOUND: Account not found');
    
    const salt = Utilities.getUuid();
    const hash = hashPassword_(initialPw, salt);
    
    accounts[targetUsername].salt = salt;
    accounts[targetUsername].hash = hash;
    accounts[targetUsername].mustChange = true;
    
    props.setProperty('ADMIN_ACCOUNTS', JSON.stringify(accounts));
    writeAudit_(session.displayName, 'RESET_PASSWORD', 'Auth', targetUsername, null, null);
    resPw = initialPw;
  });
  
  return { ok: true, initialPassword: resPw, _version: 'v1.0.0' };
}

function superSetAccountActive(token, targetUsername, active) {
  const session = requireSuper_(token);
  const props = PropertiesService.getScriptProperties();
  
  withLock_(() => {
    const accounts = JSON.parse(props.getProperty('ADMIN_ACCOUNTS') || '{}');
    if (!accounts[targetUsername]) throw new Error('NOT_FOUND: Account not found');
    
    if (targetUsername === session.username && !active) {
      throw new Error('VALIDATION: Cannot deactivate yourself');
    }
    
    if (!active && accounts[targetUsername].role === 'SUPER') {
      const activeSupers = Object.values(accounts).filter(a => a.role === 'SUPER' && a.active).length;
      if (activeSupers <= 1) {
        throw new Error('VALIDATION: Cannot deactivate the last active SUPER admin');
      }
    }
    
    accounts[targetUsername].active = !!active;
    props.setProperty('ADMIN_ACCOUNTS', JSON.stringify(accounts));
    writeAudit_(session.displayName, 'SET_ACCOUNT_ACTIVE', 'Auth', targetUsername, { active: !active }, { active: !!active });
  });
  
  return { ok: true, _version: 'v1.0.0' };
}
