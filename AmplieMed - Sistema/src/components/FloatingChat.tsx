import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { IoChatbubbleEllipsesOutline, IoClose, IoSend, IoChevronBack, IoMegaphoneOutline, IoPeopleOutline, IoAddCircleOutline, IoSearchOutline, IoRefreshOutline, IoWarningOutline, IoAttachOutline, IoDocumentTextOutline, IoImageOutline, IoVideocamOutline, IoVolumeHighOutline, IoEllipsisVertical, IoTrashOutline, IoPencilOutline, IoHappyOutline, IoCheckmarkDoneOutline } from 'react-icons/io5';
import { getSupabase } from '../utils/supabaseClient';
import { useApp } from './AppContext';
import { toastSuccess, toastError, toastInfo, toastWarning } from '../utils/toastService';

interface Chat {
  id: string;
  user1_id: string;
  user2_id: string;
  updated_at: string;
  fixada_em?: string;
  silenciada_em?: string;
}

interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  read_at: string | null;
  status?: 'sending' | 'sent' | 'failed';
  editada?: boolean;
  deletada?: boolean;
  arquivo_url?: string;
  arquivo_tipo?: string;
  arquivo_nome_original?: string;
  arquivo_tamanho?: number;
  arquivo_storage_path?: string;
}

interface BroadcastMessage {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface Reaction {
  id: string;
  mensagem_id: string;
  usuario_id: string;
  emoji: string;
}

interface ChatUser {
  id: string;  // auth UUID from profiles table
  name: string;
  role: string;
  specialty?: string;
}

const COMMON_EMOJIS = ['👍', '❤️', '😂', '🎉', '🤔', '👀'];

const FloatingChat: React.FC = () => {
  const { currentUser } = useApp();
  const userEmail = currentUser?.email;
  const [isOpen, setIsOpen] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | 'broadcast' | null>(null);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const [showNewChatDropdown, setShowNewChatDropdown] = useState(false);

  // States
  const [myId, setMyId] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [limit, setLimit] = useState(50);
  
  // Confirms
  const [showBroadcastConfirm, setShowBroadcastConfirm] = useState(false);
  const [broadcastDraft, setBroadcastDraft] = useState("");

  // Edit/Delete
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [showMenuForMsgId, setShowMenuForMsgId] = useState<string | null>(null);

  // File Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Presence and Typing
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);

  const channelsRef = useRef<any[]>([]);
  const presenceChannelRef = useRef<any>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const attemptReconnect = useCallback(() => {
    setIsConnected(false);
    setTimeout(() => {
       const supabase = getSupabase();
       if (supabase) {
          setIsConnected(true);
          toastSuccess("Conexão restabelecida");
       }
    }, 4000);
  }, []);

  const playNotificationSound = useCallback(() => {
    try { const audio = new Audio("data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq"); audio.volume = 0.5; audio.play().catch(() => {}); } catch(e) {}
  }, []);

