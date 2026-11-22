import React, { useEffect, useState } from 'react';
import {
  Activity, ArrowDown, ArrowRight, ArrowUpRight, AudioLines, BarChart3,
  BookOpen, Bot, BriefcaseBusiness, Check, ChevronDown, CircleHelp,
  Code2, Command, Compass, FileText, FolderKanban, Globe2, GraduationCap,
  LayoutGrid, Menu, MessageSquare, Mic, Paperclip, Plus, Search, Send,
  Settings2, Sparkles, WandSparkles, X, Zap
} from 'lucide-react';

const modules = [
  { icon: FileText, title: 'Write Studio', detail: 'Create polished writing, from first draft to final copy.', tone: 'violet', prompt: 'Help me write a clear, compelling document about ' },
  { icon: BriefcaseBusiness, title: 'Business Assistant', detail: 'Plan, organize and grow your business with confidence.', tone: 'amber', prompt: 'Help me build a practical business plan for ' },
  { icon: Code2, title: 'Developer Studio', detail: 'Build, understand and debug software faster.', tone: 'blue', prompt: 'Help me build or debug ' },
  { icon: Globe2, title: 'Research Assistant', detail: 'Explore topics and turn information into insight.', tone: 'cyan', prompt: 'Research and explain ' },
  { icon: GraduationCap, title: 'Learning Assistant', detail: 'Understand difficult ideas and learn at your pace.', tone: 'green', prompt: 'Teach me ' },
  { icon: FolderKanban, title: 'Workflow Studio', detail: 'Turn repeatable work into clear, actionable steps.', tone: 'pink', prompt: 'Design a workflow for ' },
];

const quickStarts = [
  { icon: FileText, label: 'Draft a document', prompt: 'Help me draft a professional document about ' },
  { icon: Code2, label: 'Write some code', prompt: 'Help me write code for ' },
  { icon: BarChart3, label: 'Analyze an idea', prompt: 'Analyze this idea and give me a practical action plan: ' },
];

