// src/features/chat/VirtualAssistantChatbot.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Loader2, Mic, MicOff, Volume2, VolumeX, Square } from 'lucide-react';
import { geminiConfig } from '../../config';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API client directly
const genAI = new GoogleGenerativeAI(geminiConfig.apiKey);

const VirtualAssistantChatbot = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([
    { role: 'model', content: "Hello! I'm your AI campus assistant. How can I help you with your academic queries or questions about the portal?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);

  // States for draggable and resizable modal
  const chatWindowRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const initialPos = useRef({ x: 0, y: 0 });
  const initialSize = useRef({ width: 0, height: 0 });
  const [position, setPosition] = useState({
    x: typeof window !== 'undefined' ? window.innerWidth - 450 : 0,
    y: typeof window !== 'undefined' ? window.innerHeight - 600 : 0
  });
  const [dimensions, setDimensions] = useState({ width: 384, height: 500 });

  const minWidth = 300;
  const minHeight = 400;

  // -------------------- TTS (Speech Output) --------------------
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [voices, setVoices] = useState([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const [rate, setRate] = useState(1);   // 0.1 - 10
  const [pitch, setPitch] = useState(1); // 0 - 2
  const [volume, setVolume] = useState(1); // 0 - 1

  // Load available voices (some browsers populate asynchronously)
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const synth = window.speechSynthesis;

    const loadVoices = () => {
      const v = synth.getVoices();
      if (v && v.length) {
        setVoices(v);
        // Select a default English voice if available
        if (!selectedVoiceURI) {
          const preferred =
            v.find(voice => /en-US/i.test(voice.lang) && /female/i.test(voice.name)) ||
            v.find(voice => /en-US/i.test(voice.lang)) ||
            v[0];
          if (preferred) setSelectedVoiceURI(preferred.voiceURI);
        }
      }
    };

    loadVoices();

    // Some browsers fire this when voices are loaded
    synth.onvoiceschanged = loadVoices;

    // Fallback: retry a few times if voices list is initially empty
    let tries = 0;
    const iv = setInterval(() => {
      if (voices.length === 0 && tries < 10) {
        loadVoices();
        tries += 1;
      } else {
        clearInterval(iv);
      }
    }, 300);

    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper to speak text
  const speakText = (text) => {
    if (!ttsEnabled) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (!text || !text.trim()) return;

    try {
      const synth = window.speechSynthesis;
      // Cancel any current utterances before starting a new one
      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;

      const voice = voices.find(v => v.voiceURI === selectedVoiceURI);
      if (voice) utterance.voice = voice;

      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);

      synth.speak(utterance);
    } catch (e) {
      // Fail silently to avoid breaking chat
      console.warn('Speech synthesis failed:', e);
    }
  };

  const stopSpeaking = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  // Speak initial greeting on mount if TTS enabled
  useEffect(() => {
    if (ttsEnabled && messages.length === 1 && messages[0].role === 'model') {
      speakText(messages[0].content);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ttsEnabled]);

  // -------------------- Prompt Context --------------------
  const portalInfo = `
    The KIIT Smart Campus portal has the following features:
    - Complaints: Students can file and track complaints. Admins and departments can view and manage them.
    - Marketplace: Students can buy and sell items within campus.
    - Lost & Found: Students can report and find lost items.
    - Mentorship: Students can connect with mentors.
    - Leave: Students can apply for hostel leave.
    - Timetable: Students can view their timetable.
    - News: Students can view latest news related to academics and placements.
  `;

  const academicPrompt = `
    You are an AI assistant for a university student portal. Your primary function is to answer questions related to academics and the features of this portal.

    If a user asks about general knowledge or topics unrelated to the portal or academics, politely state that you can only assist with academic and portal-related questions.

    Here is some information about the portal's features:
    ${portalInfo}

    User: "${input}"
  `;

  // -------------------- Web Speech API (Speech-to-Text) --------------------
  const recognition = useRef(null);
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      recognition.current = new window.webkitSpeechRecognition();
      recognition.current.continuous = false;
      recognition.current.interimResults = false;
      recognition.current.lang = 'en-US';

      recognition.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognition.current.onend = () => {
        setIsListening(false);
      };

      recognition.current.onerror = (event) => {
        console.error('Speech recognition error', event);
        setIsListening(false);
      };
    }
  }, []);

  const startListening = () => {
    if (recognition.current) {
      setIsListening(true);
      recognition.current.start();
    }
  };

  // -------------------- Send Message --------------------
  const sendMessage = async () => {
    if (input.trim() === '') return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });
      const result = await model.generateContent(academicPrompt + input);
      const response = await result.response;
      const text = response.text();
      const botResponse = { role: 'model', content: text };
      setMessages(prev => [...prev, botResponse]);

      // Speak the bot's response (keeps other functionality intact)
      speakText(text);
    } catch (error) {
      console.error("Gemini API error:", error);
      const errorText = "Sorry, I'm having trouble connecting right now. Please try again later.";
      const errorMessage = { role: 'model', content: errorText };
      setMessages(prev => [...prev, errorMessage]);
      speakText(errorText);
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------- Keyboard Send --------------------
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // -------------------- Auto-scroll --------------------
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // -------------------- Drag & Resize --------------------
  const handleDragStart = (e) => {
    e.preventDefault();
    setIsDragging(true);
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    if (chatWindowRef.current) {
      initialPos.current = {
        x: chatWindowRef.current.offsetLeft,
        y: chatWindowRef.current.offsetTop
      };
      dragStartPos.current = { x: clientX, y: clientY };
    }
  };

  const handleResizeStart = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    if (chatWindowRef.current) {
      initialSize.current = {
        width: chatWindowRef.current.offsetWidth,
        height: chatWindowRef.current.offsetHeight
      };
      dragStartPos.current = { x: clientX, y: clientY };
    }
  };

  const handleDragOrResize = (e) => {
    if (!chatWindowRef.current || (!isDragging && !isResizing)) return;

    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    if (isDragging) {
      const newX = initialPos.current.x + (clientX - dragStartPos.current.x);
      const newY = initialPos.current.y + (clientY - dragStartPos.current.y);
      chatWindowRef.current.style.left = `${newX}px`;
      chatWindowRef.current.style.top = `${newY}px`;
    } else if (isResizing) {
      const newWidth = initialSize.current.width + (clientX - dragStartPos.current.x);
      const newHeight = initialSize.current.height + (clientY - dragStartPos.current.y);
      chatWindowRef.current.style.width = `${Math.max(newWidth, minWidth)}px`;
      chatWindowRef.current.style.height = `${Math.max(newHeight, minHeight)}px`;
    }
  };

  const handleDragOrResizeEnd = () => {
    if (isDragging || isResizing) {
      if (isDragging) {
        setPosition({
          x: chatWindowRef.current.offsetLeft,
          y: chatWindowRef.current.offsetTop
        });
      }
      if (isResizing) {
        setDimensions({
          width: chatWindowRef.current.offsetWidth,
          height: chatWindowRef.current.offsetHeight
        });
      }
    }
    setIsResizing(false);
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleDragOrResize);
      document.addEventListener('mouseup', handleDragOrResizeEnd);
      document.addEventListener('touchmove', handleDragOrResize);
      document.addEventListener('touchend', handleDragOrResizeEnd);
    }
    return () => {
      document.removeEventListener('mousemove', handleDragOrResize);
      document.removeEventListener('mouseup', handleDragOrResizeEnd);
      document.removeEventListener('touchmove', handleDragOrResize);
      document.removeEventListener('touchend', handleDragOrResizeEnd);
    };
  }, [isDragging, isResizing]);

  if (!isOpen) return null;

  return (
    <div
      ref={chatWindowRef}
      className="fixed z-[100] flex flex-col shadow-2xl rounded-2xl transition-all duration-300 touch-none bg-slate-900 overflow-hidden"
      style={{
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        left: `${position.x}px`,
        top: `${position.y}px`,
        // NOTE: Inline styles don't support @media. Keeping as-is to avoid changing current functionality.
      }}
    >
      <div className="w-full h-full flex flex-col shadow-lg border border-slate-700/70 overflow-hidden">
        {/* Header (drag handle) */}
        <div
          className={`flex items-center justify-between p-4 bg-slate-950 border-b border-cyan-500/20 shadow-md cursor-grab ${isDragging ? 'cursor-grabbing' : ''}`}
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
        >
          <div className="flex items-center gap-3 text-white">
            <Bot size={24} className="text-cyan-400" />
            <h3 className="text-lg font-bold">AI Campus Assistant</h3>
          </div>

          {/* TTS quick controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTtsEnabled(prev => !prev)}
              className={`p-2 rounded-lg transition-colors ${ttsEnabled ? 'bg-cyan-700 text-white' : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
              title={ttsEnabled ? 'Disable speech' : 'Enable speech'}
            >
              {ttsEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
            <button
              onClick={stopSpeaking}
              disabled={!speaking}
              className="p-2 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-50"
              title="Stop speech"
            >
              <Square size={20} />
            </button>

            <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide bg-slate-800">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`p-3 rounded-xl max-w-[80%] whitespace-pre-wrap leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-cyan-600/70 text-white rounded-br-none shadow-md'
                    : 'bg-slate-700/70 text-slate-200 rounded-bl-none shadow-md'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-700/70 text-slate-200 p-3 rounded-xl rounded-bl-none max-w-[80%] flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                <span className="text-sm">Typing...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Composer */}
        <div className="p-4 border-t border-slate-700 bg-slate-950 flex items-center gap-2">
          {/* Microphone (STT) */}
          <button
            onClick={startListening}
            disabled={isLoading || isListening}
            className={`p-3 rounded-lg transition-colors ${isListening ? 'bg-red-600 text-white' : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
            title={isListening ? 'Listening...' : 'Dictate your question'}
          >
            {isListening ? <MicOff size={24} className="animate-pulse" /> : <Mic size={24} />}
          </button>

          <textarea
            className="flex-1 resize-none bg-slate-700/50 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all placeholder-slate-400"
            rows="1"
            placeholder="Ask me anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          <button
            onClick={sendMessage}
            disabled={isLoading || input.trim() === ''}
            className="p-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors disabled:bg-slate-600"
            title="Send"
          >
            <Send size={24} />
          </button>
        </div>
      </div>

      {/* Resizable handle */}
      <div
        className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize z-50 bg-transparent"
        onMouseDown={handleResizeStart}
        onTouchStart={handleResizeStart}
      />

      {/* Optional: compact TTS settings panel (hidden by default to avoid UI changes).
          If you want a visible selector, you can uncomment below. It won't affect core behavior. */}
      {/* <div className="absolute left-2 bottom-16 bg-slate-900/90 border border-slate-700 rounded-lg p-2 text-xs text-slate-300 space-y-2">
        <div className="flex items-center gap-2">
          <label className="whitespace-nowrap">Voice:</label>
          <select
            className="bg-slate-800 border border-slate-700 rounded p-1 text-slate-200"
            value={selectedVoiceURI}
            onChange={(e) => setSelectedVoiceURI(e.target.value)}
          >
            {voices.map(v => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label>Rate</label>
          <input type="range" min="0.5" max="2" step="0.1" value={rate} onChange={(e)=>setRate(parseFloat(e.target.value))}/>
        </div>
        <div className="flex items-center gap-2">
          <label>Pitch</label>
          <input type="range" min="0" max="2" step="0.1" value={pitch} onChange={(e)=>setPitch(parseFloat(e.target.value))}/>
        </div>
        <div className="flex items-center gap-2">
          <label>Volume</label>
          <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(e)=>setVolume(parseFloat(e.target.value))}/>
        </div>
      </div> */}
    </div>
  );
};

export default VirtualAssistantChatbot;