  useEffect(() => {
    let mounted = true;

    async function init() {
      setIsLoading(true);
      try {
        const supabase = getSupabase();
        
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        if (authError || !session?.user?.id) throw new Error("Usuário não autenticado");
        
        const uid = session.user.id;
        if (mounted) setMyId(uid);

        // Load chat-eligible users from profiles table (auth UUIDs)
        try {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, name, role, specialty')
            .neq('id', uid)
            .eq('status', 'active');
          if (profilesError) {
            console.error('[Chat] Profiles query error (RLS?):', profilesError.message);
          }
          if (profilesData && mounted) {
            console.log(`[Chat] Loaded ${profilesData.length} chat users from profiles`);
            setChatUsers(profilesData as ChatUser[]);
          }
        } catch (profileErr) {
          console.error('[Chat] Failed to load profiles:', profileErr);
        }

        const { data: chatData, error: chatError } = await supabase.from('chats').select('*').or(`user1_id.eq.${uid},user2_id.eq.${uid}`).order('updated_at', { ascending: false });
        if (chatError) throw chatError;

        if (chatData && mounted) {
          setChats(chatData);
          if (chatData.length > 0) {
            const chatIds = chatData.map((c) => c.id);
            const { data: msgData, error: msgError } = await supabase.from('messages').select('*').in('chat_id', chatIds).order('created_at', { ascending: false }).limit(200);
            if (msgError) throw msgError;

            if (msgData && mounted) setMessages(msgData.reverse().map(m => ({ ...m, status: 'sent' } as Message)));
            
            // Teria que fazer paginaçāo robusta, mas limitamos 200 mensagens globais e carregamos as reações correspondentes
            const msgIds = (msgData || []).map(m => m.id);
            if (msgIds.length > 0) {
              const { data: reactData } = await supabase.from('reacoes_mensagens').select('*').in('mensagem_id', msgIds);
              if (reactData && mounted) setReactions(reactData);
            }
          }
        }

        const { data: bcData } = await supabase.from('broadcast_messages').select('*').order('created_at', { ascending: true }).limit(50);
        if (bcData && mounted) setBroadcasts(bcData);

        // SUBSCRIPTIONS
        const chatsSub = supabase.channel('chats-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, payload => {
            if (!mounted) return;
            const updatedChat = payload.new as Chat;
            if (updatedChat.user1_id === uid || updatedChat.user2_id === uid) {
               setChats(prev => [updatedChat, ...prev.filter(c => c.id !== updatedChat.id)].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
            }
          }).subscribe((s) => { if(s === 'CLOSED' || s === 'CHANNEL_ERROR') attemptReconnect(); });

        const msgsSub = supabase.channel('messages-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, payload => {
            if (!mounted) return;
            const msg = payload.new as Message;
            msg.status = 'sent';
            
            if (payload.eventType === 'INSERT') {
               setMessages(prev => prev.find(m => m.id === msg.id) ? prev.map(m => m.id === msg.id ? msg : m) : [...prev, msg]);
               if (msg.sender_id !== uid) playNotificationSound();
            } else if (payload.eventType === 'UPDATE') {
               setMessages(prev => prev.map(m => m.id === msg.id ? { ...msg, status: 'sent' } : m));
            }
          }).subscribe();

        const reactsSub = supabase.channel('reactions-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'reacoes_mensagens' }, payload => {
             if (!mounted) return;
             if (payload.eventType === 'INSERT') setReactions(prev => [...prev, payload.new as Reaction]);
             else if (payload.eventType === 'DELETE') setReactions(prev => prev.filter(r => r.id !== payload.old.id));
          }).subscribe();

        const broadcastsSub = supabase.channel('broadcasts-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'broadcast_messages' }, payload => {
            if (!mounted) return;
            if (payload.eventType === 'INSERT') {
              setBroadcasts(prev => [...prev, payload.new as BroadcastMessage]);
              if ((payload.new as BroadcastMessage).sender_id !== uid) { playNotificationSound(); toastInfo("📣 Transmissão Geral", { description: (payload.new as BroadcastMessage).content }); }
            }
          }).subscribe();

        // PRESENCE
        const presenceSub = supabase.channel('chat-presence', { config: { presence: { key: uid } } });
        presenceSub.on('presence', { event: 'sync' }, () => {
           if (!mounted) return;
           const newState = presenceSub.presenceState();
           const onlineKeys = new Set(Object.keys(newState));
           setOnlineUsers(onlineKeys);
        }).on('broadcast', { event: 'typing' }, payload => {
            if (payload.payload && mounted) {
               const { chat_id, user_id, isTyping } = payload.payload;
               if (user_id !== uid) setTypingUsers(prev => ({ ...prev, [chat_id]: isTyping ? user_id : '' }));
            }
        }).subscribe(async (status) => {
           if (status === 'SUBSCRIBED') await presenceSub.track({ online_at: new Date().toISOString() });
        });
        presenceChannelRef.current = presenceSub;

        channelsRef.current = [chatsSub, msgsSub, reactsSub, broadcastsSub];
        setIsConnected(true);
      } catch (err) {
        setIsConnected(false);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    init();
    return () => {
      mounted = false;
      const supabase = getSupabase();
      channelsRef.current.forEach(ch => supabase.removeChannel(ch));
      if (presenceChannelRef.current) supabase.removeChannel(presenceChannelRef.current);
    };
  }, [attemptReconnect, playNotificationSound, userEmail]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
       if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
          e.preventDefault(); setIsOpen(p => !p);
       }
       if (e.key === 'Escape' && isOpen) {
          if (editingMessageId) setEditingMessageId(null);
          else if (showBroadcastConfirm) setShowBroadcastConfirm(false);
          else if (showNewChatDropdown) setShowNewChatDropdown(false);
          else if (activeChatId) setActiveChatId(null);
          else setIsOpen(false);
       }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeChatId, showNewChatDropdown, showBroadcastConfirm, editingMessageId]);

  const handleTyping = () => {
     if (!activeChatId || activeChatId === 'broadcast' || !presenceChannelRef.current) return;
     presenceChannelRef.current.send({ type: 'broadcast', event: 'typing', payload: { chat_id: activeChatId, user_id: myId, isTyping: true } });
     if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
     typingTimeoutRef.current = setTimeout(() => presenceChannelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { chat_id: activeChatId, user_id: myId, isTyping: false } }), 2000);
  };

  useEffect(() => {
    if (!myId) return;
    setUnreadCount(messages.filter(m => m.sender_id !== myId && !m.is_read).length);
  }, [messages, myId]);

  useEffect(() => {
    if (!myId || !activeChatId || activeChatId === 'broadcast') return;
    const unreadMsgs = messages.filter(m => m.chat_id === activeChatId && m.sender_id !== myId && !m.is_read);
    if (unreadMsgs.length > 0) {
      const supabase = getSupabase();
      const markAsRead = async () => {
        const ids = unreadMsgs.map(m => m.id);
        setMessages(prev => prev.map(m => ids.includes(m.id) ? { ...m, is_read: true, read_at: new Date().toISOString() } : m));
        await supabase.from('messages').update({ is_read: true, read_at: new Date().toISOString() }).in('id', ids);
      };
      markAsRead();
    }
  }, [messages, activeChatId, myId]);

  useEffect(() => {
    if (activeChatId && messagesEndRef.current && !editingMessageId) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, broadcasts, activeChatId, typingUsers, isOpen, editingMessageId]);

  useEffect(() => {
     if (activeChatId && inputRef.current) setTimeout(() => inputRef.current?.focus(), 300);
  }, [activeChatId]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) { setActiveChatId(null); setShowNewChatDropdown(false); setShowBroadcastConfirm(false); setSearchTerm(""); setEditingMessageId(null); setPendingFile(null); }
  };

  const handleOpenChat = (id: string | 'broadcast') => {
    setActiveChatId(id); setShowNewChatDropdown(false); setSearchTerm(""); setLimit(50); setEditingMessageId(null); setPendingFile(null);
  };

  const handleBackToList = () => { setActiveChatId(null); setShowNewChatDropdown(false); setEditingMessageId(null); setPendingFile(null); };

  const confirmBroadcast = (e?: React.FormEvent) => {
     if (e) e.preventDefault();
     if (!inputText.trim()) return;
     if (inputText.length > 5000) { toastError("Mensagem muito longa."); return; }
     setBroadcastDraft(inputText.trim()); setShowBroadcastConfirm(true);
  };

  const executeSendBroadcast = async () => {
     if (!myId || !isConnected) return;
     const text = broadcastDraft;
     setInputText(""); setShowBroadcastConfirm(false); setBroadcastDraft("");
     const { error } = await getSupabase().from('broadcast_messages').insert([{ sender_id: myId, content: text }]);
     if (error) toastError("Erro ao enviar transmissão"); else toastSuccess("Transmissão enviada!");
  };

  const startEditMessage = (msg: Message) => {
      setEditingMessageId(msg.id);
      setInputText(msg.content);
      setShowMenuForMsgId(null);
      if (inputRef.current) inputRef.current.focus();
  };

  const cancelEdit = () => {
      setEditingMessageId(null);
      setInputText("");
  };

  const deleteMessage = async (msgId: string) => {
      if (!window.confirm("Deseja realmente remover esta mensagem para todos?")) return;
      setShowMenuForMsgId(null);
      // Soft Delete
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, deletada: true } : m));
      const { error } = await getSupabase().from('messages').update({ deletada: true, deletada_em: new Date().toISOString() }).eq('id', msgId);
      if (error) toastError("Falha ao deletar mensagem.");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const file = e.target.files[0];
          if (file.size > 10 * 1024 * 1024) { toastError("Arquivo muito grande (Máx 10MB)"); return; }
          setPendingFile(file);
      }
  };

  const uploadFile = async (file: File, chatId: string): Promise<Partial<Message> | null> => {
     try {
         setIsUploading(true);
         const fileExt = file.name.split('.').pop();
         const fileName = `${myId}_${Date.now()}.${fileExt}`;
         const storagePath = `${chatId}/${fileName}`;
         
         const supabase = getSupabase();
         const { error: uploadError } = await supabase.storage.from('chat_attachments').upload(storagePath, file);
         if (uploadError) throw uploadError;

         const { data: { publicUrl } } = supabase.storage.from('chat_attachments').getPublicUrl(storagePath);
         
         let tipo = 'document';
         if (file.type.startsWith('image/')) tipo = 'image';
         else if (file.type.startsWith('audio/')) tipo = 'audio';
         else if (file.type.startsWith('video/')) tipo = 'video';

         return {
             arquivo_url: publicUrl,
             arquivo_nome_original: file.name,
             arquivo_tamanho: file.size,
             arquivo_tipo: tipo,
             arquivo_storage_path: storagePath
         };
     } catch (e) {
         toastError("Falha no upload do arquivo.");
         return null;
     } finally {
         setIsUploading(false);
         setPendingFile(null);
     }
  };

  const reactToMessage = async (msgId: string, emoji: string) => {
      if (!myId) return;
      const existing = reactions.find(r => r.mensagem_id === msgId && r.usuario_id === myId && r.emoji === emoji);
      const supabase = getSupabase();
      
      if (existing) {
          // Remover reação
          setReactions(prev => prev.filter(r => r.id !== existing.id));
          await supabase.from('reacoes_mensagens').delete().eq('id', existing.id);
      } else {
          // Adicionar
          const tempId = crypto.randomUUID();
          setReactions(prev => [...prev, { id: tempId, mensagem_id: msgId, usuario_id: myId, emoji }]);
          await supabase.from('reacoes_mensagens').insert([{ mensagem_id: msgId, usuario_id: myId, emoji }]);
      }
      setShowMenuForMsgId(null);
  };

  const handleSendMessage = async (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e && 'preventDefault' in e) e.preventDefault();
    if ((!inputText.trim() && !pendingFile) || !myId || !isConnected) {
       if (!isConnected) toastWarning("Aguarde a conexão.");
       return;
    }
    
    if (activeChatId === 'broadcast') { confirmBroadcast(); return; }

    const text = inputText.trim();
    setInputText("");

    // Editing mode
    if (editingMessageId) {
        const msgId = editingMessageId;
        setEditingMessageId(null);
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: text, editada: true } : m));
        await getSupabase().from('messages').update({ content: text, editada: true, editada_em: new Date().toISOString() }).eq('id', msgId);
        return;
    }

    if (presenceChannelRef.current && activeChatId) presenceChannelRef.current.send({ type: 'broadcast', event: 'typing', payload: { chat_id: activeChatId, user_id: myId, isTyping: false } });

    let attachmentData = null;
    if (pendingFile && activeChatId) {
        attachmentData = await uploadFile(pendingFile, activeChatId);
        if (!attachmentData && !text) return; // if file failed and no text, stop
    }

    const newMsgId = crypto.randomUUID();
    const tempMsg: Message = {
       id: newMsgId, chat_id: activeChatId!, sender_id: myId, content: text || "Anexo",
       created_at: new Date().toISOString(), is_read: false, read_at: null, status: 'sending',
       ...attachmentData
    };
    setMessages(prev => [...prev, tempMsg]);

    const { error } = await getSupabase().from('messages').insert([{
       id: newMsgId, chat_id: activeChatId, sender_id: myId, content: text || "Anexo", ...attachmentData
    }]);

    if (error) {
       toastError("Falha ao enviar.");
       setMessages(prev => prev.map(m => m.id === newMsgId ? { ...m, status: 'failed' } : m));
    } else {
       setMessages(prev => prev.map(m => m.id === newMsgId ? { ...m, status: 'sent' } : m));
    }
  };

  const handleRetryMessage = async (msg: Message) => {
     if (!isConnected) return;
     setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'sending' } : m));
     const { error } = await getSupabase().from('messages').insert([{
        id: msg.id, chat_id: msg.chat_id, sender_id: msg.sender_id, content: msg.content, created_at: msg.created_at, arquivo_url: msg.arquivo_url, arquivo_tipo: msg.arquivo_tipo, arquivo_nome_original: msg.arquivo_nome_original, arquivo_storage_path: msg.arquivo_storage_path, arquivo_tamanho: msg.arquivo_tamanho
     }]);

     if (error) {
        toastError("Falha na tentativa. Tente novamente.");
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'failed' } : m));
     } else {
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'sent' } : m));
     }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
     if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); activeChatId === 'broadcast' ? confirmBroadcast() : handleSendMessage(e); }
  };

  const getUserName = (id: string) => {
     if (id === myId) return currentUser?.name || "Você";
     const user = chatUsers.find(u => u.id === id);
     return user ? user.name : "Usuário Desconhecido";
  };

  const startNewChat = async (otherUserId: string) => {
     if (!myId || !isConnected) return;
     const existing = chats.find(c => (c.user1_id === myId && c.user2_id === otherUserId) || (c.user1_id === otherUserId && c.user2_id === myId));
     if (existing) { handleOpenChat(existing.id); return; }

     const supabase = getSupabase();
     const { data, error } = await supabase.from('chats').insert([{ user1_id: myId, user2_id: otherUserId }]).select().single();
     if (error) toastError("Erro ao iniciar a conversa");
     else if (data) { setChats(prev => [data, ...prev]); handleOpenChat(data.id); }
  };

  const isAdminOrDoctor = currentUser?.role === 'admin' || currentUser?.role === 'doctor';
  const isBroadcast = activeChatId === 'broadcast';
  const debounceSearchTerm = searchTerm.toLowerCase();

  const chatListItems = useMemo(() => {
    if (!myId) return [];
    let list = chats.map(chat => {
       const otherUserId = chat.user1_id === myId ? chat.user2_id : chat.user1_id;
       const name = getUserName(otherUserId);
       const chatMessages = messages.filter(m => m.chat_id === chat.id);
       const lastMessage = chatMessages.length > 0 ? chatMessages[chatMessages.length - 1] : null;
       const unreadItemCount = chatMessages.filter(m => m.sender_id !== myId && !m.is_read).length;
       const isOnline = onlineUsers.has(otherUserId);
       return { id: chat.id, otherUserId, name, lastMessage, updatedAt: new Date(chat.updated_at), unreadCount: unreadItemCount, isOnline };
    });

    if (debounceSearchTerm) list = list.filter(c => c.name.toLowerCase().includes(debounceSearchTerm));
    return list.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }, [chats, messages, chatUsers, myId, debounceSearchTerm, currentUser, onlineUsers]);

  const availableUsersToChat = chatUsers.filter(u => u.id !== myId && u.id);

  const formatTime = (isoString?: string) => isoString ? new Date(isoString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : "";
  const formatDateLabel = (isoString?: string) => {
     if (!isoString) return "";
     const d = new Date(isoString), today = new Date(), yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
     if (d.toDateString() === today.toDateString()) return "Hoje às " + formatTime(isoString);
     if (d.toDateString() === yesterday.toDateString()) return "Ontem às " + formatTime(isoString);
     return d.toLocaleDateString('pt-BR') + " " + formatTime(isoString);
  };
  const handleScrollToLoadMore = () => { if (chatScrollRef.current && chatScrollRef.current.scrollTop === 0) setLimit(prev => prev + 50); };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
     setInputText(e.target.value); handleTyping(); e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const renderMessageContent = (msg: Message) => {
     if (msg.deletada) return <i className="text-gray-400 text-xs italic">[Esta mensagem foi removida]</i>;
     
     return (
       <div className="flex flex-col">
         {msg.arquivo_url && (
            <div className="mb-2 max-w-full">
               {msg.arquivo_tipo === 'image' ? (
                  <a href={msg.arquivo_url} target="_blank" rel="noreferrer" className="block max-w-[200px] overflow-hidden rounded-lg bg-black/10">
                     <img src={msg.arquivo_url} alt="anexo" className="w-full h-auto object-cover max-h-[150px]" loading="lazy" />
                  </a>
               ) : (
                  <a href={msg.arquivo_url} download target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 bg-black/5 rounded-lg text-[11px] font-medium hover:bg-black/10 transition">
                     <IoDocumentTextOutline size={18} />
                     <span className="truncate max-w-[120px]">{msg.arquivo_nome_original}</span>
                  </a>
               )}
            </div>
         )}
         {msg.content !== "Anexo" && <p className="text-[13px] leading-[1.45] whitespace-pre-wrap break-words">{msg.content}</p>}
         {msg.editada && <span className="text-[9px] opacity-60 ml-1 inline-block">(editado)</span>}
       </div>
     );
  };

  const renderReactions = (msgId: string) => {
      const msgReacts = reactions.filter(r => r.mensagem_id === msgId);
      if (msgReacts.length === 0) return null;
      
      const counts: Record<string, { count: number; reactedByMe: boolean }> = {};
      msgReacts.forEach(r => {
          if (!counts[r.emoji]) counts[r.emoji] = { count: 0, reactedByMe: false };
          counts[r.emoji].count++;
          if (r.usuario_id === myId) counts[r.emoji].reactedByMe = true;
      });

      return (
         <div className="flex flex-wrap gap-1 mt-1 z-10 relative">
             {Object.entries(counts).map(([emoji, data]) => (
                 <button 
                    key={emoji} 
                    onClick={() => reactToMessage(msgId, emoji)}
                    className={`text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1 border border-transparent shadow-[0_1px_2px_rgba(0,0,0,0.1)] transition-colors
                       ${data.reactedByMe ? 'bg-pink-100 text-[#da1484] border-pink-200' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}
                    `}
                 >
                     <span>{emoji}</span><span>{data.count}</span>
                 </button>
             ))}
         </div>
      );
  };

  if (!currentUser) return null;

  return (
    <>
      <div 
         className={`fixed z-[9999] flex flex-col items-end pointer-events-none transition-all duration-300 ease-in-out ${isOpen ? 'inset-0 sm:inset-auto sm:bottom-6 sm:right-6 opacity-100' : 'bottom-6 right-6 opacity-80 hover:opacity-100'}`}
         ref={modalRef}
      >
        {isOpen && (
          <div 
            role="dialog" aria-label="Chat Interno"
            className="pointer-events-auto bg-[#fdfdfd] border-0 sm:border-[3px] border-[#da1484] sm:shadow-[-5px_5px_40px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col transition-transform duration-300 origin-bottom-right sm:rounded-2xl sm:mb-4
                       w-full h-[100dvh] sm:w-[420px] sm:h-[650px] animate-in slide-in-from-bottom-5 zoom-in-95"
          >
            {!isConnected && (
              <div className="bg-red-500 text-white text-xs py-1.5 px-3 flex items-center justify-center font-medium shadow-inner z-50">
                <IoWarningOutline className="mr-1.5" size={14}/> Sem conexão
              </div>
            )}

            {!activeChatId ? (
              <div className="flex flex-col h-full w-full relative bg-[#f5f5f5]">
                <div className="bg-[#da1484] p-4 flex justify-between items-center shrink-0 border-b border-[#c11275] sticky top-0 z-10">
                  <div className="flex items-center space-x-3">
                    <div className="bg-white/20 p-2 rounded-xl text-white"><IoChatbubbleEllipsesOutline size={22} /></div>
                    <h3 className="font-extrabold text-[18px] text-white tracking-tight">Clínica Chat</h3>
                  </div>
                  <button onClick={toggleChat} className="hover:bg-white/10 p-2 rounded-full transition-colors text-white focus:outline-none"><IoClose size={24} /></button>
                </div>

                <div className="p-4 bg-white border-b border-[#e8e8e8] flex flex-col shrink-0">
                  <div className="relative">
                     <IoSearchOutline className="absolute left-3.5 top-[11px] text-[#888888]" size={16}/>
                     <input type="text" placeholder="Buscar conexões..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-[#f4f4f4] border border-transparent focus:border-[#da1484]/30 focus:bg-white rounded-xl py-2 pl-10 pr-4 text-[13px] text-[#333333] outline-none transition-all placeholder-[#a0a0a0] font-medium" />
                  </div>
                </div>

                {showNewChatDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowNewChatDropdown(false)} />
                    <div className="absolute bottom-[90px] right-5 w-[280px] max-h-[300px] overflow-y-auto bg-white shadow-2xl rounded-2xl border border-gray-100 z-50 animate-in fade-in slide-in-from-bottom-5 origin-bottom-right">
                       <div className="sticky top-0 bg-gray-50/90 backdrop-blur px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-100 z-10">Equipe</div>
                       {availableUsersToChat.length === 0 ? <div className="p-6 text-center text-[13px] text-[#888888] font-medium">Nenhum colaborador disponível.</div> : availableUsersToChat.map(user => (
                           <button key={user.id} onClick={() => startNewChat(user.id)} className="w-full text-left p-3 hover:bg-[#fcf8fa] border-b border-gray-50 last:border-0 flex items-center gap-3 transition-colors relative z-10">
                            <div className="w-[42px] h-[42px] rounded-full bg-gradient-to-br from-[#da1484] to-[#f472b6] flex items-center justify-center shrink-0 shadow-inner relative text-white font-bold text-[16px]">{user.name.charAt(0).toUpperCase()}</div>
                            <div className="min-w-0 flex-1"><p className="text-[14px] font-extrabold text-[#333333] truncate">{user.name}</p><p className="text-[12px] font-medium text-[#888888] truncate">{user.specialty || user.role}</p></div>
                         </button>
                     ))}
                  </div>
                  </>
                )}

                <div className="flex-1 overflow-y-auto p-2 scroll-smooth">
                  {isLoading ? (
                     <div className="flex flex-col items-center justify-center h-full space-y-3 opacity-50"><div className="w-8 h-8 border-4 border-pink-100 border-t-[#da1484] rounded-full animate-spin"></div><p className="text-[13px] font-bold text-[#888888]">Carregando...</p></div>
                  ) : chatListItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6"><div className="bg-white p-5 rounded-3xl mb-4 shadow-sm border border-gray-100"><IoChatbubbleEllipsesOutline size={34} className="text-gray-200"/></div><p className="text-[#333333] font-extrabold text-[15px] mb-1">Caixa Vazia</p><p className="text-[#888888] text-[13px] font-medium max-w-[200px]">Nenhuma conversa ativa no momento.</p></div>
                  ) : chatListItems.map((chat) => (
                      <button key={chat.id} onClick={() => handleOpenChat(chat.id)} className={`w-full text-left p-3.5 mb-2 rounded-2xl transition-all flex items-center space-x-3.5 focus:outline-none focus:ring-2 focus:ring-[#da1484]/30 ${chat.unreadCount > 0 ? 'bg-white shadow-[0_5px_15px_rgba(218,20,132,0.08)] border border-pink-100' : 'bg-transparent border border-transparent hover:bg-white hover:border-gray-100 hover:shadow-sm'}`}>
                        <div className="w-[50px] h-[50px] rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shrink-0 relative border border-gray-100 shadow-inner">
                          {chat.unreadCount > 0 ? <div className="w-full h-full rounded-full bg-gradient-to-br from-[#da1484] to-[#f472b6] flex items-center justify-center shrink-0"><span className="text-white font-extrabold text-[18px]">{chat.name.charAt(0).toUpperCase()}</span></div> : <span className="text-[#888888] font-bold text-[18px]">{chat.name.charAt(0).toUpperCase()}</span>}
                          {chat.isOnline && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>}
                          {chat.unreadCount > 0 && <div className="absolute -top-1 -right-1 w-[22px] h-[22px] bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white shadow-sm ring-1 ring-black/5 animate-pulse">{chat.unreadCount > 9 ? '9+' : chat.unreadCount}</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline mb-0.5"><h4 className={`text-[15px] tracking-tight truncate ${chat.unreadCount > 0 ? 'font-extrabold text-[#da1484]' : 'font-bold text-[#333333]'}`}>{chat.name}</h4><span className={`text-[11px] whitespace-nowrap ml-2 font-medium ${chat.unreadCount > 0 ? 'text-[#da1484]' : 'text-[#a0a0a0]'}`}>{chat.lastMessage ? formatTime(chat.lastMessage.created_at) : ''}</span></div>
                          <p className={`text-[13px] truncate ${chat.unreadCount > 0 ? 'font-bold text-[#555]' : 'font-medium text-[#888888]'}`}>{chat.lastMessage ? (chat.lastMessage.deletada ? 'Removida' : chat.lastMessage.content) : <i className="opacity-70">Nova conversa iniciada</i>}</p>
                        </div>
                      </button>
                  ))}
                </div>

                {/* FAB Buttons */}
                <div className="absolute flex flex-col gap-3 z-30 transition-all duration-300 bottom-5 right-5">
                   {isAdminOrDoctor && (
                     <button onClick={() => handleOpenChat('broadcast')} title="Broadcast" className="w-[46px] h-[46px] rounded-full bg-white border-2 border-[#da1484] shadow-[0_4px_12px_rgba(218,20,132,0.15)] flex items-center justify-center text-[#da1484] hover:bg-pink-50 hover:scale-105 active:scale-95 transition-all focus:outline-none ring-offset-2 focus:ring-2 focus:ring-[#da1484]/50 group relative">
                        <IoMegaphoneOutline size={20} className="group-hover:animate-pulse" />
                        <span className="absolute right-14 bg-gray-800 text-white text-[11px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">Central Avisos</span>
                     </button>
                   )}
                   <button onClick={() => setShowNewChatDropdown(!showNewChatDropdown)} title="Nova Conversa" className="w-[54px] h-[54px] rounded-full bg-gradient-to-tr from-[#da1484] to-[#f472b6] shadow-[0_5px_15px_rgba(218,20,132,0.3)] flex items-center justify-center text-white hover:shadow-[0_8px_25px_rgba(218,20,132,0.4)] hover:scale-105 active:scale-95 transition-all focus:outline-none ring-offset-2 focus:ring-2 focus:ring-[#da1484]/50 group relative">
                      {showNewChatDropdown ? <IoClose size={26} className="transition-transform duration-300 rotate-90" /> : <IoAddCircleOutline size={28} className="transition-transform duration-300" />}
                      <span className="absolute right-16 bg-gray-800 text-white text-[11px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">{showNewChatDropdown ? 'Fechar' : 'Nova Conversa'}</span>
                   </button>
                </div>

              </div>
            ) : (
              // ÁREA DE CHAT (Conversa Aberta)
              <div className="flex flex-col h-full w-full bg-[#f5f5f5] relative">
                {/* Header Conversa */}
                <div className="bg-[#da1484] p-3 flex items-center shrink-0 shadow-[0_1px_5px_rgba(0,0,0,0.03)] z-20 border-b border-[#c11275]">
                  <button onClick={handleBackToList} className="mr-2 hover:bg-white/10 p-2 rounded-full transition-colors text-white"><IoChevronBack size={24} /></button>
                  <div className={`w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center mr-3 shrink-0 border border-white/20 font-bold text-[15px] relative`}>
                    {isBroadcast ? <IoMegaphoneOutline size={18} /> : chats.find(c => c.id === activeChatId) ? getUserName(chats.find(c => c.id === activeChatId)!.user1_id === myId ? chats.find(c => c.id === activeChatId)!.user2_id : chats.find(c => c.id === activeChatId)!.user1_id).charAt(0).toUpperCase() : '?'}
                    {!isBroadcast && onlineUsers.has(chats.find(c => c.id === activeChatId) ? (chats.find(c => c.id === activeChatId)!.user1_id === myId ? chats.find(c => c.id === activeChatId)!.user2_id : chats.find(c => c.id === activeChatId)!.user1_id) : '') && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border border-[#da1484] rounded-full"></div>}
                  </div>
                  <div className="flex-1 min-w-0 flex items-center justify-between">
                    <div className="flex flex-col">
                       <h3 className="font-extrabold text-[15px] text-white truncate tracking-tight">{isBroadcast ? 'Equipe AmplieMed' : chats.find(c => c.id === activeChatId) ? getUserName(chats.find(c => c.id === activeChatId)!.user1_id === myId ? chats.find(c => c.id === activeChatId)!.user2_id : chats.find(c => c.id === activeChatId)!.user1_id) : 'Chat'}</h3>
                       {typingUsers[activeChatId!] ? <span className="text-[11px] font-bold text-white/90 animate-pulse">digitando...</span> : <span className="text-[11px] font-semibold text-white/70">{isBroadcast ? 'Transmissão Oficial' : (onlineUsers.has(chats.find(c => c.id === activeChatId) ? (chats.find(c => c.id === activeChatId)!.user1_id === myId ? chats.find(c => c.id === activeChatId)!.user2_id : chats.find(c => c.id === activeChatId)!.user1_id) : '') ? 'Online' : 'Visto recentemente')}</span>}
                    </div>
                    <button onClick={toggleChat} className="hover:bg-white/10 p-2 rounded-full transition-colors shrink-0 text-white"><IoClose size={24} /></button>
                  </div>
                </div>

                {/* Área de Mensagens */}
                <div className="flex-1 overflow-y-auto p-4 bg-[#f5f5f5] flex flex-col space-y-4" ref={chatScrollRef} onScroll={handleScrollToLoadMore}>
                  {isBroadcast ? (
                    <div className="flex flex-col space-y-4 pb-4">
                       <div className="flex flex-col items-center justify-center text-center px-4 py-8 mb-4">
                         <div className="w-[72px] h-[72px] bg-white rounded-3xl flex items-center justify-center mb-4 shadow-sm border border-gray-100 text-[#da1484]"><IoPeopleOutline size={34} /></div>
                         <h4 className="font-black text-[#333333] text-[16px] mb-1">Central de Transmissões</h4>
                         <p className="text-[#888888] text-[13px] font-medium max-w-[260px]">Avisos enviados aqui serão notificados urgentemente para todos os membros da clínica.</p>
                       </div>
                       
                       {broadcasts.length === 0 ? <div className="text-center text-[#a0a0a0] text-[13px] font-medium font-italic">Nenhuma transmissão.</div> : broadcasts.slice(-limit).map((bc) => {
                          const isMe = bc.sender_id === myId;
                          return (
                            <div key={bc.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                              <div className="max-w-[85%] flex flex-col">
                                {!isMe && <div className="text-[11px] font-extrabold text-[#555] mb-1 ml-1">{getUserName(bc.sender_id)}</div>}
                                <div className={`px-4 py-3 rounded-2xl relative shadow-sm border ${isMe ? 'bg-[#da1484] border-[#da1484] text-white rounded-tr-[4px]' : 'bg-white border-[#e8e8e8] text-[#333333] rounded-tl-[4px]'}`}>
                                  <IoMegaphoneOutline size={14} className={`absolute top-4 ${isMe ? 'opacity-20 right-3' : 'text-gray-300 right-3'}`} />
                                  <p className="text-[14px] leading-relaxed whitespace-pre-wrap pr-6 font-medium">{bc.content}</p>
                                  <span className={`text-[10px] mt-2 block text-right font-bold ${isMe ? 'text-white/70' : 'text-[#a0a0a0]'}`}>{formatDateLabel(bc.created_at)}</span>
                                </div>
                              </div>
                            </div>
                          )
                       })}
                    </div>
                  ) : (
                    <>
                      {messages.filter(m => m.chat_id === activeChatId).length === 0 ? (
                        <div className="m-auto flex flex-col items-center justify-center p-6 text-center">
                           <div className="bg-white p-4 rounded-full mb-4 shadow-sm border border-gray-100"><IoChatbubbleEllipsesOutline size={34} className="text-pink-200"/></div>
                           <h4 className="text-[15px] font-extrabold text-[#333333] mb-1">Inicie aqui</h4>
                           <p className="text-[13px] font-medium text-[#888888] max-w-[220px]">Diga 'Olá'. Suas informações trafegam seguras.</p>
                        </div>
                      ) : (
                         messages.filter(m => m.chat_id === activeChatId).slice(-limit).map((msg) => {
                           const isMe = msg.sender_id === myId;
                           return (
                             <div key={msg.id} className={`flex w-full group ${isMe ? 'justify-end' : 'justify-start'}`}>
                               {!isMe && showMenuForMsgId === msg.id && (
                                 <div className="flex flex-row items-center justify-center mr-2 relative z-20">
                                   <div className="absolute top-0 flex space-x-1 bg-white border border-gray-200 shadow-md p-1 rounded-full">
                                      {COMMON_EMOJIS.map(emj => <button key={emj} className="hover:scale-125 transition-transform p-1 text-[16px]" onClick={() => reactToMessage(msg.id, emj)}>{emj}</button>)}
                                   </div>
                                 </div>
                               )}

                               <div className="relative group flex items-center">
                                 {isMe && !msg.deletada && (
                                   <button onClick={() => setShowMenuForMsgId(showMenuForMsgId === msg.id ? null : msg.id)} className="opacity-0 group-hover:opacity-100 p-1 mr-1 text-gray-400 hover:text-gray-600 transition-opacity"><IoEllipsisVertical size={16} /></button>
                                 )}

                                 <div className={`max-w-[280px] xs:max-w-[80%] px-4 py-3 rounded-3xl relative shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${isMe ? 'bg-gradient-to-br from-[#da1484] to-[#c11275] text-white rounded-br-sm' : 'bg-white border border-[#e8e8e8] text-[#333333] rounded-bl-sm'} ${msg.status === 'failed' ? 'opacity-80 border-red-300 border-2' : ''}`}>
                                   
                                   {isMe && showMenuForMsgId === msg.id && !msg.deletada && (
                                     <div className="absolute top-8 right-2 bg-white shadow-xl rounded-lg py-1 border border-gray-100 z-50 flex flex-col w-[120px]">
                                        <button onClick={() => startEditMessage(msg)} className="text-left px-4 py-2 text-[12px] font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"><IoPencilOutline/> Editar</button>
                                        <button onClick={() => deleteMessage(msg.id)} className="text-left px-4 py-2 text-[12px] font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"><IoTrashOutline/> Remover</button>
                                     </div>
                                   )}

                                   {renderMessageContent(msg)}
                                   {renderReactions(msg.id)}
                                   
                                   <div className={`text-[10px] mt-1.5 flex gap-1 justify-end items-center font-bold ${isMe ? 'text-white/60' : 'text-[#a0a0a0]'}`}>
                                     {formatTime(msg.created_at)}
                                     {isMe && (
                                       <span className="ml-1 text-[13px] flex items-center">
                                          {msg.status === 'sending' && <IoRefreshOutline className="animate-spin opacity-80" />}
                                          {msg.status === 'sent' && (msg.is_read ? <IoCheckmarkDoneOutline size={14} className="text-white"/> : <span className="opacity-80 font-normal">✓</span>)}
                                          {msg.status === 'failed' && <button onClick={() => handleRetryMessage(msg)} className="text-white hover:text-white underline decoration-dotted text-[10px] ml-1 uppercase">Tentar dnv</button>}
                                       </span>
                                     )}
                                   </div>
                                 </div>

                                 {!isMe && !msg.deletada && (
                                    <button onClick={() => setShowMenuForMsgId(showMenuForMsgId === msg.id ? null : msg.id)} className="opacity-0 group-hover:opacity-100 p-1 ml-1 text-gray-400 hover:text-gray-600 transition-opacity"><IoHappyOutline size={18} /></button>
                                 )}
                               </div>
                             </div>
                           );
                         })
                      )}
                    </>
                  )}
                  <div ref={messagesEndRef} className="h-4" />
                </div>

                {showBroadcastConfirm && (
                   <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-30 flex items-center justify-center p-6 animate-in fade-in zoom-in-95">
                      <div className="bg-white border flex flex-col border-[#e8e8e8] shadow-[0_20px_60px_rgba(218,20,132,0.1)] rounded-3xl p-6 w-full max-w-sm">
                         <div className="w-14 h-14 bg-pink-50 rounded-full flex items-center justify-center mb-5 self-center border-4 border-white shadow-sm"><IoMegaphoneOutline size={26} className="text-[#da1484]"/></div>
                         <h3 className="text-[18px] font-black text-[#333333] text-center mb-1">Impacto Geral</h3>
                         <p className="text-[13px] font-medium text-[#888888] text-center mb-5 leading-relaxed">Mensagem oficial para os <strong className="text-[#da1484] bg-pink-50 px-2 py-0.5 rounded-md">{chatUsers.length} profissionais</strong>.</p>
                         <div className="bg-[#f9f9f9] border border-[#e8e8e8] p-4 rounded-2xl text-[14px] font-medium text-[#555] mb-6 max-h-40 overflow-y-auto italic whitespace-pre-wrap">{broadcastDraft}</div>
                         <div className="flex gap-3">
                            <button onClick={() => setShowBroadcastConfirm(false)} className="flex-1 py-3 rounded-2xl text-[13px] font-bold text-[#555] bg-white border border-[#e8e8e8] hover:bg-gray-50 transition-colors">Cancelar</button>
                            <button onClick={executeSendBroadcast} className="flex-1 py-3 rounded-2xl text-[13px] font-bold text-white bg-gradient-to-r from-[#da1484] to-[#f472b6] shadow-md transition-all active:scale-95">Disparar</button>
                         </div>
                      </div>
                   </div>
                )}

                {/* Input Area */}
                {(!isBroadcast || isAdminOrDoctor) && (
                  <div className="bg-white border-t border-[#e8e8e8] shrink-0 p-3 pt-2 relative z-10 flex flex-col">
                    {editingMessageId && (
                       <div className="flex justify-between items-center bg-yellow-50 px-3 py-1.5 rounded-lg mb-2 border border-yellow-200/50">
                          <span className="text-[11px] font-bold text-yellow-700 flex items-center"><IoPencilOutline className="mr-1"/> Editando mensagem</span>
                          <button onClick={cancelEdit} className="text-yellow-700 hover:text-yellow-900"><IoClose size={16}/></button>
                       </div>
                    )}
                    
                    {pendingFile && (
                       <div className="flex items-center justify-between bg-[#f5f5f5] p-2 rounded-xl mb-2 border border-[#e8e8e8]">
                          <div className="flex items-center gap-2 overflow-hidden">
                             <div className="bg-[#da1484] text-white p-1.5 rounded-lg"><IoDocumentTextOutline size={16}/></div>
                             <span className="text-[12px] font-bold text-[#333333] truncate">{pendingFile.name}</span>
                             <span className="text-[10px] text-[#888888]">{(pendingFile.size / 1024 / 1024).toFixed(1)}MB</span>
                          </div>
                          <button onClick={() => setPendingFile(null)} className="p-1 hover:bg-gray-200 rounded-full"><IoClose size={14} className="text-[#555]"/></button>
                       </div>
                    )}

                    <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
                      {!editingMessageId && activeChatId !== 'broadcast' && (
                         <button type="button" onClick={() => fileInputRef.current?.click()} className="mb-[6px] p-2.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-[#da1484] transition-colors focus:outline-none"><IoAttachOutline size={22}/></button>
                      )}
                      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" />
                      
                      <textarea
                        ref={inputRef} value={inputText} rows={1} onChange={handleTextareaInput} onKeyDown={handleInputKeyDown} maxLength={5000}
                        placeholder={isBroadcast ? "Nova Transmissão Oficial..." : "Sua mensagem..."}
                        className="flex-1 bg-[#f5f5f5] text-[#333333] font-medium border border-[#e8e8e8] focus:border-[#da1484]/40 focus:bg-white rounded-2xl py-3 px-4 text-[14px] outline-none transition-all placeholder-[#a0a0a0] resize-none overflow-y-auto w-full mb-1"
                        style={{ minHeight: '46px', maxHeight: '140px' }}
                      />
                      <button type="submit" disabled={(!inputText.trim() && !pendingFile) || isUploading} aria-label="Enviar mensagem" className="w-[46px] h-[46px] mb-1 flex items-center justify-center shrink-0 disabled:opacity-40 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white hover:bg-[#c11275] focus:outline-none transition-all shadow-sm active:scale-95 bg-[#da1484] rounded-full">
                        {isUploading ? <IoRefreshOutline className="animate-spin" size={20}/> : <IoSend size={20} className="translate-x-[2px]" />}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Botão Flutuante (Launcher) */}
        {!isOpen && (
          <button onClick={toggleChat} aria-label="Abrir chat central (Atalho: Ctrl+Shift+C)" className="pointer-events-auto w-[68px] h-[68px] bg-gradient-to-br from-[#da1484] to-[#f472b6] rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(218,20,132,0.4)] transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-[0_15px_35px_rgba(218,20,132,0.5)] active:scale-95 focus:outline-none relative z-50 mb-1 mr-1 sm:mb-2 sm:mr-2">
            <IoChatbubbleEllipsesOutline size={30} className="text-white" />
            {unreadCount > 0 && <div className="absolute -top-1 -right-0 w-[26px] h-[26px] bg-red-500 text-white text-[11px] font-black flex items-center justify-center rounded-full border-[3px] border-white shadow-md transition-transform duration-300 transform scale-110">{unreadCount > 9 ? '9+' : unreadCount}</div>}
          </button>
        )}
      </div>
    </>
  );
};

export default FloatingChat;
