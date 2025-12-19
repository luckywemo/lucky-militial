
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";

interface Props {
  onBack: () => void;
  onSaveAvatar: (url: string) => void;
}

const ImageLab: React.FC<Props> = ({ onBack, onSaveAvatar }) => {
  const [prompt, setPrompt] = useState('A futuristic space soldier with glowing blue visor, pixel art style, high quality');
  const [size, setSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateImage = async () => {
    // Check for paid API key for gemini-3-pro-image-preview as required by guidelines
    if (!(window as any).aistudio?.hasSelectedApiKey()) {
      await (window as any).aistudio?.openSelectKey();
    }

    setLoading(true);
    setError(null);
    try {
      // Re-initialize to ensure the latest API key is used
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [{ text: prompt }]
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: size
          }
        }
      });

      let foundImage = false;
      for (const part of response.candidates[0].content.parts) {
        // Iterate through all parts to find the image part as per guidelines
        if (part.inlineData) {
          const imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          setResult(imageUrl);
          foundImage = true;
          break;
        }
      }
      if (!foundImage) setError("No image was returned. Try a different prompt.");
    } catch (err: any) {
      // Handle key selection error as per guidelines
      if (err.message?.includes("Requested entity was not found")) {
        setError("API Key verification failed. Please select a valid paid project key.");
        await (window as any).aistudio?.openSelectKey();
      } else {
        setError(err.message || "Failed to generate image.");
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
          <h2 className="text-3xl font-black italic text-indigo-400">AVATAR LAB</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-6">
            <div className="bg-slate-800 p-6 rounded-3xl border-2 border-slate-700">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-3">AI Vision Prompt</label>
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full bg-slate-900 border-2 border-slate-700 rounded-xl p-4 text-slate-200 h-32 outline-none focus:border-indigo-500 transition-all resize-none"
                placeholder="Describe your warrior..."
              />
              
              <div className="mt-6">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Resolution Quality</label>
                <div className="flex gap-2">
                  {(['1K', '2K', '4K'] as const).map(s => (
                    <button 
                      key={s}
                      onClick={() => setSize(s)}
                      className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all border-2 ${size === s ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={generateImage}
                disabled={loading}
                className={`w-full mt-8 py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all ${loading ? 'bg-slate-700 cursor-not-allowed text-slate-500' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'}`}
              >
                {loading ? <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div> : 'GENERATE AVATAR'}
              </button>
              
              {error && <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs text-center">{error}</div>}
              <p className="mt-4 text-[9px] text-slate-500 text-center uppercase tracking-widest leading-relaxed">
                Note: Pro Image generation requires a paid Google Cloud project.<br/>
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-indigo-400 hover:underline">Billing Docs</a>
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center">
            {result ? (
              <div className="space-y-6 w-full animate-in fade-in zoom-in duration-500">
                <img src={result} className="w-full aspect-square rounded-3xl border-4 border-slate-700 shadow-2xl object-cover bg-slate-800" alt="Result" />
                <button 
                  onClick={() => onSaveAvatar(result)}
                  className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-green-500/20"
                >
                  USE AS AVATAR
                </button>
              </div>
            ) : (
              <div className="w-full aspect-square bg-slate-800/50 rounded-3xl border-4 border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-600">
                <div className="text-6xl mb-4">👾</div>
                <div className="text-sm font-bold uppercase tracking-widest">No Avatar Generated</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageLab;
