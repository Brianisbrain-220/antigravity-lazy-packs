/**
 * Mock & Demo Data for CCPS Parking & ETC Management System
 * Allows full application usage & testing even without Firebase connection.
 */

export const INITIAL_RULES_TEXT = `【高雄市中正國民小學 校園汽機車及 ETC 停車管理規範】

一、申請資格與範圍：
1. 本校編制內正職教職員工：經申請核可後發放「學年度汽車停車證」，憑證可停入本校地下停車場及指定區域。
2. 代理代課教師、外聘教師、社團教師及志工：經申請核可後發放「臨時汽車停車證」，請確實遵守核可之有效期限及停放範圍。
3. ETC 登記：本校教職員工及約聘人員可申請登記車牌與聯絡手機，ETC 內碼由事務組掃描或確認後填妥。

二、停放與證件使用原則：
1. 汽車停車證請務必放置於「前擋風玻璃明顯處」，以利管理員識別。
2. 一人最多申請二部汽機車，但校內同一時間限停放一部，嚴禁轉借他人或非申請車輛使用。
3. 非本校開放停車時間（如平日夜間或校園不開放時段），請勿擅自停入本校。

三、違規處分與續辦：
1. 若未依規定擺放停車證、占用殘障或專屬車位、或超時停放等，將由管理員於系統記點並通知車主。
2. 違反本校停車管理辦法情節重大或累計三次違規者，取消本證並暫停申請一年。
3. 正式員工之停車證於到期前一個月，系統將發送 Email 通知續辦，可確認資料無誤後一鍵送出下一年度申請。`;

export const INITIAL_PERMITS = [
  {
    id: 'p1',
    createdAt: '2026-06-01 09:30',
    name: '王小明',
    email: 'wang@ccps.kh.edu.tw',
    role: '本校正職教職員工',
    department: '教務處',
    plate1: 'ABC-1234',
    plate2: 'XYZ-5678',
    relationship: '本人',
    phone: '0912-345-678',
    etcCode: 'E004123456',
    status: 'APPROVED',
    expiryDate: '115. 08. 31',
    academicYear: '114',
    isEtcApplied: true
  },
  {
    id: 'p2',
    createdAt: '2026-06-15 14:20',
    name: '李美華',
    email: 'lee@ccps.kh.edu.tw',
    role: '代理代課教師',
    department: '三年級導師室',
    plate1: 'DEF-8899',
    plate2: '',
    relationship: '本人',
    phone: '0923-456-789',
    etcCode: '',
    status: 'APPROVED',
    expiryDate: '114. 07. 31',
    academicYear: '',
    isEtcApplied: false
  },
  {
    id: 'p3',
    createdAt: '2026-07-01 11:10',
    name: '張建國',
    email: 'chang@ccps.kh.edu.tw',
    role: '社團教師',
    department: '管樂團',
    plate1: 'GHI-3344',
    plate2: '',
    relationship: '夫妻',
    phone: '0934-567-890',
    etcCode: 'E008889999',
    status: 'APPROVED',
    expiryDate: '114. 12. 31',
    academicYear: '',
    isEtcApplied: true
  },
  {
    id: 'p4',
    createdAt: '2026-07-10 16:45',
    name: '陳志強',
    email: 'chen@ccps.kh.edu.tw',
    role: '志工',
    department: '交通導護組',
    plate1: 'JKL-7788',
    plate2: '',
    relationship: '本人',
    phone: '0955-667-788',
    etcCode: '',
    status: 'PENDING',
    expiryDate: '114. 08. 31',
    academicYear: '',
    isEtcApplied: false
  }
];

export const INITIAL_VIOLATIONS = [
  {
    id: 'v1',
    createdAt: '2026-07-15 10:15',
    plate: 'DEF-8899',
    ownerName: '李美華',
    phone: '0923-456-789',
    reason: '未依規定放置臨時停車證於前擋風玻璃',
    location: '地下停車場 B1 東側',
    notified: true,
    notifyTime: '2026-07-15 10:16'
  }
];

export const INITIAL_VIOLATION_TYPES = [
  '未依規定放置停車證於前擋風玻璃',
  '占放身心障礙或專屬車位',
  '非校園開放時間擅自停入',
  '車輛漏油或有危險物品',
  '超時停放或過夜未申請'
];

export const INITIAL_UNREGISTERED_VEHICLES = [
  {
    id: 'unreg_1',
    plate: 'ZZ-9999',
    note: '黑色進口轎車 / 曾違停於東側校門通道',
    firstSeen: '2026-07-10 14:20',
    count: 2,
    history: [
      {
        date: '2026-07-10 14:20',
        reasons: ['非校園開放時間擅自停入'],
        location: '東側校門通道'
      },
      {
        date: '2026-07-18 09:30',
        reasons: ['占放身心障礙或專屬車位'],
        location: '前棟川堂旁車位'
      }
    ]
  }
];

