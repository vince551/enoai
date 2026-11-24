import React, { useEffect, useState } from 'react';
import { Film, ImagePlus, Sparkles, Download, RefreshCw, Clock3, WandSparkles, AlertCircle } from 'lucide-react';

const STORAGE_KEY = 'vincora-generated-media';
const readMedia = () => {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch { return []; }
};

export default function MediaStudio() {
  const [mode, setMode] = useState('image');
  const [prompt, setPrompt] = useState('');
  const [ratio, setRatio] = useState('16:9');
  const [quality, setQuality] = useState('standard');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [items, setItems] = useState(readMedia);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 30))); }
    catch { setError('Your browser storage is full. Download your generated media before clearing old items.'); }
  }, [items]);

  const remember = item => setItems(current => [{ ...item, id: Date.now() + '-' + Math.random().toString(36).slice(2, 7), createdAt: new Date().toISOString() }, ...current].slice(0, 30));

  const generateImage = async () => {
    setBusy(true); setError(''); setStatus('Creating your image…');
    try {
      const sizes = { '1:1': '1024x1024', '16:9': '1024x768', '9:16': '768x1024' };
      const response = await fetch('/api/media/image', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), size: sizes[ratio], quality })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Image generation failed.');
      const src = data.imageData || data.imageUrl;
      if (!src) throw new Error('The provider returned no image.');
      remember({ type: 'image', prompt: prompt.trim(), src, provider: data.provider || 'Agnes AI', model: data.model });
      setStatus('Image created. It has been saved in this browser.');
    } catch (e) { setError(e.message); setStatus(''); }
    finally { setBusy(false); }
  };

  const generateVideo = async () => {
    setBusy(true); setError(''); setStatus('Submitting your video request…');
    try {
      const response = await fetch('/api/media/video', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), ratio, seconds: '5' })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Video generation failed.');
      setStatus('Your video is in the free provider queue. This can take several minutes.');
      let completed = false;
      for (let attempt = 0; attempt < 40; attempt += 1) {
        await new Promise(resolve => setTimeout(resolve, 12000));
        const check = await fetch('/api/media/video-status?videoId=' + encodeURIComponent(data.videoId), { cache: 'no-store' });
        const result = await check.json().catch(() => ({}));
        if (!check.ok) throw new Error(result.error || 'Could not check video progress.');
        if (result.status === 'failed') throw new Error(result.error || 'The provider could not generate this video.');
        if (result.status === 'completed' && result.videoUrl) {
          remember({ type: 'video', prompt: prompt.trim(), src: result.videoUrl, provider: result.provider || 'Agnes AI', model: data.model });
          setStatus('Video created. It has been saved in this browser.');
          completed = true;
          break;
        }
        setStatus('Video is processing… Check ' + Math.min(attempt + 1, 40) + '/40');
      }
      if (!completed) setStatus('The video is still processing upstream. You can retry later; this browser session will keep checking only while this page remains open.');
    } catch (e) { setError(e.message); setStatus(''); }
    finally { setBusy(false); }
  };

  const generate = () => {
    if (!prompt.trim() || busy) return;
    return mode === 'image' ? generateImage() : generateVideo();
  };

  const download = async item => {
    try {
      const response = await fetch(item.src);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'vincora-' + item.type + '-' + Date.now() + (item.type === 'image' ? '.png' : '.mp4');
      document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    } catch { window.open(item.src, '_blank', 'noopener,noreferrer'); }
  };

  return <section className="media-studio">
    <div className="features-heading">
      <div><div className="eyebrow"><span className="eyebrow-dot" /> VINCORA CREATION TOOLS</div><h1>Image &amp; Video Studio.</h1><p>Turn a written prompt into original visual content.</p></div>
    </div>
    <div className="media-hero">
      <div className="media-mode-switch">
        <button className={mode === 'image' ? 'selected' : ''} onClick={() => { setMode('image'); setStatus(''); setError(''); }}><ImagePlus size={16}/> Image generation</button>
        <button className={mode === 'video' ? 'selected' : ''} onClick={() => { setMode('video'); setStatus(''); setError(''); }}><Film size={16}/> Video generation</button>
      </div>
      <div className="media-prompt-wrap">
        <label htmlFor="media-prompt">Describe what you want to create</label>
        <textarea id="media-prompt" value={prompt} onChange={e => setPrompt(e.target.value)} maxLength={1600} rows={4} placeholder={mode === 'image' ? 'A cinematic portrait of a futuristic Nairobi skyline at golden hour, ultra-detailed, editorial photography…' : 'A cinematic 5-second tracking shot of a futuristic electric car driving through Nairobi at dusk, realistic motion and reflections…'}/>
        <div className="media-prompt-meta"><span>{prompt.length}/{mode === 'image' ? 1600 : 1200} characters</span><span>Be specific about subject, style, lighting and movement.</span></div>
      </div>
      <div className="media-controls">
        <div><label>Aspect ratio</label><div className="media-ratios">{['16:9','9:16','1:1'].map(value => <button key={value} className={ratio === value ? 'selected' : ''} onClick={() => setRatio(value)}>{value}</button>)}</div></div>
        {mode === 'image' && <div><label>Image model</label><select value={quality} onChange={e => setQuality(e.target.value)}><option value="standard">Agnes Image 2.1 Flash</option><option value="fast">Agnes Image 2.0 Flash · Fast</option></select></div>}
        {mode === 'video' && <div className="media-model-note"><span className="media-free-dot"/> Agnes Video 2.5 Flash · 5 seconds · 720P</div>}
      </div>
      <button className="media-generate" onClick={generate} disabled={!prompt.trim() || busy}><span>{busy ? <RefreshCw size={16} className="media-spin"/> : <WandSparkles size={16}/>}</span>{busy ? 'Generating…' : mode === 'image' ? 'Generate image' : 'Generate video'}</button>
      {status && <div className="media-status"><Clock3 size={14}/>{status}</div>}
      {error && <div className="media-error"><AlertCircle size={14}/>{error}</div>}
      <p className="media-footnote">Free-tier access and queues are controlled by the provider. VINCORA will not switch to a paid model or charge you automatically.</p>
    </div>
    <div className="media-library-heading"><div><h2>Your creations</h2><p>Saved in this browser on this device.</p></div><span>{items.length} / 30</span></div>
    {items.length ? <div className="media-gallery">{items.map(item => <article className="media-card" key={item.id}>
      <div className="media-preview">{item.type === 'video' ? <video src={item.src} controls preload="metadata"/> : <img src={item.src} alt={item.prompt}/>}</div>
      <div className="media-card-copy"><span>{item.type === 'video' ? 'VIDEO' : 'IMAGE'} · {item.provider}</span><p>{item.prompt}</p><button onClick={() => download(item)}><Download size={14}/> Download</button></div>
    </article>)}</div> : <div className="media-empty"><Sparkles size={25}/><strong>Your creations will appear here.</strong><span>Start with an image or video prompt above.</span></div>}
  </section>;
}
