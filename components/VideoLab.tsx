
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";

interface Props {
  onBack: () => void;
}

const VideoLab: React.FC<Props> = ({ onBack }) => {
  const [image, setImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('Dynamic camera sweep, epic lighting, cinematic movement');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressMsg, setProgressMsg] = useState('');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const generateVideo = async () => {
    if (!image) return;
    
    // Check for Veo specific key
    if (!(window as any).aistudio?.hasSelectedApiKey()) {
      await (window as any).aistudio?.openSelectKey();
      // Proceed assuming success as per rules
    }

    setLoading(true);
    setError(null);
    setProgressMsg('Initiating Veo engine...');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const base64Data = image.split(',')[1];
      const mimeType = image.split(';')[0].split(':')[1];

      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        image: {
          imageBytes: base64Data,
          mimeType: mimeType,
        },
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: aspectRatio
        }
      });

      const messages = [
        "Synthesizing frames...",
        "Applying temporal consistency...",
        "Rendering motion vectors...",
        "Almost there, finalizing textures...",
        "Polishing the vibe..."
      ];
      let msgIdx = 0;

      while (!operation.done) {
        setProgressMsg(messages[msgIdx % messages.length]);
        msgIdx++;
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        const blob = await response.blob();
        setVideoUrl(URL.createObjectURL(blob));
      } else {
        setError("Video generation failed to return a result.");
      }
    } catch (err: any) {
      if (err.message?.includes("Requested entity was not found")) {
        setError("API Key verification failed. Please select a valid paid project key.");
        await (window as any).aistudio?.openSelectKey();
      } else {
        setError(err.message || "An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full">
        <div className="flex justify-between items-center mb-8">
          <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-2 font-bold uppercase text-xs">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            Back to Hub
          </button>
          <h2 className="text-3xl font-black italic text-purple-400">VIBE STUDIO</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-6">
            <div className="bg-slate-800 p-6 rounded-3xl border-2 border-slate-700">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Starting Photo</label>
              {!image ? (
                <div className="relative w-full h-48 bg-slate-900 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center hover:border-purple-500 transition-all group cursor-pointer">
                  <input type="file" accept="image/*" onChange={handleFile} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">📸</div>
                  <div className="text-xs text-slate-500 font-bold uppercase">Upload Character Art</div>
                </div>
              ) : (
                <div className="relative group">
                  <img src={image} className="w-full h-48 object-cover rounded-xl border-2 border-slate-700" alt="Upload" />
                  <button onClick={() => setImage(null)} className="absolute top-2 right-2 bg-red-500 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              )}

              <div className="mt-6">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Motion Prompt</label>
                <input 
                  type="text" 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full bg-slate-900 border-2 border-slate-700 rounded-xl px-4 py-3 text-slate-200 outline-none focus:border-purple-500 transition-all font-bold text-sm"
                />
              </div>

              <div className="mt-6">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Aspect Ratio</label>
                <div className="flex gap-2">
                  {(['16:9', '9:16'] as const).map(ar => (
                    <button 
                      key={ar}
                      onClick={() => setAspectRatio(ar)}
                      className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all border-2 ${aspectRatio === ar ? 'bg-purple-600 border-purple-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500'}`}
                    >
                      {ar}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={generateVideo}
                disabled={loading || !image}
                className={`w-full mt-8 py-4 rounded-xl font-bold flex flex-col items-center justify-center transition-all ${loading || !image ? 'bg-slate-700 cursor-not-allowed text-slate-500' : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20'}`}
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mb-2"></div>
                    <span className="text-[10px] animate-pulse">{progressMsg}</span>
                  </>
                ) : 'GENERATE VIBE'}
              </button>
              
              {error && <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs text-center">{error}</div>}
              <p className="mt-4 text-[9px] text-slate-500 text-center uppercase tracking-widest leading-relaxed">
                Note: Video generation requires a paid Google Cloud project.<br/>
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-purple-400 hover:underline">Billing Docs</a>
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center">
            {videoUrl ? (
              <div className="space-y-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                <video src={videoUrl} controls autoPlay loop className="w-full rounded-3xl border-4 border-slate-700 shadow-2xl bg-slate-800" />
                <a 
                  href={videoUrl} 
                  download="vibe_militia.mp4"
                  className="w-full bg-slate-700 hover:bg-slate-600 text-white text-center font-bold py-4 rounded-xl transition-all block"
                >
                  DOWNLOAD MOVIE
                </a>
              </div>
            ) : (
              <div className="w-full aspect-video bg-slate-800/50 rounded-3xl border-4 border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-600">
                <div className="text-6xl mb-4">🎥</div>
                <div className="text-sm font-bold uppercase tracking-widest">Veo Cinematic Viewport</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoLab;
