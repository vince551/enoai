import React, { useEffect, useRef, useState } from 'react';
import WorkspaceFeatures from './WorkspaceFeatures.jsx';
import MediaStudio from './MediaStudio.jsx';
import FormattedMessage from './FormattedMessage.jsx';
import {
  Activity, ArrowDown, ArrowRight, ArrowUpRight, AudioLines, BarChart3,
  BookOpen, Bot, BriefcaseBusiness, Check, ChevronDown, CircleHelp,
  Code2, Command, Compass, FileText, FolderKanban, Globe2, GraduationCap,
  LayoutGrid, Menu, MessageSquare, Mic, Paperclip, Plus, Search, Send, ImagePlus,
  Settings2, Sparkles, WandSparkles, X, Zap, Archive, FolderPlus, Save,
  ArrowLeft, Clock3, MoreHorizontal, ShieldCheck, Copy, Download, RefreshCw, ThumbsUp, ThumbsDown
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

function readJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch { return fallback; }
}

function makeConversation(messages = [], projectId = null, studio = 'AI Workspace') {
  const firstPrompt = messages.find(message => message.role === 'user')?.content || 'New conversation';
  return {
    id: 'conversation-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    title: firstPrompt.slice(0, 58) + (firstPrompt.length > 58 ? '…' : ''),
    projectId,
    studio,
    messages,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function App() {
  const [active, setActive] = useState('Overview');
  const [prompt, setPrompt] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const [mode, setMode] = useState('Balanced');
  const [notice, setNotice] = useState('Your workspace is ready. Connect an AI provider to start generating.');
  const [showNotice, setShowNotice] = useState(true);
  const [projects, setProjects] = useState(() => readJson('vincora-projects', []));
  const [conversations, setConversations] = useState(() => {
    const saved = readJson('vincora-conversations', null);
    if (Array.isArray(saved)) return saved;
    const current = readJson('vincora-chat-messages', null);
    const legacy = current ? null : readJson('vexon-chat-messages', []);
    const oldMessages = Array.isArray(current) ? current : (Array.isArray(legacy) ? legacy : []);
    return oldMessages.length ? [makeConversation(oldMessages)] : [];
  });
  const [activeConversationId, setActiveConversationId] = useState(() => conversations[0]?.id || null);
  const [selectedProjectId, setSelectedProjectId] = useState(() => conversations[0]?.projectId || null);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef(null);
  const composerRef = useRef(null);
  const [personalContext, setPersonalContext] = useState(() => readJson('vincora-include-personal-context', false) ? readJson('vincora-personal-context', '') : '');

  const activeConversation = conversations.find(item => item.id === activeConversationId) || null;
  const messages = activeConversation?.messages || [];
  const selectedProject = projects.find(item => item.id === selectedProjectId) || null;
  const projectConversations = conversations.filter(item => item.projectId === selectedProjectId);
  const recentConversations = conversations.slice().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).slice(0, 6);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, sending, activeConversationId]);

  useEffect(() => {
    try { localStorage.setItem('vincora-projects', JSON.stringify(projects)); }
    catch { setNotice('This browser could not save projects.'); setShowNotice(true); }
  }, [projects]);

  useEffect(() => {
    try {
      localStorage.setItem('vincora-conversations', JSON.stringify(conversations));
      const latestLegacyThread = conversations.find(item => item.id === activeConversationId) || conversations[0];
      if (latestLegacyThread) localStorage.setItem('vincora-chat-messages', JSON.stringify(latestLegacyThread.messages.slice(-80)));
    } catch { setNotice('This browser could not save conversation history.'); setShowNotice(true); }
  }, [conversations, activeConversationId]);

  const updateConversation = (conversationId, updater) => {
    setConversations(current => current.map(item => item.id === conversationId ? updater(item) : item));
  };

  const startNewConversation = () => {
    setActiveConversationId(null);
    setSelectedProjectId(null);
    setActive('AI Workspace');
    setPrompt('');
    setMobileNav(false);
  };

  const createProject = () => {
    const name = projectName.trim();
    if (!name) return;
    const project = {
      id: 'project-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      name,
      description: projectDescription.trim(),
      context: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archived: false
    };
    setProjects(current => [project, ...current]);
    setSelectedProjectId(project.id);
    setProjectName('');
    setProjectDescription('');
    setShowProjectForm(false);
    setActive('Project Detail');
    setNotice('Project created. Add a brief so VINCORA can understand what you are working towards.');
    setShowNotice(true);
  };

  const openProject = (project) => {
    setSelectedProjectId(project.id);
    setActive('Project Detail');
    setActiveConversationId(null);
    setMobileNav(false);
  };

  const updateProject = (projectId, patch) => {
    setProjects(current => current.map(item => item.id === projectId
      ? { ...item, ...patch, updatedAt: new Date().toISOString() }
      : item));
  };

  const archiveProject = (projectId) => {
    updateProject(projectId, { archived: true });
    setActive('My Projects');
    setNotice('Project archived. Its conversations have been preserved.');
    setShowNotice(true);
  };

  const submitPrompt = async () => {
    const text = prompt.trim();
    if (!text || sending) return;
    const conversationId = activeConversationId || ('conversation-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7));
    const existing = conversations.find(item => item.id === conversationId);
    const base = existing || makeConversation([], selectedProjectId, active === 'Overview' ? 'AI Workspace' : active);
    const nextMessages = [...base.messages, { role: 'user', content: text, id: Date.now() }];
    const nextConversation = { ...base, id: conversationId, title: existing?.title || (text.slice(0, 58) + (text.length > 58 ? '…' : '')), projectId: base.projectId || selectedProjectId, studio: active, mode, messages: nextMessages, updatedAt: new Date().toISOString() };
    setConversations(current => existing
      ? current.map(item => item.id === conversationId ? nextConversation : item)
      : [nextConversation, ...current]);
    setActiveConversationId(conversationId);
    setPrompt('');
    if (composerRef.current) composerRef.current.style.height = '';
    setSending(true);
    setNotice('VINCORA is preparing your response with its free model.');
    setShowNotice(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.slice(-12).map(({ role, content }) => ({ role, content })),
          studio: active,
          mode,
          projectContext: [selectedProject?.context, personalContext].filter(Boolean).join('\n\nUSER PERSONAL CONTEXT:\n')
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'VINCORA could not complete that request.');
      updateConversation(conversationId, current => ({
        ...current,
        messages: [...current.messages, { role: 'assistant', content: data.text, id: Date.now() + 1 }],
        updatedAt: new Date().toISOString()
      }));
      setNotice('Response generated using VINCORA’s free AI model.');
      setShowNotice(true);
    } catch (error) {
      updateConversation(conversationId, current => ({
        ...current,
        messages: [...current.messages, { role: 'assistant', content: "I couldn't complete that request. " + error.message + " Your question is still available above; you can try again.", id: Date.now() + 1, error: true }],
        updatedAt: new Date().toISOString()
      }));
      setNotice(error.message);
      setShowNotice(true);
    } finally {
      setSending(false);
    }
  };

  const setMessageFeedback = (messageId, feedback) => {
    if (!activeConversationId) return;
    updateConversation(activeConversationId, current => ({
      ...current,
      messages: current.messages.map(message => message.id === messageId
        ? { ...message, feedback: message.feedback === feedback ? null : feedback }
        : message),
      updatedAt: new Date().toISOString()
    }));
  };

  const copyAnswer = async (content) => {
    try { await navigator.clipboard.writeText(content); setNotice('Answer copied to clipboard.'); }
    catch { setNotice('Clipboard access was unavailable in this browser.'); }
    setShowNotice(true);
  };

  const exportAnswer = (content, format) => {
    const extension = format === 'markdown' ? 'md' : 'txt';
    const mime = format === 'markdown' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8';
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vincora-answer.' + extension;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const regenerateResponse = async (messageId) => {
    if (sending || !activeConversation) return;
    const targetIndex = activeConversation.messages.findIndex(message => message.id === messageId);
    if (targetIndex < 0 || activeConversation.messages[targetIndex].role !== 'assistant') return;
    let userIndex = targetIndex - 1;
    while (userIndex >= 0 && activeConversation.messages[userIndex].role !== 'user') userIndex -= 1;
    if (userIndex < 0) return;
    const history = activeConversation.messages.slice(0, userIndex + 1);
    const project = projects.find(item => item.id === activeConversation.projectId);
    const studio = activeConversation.studio || 'AI Workspace';
    setSending(true);
    setNotice('VINCORA is generating a fresh version of this answer.');
    setShowNotice(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.slice(-12).map(({ role, content }) => ({ role, content })),
          studio,
          mode: activeConversation.mode || mode,
          projectContext: [project?.context, personalContext].filter(Boolean).join('\n\nUSER PERSONAL CONTEXT:\n')
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'VINCORA could not regenerate that answer.');
      updateConversation(activeConversation.id, current => ({
        ...current,
        messages: current.messages.map(message => message.id === messageId ? { ...message, content: data.text, error: false, regeneratedAt: new Date().toISOString() } : message),
        updatedAt: new Date().toISOString()
      }));
      setNotice('A fresh answer has replaced the previous version.');
    } catch (error) { setNotice(error.message); }
    finally { setShowNotice(true); setSending(false); }
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
          <span className="brand-mark"><span className="brand-glyph">V</span></span>
          <span>VINCORA<span className="brand-period"> AI</span></span>
        </a>
        <div className="workspace-switch">
          <div className="workspace-avatar">V</div>
          <div className="workspace-meta"><strong>Personal workspace</strong><span>Free plan</span></div>
          <ChevronDown size={15} />
        </div>
        <button className="new-chat" onClick={startNewConversation}>
          <Plus size={17} /> New conversation
          <span className="shortcut">⌘ K</span>
        </button>
        <div className="nav-label">WORKSPACE</div>
        <nav className="main-nav">
          {[
            { label: 'Overview', icon: LayoutGrid },
            { label: 'AI Workspace', icon: MessageSquare },
            { label: 'My Projects', icon: FolderKanban },
            { label: 'Creation Centre', icon: FileText },
            { label: 'Workflows', icon: Activity },
            { label: 'Memory & Context', icon: ShieldCheck },
            { label: 'Image & Video Studio', icon: ImagePlus }
          ].map(({ label, icon: Icon }) => (
            <button key={label} className={active === label || (label === 'My Projects' && active === 'Project Detail') ? 'nav-item active' : 'nav-item'} onClick={() => { setActive(label); setMobileNav(false); }}>
              <Icon size={17} /><span>{label}</span>{label === 'My Projects' && <span className="nav-count">{projects.filter(project => !project.archived).length}</span>}
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
        {recentConversations.length > 0 && <div className="recent-chats">
          <div className="nav-label recent-chats-label">RECENT CHATS</div>
          {recentConversations.map(conversation => <button key={conversation.id} className={activeConversationId === conversation.id ? 'recent-chat active' : 'recent-chat'} onClick={() => {
            setActiveConversationId(conversation.id);
            setSelectedProjectId(conversation.projectId || null);
            setActive(conversation.studio || 'AI Workspace');
            setMobileNav(false);
          }} title={conversation.title}>
            <MessageSquare size={14}/><span>{conversation.title || 'Untitled conversation'}</span>
          </button>)}
        </div>}
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
            <button className="upgrade-button" onClick={() => setNotice('VINCORA plans will be available soon.')}> <Zap size={14} /> Upgrade</button>
          </div>
        </header>

        <div className="content-wrap">
          {active === 'Image & Video Studio' ? <MediaStudio /> : ['Creation Centre', 'Workflows', 'Memory & Context'].includes(active) ? <WorkspaceFeatures active={active} conversations={conversations} projects={projects} onContextChange={setPersonalContext} onUseWorkflowPrompt={workflowPrompt => { setActive('AI Workspace'); setPrompt(workflowPrompt); setActiveConversationId(null); setSelectedProjectId(null); }} /> : active === 'My Projects' || active === 'Project Detail' ? (
            <section className="projects-page">
              <div className="projects-page-heading">
                <div>
                  <div className="eyebrow"><span className="eyebrow-dot" /> YOUR WORKSPACE</div>
                  {active === 'Project Detail' && selectedProject ? <input className="project-name-input" aria-label="Project name" value={selectedProject.name} onChange={event => updateProject(selectedProject.id, { name: event.target.value })} maxLength={80}/> : <h1>Your projects.</h1>}
                  <p className="welcome-copy">{active === 'Project Detail' ? 'Keep your goals, context and conversations together.' : 'Organise ongoing work and pick up exactly where you left off.'}</p>
                </div>
                <div className="project-page-actions">
                  {active === 'Project Detail' && <button className="project-secondary-button" onClick={() => setActive('My Projects')}><ArrowLeft size={15}/> All projects</button>}
                  <button className="project-primary-button" onClick={() => { setShowProjectForm(true); setActive('My Projects'); }}><FolderPlus size={15}/> New project</button>
                </div>
              </div>

              {showProjectForm && (
                <div className="project-form-panel">
                  <div className="project-form-heading"><div><strong>Create a project</strong><span>Give your work a home in VINCORA.</span></div><button aria-label="Close project form" onClick={() => setShowProjectForm(false)}><X size={16}/></button></div>
                  <label>Project name</label>
                  <input value={projectName} onChange={event => setProjectName(event.target.value)} placeholder="e.g. Launch my online business" maxLength={80}/>
                  <label>Short description <span>Optional</span></label>
                  <textarea value={projectDescription} onChange={event => setProjectDescription(event.target.value)} placeholder="What are you trying to accomplish?" rows={2} maxLength={240}/>
                  <div className="project-form-actions"><button className="project-secondary-button" onClick={() => setShowProjectForm(false)}>Cancel</button><button className="project-primary-button" onClick={createProject} disabled={!projectName.trim()}><Plus size={14}/> Create project</button></div>
                </div>
              )}

              {active === 'My Projects' ? (
                <>
                  <div className="project-toolbar">
                    <div className="project-search"><Search size={15}/><input value={projectSearch} onChange={event => setProjectSearch(event.target.value)} placeholder="Search projects"/></div>
                    <span>{projects.filter(project => !project.archived).length} active projects</span>
                  </div>
                  <div className="project-card-grid">
                    {projects.filter(project => !project.archived && (project.name + ' ' + project.description).toLowerCase().includes(projectSearch.toLowerCase())).map(project => {
                      const count = conversations.filter(conversation => conversation.projectId === project.id).length;
                      return <button className="project-card" key={project.id} onClick={() => openProject(project)}>
                        <div className="project-card-top"><span className="project-card-icon"><FolderKanban size={18}/></span><MoreHorizontal size={17}/></div>
                        <strong>{project.name}</strong>
                        <p>{project.description || 'No description added yet.'}</p>
                        <div className="project-card-meta"><span><MessageSquare size={12}/> {count} conversations</span><span><Clock3 size={12}/> {new Date(project.updatedAt).toLocaleDateString()}</span></div>
                      </button>;
                    })}
                  </div>
                  {!projects.some(project => !project.archived && (project.name + ' ' + project.description).toLowerCase().includes(projectSearch.toLowerCase())) && (
                    <div className="projects-empty"><div className="empty-project-icon"><FolderKanban size={21}/></div><strong>{projectSearch ? 'No matching projects.' : 'A place for your next big idea.'}</strong><span>{projectSearch ? 'Try another search.' : 'Create a project to keep its conversations and context together.'}</span><button className="project-primary-button" onClick={() => setShowProjectForm(true)}><Plus size={14}/> Create your first project</button></div>
                  )}
                  {projects.some(project => project.archived) && <div className="archived-note"><Archive size={14}/> {projects.filter(project => project.archived).length} archived projects are safely retained in this browser.</div>}
                </>
              ) : selectedProject ? (
                <>
                  <div className="project-detail-grid">
                    <div className="project-detail-main">
                      <div className="project-detail-panel">
                        <div className="project-panel-title"><div><strong>Project brief</strong><span>Give VINCORA the background it should use when helping with this project.</span></div><Save size={17}/></div>
                        <label>Project description</label>
                        <textarea value={selectedProject.description} onChange={event => updateProject(selectedProject.id, { description: event.target.value })} rows={2} maxLength={500} placeholder="What is this project about?"/>
                        <label>Context and goals</label>
                        <textarea className="project-context-input" value={selectedProject.context || ''} onChange={event => updateProject(selectedProject.id, { context: event.target.value })} rows={7} maxLength={3000} placeholder="Add background, goals, important decisions, constraints, preferred tools, and what success looks like. VINCORA will use this context when you chat inside this project."/>
                        <div className="context-footnote">{(selectedProject.context || '').length}/3000 characters · Saved automatically in this browser</div>
                      </div>
                      <div className="project-detail-panel">
                        <div className="project-panel-title"><div><strong>Project conversations</strong><span>Every conversation started here stays linked to this project.</span></div><MessageSquare size={17}/></div>
                        {projectConversations.length ? projectConversations.slice().sort((a,b) => b.updatedAt.localeCompare(a.updatedAt)).map(conversation => <button className="project-conversation-row" key={conversation.id} onClick={() => { setSelectedProjectId(selectedProject.id); setActiveConversationId(conversation.id); setActive(conversation.studio || 'AI Workspace'); setMobileNav(false); }}><span className="conversation-row-icon"><MessageSquare size={15}/></span><span><strong>{conversation.title}</strong><small>{conversation.messages.length} messages · {new Date(conversation.updatedAt).toLocaleString()}</small></span><ArrowUpRight size={15}/></button>) : <div className="project-conversations-empty">No conversations yet. Start one and VINCORA will keep it with this project.</div>}
                        <button className="project-primary-button project-start-chat" onClick={() => { setActiveConversationId(null); setActive('AI Workspace'); setPrompt(''); setMobileNav(false); }}><Plus size={14}/> Start project conversation</button>
                      </div>
                    </div>
                    <aside className="project-detail-side">
                      <div className="project-detail-panel"><strong>Project details</strong><div className="project-stat"><span>Status</span><b>Active</b></div><div className="project-stat"><span>Conversations</span><b>{projectConversations.length}</b></div><div className="project-stat"><span>Created</span><b>{new Date(selectedProject.createdAt).toLocaleDateString()}</b></div><button className="archive-project-button" onClick={() => archiveProject(selectedProject.id)}><Archive size={14}/> Archive project</button></div>
                    </aside>
                  </div>
                </>
              ) : <div className="projects-empty"><strong>Project not found.</strong><button className="project-primary-button" onClick={() => setActive('My Projects')}>Return to projects</button></div>}
            </section>
          ) : (
          <>
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
              <div className="hero-tag"><Sparkles size={13} /> THE VINCORA AI WORKSPACE</div>
              <h2>What are we <span>working on</span><br className="desktop-break" /> today?</h2>
              <p>From a quick question to a full project, bring your next idea here.</p>
              {messages.length > 0 && <div className="chat-thread" aria-live="polite">
                <div className="chat-thread-head"><span>{activeConversation?.title || 'Conversation'}</span><button onClick={() => { if (window.confirm('Clear all messages in this conversation? This cannot be undone.')) updateConversation(activeConversationId, current => ({ ...current, messages: [], updatedAt: new Date().toISOString() })); }}>Clear conversation</button></div>
                {messages.slice(-16).map(message => <div className={"chat-message " + (message.role === 'user' ? 'from-user' : 'from-vincora')} key={message.id}>
                  <div className="chat-message-label">{message.role === 'user' ? 'You' : 'VINCORA'}</div>
                  <div className={"chat-message-content " + (message.role === "assistant" ? "assistant-answer-content" : "user-message-content")}>{message.role === "assistant" && !message.error ? <FormattedMessage content={message.content}/> : message.content}</div>
                  {message.role === 'assistant' && <div className="message-actions">
                    {!message.error && <>
                      <button type="button" onClick={() => copyAnswer(message.content)} title="Copy answer"><Copy size={13}/> <span>Copy</span></button>
                      <button type="button" onClick={() => exportAnswer(message.content, 'markdown')} title="Export Markdown"><Download size={13}/> <span>Markdown</span></button>
                      <button type="button" onClick={() => exportAnswer(message.content, 'text')} title="Export plain text"><FileText size={13}/> <span>Text</span></button>
                    </>}
                    <button type="button" onClick={() => regenerateResponse(message.id)} disabled={sending} title={message.error ? 'Retry response' : 'Regenerate answer'}><RefreshCw size={13}/> <span>{message.error ? 'Retry' : 'Regenerate'}</span></button>
                    {!message.error && <>
                      <button type="button" className={message.feedback === 'up' ? 'feedback-selected' : ''} onClick={() => setMessageFeedback(message.id, 'up')} aria-label="Mark answer helpful" title="Helpful"><ThumbsUp size={13}/></button>
                      <button type="button" className={message.feedback === 'down' ? 'feedback-selected' : ''} onClick={() => setMessageFeedback(message.id, 'down')} aria-label="Mark answer not helpful" title="Not helpful"><ThumbsDown size={13}/></button>
                    </>}
                  </div>}
                </div>)}
                {sending && <div className="chat-message from-vincora"><div className="chat-message-label">VINCORA</div><div className="chat-typing"><span /><span /><span /> Thinking…</div></div>}
                <div ref={chatEndRef} />
              </div>}
              <div className="composer">
                <textarea ref={composerRef} value={prompt} onChange={e => { setPrompt(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 180) + 'px'; }} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitPrompt(); } }} placeholder="Ask VINCORA anything, or describe what you want to create..." rows={2} />
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
              {projects.filter(project => !project.archived).length ? <div className="home-project-list">{projects.filter(project => !project.archived).slice(0,3).map(project => <button key={project.id} onClick={() => openProject(project)}><span className="quick-icon"><FolderKanban size={15}/></span><span>{project.name}</span><ArrowUpRight size={14}/></button>)}</div> : <div className="empty-projects"><div className="empty-project-icon"><FolderKanban size={20} /></div><strong>A fresh start.</strong><span>Your projects will appear here when you create one.</span><button onClick={() => { setShowProjectForm(true); setActive('My Projects'); }}>Create a project <Plus size={14} /></button></div>}
            </div>
          </section>

          <footer className="footer"><span>© 2026 VINCORA AI</span><span>Built for ideas that move forward.</span><a href="mailto:hello@vexon.ai">Contact support <ArrowUpRight size={12} /></a></footer>
          </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;