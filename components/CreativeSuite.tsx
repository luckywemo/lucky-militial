
import React, { useState } from 'react';
import { GoogleGenAI, Type } from "@google/genai";

interface Props {
  onBack: () => void;
  setAvatar: (url: string) => void;
}

const CreativeSuite: React.FC<Props> = ({ onBack, setAvatar }) => {
  const [tab, setTab] = useState<'generate' | 'edit' | 'video'>('generate');
  const [prompt, setPrompt] = useState('');
  const [imgSize, setImgSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [aspect, setAspect] = useState<'16:9' | '9:16'>('16:9');
  const [sourceImg, setSourceImg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [thoughts, setThoughts] = useState<string[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setSourceImg(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const addThought = (msg: string) => {
    setThoughts(prev => [...prev.slice(-4), msg]);
  };

  const processAI = async () => {
    if (tab === 'generate' || tab === 'video') {
      if (!(window as any).aistudio?.hasSelectedApiKey()) {
        await (window as any).aistudio?.openSelectKey();
      }
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setThoughts([]);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      if (tab === 'generate') {
        setStatus('Synthesizing Bio-Metrics...');
        addThought("Initializing Pro-Image Neural Engine...");
        addThought("Calibrating semantic vectors...");
        
        const res = await ai.models.generateContent({
          model: 'gemini-3-pro-image-preview',
          contents: { parts: [{ text: prompt }] },
          config: { 
            imageConfig: { imageSize: imgSize, aspectRatio: "1:1" },
            thinkingConfig: { thinkingBudget: 1000 }
          }
        });
        
        addThought("Pixel synthesis complete.");
        const part = res.candidates[0].content.parts.find(p => p.inlineData);
        if (part) setResult(`data:image/png;base64,${part.inlineData.data}`);
      } 
      else if (tab === 'edit') {
        if (!sourceImg) throw new Error("Hardware Asset Required.");
        setStatus('Applying Augmentations...');
        addThought("Loading reference raster...");
        const base64 = sourceImg.split(',')[1];
        const res = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [
              { inlineData: { data: base64, mimeType: sourceImg.split(';')[0].split(':')[1] } },
              { text: prompt }
            ]
          }
        });
        const part = res.candidates[0].content.parts.find(p => p.inlineData);
        if (part) setResult(`data:image/png;base64,${part.inlineData.data}`);
      }
      else if (tab === 'video') {
        if (!sourceImg) throw new Error("Keyframe Asset Required.");
        setStatus('Simulating Kinematics...');
        addThought("Spinning up Veo Engine...");
        
        const base64 = sourceImg.split(',')[1];
        let op = await ai.models.generateVideos({
          model: 'veo-3.1-fast-generate-preview',
          prompt: prompt,
          image: { imageBytes: base64, mimeType: sourceImg.split(';')[0].split(':')[1] },
          config: { numberOfVideos: 1, resolution: '720p', aspectRatio: aspect }
        });

        while (!op.done) {
          addThought(`Computing temporal frame ${Math.floor(Math.random() * 60)}...`);
          await new Promise(r => setTimeout(r, 6000));
          op = await ai.operations.getVideosOperation({ operation: op });
        }

        const link = op.response?.generatedVideos?.[0]?.video?.uri;
        if (link) {
          const vRes = await fetch(`${link}&key=${process.env.API_KEY}`);
          const blob = await vRes.blob();
          setResult(URL.createObjectURL(blob));
        }
      }
    } catch (e: any) {
      if (e.message?.includes("Requested entity was not found")) {
        setError("AUTH_FAILURE: Check Neural Cloud Project.");
        await (window as any).aistudio?.openSelectKey();
      } else {
        setError("SYS_EXCEPTION: " + e.message);
      }
    } finally {
      setLoading(false);
      setStatus('');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-stone-900/60 p-10 font-mono">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-6 text-stone-400 hover:text-white font-black uppercase text-[11px] tracking-[0.4em] transition-all group">
            <div className="w-14 h-14 border-2 border-stone-700 flex items-center justify-center group-hover:bg-stone-800 transition-colors stencil-cutout bg-stone-900 shadow-xl">
              <svg className="w-6 h-6 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
            </div>
            TERMINATE_SYNTH
          </button>
          <div className="text-right">
            <h2 className="text-7xl font-black italic text-stone-100 tracking-tighter font-stencil leading-none uppercase drop-shadow-lg">Bio_Forge_Terminal</h2>
            <p className="text-[11px] font-bold text-orange-500 uppercase tracking-[0.5em] mt-4">Industrial_grade Synthesis Engine v9.1</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* CONTROL SECTION */}
          <div className="lg:col-span-4 space-y-10">
            <div className="tactical-panel p-2 flex gap-2 shadow-2xl bg-stone-800 border-stone-700">
              {(['generate', 'edit', 'video'] as const).map(t => (
                <button 
                  key={t}
                  onClick={() => { setTab(t); setResult(null); }}
                  className={`flex-1 py-5 text-[11px] font-black uppercase tracking-[0.3em] transition-all stencil-cutout ${tab === t ? 'bg-orange-600 text-white shadow-lg' : 'text-stone-400 hover:bg-stone-700 hover:text-stone-200'}`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="tactical-panel p-12 space-y-10 relative overflow-hidden bg-stone-800/90 border-stone-700 shadow-2xl">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-orange-500/30 data-stream opacity-40"></div>
              
              {(tab === 'edit' || tab === 'video') && (
                <div className="space-y-4">
                  <label className="block text-[11px] font-black text-stone-400 uppercase tracking-widest mb-3">Input_Asset_Vector</label>
                  {!sourceImg ? (
                    <div className="relative aspect-video bg-stone-950 border-4 border-dashed border-stone-700 flex flex-col items-center justify-center hover:border-orange-500 transition-all cursor-pointer group shadow-inner">
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                      <span className="text-6xl mb-6 grayscale group-hover:grayscale-0 transition-all opacity-40 group-hover:opacity-100">📸</span>
                      <span className="text-[10px] text-stone-500 font-black uppercase tracking-[0.4em]">Mount_Hardware</span>
                    </div>
                  ) : (
                    <div className="relative group border-2 border-stone-600 shadow-2xl">
                      <img src={sourceImg} className="w-full aspect-video object-cover brightness-110 contrast-110" alt="Hardware Asset" />
                      <button onClick={() => setSourceImg(null)} className="absolute top-4 right-4 bg-red-600 hover:bg-red-500 p-4 transition-all shadow-xl active:scale-90">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <label className="block text-[11px] font-black text-stone-400 uppercase tracking-widest mb-3">Neural_Command_Strings</label>
                <div className="relative">
                  <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full bg-stone-100 border-4 border-stone-300 p-8 text-[13px] text-stone-900 h-44 focus:border-orange-500 outline-none transition-all resize-none font-bold placeholder:text-stone-400 uppercase tracking-wider shadow-inner"
                    placeholder={tab === 'generate' ? "DESCRIBE OPERATOR PARAMETERS..." : "SPECIFY MODIFICATIONS..."}
                  />
                  <div className="absolute bottom-4 right-6 text-[9px] font-black text-stone-300 tracking-tighter">UPLINK_BUFFER_READY</div>
                </div>
              </div>

              {tab === 'generate' && (
                <div className="grid grid-cols-3 gap-3">
                  {(['1K', '2K', '4K'] as const).map(s => (
                    <button key={s} onClick={() => setImgSize(s)} className={`py-4 text-[11px] font-black transition-all border-2 ${imgSize === s ? 'bg-white border-white text-stone-950 shadow-lg' : 'bg-stone-900 border-stone-700 text-stone-500 hover:border-stone-500'}`}>{s}</button>
                  ))}
                </div>
              )}

              {tab === 'video' && (
                <div className="grid grid-cols-2 gap-3">
                  {(['16:9', '9:16'] as const).map(a => (
                    <button key={a} onClick={() => setAspect(a)} className={`py-4 text-[11px] font-black transition-all border-2 ${aspect === a ? 'bg-white border-white text-stone-950 shadow-lg' : 'bg-stone-900 border-stone-700 text-stone-500 hover:border-stone-500'}`}>{a}</button>
                  ))}
                </div>
              )}

              <button 
                onClick={processAI}
                disabled={loading}
                className={`w-full py-7 font-black uppercase tracking-[0.6em] transition-all text-[12px] stencil-cutout shadow-2xl active:translate-y-1 ${loading ? 'bg-stone-700 text-stone-500 cursor-not-allowed border-none' : 'bg-orange-600 hover:bg-orange-500 text-white border-b-4 border-orange-800'}`}
              >
                {loading ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-6 h-6 border-2 border-stone-400 border-t-white rounded-full animate-spin"></div>
                    <span className="text-[9px] animate-pulse tracking-widest">{status}</span>
                  </div>
                ) : `INIT_SYNTHESIS_SEQUENCE`}
              </button>

              {loading && thoughts.length > 0 && (
                <div className="space-y-2 p-6 bg-stone-950/80 border border-stone-700 shadow-inner animate-in fade-in slide-in-from-bottom-4 duration-500">
                   <p className="text-[9px] font-black text-orange-400 uppercase tracking-[0.4em] mb-3">Neural_Process_Log</p>
                   {thoughts.map((t, i) => (
                     <div key={i} className="text-[9px] text-stone-500 uppercase font-bold tracking-widest leading-tight">&gt; {t}</div>
                   ))}
                </div>
              )}

              {error && <div className="p-5 bg-red-600/20 border-2 border-red-600 text-red-500 text-[10px] text-center font-black uppercase tracking-widest shadow-lg">{error}</div>}
            </div>
          </div>

          {/* VIEWPORT SECTION */}
          <div className="lg:col-span-8 flex flex-col items-center justify-start pt-10 relative">
            {result ? (
              <div className="w-full max-w-4xl space-y-12 animate-in zoom-in-[0.98] fade-in duration-700">
                <div className="tactical-panel p-6 shadow-[0_60px_100px_rgba(0,0,0,0.6)] relative overflow-hidden bg-stone-800 border-stone-700">
                  <div className="absolute top-5 right-6 text-[11px] font-black text-stone-500 tracking-[0.3em]">SYNTH_BLOCK_01_FINAL</div>
                  <div className="bg-stone-950 p-3 shadow-inner">
                    {tab === 'video' ? (
                      <video src={result} controls autoPlay loop className="w-full aspect-video object-contain" />
                    ) : (
                      <img src={result} className="w-full aspect-square object-contain brightness-110 contrast-110 shadow-2xl" alt="Result" />
                    )}
                  </div>
                </div>
                {tab !== 'video' && (
                  <button 
                    onClick={() => { setAvatar(result); onBack(); }}
                    className="w-full bg-white hover:bg-orange-500 text-stone-950 hover:text-white font-black py-7 text-[13px] uppercase tracking-[0.8em] transition-all stencil-cutout transform hover:-translate-y-2 shadow-[0_40px_60px_rgba(0,0,0,0.4)]"
                  >
                    DEPLOY_TO_COMMAND_UNIT
                  </button>
                )}
              </div>
            ) : (
              <div className="w-full h-[700px] tactical-panel border-4 border-dashed border-stone-700 bg-stone-900/40 flex flex-col items-center justify-center text-stone-600 transition-all">
                <div className="text-[120px] mb-12 opacity-20 grayscale filter contrast-50">⚙️</div>
                <p className="font-black uppercase tracking-[1.2em] text-[12px] text-stone-500">Awaiting_Terminal_Sequence</p>
                <div className="mt-10 flex gap-4">
                   <div className="w-3 h-3 bg-stone-700 animate-pulse delay-0"></div>
                   <div className="w-3 h-3 bg-stone-700 animate-pulse delay-150"></div>
                   <div className="w-3 h-3 bg-stone-700 animate-pulse delay-300"></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreativeSuite;
