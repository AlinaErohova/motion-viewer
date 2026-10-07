import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DotLottie } from '@lottiefiles/dotlottie-web';
import {
  Copy, Download, FolderOpen, Grid3X3, Info, Lock, Maximize2, Moon,
  Pause, Play, RotateCcw, Sun, Trash2, Upload, X,
} from 'lucide-react';
import './styles.css';

type MotionFile = { id: string; name: string; size: number; url: string; file: File; path?: string };
type NativeFile = { name: string; path: string; size: number; data: Uint8Array };
type ExportFormat = 'json' | 'lottie';
type ExportSize = 'original' | 'custom';
type ExportScope = 'selected' | 'all';

const speeds = [0.25, 0.5, 1, 1.5, 2];
const bytes = (value: number) => value < 1024
  ? `${value} B`
  : value < 1048576 ? `${(value / 1024).toFixed(1)} KB` : `${(value / 1048576).toFixed(1)} MB`;

function App() {
  const input = useRef<HTMLInputElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const player = useRef<DotLottie | null>(null);
  const noticeTimer = useRef<number | null>(null);
  const [files, setFiles] = useState<MotionFile[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [background, setBackground] = useState<'dark' | 'light' | 'grid'>('grid');
  const [frame, setFrame] = useState(0);
  const [total, setTotal] = useState(1);
  const [fps, setFps] = useState(60);
  const [duration, setDuration] = useState(0);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportScope, setExportScope] = useState<ExportScope>('selected');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');
  const [exportSize, setExportSize] = useState<ExportSize>('original');
  const [exportWidth, setExportWidth] = useState(512);
  const [exportHeight, setExportHeight] = useState(512);
  const [aspectLocked, setAspectLocked] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const current = files.find((file) => file.id === active);

  const showNotice = (tone: 'success' | 'error', text: string) => {
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    setNotice({ tone, text });
    noticeTimer.current = window.setTimeout(() => setNotice(null), 3200);
  };

  const add = (incoming: FileList | File[]) => {
    const added = Array.from(incoming)
      .filter((file) => /\.(json|lottie)$/i.test(file.name))
      .map((file) => ({ id: crypto.randomUUID(), name: file.name, size: file.size, url: URL.createObjectURL(file), file }));
    if (added.length) {
      setFiles((value) => [...value, ...added]);
      setActive((value) => value ?? added[0].id);
    }
  };

  const addNative = async (items: NativeFile[]) => {
    const added = items.filter((item) => /\.(json|lottie)$/i.test(item.name)).map((item) => {
      const file = new File([item.data], item.name, {
        type: item.name.toLowerCase().endsWith('.json') ? 'application/json' : 'application/octet-stream',
      });
      return { id: crypto.randomUUID(), name: item.name, size: item.size, url: URL.createObjectURL(file), file, path: item.path };
    });
    if (added.length) {
      setFiles((value) => [...value, ...added]);
      setActive((value) => value ?? added[0].id);
    }
  };

  const openFiles = async () => {
    if (window.motionViewer) await addNative(await window.motionViewer.chooseFiles());
    else input.current?.click();
  };

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setDragging(true);
  };
  const onDragLeave = (event: React.DragEvent) => {
    if (event.currentTarget === event.target) event.preventDefault();
    setDragging(false);
  };
  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const dropped = Array.from(event.dataTransfer.files);
    if (dropped.length) add(dropped);
  };

  useEffect(() => {
    const unsubscribe = window.motionViewer?.onFilesOpened((items) => addNative(items));
    return () => unsubscribe?.();
  }, []);

  useEffect(() => {
    if (!current || !canvas.current) return;
    player.current?.destroy();
    setFrame(0);
    setTotal(1);
    setDuration(0);
    setDimensions({ width: 0, height: 0 });
    const instance = new DotLottie({
      canvas: canvas.current, src: current.url, autoplay: true, loop: true, speed,
      renderConfig: { devicePixelRatio: devicePixelRatio || 1 },
    });
    player.current = instance;
    instance.addEventListener('load', () => {
      instance.setSpeed(speed);
      setPlaying(true);
      setTotal(instance.totalFrames || 1);
      setFps(instance.fps || 60);
      setDuration((instance.totalFrames || 0) / (instance.fps || 60));
      setDimensions(instance.animationSize());
    });
    instance.addEventListener('frame', (event: any) => setFrame(Math.round(event.currentFrame ?? 0)));
    return () => { instance.destroy(); player.current = null; };
  }, [current]);

  useEffect(() => { player.current?.setSpeed(speed); }, [speed]);
  useEffect(() => () => { if (noticeTimer.current) window.clearTimeout(noticeTimer.current); }, []);

  const toggle = () => {
    if (!player.current) return;
    if (playing) player.current.pause(); else player.current.play();
    setPlaying(!playing);
  };
  const seek = (nextFrame: number) => { player.current?.setFrame(nextFrame); setFrame(nextFrame); };
  const remove = (id: string) => {
    const removed = files.find((file) => file.id === id);
    if (removed) URL.revokeObjectURL(removed.url);
    const remaining = files.filter((file) => file.id !== id);
    setFiles(remaining);
    if (active === id) setActive(remaining[0]?.id ?? null);
  };
  const copy = async () => {
    if (!current) return;
    await navigator.clipboard.writeText(await current.file.text());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1000);
  };

  const openExport = () => {
    setExportScope(files.length > 1 ? 'all' : 'selected');
    if (dimensions.width && dimensions.height) {
      setExportWidth(Math.round(dimensions.width));
      setExportHeight(Math.round(dimensions.height));
    }
    setExportOpen(true);
  };
  const changeExportWidth = (value: number) => {
    const width = Math.max(1, Math.min(16384, Math.round(value || 1)));
    setExportWidth(width);
    if (aspectLocked && dimensions.width && dimensions.height) {
      setExportHeight(Math.max(1, Math.round(width * dimensions.height / dimensions.width)));
    }
  };
  const changeExportHeight = (value: number) => {
    const height = Math.max(1, Math.min(16384, Math.round(value || 1)));
    setExportHeight(height);
    if (aspectLocked && dimensions.width && dimensions.height) {
      setExportWidth(Math.max(1, Math.round(height * dimensions.width / dimensions.height)));
    }
  };
  const runExport = async () => {
    if (!window.motionViewer || !current) return;
    const selected = exportScope === 'all' ? files : [current];
    setExporting(true);
    try {
      const items = await Promise.all(selected.map(async (item) => ({
        name: item.name, data: new Uint8Array(await item.file.arrayBuffer()),
      })));
      const result = await window.motionViewer.exportFiles({
        items, format: exportFormat, size: exportSize,
        width: exportSize === 'custom' ? exportWidth : undefined,
        height: exportSize === 'custom' ? exportHeight : undefined,
      });
      if (!result.canceled) {
        setExportOpen(false);
        showNotice('success', `${result.count} animation${result.count === 1 ? '' : 's'} exported`);
      }
    } catch (error) {
      showNotice('error', error instanceof Error ? error.message : 'Export failed');
    } finally { setExporting(false); }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (exportOpen) { if (event.key === 'Escape') setExportOpen(false); return; }
      if (event.code === 'Space') { event.preventDefault(); toggle(); }
      if (event.key === 'ArrowLeft') seek(Math.max(0, frame - 1));
      if (event.key === 'ArrowRight') seek(Math.min(total - 1, frame + 1));
      if (event.key.toLowerCase() === 'f') document.querySelector('.stage')?.requestFullscreen();
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'o') { event.preventDefault(); openFiles(); }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'e' && files.length) { event.preventDefault(); openExport(); }
    };
    addEventListener('keydown', onKeyDown);
    return () => removeEventListener('keydown', onKeyDown);
  }, [playing, frame, total, exportOpen, files, current, dimensions]);

  return <div className={`app ${dragging ? 'dragging' : ''}`} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
    <header>
      <div className="brand"><div className="logo">✦</div><div><b>Motion Viewer</b><span>Lottie Inspector</span></div></div>
      <div className="actions">
        <button className="ghost" onClick={openFiles}><FolderOpen size={16} />Open</button>
        <button className="ghost" onClick={openExport} disabled={!files.length}><Download size={16} />Export</button>
        <button className="primary" onClick={openFiles}><Upload size={16} />Add animation</button>
        <input ref={input} hidden type="file" multiple accept=".json,.lottie" onChange={(event) => event.target.files && add(event.target.files)} />
      </div>
    </header>
    <main>
      <aside className="sidebar">
        <div className="title">FILES <b>{files.length}</b></div>
        <div className="drop">{files.length === 0 ? <div className="dropmsg" onClick={openFiles}>
          <div className="dropicon">↥</div><strong>Drop Lottie files here</strong><small>.json or .lottie</small>
        </div> : files.map((file) => <div className={`file ${active === file.id ? 'sel' : ''}`} key={file.id} onClick={() => setActive(file.id)}>
          <div className="thumb">✦</div><div className="fi"><strong title={file.name}>{file.name}</strong><small>{bytes(file.size)}</small></div>
          <button className="del" onClick={(event) => { event.stopPropagation(); remove(file.id); }}><Trash2 size={14} /></button>
        </div>)}</div>
      </aside>
      <section className="workspace">
        <div className={`stage ${background}`}>
          {current ? <canvas ref={canvas} /> : <div className="empty"><div>✦</div><h2>Your motion canvas</h2><p>Drop a .json or .lottie animation to start</p><button className="primary" onClick={openFiles}>Choose file</button></div>}
          <div className="stagebuttons">
            <button onClick={() => setBackground(background === 'grid' ? 'dark' : background === 'dark' ? 'light' : 'grid')}><Grid3X3 size={15} /></button>
            <button onClick={() => document.querySelector('.stage')?.requestFullscreen()}><Maximize2 size={15} /></button>
          </div>
        </div>
        <div className="transport">
          <button className="round" onClick={() => seek(0)}><RotateCcw size={15} /></button>
          <button className="play" onClick={toggle}>{playing ? <Pause size={16} /> : <Play size={16} />}</button>
          <span className="time">{duration ? `${(frame / fps).toFixed(2)} / ${duration.toFixed(2)} s` : '— / —'}</span>
          <input className="range" type="range" min="0" max={Math.max(1, total - 1)} value={frame} onChange={(event) => seek(Number(event.target.value))} />
          <label>Speed <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>{speeds.map((value) => <option key={value} value={value}>{value}×</option>)}</select></label>
        </div>
        <div className="status"><span>FRAME <b>{String(frame).padStart(4, '0')}</b></span><span>FPS <b>{fps}</b></span><span>DURATION <b>{duration ? `${duration.toFixed(2)}s` : '—'}</b></span><span className="path">{current?.name}</span></div>
      </section>
      <aside className="inspector">
        <div className="title">INSPECTOR <Info size={14} /></div>
        {current ? <>
          <div className="card"><small>ANIMATION</small><strong>{current.name}</strong><em>{current.name.endsWith('.lottie') ? 'LOTTIE' : 'JSON'}</em></div>
          <div className="props"><p><span>File size</span><b>{bytes(current.size)}</b></p><p><span>Dimensions</span><b>{dimensions.width ? `${dimensions.width} × ${dimensions.height}` : '—'}</b></p><p><span>Frames</span><b>{total}</b></p><p><span>Frame rate</span><b>{fps} FPS</b></p><p><span>Duration</span><b>{duration ? `${duration.toFixed(2)} sec` : '—'}</b></p></div>
          <div className="section"><small>VIEW</small><button onClick={() => setBackground('grid')}><Grid3X3 size={14} />Checkerboard <b>{background === 'grid' ? '✓' : ''}</b></button><button onClick={() => setBackground('light')}><Sun size={14} />Light <b>{background === 'light' ? '✓' : ''}</b></button><button onClick={() => setBackground('dark')}><Moon size={14} />Dark <b>{background === 'dark' ? '✓' : ''}</b></button></div>
          <div className="section"><small>DATA</small><button onClick={copy}><Copy size={14} />{copied ? 'Copied!' : 'Copy JSON'}</button><button onClick={openExport}><Download size={14} />Export animation</button></div>
        </> : <div className="emptyins">Select an animation<br />to inspect it.</div>}
      </aside>
    </main>
    <footer><span><kbd>Space</kbd> Play / pause</span><span><kbd>←</kbd><kbd>→</kbd> Frame step</span><span><kbd>F</kbd> Fullscreen</span><span><kbd>⌘</kbd><kbd>O</kbd> Open</span><span><kbd>⌘</kbd><kbd>E</kbd> Export</span><span className="local">Runs locally on your Mac · files never leave your computer</span></footer>
    {dragging && <div className="drop-overlay"><div><div className="drop-overlay-icon">↥</div><strong>Drop Lottie files here</strong><span>.json or .lottie · multiple files supported</span></div></div>}
    {exportOpen && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setExportOpen(false)}>
      <div className="export-dialog" role="dialog" aria-modal="true" aria-labelledby="export-title">
        <div className="export-head"><div><h2 id="export-title">Export animations</h2><p>Convert and save locally</p></div><button className="icon-button" onClick={() => setExportOpen(false)} aria-label="Close export dialog"><X size={17} /></button></div>
        <div className="export-field"><label>FILES</label><div className="segmented"><button className={exportScope === 'selected' ? 'active' : ''} onClick={() => setExportScope('selected')}>Selected</button><button className={exportScope === 'all' ? 'active' : ''} onClick={() => setExportScope('all')} disabled={files.length < 2}>All files <span>{files.length}</span></button></div></div>
        <div className="export-field"><label>FORMAT</label><div className="segmented"><button className={exportFormat === 'json' ? 'active' : ''} onClick={() => setExportFormat('json')}>JSON</button><button className={exportFormat === 'lottie' ? 'active' : ''} onClick={() => setExportFormat('lottie')}>dotLottie</button></div></div>
        <div className="export-field"><label>SIZE</label><div className="segmented"><button className={exportSize === 'original' ? 'active' : ''} onClick={() => setExportSize('original')}>Original</button><button className={exportSize === 'custom' ? 'active' : ''} onClick={() => setExportSize('custom')}>Custom</button></div></div>
        {exportSize === 'custom' && <div className="size-row">
          <label><span>WIDTH</span><input type="number" min="1" max="16384" value={exportWidth} onChange={(event) => changeExportWidth(Number(event.target.value))} /></label>
          <button className={`lock-button ${aspectLocked ? 'active' : ''}`} onClick={() => setAspectLocked(!aspectLocked)} title="Lock source aspect ratio" aria-label="Lock source aspect ratio"><Lock size={14} /></button>
          <label><span>HEIGHT</span><input type="number" min="1" max="16384" value={exportHeight} onChange={(event) => changeExportHeight(Number(event.target.value))} /></label>
        </div>}
        <div className="export-summary"><span>{exportScope === 'all' ? files.length : 1} file{(exportScope === 'all' ? files.length : 1) === 1 ? '' : 's'}</span><span>{exportFormat === 'json' ? '.json' : '.lottie'}</span><span>{exportSize === 'original' ? 'Original size' : `${exportWidth} × ${exportHeight}`}</span></div>
        <div className="export-actions"><button className="ghost" onClick={() => setExportOpen(false)}>Cancel</button><button className="primary" onClick={runExport} disabled={exporting}><Download size={16} />{exporting ? 'Exporting…' : 'Export'}</button></div>
      </div>
    </div>}
    {notice && <div className={`notice ${notice.tone}`}>{notice.text}</div>}
  </div>;
}

createRoot(document.getElementById('root')!).render(<App />);
