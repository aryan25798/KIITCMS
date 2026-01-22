// src/features/chat/VirtualAssistantChatbot.jsx
import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, Send, X, Loader2, Mic, MicOff, Volume2, Square, 
  Sparkles, Paperclip, Trash2, StopCircle, PlayCircle 
} from 'lucide-react';
import { geminiConfig } from '../../config';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(geminiConfig.apiKey);

const VirtualAssistantChatbot = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([
    { 
      role: 'model', 
      content: "Hello! I'm your AI Campus Assistant. I can help with complaints, schedules, or even analyze images of campus notices. How can I help?" 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  // Image Upload State
  const [attachment, setAttachment] = useState(null); 
  const fileInputRef = useRef(null);

  const messagesEndRef = useRef(null);
  const chatWindowRef = useRef(null);

  // --- RESPONSIVE & DRAG STATE ---
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  
  const dragStartPos = useRef({ x: 0, y: 0 });
  const initialPos = useRef({ x: 0, y: 0 });
  const initialSize = useRef({ width: 0, height: 0 });

  const [position, setPosition] = useState({
    x: window.innerWidth - 420,
    y: window.innerHeight - 650
  });
  const [dimensions, setDimensions] = useState({ width: 380, height: 550 });
  const minWidth = 320;
  const minHeight = 450;

  // --- TTS STATE (Per Message) ---
  const [speakingIndex, setSpeakingIndex] = useState(null); // Track which message is playing
  const [selectedVoice, setSelectedVoice] = useState(null);

  // Handle Resize Listener
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize TTS Voices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const preferred = voices.find(v => /en-US/i.test(v.lang) && /female/i.test(v.name)) || voices[0];
        setSelectedVoice(preferred);
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  // --- TOGGLE SPEECH FUNCTION ---
  const toggleSpeech = (text, index) => {
    if (!window.speechSynthesis) return;

    // If clicking the currently speaking message, STOP it.
    if (speakingIndex === index) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
      return;
    }

    // Stop any previous speech
    window.speechSynthesis.cancel();

    // Start new speech
    const utterance = new SpeechSynthesisUtterance(text);
    if (selectedVoice) utterance.voice = selectedVoice;
    
    utterance.onstart = () => setSpeakingIndex(index);
    utterance.onend = () => setSpeakingIndex(null);
    utterance.onerror = () => setSpeakingIndex(null);

    window.speechSynthesis.speak(utterance);
  };

  // Stop speech when closing chat
  useEffect(() => {
    if (!isOpen) {
      window.speechSynthesis?.cancel();
      setSpeakingIndex(null);
    }
  }, [isOpen]);

  // --- FILE HANDLING ---
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File size too large. Please upload an image under 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        setAttachment({ file, previewUrl: e.target.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const clearAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const fileToGenerativePart = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve({
        inlineData: {
          data: reader.result.split(',')[1],
          mimeType: file.type,
        },
      });
      reader.readAsDataURL(file);
    });
  };

  // --- SEND MESSAGE ---
  const sendMessage = async () => {
    if (!input.trim() && !attachment) return;

    const userMsg = { role: 'user', content: input, image: attachment?.previewUrl };
    setMessages(p => [...p, userMsg]);
    setInput('');
    const currentAttachment = attachment;
    clearAttachment();
    setIsLoading(true);

    // Stop any ongoing speech when sending a new message
    window.speechSynthesis?.cancel();
    setSpeakingIndex(null);

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const parts = [];
      if (currentAttachment) {
        const imagePart = await fileToGenerativePart(currentAttachment.file);
        parts.push(imagePart);
      }
      if (input) parts.push({ text: input });

      const portalInfo = `You are a helpful AI assistant for KIIT Smart Campus. Be concise.`;
      
      const result = await model.generateContent([portalInfo, ...parts]);
      const text = result.response.text();
      
      setMessages(p => [...p, { role: 'model', content: text }]);
      // NOTE: Auto-speak removed as requested
    } catch (err) {
      console.error(err);
      setMessages(p => [...p, { role: 'model', content: "I encountered an error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- DRAG HANDLERS ---
  const handleDragStart = (e) => {
    if (isMobile) return;
    setIsDragging(true);
    const clientX = e.clientX || e.touches?.[0].clientX;
    const clientY = e.clientY || e.touches?.[0].clientY;
    if (chatWindowRef.current) {
        initialPos.current = { x: chatWindowRef.current.offsetLeft, y: chatWindowRef.current.offsetTop };
        dragStartPos.current = { x: clientX, y: clientY };
    }
  };

  const handleResizeStart = (e) => {
    if (isMobile) return;
    e.stopPropagation();
    setIsResizing(true);
    const clientX = e.clientX || e.touches?.[0].clientX;
    const clientY = e.clientY || e.touches?.[0].clientY;
    initialSize.current = { width: chatWindowRef.current.offsetWidth, height: chatWindowRef.current.offsetHeight };
    dragStartPos.current = { x: clientX, y: clientY };
  };

  const handleMove = (e) => {
    if (isMobile || (!isDragging && !isResizing)) return;
    const clientX = e.clientX || e.touches?.[0].clientX;
    const clientY = e.clientY || e.touches?.[0].clientY;
    const deltaX = clientX - dragStartPos.current.x;
    const deltaY = clientY - dragStartPos.current.y;

    if (isDragging) {
      setPosition({ x: initialPos.current.x + deltaX, y: initialPos.current.y + deltaY });
    } else {
      setDimensions({ 
        width: Math.max(initialSize.current.width + deltaX, minWidth), 
        height: Math.max(initialSize.current.height + deltaY, minHeight) 
      });
    }
  };

  const handleEnd = () => { setIsDragging(false); setIsResizing(false); };

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('touchend', handleEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, isResizing]);

  const startListening = () => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.lang = 'en-US';
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onresult = (e) => setInput(e.results[0][0].transcript);
      recognition.start();
    }
  };

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isLoading, attachment]);

  if (!isOpen) return null;

  const windowStyles = isMobile 
    ? { position: 'fixed', inset: 0, width: '100%', height: '100%', borderRadius: 0 }
    : { width: dimensions.width, height: dimensions.height, left: position.x, top: position.y };

  return (
    <div
      ref={chatWindowRef}
      className={`fixed z-[100] flex flex-col overflow-hidden bg-[#0F172A]/95 backdrop-blur-xl border-white/10 shadow-2xl transition-all duration-200 ${!isMobile ? 'rounded-2xl border ring-1 ring-white/5' : ''}`}
      style={windowStyles}
    >
      {/* --- HEADER --- */}
      <div
        className={`flex items-center justify-between px-4 py-3 bg-[#0B0F19]/95 border-b border-white/5 select-none ${!isMobile ? 'cursor-move' : ''}`}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
      >
        <div className="flex items-center gap-3">
            <div className="relative">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full absolute -top-0.5 -right-0.5 ring-2 ring-[#0B0F19] z-10"></div>
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                  <Bot className="text-cyan-400" size={20} />
                </div>
            </div>
            <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  Gemini AI <Sparkles size={12} className="text-yellow-400" />
                </h3>
                <p className="text-[10px] text-slate-400 font-medium tracking-wider">CAMPUS ASSISTANT</p>
            </div>
        </div>

        <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
            <X size={20} />
        </button>
      </div>

      {/* --- MESSAGES AREA --- */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gradient-to-b from-[#0F172A]/50 to-[#0B0F19]/50 scrollbar-hide">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              
              {/* Image Preview in Message */}
              {msg.image && (
                <div className="mb-2 overflow-hidden rounded-2xl border border-white/10 shadow-lg">
                  <img src={msg.image} alt="Upload" className="max-w-full h-auto max-h-48 object-cover" />
                </div>
              )}

              {/* Message Bubble */}
              <div className={`
                relative px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm group
                ${msg.role === 'user' 
                  ? 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white rounded-br-none' 
                  : 'bg-slate-800/80 border border-white/5 text-slate-200 rounded-bl-none pr-10'}
              `}>
                {msg.content}

                {/* --- SPEAKER BUTTON (Only for Bot Messages) --- */}
                {msg.role === 'model' && (
                  <button 
                    onClick={() => toggleSpeech(msg.content, idx)}
                    className="absolute bottom-2 right-2 p-1 text-slate-400 hover:text-cyan-400 transition-colors opacity-70 hover:opacity-100"
                    title={speakingIndex === idx ? "Stop Reading" : "Read Aloud"}
                  >
                    {speakingIndex === idx ? (
                      <div className="relative">
                        <span className="absolute inset-0 rounded-full bg-cyan-400/20 animate-ping"></span>
                        <Square size={14} fill="currentColor" />
                      </div>
                    ) : (
                      <Volume2 size={16} />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-800/50 border border-white/5 px-4 py-3 rounded-2xl rounded-bl-none flex items-center gap-2.5">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span className="text-xs text-slate-400 font-medium animate-pulse">Analyzing...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* --- FOOTER INPUT --- */}
      <div className="p-3 bg-[#0B0F19] border-t border-white/5">
        
        {/* Attachment Preview */}
        {attachment && (
            <div className="flex items-center gap-3 mb-3 px-3 py-2 bg-slate-900/80 rounded-xl border border-white/10">
                <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-white/10">
                    <img src={attachment.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-300 truncate font-medium">{attachment.file.name}</p>
                    <p className="text-[10px] text-slate-500">{(attachment.file.size / 1024).toFixed(0)}KB</p>
                </div>
                <button onClick={clearAttachment} className="p-1.5 hover:bg-white/10 rounded-full text-slate-400 hover:text-red-400 transition-colors">
                    <Trash2 size={16} />
                </button>
            </div>
        )}

        <div className="flex items-end gap-2 bg-slate-900/50 border border-white/10 rounded-2xl p-1.5 focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/20 transition-all">
            
            {/* File Upload */}
            <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept="image/*" 
                onChange={handleFileSelect} 
            />
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                title="Upload Image"
            >
                <Paperclip size={20} />
            </button>

            {/* Input Field */}
            <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                }}
                placeholder="Ask anything..."
                className="flex-1 bg-transparent text-white text-sm placeholder-slate-500 resize-none py-3 focus:outline-none max-h-24 custom-scrollbar"
                rows={1}
                style={{ minHeight: '44px' }}
            />

            {/* Mic / Send Button */}
            {input.trim() || attachment ? (
                <button
                    onClick={sendMessage}
                    disabled={isLoading}
                    className="p-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl shadow-lg shadow-cyan-900/20 transition-all active:scale-95"
                >
                    <Send size={18} fill="currentColor" />
                </button>
            ) : (
                <button 
                    onClick={startListening}
                    className={`p-2.5 rounded-xl transition-all ${isListening ? 'bg-red-500/20 text-red-500 animate-pulse' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                    {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
            )}
        </div>
      </div>

      {/* Resize Handle (Desktop Only) */}
      {!isMobile && (
        <div 
            className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize z-50 flex items-end justify-end p-1 opacity-40 hover:opacity-100"
            onMouseDown={handleResizeStart}
        >
            <div className="w-1.5 h-1.5 bg-slate-500 rounded-full mb-0.5 mr-0.5" />
        </div>
      )}
    </div>
  );
};

export default VirtualAssistantChatbot;