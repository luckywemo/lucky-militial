
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { decode, encode, decodeAudioData } from '../utils/audio-utils';

const VibeAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'bot', text: string, sources?: any[] }[]>([
    { role: 'bot', text: 'HQ to Lucky Militia. Comms Band Secured. Standing by for tactical intel.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const audioCtx = useRef<AudioContext | null>(null);
  const nextStartTime = useRef(0);
  const sources = useRef(new Set<AudioBufferSourceNode>());
  const liveSession = useRef<any>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const sendQuery = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let model = 'gemini-3-pro-preview';
      let tools: any[] = [];
      let toolConfig: any = undefined;

      if (userMsg.toLowerCase().includes('search') || userMsg.toLowerCase().includes('news') || userMsg.toLowerCase().includes('recent')) {
        model = 'gemini-3-flash-preview';
        tools = [{ googleSearch: {} }];
      } else if (userMsg.toLowerCase().includes('map') || userMsg.toLowerCase().includes('near') || userMsg.toLowerCase().includes('where')) {
        model = 'gemini-2.5-flash';
        tools = [{ googleMaps: {} }];
        const pos = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
        toolConfig = { retrievalConfig: { latLng: { latitude: pos.coords.latitude, longitude: pos.coords.longitude } } };
      }

      const response = await ai.models.generateContent({
        model,
        contents: userMsg,
        config: {
          systemInstruction: "You are the Lucky Militia Command AI. Use tactical military jargon. Be professional, direct, and concise. Your goal is to provide intel on battlefield conditions, operators, or equipment.",
          tools,
          toolConfig
        }
      });

      const grounding = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      setMessages(prev => [...prev, { 
        role: 'bot', 
        text: response.text || "COMM_SILENCE: SIGNAL LOSS DETECTED", 
        sources: grounding 
      }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'bot', text: "SECURE_FAIL: " + e.message }]);
    } finally {
      setLoading(false);
    }
  };

  const toggleLive = async () => {
    if (isLive) {
      if (liveSession.current) {
        liveSession.current.close();
        liveSession.current = null;
      }
      setIsLive(false);
      return;
    }

    setIsLive(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    if (!audioCtx.current) audioCtx.current = new AudioContext({ sampleRate: 24000 });

    const sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks: {
        onopen: () => console.log('Primary Link Active'),
        onmessage: async (message: LiveServerMessage) => {
          const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (base64EncodedAudioString && audioCtx.current) {
            nextStartTime.current = Math.max(nextStartTime.current, audioCtx.current.currentTime);
            const audioBuffer = await decodeAudioData(decode(base64EncodedAudioString), audioCtx.current, 24000, 1);
            const source = audioCtx.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioCtx.current.destination);
            source.addEventListener('ended', () => { sources.current.delete(source); });
            source.start(nextStartTime.current);
            nextStartTime.current += audioBuffer.duration;
            sources.current.add(source);
          }
        },
        onerror: (e) => console.error(e),
        onclose: () => setIsLive(false)
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } }
      }
    });

    sessionPromise.then(s => { liveSession.current = s; });

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const sourceNode = audioCtx.current.createMediaStreamSource(stream);
    const scriptProcessor = audioCtx.current.createScriptProcessor(4096, 1, 1);
    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
      const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
      const int16 = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) { int16[i] = inputData[i] * 32768; }
      const base64Pcm = encode(new Uint8Array(int16.buffer));
      sessionPromise.then((session) => {
        session.sendRealtimeInput({ media: { data: base64Pcm, mimeType: 'audio/pcm;rate=16000' } });
      });
    };
    sourceNode.connect(scriptProcessor);
    scriptProcessor.connect(audioCtx.current.destination);
  };

  return (
    <div className="fixed bottom-10 right-10 z-[1000] flex flex-col items-end pointer-events-auto font-mono">
      {isOpen && (
        <div className="mb-6 w-[440px] h-[680px] tactical-panel flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-500 shadow-[0_40px_100px_rgba(0,0,0,0.8)] border border-stone-800">
          {/* HEADER */}
          <div className="p-8 bg-stone-900 border-b border-stone-800 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className={`w-3 h-3 rounded-none ${isLive ? 'bg-orange-500 animate-pulse' : 'bg-stone-500'}`}></div>
                <div className={`absolute inset-0 w-3 h-3 rounded-none bg-orange-500 blur-sm ${isLive ? 'opacity-100' : 'opacity-0'}`}></div>
              </div>
              <div>
                <h3 className="font-black italic tracking-[0.2em] uppercase text-stone-100 text-[11px]">Secure_Comms_Node</h3>
                <p className="text-[8px] font-bold text-stone-600 uppercase tracking-widest">Encyption: AES-V2_Direct</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={toggleLive} 
                className={`w-12 h-12 flex items-center justify-center transition-all stencil-cutout ${isLive ? 'bg-orange-600 text-white' : 'bg-stone-800 text-stone-500 hover:text-stone-300'}`}
                title={isLive ? "Terminate Comms" : "Direct Voice Link"}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              </button>
              <button onClick={() => setIsOpen(false)} className="w-12 h-12 bg-stone-800 hover:bg-red-600 text-stone-500 hover:text-white transition-all flex items-center justify-center stencil-cutout">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>

          {/* MESSAGES */}
          <div ref={scrollRef} className="flex-1 p-8 overflow-y-auto space-y-8 bg-black/40 relative">
            {/* Waveform Visualization Placeholder (Animated CSS) */}
            {isLive && (
              <div className="flex gap-1 h-6 items-center justify-center mb-10">
                {[...Array(20)].map((_, i) => (
                  <div key={i} className="w-[2px] bg-orange-500/50 animate-[bounce_1s_infinite]" style={{ height: `${Math.random() * 100}%`, animationDelay: `${i * 0.05}s` }}></div>
                ))}
              </div>
            )}
            
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                <div className={`max-w-[85%] p-5 text-[12px] leading-relaxed relative ${m.role === 'user' ? 'bg-white text-stone-900 stencil-cutout' : 'bg-stone-900 text-stone-300 border border-stone-800 border-l-4 border-l-orange-500'}`}>
                  <div className="relative z-10 font-bold uppercase tracking-tight">{m.text}</div>
                  
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-stone-800 space-y-3 relative z-10">
                      <p className="text-[9px] uppercase font-black tracking-[0.4em] text-orange-500">External_Data_Nodes</p>
                      {m.sources.map((s: any, si: number) => (
                        <a key={si} href={s.web?.uri || s.maps?.uri} target="_blank" className="flex items-center gap-2 text-[10px] text-stone-500 hover:text-white transition-colors group">
                          <span className="w-1.5 h-1.5 bg-orange-500 rounded-none group-hover:animate-ping"></span>
                          <span className="truncate flex-1 font-mono uppercase tracking-tighter">{s.web?.title || s.maps?.title || 'Data_Link'}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-3 ml-2">
                <div className="w-1.5 h-1.5 bg-orange-500 animate-pulse delay-0"></div>
                <div className="w-1.5 h-1.5 bg-orange-500 animate-pulse delay-150"></div>
                <div className="w-1.5 h-1.5 bg-orange-500 animate-pulse delay-300"></div>
                <span className="text-[10px] text-orange-500/50 font-black uppercase tracking-[0.4em] ml-2">Crunching_Datalink...</span>
              </div>
            )}
          </div>

          {/* INPUT */}
          <div className="p-8 bg-stone-950/80 border-t border-stone-800">
            <div className="flex gap-2">
              <input 
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendQuery()}
                placeholder="INPUT_INQUIRY..."
                className="flex-1 bg-black border border-stone-800 px-5 py-4 text-[11px] font-bold focus:border-orange-500 outline-none transition-all placeholder:text-stone-800 uppercase tracking-widest text-white"
              />
              <button 
                onClick={sendQuery} 
                className="bg-stone-100 w-14 h-14 text-stone-950 hover:bg-orange-500 hover:text-white transition-all flex items-center justify-center shrink-0 stencil-cutout"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 12h14M12 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRIGGER */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-24 h-24 shadow-2xl flex items-center justify-center transition-all transform z-[1100] border-2 group stencil-cutout ${isOpen ? 'bg-white border-white scale-90' : 'bg-stone-900 border-stone-800 hover:border-orange-500 hover:scale-105 active:scale-95'}`}
      >
        {isOpen ? (
          <svg className="w-8 h-8 text-stone-950" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M12 4v16m8-8H4" /></svg>
        ) : (
          <div className="relative">
             <svg className="w-9 h-9 text-stone-100 group-hover:animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
             <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 border-2 border-stone-900 group-hover:scale-125 transition-transform"></div>
          </div>
        )}
      </button>
    </div>
  );
};

export default VibeAssistant;
