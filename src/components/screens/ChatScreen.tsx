import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../../services/firebase';
import { usePermissions } from '../../context/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { ROLE_LABELS, Role } from '../../permissions';

interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  createdAt: any; // Firestore Timestamp
  isAnnouncement?: boolean;
}

interface StaffUser {
  id: string;
  displayName: string;
  email: string;
  role: Role;
  active: boolean;
}

export const ChatScreen: React.FC = () => {
  const { userProfile } = usePermissions();
  const { language, t, isRTL } = useLanguage();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [inputText, setInputText] = useState('');
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [floatingChatEnabled, setFloatingChatEnabled] = useState(() => {
    return localStorage.getItem('soli_enable_floating_chat') !== 'false';
  });
  const [loading, setLoading] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesCount = useRef(0);

  // Audio object for notification sound
  const notificationAudio = useMemo(() => {
    return new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav');
  }, []);

  // 1. Fetch Staff Directory from Firestore 'users' collection
  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    let unsubUsers = () => {};
    import('firebase/firestore').then(({ collection, onSnapshot, query, where }) => {
      const q = query(collection(db, 'users'), where('active', '==', true));
      unsubUsers = onSnapshot(
        q,
        (snap) => {
          const list: StaffUser[] = [];
          snap.forEach((docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              list.push({
                id: docSnap.id,
                displayName: data.displayName || 'مستخدم العيادة',
                email: data.email || '',
                role: data.role || 'secretary',
                active: data.active ?? true,
              });
            }
          });
          setUsers(list);
        },
        (err) => console.warn('Public Chat User Directory Fetch Error:', err)
      );
    });

    return () => unsubUsers();
  }, []);

  // 2. Fetch Chat Messages from Firestore 'messages' collection in real-time
  const [fallbackEventToggle, setFallbackEventToggle] = useState(false);

  useEffect(() => {
    const handleFallbackUpdate = () => {
      setFallbackEventToggle((prev) => !prev);
    };
    window.addEventListener('soli_new_fallback_message', handleFallbackUpdate);
    window.addEventListener('storage', handleFallbackUpdate);
    return () => {
      window.removeEventListener('soli_new_fallback_message', handleFallbackUpdate);
      window.removeEventListener('storage', handleFallbackUpdate);
    };
  }, []);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    let unsubMessages = () => {};
    import('firebase/firestore').then(({ collection, onSnapshot, query, orderBy, limit }) => {
      const q = query(
        collection(db, 'messages'),
        orderBy('createdAt', 'asc'),
        limit(150)
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
          
          // Merge with fallback messages
          const fallbackList = JSON.parse(localStorage.getItem('soli_fallback_messages') || '[]');
          const combined = [...list, ...fallbackList];
          
          const uniqueMap = new Map<string, ChatMessage>();
          combined.forEach((m) => {
            const key = m.id || `${m.senderId}-${m.text}-${m.createdAt?.seconds}`;
            uniqueMap.set(key, m);
          });
          
          const sorted = Array.from(uniqueMap.values()).sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeA - timeB;
          });

          setMessages(sorted);
          setLoading(false);

          // Play sound notification on new incoming message from someone else
          if (
            soundEnabled &&
            sorted.length > prevMessagesCount.current &&
            prevMessagesCount.current > 0
          ) {
            const lastMsg = sorted[sorted.length - 1];
            if (lastMsg.senderId !== userProfile?.uid) {
              notificationAudio.play().catch(() => {});
            }
          }
          prevMessagesCount.current = sorted.length;
        },
        (err) => {
          console.warn('Real-time Chat subscription failed:', err);
          
          // Render only fallback if firestore subscription is completely blocked
          const fallbackList = JSON.parse(localStorage.getItem('soli_fallback_messages') || '[]');
          setMessages(fallbackList);
          setLoading(false);
        }
      );
    });

    return () => unsubMessages();
  }, [soundEnabled, userProfile?.uid, notificationAudio, fallbackEventToggle]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !userProfile) return;

    const messageContent = inputText.trim();
    const announcementFlag = isAnnouncement;
    setInputText('');
    setIsAnnouncement(false);

    try {
      if (!db) throw new Error('No DB connection');
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      await addDoc(collection(db, 'messages'), {
        text: messageContent,
        senderId: userProfile.uid,
        senderName: userProfile.displayName || userProfile.username || 'مجهول',
        senderRole: userProfile.role || 'secretary',
        createdAt: serverTimestamp(),
        isAnnouncement: announcementFlag,
      });
    } catch (err) {
      console.warn('Firestore chat write failed, fallback to local storage:', err);
      
      const fallbackMsg = {
        id: `msg-fallback-${Date.now()}-${Math.random()}`,
        text: messageContent,
        senderId: userProfile.uid,
        senderName: userProfile.displayName || userProfile.username || 'مجهول',
        senderRole: userProfile.role || 'secretary',
        createdAt: { seconds: Math.floor(Date.now() / 1000) },
        isAnnouncement: announcementFlag,
      };

      const existing = JSON.parse(localStorage.getItem('soli_fallback_messages') || '[]');
      existing.push(fallbackMsg);
      localStorage.setItem('soli_fallback_messages', JSON.stringify(existing));
      window.dispatchEvent(new Event('soli_new_fallback_message'));
    }
  };

  // Handle Delete Message (Admins or original sender can delete)
  const handleDeleteMessage = async (msgId: string) => {
    // 1. Try deleting from Firestore
    let deletedFromFirestore = false;
    if (db) {
      try {
        const { doc, deleteDoc } = await import('firebase/firestore');
        await deleteDoc(doc(db, 'messages', msgId));
        deletedFromFirestore = true;
      } catch (err) {
        console.warn('Could not delete from firestore, check permission or connectivity:', err);
      }
    }

    // 2. Also delete from local fallback storage
    const fallbackList = JSON.parse(localStorage.getItem('soli_fallback_messages') || '[]');
    const filtered = fallbackList.filter((m: any) => m.id !== msgId);
    if (filtered.length !== fallbackList.length) {
      localStorage.setItem('soli_fallback_messages', JSON.stringify(filtered));
      window.dispatchEvent(new Event('soli_new_fallback_message'));
    }
  };

  // Filter messages based on search query
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase();
    return messages.filter(
      (m) =>
        m.text.toLowerCase().includes(q) ||
        m.senderName.toLowerCase().includes(q)
    );
  }, [messages, searchQuery]);

  // Separate regular and announcement messages
  const announcements = useMemo(() => {
    return messages.filter((m) => m.isAnnouncement);
  }, [messages]);

  const roleLabelsAr: Record<Role, string> = {
    admin: 'مدير النظام',
    doctor: 'الطبيب المعالج',
    secretary: 'سكرتارية العيادة',
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

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-5rem)] bg-slate-50 dark:bg-[#0b1324] rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm">
      
      {/* Right Column (Left in LTR): Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#0d172a] h-full">
        
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-[#080e1b]/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00c2cb]/10 border border-[#00c2cb]/20 flex items-center justify-center text-[#00c2cb]">
              <span className="material-symbols-outlined text-2xl">forum</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white">
                {isRTL ? 'غرفة المحادثة المشتركة' : 'Staff Discussion Room'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isRTL
                  ? `يتصل الآن ${users.length} من طاقم العمل`
                  : `${users.length} staff members online`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Search input inside header */}
            <div className="relative hidden md:block w-48 lg:w-64">
              <span className="material-symbols-outlined text-slate-400 absolute right-3 top-2.5 text-base">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isRTL ? 'بحث في الرسائل...' : 'Search messages...'}
                className="w-full pl-3 pr-9 py-1.5 rounded-xl text-xs bg-slate-100 dark:bg-[#111a2e] text-slate-800 dark:text-white border border-slate-200 dark:border-white/5 focus:outline-none focus:border-[#00c2cb] focus:ring-1 focus:ring-[#00c2cb] transition-all"
              />
            </div>

            {/* Sound Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                soundEnabled
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-400 border-slate-200 dark:border-white/5'
              }`}
              title={soundEnabled ? 'إيقاف صوت الإشعارات' : 'تشغيل صوت الإشعارات'}
            >
              <span className="material-symbols-outlined text-base block">
                {soundEnabled ? 'volume_up' : 'volume_off'}
              </span>
            </button>

            {/* Floating Widget Toggle */}
            <button
              onClick={() => {
                const newVal = !floatingChatEnabled;
                setFloatingChatEnabled(newVal);
                localStorage.setItem('soli_enable_floating_chat', String(newVal));
                window.dispatchEvent(new Event('soli_floating_chat_settings_changed'));
              }}
              className={`p-2 px-3 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
                floatingChatEnabled
                  ? 'bg-cyan-50 dark:bg-cyan-500/10 text-[#00c2cb] border-cyan-200 dark:border-[#00c2cb]/20'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-400 border-slate-200 dark:border-white/5'
              }`}
              title={floatingChatEnabled ? 'تعطيل أيقونة الدردشة العائمة' : 'تمكين أيقونة الدردشة العائمة'}
            >
              <span className="material-symbols-outlined text-base block">
                {floatingChatEnabled ? 'chat' : 'chat_bubble_outline'}
              </span>
              <span>
                {isRTL ? 'الدردشة العائمة' : 'Floating Chat'}
              </span>
            </button>
          </div>
        </div>

        {/* Announcements Pin Bar (Shows if there are any active announcements) */}
        {announcements.length > 0 && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 flex items-start gap-2.5 shrink-0">
            <span className="material-symbols-outlined text-amber-500 text-lg mt-0.5 shrink-0 animate-pulse">
              campaign
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                {isRTL ? 'إعلانات وتوجيهات هامة من الإدارة' : 'Important Notice'}
              </p>
              <div className="max-h-12 overflow-y-auto mt-0.5">
                {announcements.map((ann) => (
                  <div key={ann.id} className="text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between gap-2 border-b border-amber-500/10 py-1 last:border-none">
                    <span className="font-medium break-all">
                      <strong className="text-amber-600 dark:text-amber-400">[{ann.senderName}]:</strong> {ann.text}
                    </span>
                    {(userProfile?.role === 'admin' || userProfile?.uid === ann.senderId) && (
                      <button
                        onClick={() => handleDeleteMessage(ann.id)}
                        className="text-rose-400 hover:text-rose-600 shrink-0 p-0.5"
                      >
                        <span className="material-symbols-outlined text-xs">close</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 bg-slate-50/30 dark:bg-[#0b111e]/30">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-2">
                <div className="w-8 h-8 border-4 border-[#00c2cb] border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs text-slate-500">{isRTL ? 'جاري الاتصال بقناة الدردشة المشفرة...' : 'Connecting to secure channel...'}</p>
              </div>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
              <span className="material-symbols-outlined text-5xl">chat_bubble</span>
              <p className="text-xs font-bold text-slate-500">
                {searchQuery ? (isRTL ? 'لا توجد رسائل مطابقة لنتائج البحث' : 'No matching messages found') : (isRTL ? 'لا توجد رسائل سابقة. ابدأ المحادثة الآن!' : 'No previous messages. Start the chat!')}
              </p>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const isMe = msg.senderId === userProfile?.uid;
              const formattedTime = msg.createdAt?.seconds 
                ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                : 'الآن';

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col max-w-[85%] md:max-w-[70%] ${
                    isMe ? (isRTL ? 'mr-auto items-start' : 'ml-auto items-end') : (isRTL ? 'ml-auto items-end' : 'mr-auto items-start')
                  }`}
                >
                  {/* Sender Metadata Block */}
                  <div className={`flex items-center gap-1.5 mb-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {msg.senderName}
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${getRoleBadgeStyle(msg.senderRole)}`}>
                      {isRTL ? roleLabelsAr[msg.senderRole as Role] || msg.senderRole : ROLE_LABELS[msg.senderRole as Role] || msg.senderRole}
                    </span>
                  </div>

                  {/* Chat bubble body */}
                  <div
                    className={`relative p-3.5 rounded-2xl border shadow-sm transition-all text-sm group ${
                      msg.isAnnouncement
                        ? 'bg-amber-500/10 text-slate-800 dark:text-white border-amber-500/30'
                        : isMe
                        ? 'bg-slate-100 dark:bg-[#1a253d] text-slate-800 dark:text-slate-100 border-slate-200 dark:border-white/5'
                        : 'bg-white dark:bg-[#111a2e] text-slate-800 dark:text-slate-100 border-slate-200 dark:border-white/5'
                    } ${
                      isMe 
                        ? (isRTL ? 'rounded-tl-none' : 'rounded-tr-none') 
                        : (isRTL ? 'rounded-tr-none' : 'rounded-tl-none')
                    }`}
                  >
                    {/* Delete Message Button for owner or admin */}
                    {(userProfile?.role === 'admin' || isMe) && (
                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        className={`absolute -top-2.5 -left-2.5 w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-500 border border-rose-200 dark:border-rose-500/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-105 active:scale-95 cursor-pointer`}
                        title="حذف الرسالة"
                      >
                        <span className="material-symbols-outlined text-xs font-bold">delete</span>
                      </button>
                    )}

                    <p className="break-words leading-relaxed font-medium whitespace-pre-wrap">{msg.text}</p>
                    
                    {/* Timestamp metadata */}
                    <div className="flex items-center justify-end gap-1 mt-1.5 text-[9px] text-slate-400 font-mono">
                      {msg.isAnnouncement && (
                        <span className="material-symbols-outlined text-[10px] text-amber-500 font-bold shrink-0">
                          campaign
                        </span>
                      )}
                      <span>{formattedTime}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Form */}
        <form
          onSubmit={handleSendMessage}
          className="p-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#080e1b]/50 shrink-0"
        >
          <div className="flex flex-col gap-2.5">
            {/* Admin only announcement selector toggle */}
            {userProfile?.role === 'admin' && (
              <div className="flex items-center gap-2">
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isAnnouncement}
                    onChange={(e) => setIsAnnouncement(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-7 h-4 bg-slate-300 dark:bg-slate-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-amber-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-500"></div>
                  <span className="mr-2 text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">campaign</span>
                    <span>نشر كإعلان هام مثبت لجميع الموظفين</span>
                  </span>
                </label>
              </div>
            )}

            {/* Input and send button row */}
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  isAnnouncement
                    ? (isRTL ? 'اكتب الإعلان الهام لتثبيته...' : 'Type the announcement to pin...')
                    : (isRTL ? 'اكتب رسالتك لزملائك في طاقم العيادة...' : 'Type your message...')
                }
                className="flex-1 px-4 py-3.5 rounded-2xl bg-white dark:bg-[#111a2e] text-slate-800 dark:text-white border border-slate-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c2cb] transition-all font-medium"
              />

              <button
                type="submit"
                disabled={!inputText.trim()}
                className="px-5 py-3.5 rounded-2xl bg-[#00c2cb] hover:bg-[#00adb5] text-white font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-sm shadow-md shadow-[#00c2cb]/10"
              >
                <span>{isRTL ? 'إرسال' : 'Send'}</span>
                <span className={`material-symbols-outlined text-base ${isRTL ? 'rotate-180' : ''}`}>send</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Left Column (Right in LTR): Connected Staff Directory */}
      <div className="w-full lg:w-72 bg-slate-50 dark:bg-[#080e1b] border-t lg:border-t-0 lg:border-r border-slate-200 dark:border-white/5 flex flex-col h-72 lg:h-full shrink-0">
        <div className="p-4.5 border-b border-slate-200 dark:border-white/5 flex items-center gap-2 bg-slate-100/50 dark:bg-slate-950/20">
          <span className="material-symbols-outlined text-[#00c2cb]">group</span>
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {isRTL ? 'دليل الطاقم الفعال' : 'Active Staff Directory'}
          </h3>
          <span className="mr-auto ml-0 text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#00c2cb]/10 text-[#00c2cb] font-bold">
            {users.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {users.map((usr) => (
            <div
              key={usr.id}
              className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${
                usr.id === userProfile?.uid
                  ? 'bg-[#00c2cb]/10 border border-[#00c2cb]/20'
                  : 'hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent'
              }`}
            >
              {/* Profile Avatar circle with role initials */}
              <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-[#111a2e] border border-slate-300 dark:border-white/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-[#00c2cb]">
                  {usr.displayName.substring(0, 1).toUpperCase()}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {usr.displayName}
                  </h4>
                  {usr.id === userProfile?.uid && (
                    <span className="text-[8px] px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                      {isRTL ? 'أنت' : 'You'}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full bg-emerald-500`}></span>
                  <span>{isRTL ? roleLabelsAr[usr.role] || usr.role : ROLE_LABELS[usr.role] || usr.role}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
    </div>
  );
};