function App() {
  const [active, setActive] = useState('Overview');
  const [prompt, setPrompt] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const [mode, setMode] = useState('Balanced');
  const [notice, setNotice] = useState('Your workspace is ready. Connect an AI provider to start generating.');
  const [showNotice, setShowNotice] = useState(true);
  const [messages, setMessages] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vexon-chat-messages') || '[]'); }
    catch { return []; }
  });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    try { localStorage.setItem('vexon-chat-messages', JSON.stringify(messages.slice(-80))); }
    catch { setNotice('This browser could not save chat history.'); setShowNotice(true); }
  }, [messages]);

  const submitPrompt = async () => {
    const text = prompt.trim();
    if (!text || sending) return;
    const nextMessages = [...messages, { role: 'user', content: text, id: Date.now() }];
    setMessages(nextMessages);
    setPrompt('');
    setSending(true);
    setNotice('Vexon is preparing your response with its free model.');
    setShowNotice(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages.slice(-12).map(({ role, content }) => ({ role, content })), studio: active, mode })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Vexon could not complete that request.');
      setMessages(current => [...current, { role: 'assistant', content: data.text, id: Date.now() + 1 }]);
      setNotice('Response generated using Vexon’s free AI model.');
      setShowNotice(true);
    } catch (error) {
      setMessages(current => [...current, { role: 'assistant', content: "I couldn't complete that request. " + error.message + " Your question is still available above; you can try again.", id: Date.now() + 1, error: true }]);
      setNotice(error.message);
      setShowNotice(true);
    } finally {
      setSending(false);
    }
  };

  const selectModule = (item) => {
    setActive(item.title);
    setPrompt(item.prompt);
    setMobileNav(false);
    document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <a className="brand" href="#" onClick={() => setActive('Overview')}>
          <span className="brand-mark"><AudioLines size={21} strokeWidth={2.4} /></span>
          <span>vexon<span className="brand-period">.</span></span>
        </a>
        <div className="workspace-switch">
          <div className="workspace-avatar">V</div>
          <div className="workspace-meta"><strong>Personal workspace</strong><span>Free plan</span></div>
          <ChevronDown size={15} />
        </div>
        <button className="new-chat" onClick={() => { setActive('Overview'); setPrompt(''); setMessages([]); setMobileNav(false); }}>
          <Plus size={17} /> New workspace
          <span className="shortcut">⌘ K</span>
        </button>
        <div className="nav-label">WORKSPACE</div>
        <nav className="main-nav">
          {[
            { label: 'Overview', icon: LayoutGrid },
            { label: 'AI Workspace', icon: MessageSquare },
            { label: 'My Projects', icon: FolderKanban },
            { label: 'File Workspace', icon: FileText },
          ].map(({ label, icon: Icon }) => (
            <button key={label} className={active === label ? 'nav-item active' : 'nav-item'} onClick={() => { setActive(label); setMobileNav(false); }}>
              <Icon size={17} /><span>{label}</span>{label === 'My Projects' && <span className="nav-count">0</span>}
            </button>
          ))}
        </nav>
        <div className="nav-label tools-label">AI TOOLS</div>
        <nav className="main-nav">
          {modules.map(({ title, icon: Icon, tone }) => (
            <button key={title} className={active === title ? 'nav-item active' : 'nav-item'} onClick={() => selectModule(modules.find(m => m.title === title))}>
              <Icon size={17} className={`nav-icon-${tone}`} /><span>{title}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="usage-card">
            <div className="usage-top"><span>Monthly usage</span><span>0%</span></div>
            <div className="usage-track"><span /></div>
            <p>Your free workspace is ready.</p>
            <button onClick={() => setNotice('Plan upgrades will be available after billing is configured.')}>Explore plans <ArrowUpRight size={13} /></button>
          </div>
          <button className="nav-item"><Settings2 size={17} /><span>Settings</span></button>
          <button className="profile-row"><div className="profile-avatar">V</div><div><strong>Vince</strong><span>Personal account</span></div><ChevronDown size={15} /></button>
        </div>
      </aside>

      {mobileNav && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu" aria-label="Open menu" onClick={() => setMobileNav(true)}><Menu size={21} /></button>
          <div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><strong>{active}</strong></div>
          <div className="topbar-actions">
            <button className="help-button"><CircleHelp size={17} /><span>Help center</span></button>
            <button className="upgrade-button" onClick={() => setNotice('Vexon plans will be available soon.')}> <Zap size={14} /> Upgrade</button>
          </div>
        </header>

        <div className="content-wrap">
          <section className="welcome-row">
            <div>
              <div className="eyebrow"><span className="eyebrow-dot" /> YOUR AI WORKSPACE</div>
              <h1>Make ideas <span>happen.</span></h1>
              <p className="welcome-copy">Think clearly. Create confidently. Get things done.</p>
            </div>
            <div className="date-chip"><Activity size={15} /> Your workspace is ready</div>
          </section>

          <section className="hero-panel" id="workspace">
            <div className="hero-glow hero-glow-one" /><div className="hero-glow hero-glow-two" />
            <div className="hero-content">
              <div className="hero-tag"><Sparkles size={13} /> THE VEXON AI WORKSPACE</div>
              <h2>What are we <span>working on</span><br className="desktop-break" /> today?</h2>
              <p>From a quick question to a full project, bring your next idea here.</p>
              {messages.length > 0 && <div className="chat-thread" aria-live="polite">
                <div className="chat-thread-head"><span>Conversation</span><button onClick={() => setMessages([])}>Clear chat</button></div>
                {messages.slice(-16).map(message => <div className={"chat-message " + (message.role === 'user' ? 'from-user' : 'from-vexon')} key={message.id}>
                  <div className="chat-message-label">{message.role === 'user' ? 'You' : 'Vexon'}</div>
                  <div className="chat-message-content">{message.content}</div>
                </div>)}
                {sending && <div className="chat-message from-vexon"><div className="chat-message-label">Vexon</div><div className="chat-typing"><span /><span /><span /> Thinking…</div></div>}
              </div>}
              <div className="composer">
                <textarea value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitPrompt(); } }} placeholder="Ask Vexon anything, or describe what you want to create..." rows={2} />
                <div className="composer-bottom">
                  <div className="composer-tools">
                    <button title="Attach a file" onClick={() => setNotice('File uploads will be available when File Workspace is connected.')}><Paperclip size={16} /></button>
                    <button title="Voice input" onClick={() => setNotice('Voice input is coming soon.')}><Mic size={16} /></button>
                    <span className="tool-divider" />
                    <button className="mode-select" onClick={() => setMode(mode === 'Balanced' ? 'Deep think' : 'Balanced')}><WandSparkles size={14} /> {mode} <ChevronDown size={12} /></button>
                  </div>
                  <button className="send-button" onClick={submitPrompt} disabled={!prompt.trim() || sending} aria-label="Send prompt">{sending ? <span className="send-spinner" /> : <Send size={16} />}</button>
                </div>
              </div>
              <div className="composer-hint"><span>↵</span> to send <span>⇧ ↵</span> for new line <i>•</i> Free model · No paid fallback</div>
            </div>
            <div className="hero-orbit orbit-a" /><div className="hero-orbit orbit-b" />
            <div className="hero-symbol"><AudioLines size={30} /></div>
          </section>

          {showNotice && <div className="notice"><div className="notice-icon"><Check size={14} /></div><span>{notice}</span><button aria-label="Dismiss notice" onClick={() => setShowNotice(false)}><X size={15} /></button></div>}

          <section className="section-block">
            <div className="section-heading"><div><h3>Explore your workspace</h3><p>Purpose-built tools for the things you want to accomplish.</p></div><button className="text-link" onClick={() => setActive('AI Workspace')}>View all tools <ArrowRight size={15} /></button></div>
            <div className="module-grid">
              {modules.map(({ icon: Icon, title, detail, tone }) => (
                <button className="module-card" key={title} onClick={() => selectModule(modules.find(m => m.title === title))}>
                  <div className={`module-icon ${tone}`}><Icon size={19} /></div>
                  <div className="module-card-copy"><h4>{title}</h4><p>{detail}</p></div>
                  <ArrowUpRight className="module-arrow" size={16} />
                </button>
              ))}
            </div>
          </section>

          <section className="bottom-grid">
            <div className="quick-panel">
              <div className="section-heading compact"><div><h3>Jump right in</h3><p>Start with a popular task.</p></div><Compass size={19} /></div>
              <div className="quick-list">
                {quickStarts.map(({ icon: Icon, label, prompt: starter }) => <button key={label} onClick={() => { setPrompt(starter); document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth' }); }}><span className="quick-icon"><Icon size={16} /></span><span>{label}</span><ArrowUpRight size={15} /></button>)}
              </div>
            </div>
            <div className="projects-panel">
              <div className="section-heading compact"><div><h3>Your projects</h3><p>Everything you're working on, in one place.</p></div><FolderKanban size={19} /></div>
              <div className="empty-projects"><div className="empty-project-icon"><FolderKanban size={20} /></div><strong>A fresh start.</strong><span>Your projects will appear here when you create one.</span><button onClick={() => { setPrompt('Help me plan a new project: '); document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth' }); }}>Create a project <Plus size={14} /></button></div>
            </div>
          </section>

          <footer className="footer"><span>© 2026 Vexon AI</span><span>Built for ideas that move forward.</span><a href="mailto:hello@vexon.ai">Contact support <ArrowUpRight size={12} /></a></footer>
        </div>
      </main>
    </div>
  );
}

export default App;