import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../services/firebase';
import { usePermissions } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { Role } from '../permissions';

interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  createdAt: any;
  isAnnouncement?: boolean;
}

interface FloatingChatWidgetProps {
  onNavigate: (screen: any) => void;
}

export const FloatingChatWidget: React.FC<FloatingChatWidgetProps> = ({ onNavigate }) => {
  const { userProfile } = usePermissions();
  const { isRTL } = useLanguage();
  
  const [isOpen, setIsOpen] = useState(false);
  const [enabled, setEnabled] = useState(() => {
    const saved = localStorage.getItem('soli_enable_floating_chat');
    return saved !== 'false'; // Defaults to true
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesCount = useRef(0);
  const isFirstLoad = useRef(true);

  // Audio object for notification sound
  const notificationAudio = useMemo(() => {
    return new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav');
  }, []);

  // 1. Sync enabled status from localStorage
  useEffect(() => {
    const checkEnabled = () => {
      const saved = localStorage.getItem('soli_enable_floating_chat');
      setEnabled(saved !== 'false');
    };

    window.addEventListener('soli_floating_chat_settings_changed', checkEnabled);
    window.addEventListener('storage', checkEnabled);
    
    return () => {
      window.removeEventListener('soli_floating_chat_settings_changed', checkEnabled);
      window.removeEventListener('storage', checkEnabled);
    };
  }, []);

  // 2. Real-time messages subscription
  useEffect(() => {
    if (!db || !enabled || !userProfile) return;

    let unsubMessages = () => {};
    import('firebase/firestore').then(({ collection, onSnapshot, query, orderBy, limit }) => {
      const q = query(
        collection(db, 'messages'),
        orderBy('createdAt', 'asc'),
        limit(40) // Less messages for the mini floating panel
      );

      unsubMessages = onSnapshot(
        q,
        (snap) => {
          const list: ChatMessage[] = [];
          snap.forEach((docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              list.push({
                id: docSnap.id,
                text: data.text || '',
                senderId: data.senderId || '',
                senderName: data.senderName || '',
                senderRole: data.senderRole || '',
                createdAt: data.createdAt,
                isAnnouncement: data.isAnnouncement || false,
              });
            }
          });

          setMessages(list);

          // Handle notifications and badge
          if (!isFirstLoad.current) {
            if (list.length > prevMessagesCount.current) {
              const lastMsg = list[list.length - 1];
              if (lastMsg.senderId !== userProfile.uid) {
                if (!isOpen) {
                  setUnreadCount((prev) => prev + 1);
                }
                if (!isMuted) {
                  notificationAudio.play().catch(() => {});
                }
              }
            }
          } else {
            isFirstLoad.current = false;
          }
          prevMessagesCount.current = list.length;
        },
        (err) => console.warn('Floating widget subscription error:', err)
      );
    });

    return () => unsubMessages();
  }, [enabled, userProfile, isOpen, isMuted, notificationAudio]);

  // Scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setUnreadCount(0); // Clear badge on open
    }
  }, [isOpen, messages]);

  if (!enabled || !userProfile) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !db) return;

    const text = inputText.trim();
    setInputText('');

    try {
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      await addDoc(collection(db, 'messages'), {
        text,
        senderId: userProfile.uid,
        senderName: userProfile.displayName || userProfile.username || 'مجهول',
        senderRole: userProfile.role || 'secretary',
        createdAt: serverTimestamp(),
        isAnnouncement: false,
      });
    } catch (err) {
      console.error('Failed to send from floating chat:', err);
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/30';
      case 'doctor':
        return 'bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-[#45dee7] border-teal-200 dark:border-teal-500/30';
      default:
        return 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30';
    }
  };

  const getRoleLabel = (role: string) => {
    if (isRTL) {
      if (role === 'admin') return 'مدير';
      if (role === 'doctor') return 'طبيب';
      return 'سكرتارية';
    }
    return role;
  };

  return (
    <div className={`fixed bottom-6 z-50 flex flex-col items-end gap-3 ${isRTL ? 'left-6' : 'right-6'}`}>
      
      {/* Mini Chat Window */}
      {isOpen && (
        <div className="w-[340px] sm:w-[380px] h-[480px] bg-white dark:bg-[#0d172a] shadow-2xl border border-slate-200 dark:border-white/10 rounded-3xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-white/5 bg-slate-50/80 dark:bg-[#080e1b]/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <div>
                <h3 className="text-xs font-bold text-slate-800 dark:text-white">
                  {isRTL ? 'الدردشة السريعة لطاقم العيادة' : 'Staff Instant Chat'}
                </h3>
                <p className="text-[10px] text-slate-500">
                  {isRTL ? 'غرفة محادثة آمنة ومزامنة' : 'Secure staff sync room'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Expand to Full Screen */}
              <button
                onClick={() => {
                  onNavigate('internal-chat');
                  setIsOpen(false);
                }}
                className="p-1.5 rounded-lg hover:bg-slate-200/50 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 cursor-pointer"
                title={isRTL ? 'توسيع بكامل الشاشة' : 'Expand full screen'}
              >
                <span className="material-symbols-outlined text-sm block">open_in_full</span>
              </button>

              {/* Mute Audio */}
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`p-1.5 rounded-lg hover:bg-slate-200/50 dark:hover:bg-white/5 cursor-pointer ${
                  isMuted ? 'text-rose-500' : 'text-slate-500'
                }`}
                title={isMuted ? (isRTL ? 'تشغيل الصوت' : 'Unmute') : (isRTL ? 'كتم الصوت' : 'Mute')}
              >
                <span className="material-symbols-outlined text-sm block">
                  {isMuted ? 'volume_off' : 'volume_up'}
                </span>
              </button>

              {/* Close Widget Window */}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-200/50 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm block">close</span>
              </button>
            </div>
          </div>

          {/* Messages Log area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50/40 dark:bg-[#0b111e]/40">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-4">
                <span className="material-symbols-outlined text-3xl">chat</span>
                <p className="text-[11px] font-bold mt-1 text-slate-500">
                  {isRTL ? 'لا توجد رسائل سابقة.' : 'No messages yet.'}
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === userProfile.uid;
                const formattedTime = msg.createdAt?.seconds 
                  ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                  : 'الآن';

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[85%] ${
                      isMe ? (isRTL ? 'mr-auto items-start' : 'ml-auto items-end') : (isRTL ? 'ml-auto items-end' : 'mr-auto items-start')
                    }`}
                  >
                    <div className={`flex items-center gap-1 mb-0.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 truncate max-w-[80px]">
                        {msg.senderName}
                      </span>
                      <span className={`text-[8px] font-bold px-1 rounded border uppercase shrink-0 ${getRoleBadgeStyle(msg.senderRole)}`}>
                        {getRoleLabel(msg.senderRole)}
                      </span>
                    </div>

                    <div
                      className={`p-2.5 rounded-xl border text-xs shadow-sm whitespace-pre-wrap break-all ${
                        msg.isAnnouncement
                          ? 'bg-amber-500/10 text-slate-800 dark:text-white border-amber-500/30 font-bold'
                          : isMe
                          ? 'bg-slate-100 dark:bg-[#1a253d] text-slate-800 dark:text-slate-100 border-slate-200/60 dark:border-white/5'
                          : 'bg-white dark:bg-[#111a2e] text-slate-800 dark:text-slate-100 border-slate-200/60 dark:border-white/5'
                      } ${
                        isMe 
                          ? (isRTL ? 'rounded-tl-none' : 'rounded-tr-none') 
                          : (isRTL ? 'rounded-tr-none' : 'rounded-tl-none')
                      }`}
                    >
                      <p className="leading-normal">{msg.text}</p>
                      <span className="block text-[8px] text-slate-400 text-left mt-1 font-mono">
                        {formattedTime}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form input footer */}
          <form
            onSubmit={handleSend}
            className="p-3 border-t border-slate-100 dark:border-white/5 bg-slate-50/80 dark:bg-[#080e1b]/80"
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={isRTL ? 'اكتب رسالة سريعة...' : 'Quick reply...'}
                className="flex-1 px-3 py-2.5 rounded-xl bg-white dark:bg-[#111a2e] text-slate-800 dark:text-white border border-slate-200 dark:border-white/10 text-xs focus:outline-none focus:ring-1 focus:ring-[#00c2cb] transition-all font-medium"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="p-2.5 rounded-xl bg-[#00c2cb] text-white flex items-center justify-center cursor-pointer transition-transform active:scale-95 disabled:opacity-45 disabled:cursor-not-allowed shrink-0"
              >
                <span className={`material-symbols-outlined text-sm ${isRTL ? 'rotate-180' : ''}`}>send</span>
              </button>
            </div>
          </form>

        </div>
      )}

      {/* Floating Button Bubble */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-14 h-14 rounded-2xl bg-[#00c2cb] hover:bg-[#00adb5] text-white flex items-center justify-center shadow-xl hover:shadow-[#00c2cb]/30 transition-all hover:scale-105 active:scale-95 cursor-pointer z-50 border border-[#00c2cb]/10"
        title={isRTL ? 'الدردشة السريعة' : 'Quick Chat'}
      >
        {/* Pulsing red notification badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white dark:border-[#0b1324] animate-bounce shrink-0 min-w-[20px] text-center">
            {unreadCount}
          </span>
        )}
        <span className="material-symbols-outlined text-2xl">
          {isOpen ? 'close_fullscreen' : 'forum'}
        </span>
      </button>

    </div>
  );
};
