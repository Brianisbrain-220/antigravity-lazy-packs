import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, FileText, CheckSquare, Square, Lock, Unlock, ArrowDownCircle } from 'lucide-react';

export default function RulesAgreement({ rulesText, agreed, setAgreed }) {
  const [expanded, setExpanded] = useState(true); // Default open for reading enforcement
  const [hasReadToBottom, setHasReadToBottom] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    // Check if content is short enough that it doesn't need scrolling
    if (scrollRef.current) {
      const { scrollHeight, clientHeight } = scrollRef.current;
      if (scrollHeight <= clientHeight + 25) {
        setHasReadToBottom(true);
      }
    }
  }, [rulesText, expanded]);

  const handleScroll = (e) => {
    const { scrollHeight, scrollTop, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 25) {
      setHasReadToBottom(true);
    }
  };

  const handleAgreeClick = () => {
    if (!hasReadToBottom) {
      alert('⚠️ 請向下捲動並詳讀上方《校園汽機車及 ETC 停車管理規範》至最後一條，完成閱讀後方可勾選！');
      return;
    }
    setAgreed(!agreed);
  };

  return (
    <div className="rules-container">
      <div className="rules-header" onClick={() => setExpanded(!expanded)}>
        <div className="rules-title">
          <FileText size={20} className="icon-blue" />
          <span>中正國小 停車管理與 ETC 申請須知規範</span>
          <span className="text-xs px-2 py-0.5 rounded bg-amber-900/40 text-amber-300 border border-amber-700/60 ml-2">
            申辦必讀
          </span>
        </div>
        <button className="rules-toggle-btn">
          {expanded ? '收合條文 ▲' : '詳讀規範內容 ▼'}
        </button>
      </div>

      {expanded && (
        <div className="flex flex-col">
          <div 
            ref={scrollRef}
            onScroll={handleScroll}
            className="rules-body max-h-72 overflow-y-auto pr-2"
          >
            <pre className="rules-text">{rulesText}</pre>
          </div>

          <div className="p-2.5 bg-gray-900/80 border-t border-gray-800 flex items-center justify-between text-xs">
            {!hasReadToBottom ? (
              <span key="status-unread" className="text-amber-400 flex items-center gap-1.5 font-semibold">
                <ArrowDownCircle size={15} className="animate-bounce" />
                <span>⬇️ 請垂直捲動條文至最底部，系統確認讀畢後將自動解鎖同意按鈕...</span>
              </span>
            ) : (
              <span key="status-read" className="text-emerald-400 flex items-center gap-1.5 font-semibold">
                <Unlock size={15} />
                <span>✔ 您已詳讀全條文，請於下方勾選同意以進入申請資料填報！</span>
              </span>
            )}
            <button 
              type="button" 
              onClick={() => {
                if (scrollRef.current) {
                  scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
              }}
              className="text-gray-400 hover:text-gray-200 underline"
            >
              一鍵滑至底部
            </button>
          </div>
        </div>
      )}

      <div 
        className={`rules-agree-bar transition ${
          !hasReadToBottom 
            ? 'opacity-60 cursor-not-allowed bg-gray-800/40' 
            : agreed 
            ? 'agreed-active cursor-pointer' 
            : 'cursor-pointer hover:bg-gray-800'
        }`}
        onClick={handleAgreeClick}
      >
        <div className="checkbox-wrap">
          {!hasReadToBottom ? (
            <span key="icon-lock" className="inline-flex"><Lock size={22} className="text-gray-500" /></span>
          ) : agreed ? (
            <span key="icon-check" className="inline-flex"><CheckSquare size={22} className="icon-success" /></span>
          ) : (
            <span key="icon-square" className="inline-flex"><Square size={22} className="icon-muted" /></span>
          )}
        </div>
        <div className="agree-label">
          <strong className="flex items-center gap-2">
            <span>我已詳讀並同意遵守上方《校園汽機車及 ETC 停車管理規範》</span>
            {!hasReadToBottom && (
              <span key="lock-hint" className="text-xs text-amber-400 font-normal">
                [🔒 請先滑到底部完成閱讀]
              </span>
            )}
          </strong>
          <p>違反規範可能導致停車證經通知後取消並停權一年申請資格</p>
        </div>
      </div>
    </div>
  );
}
