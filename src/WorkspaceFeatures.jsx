import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Plus, Download, Trash2, Save, Sparkles, CheckCircle2, Circle, ArrowRight, ShieldCheck, RotateCcw } from 'lucide-react';

const read = (key, fallback) => {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; }
  catch { return fallback; }
};

const workflowTemplates = [
  { id: 'study-plan', title: 'Study plan', description: 'Turn a subject or exam goal into a practical revision plan.', steps: ['Define the target exam, subjects and deadline', 'Assess current strengths and weak areas', 'Build a weekly study timetable', 'Add practice, revision and rest checkpoints', 'Review progress and adjust the plan'] },
  { id: 'research', title: 'Research project', description: 'Move from a research question to a clear, evidence-led report.', steps: ['Write a focused research question', 'List credible sources and evidence needed', 'Collect and organise findings', 'Compare evidence and identify limitations', 'Draft, fact-check and format the report'] },
  { id: 'business-launch', title: 'Business launch', description: 'Plan a small business launch without skipping validation.', steps: ['Describe the customer problem and proposed solution', 'Identify target customers and competitors', 'Test demand with a low-cost experiment', 'Estimate costs, pricing and basic cash flow', 'Set a launch checklist and review metrics'] },
  { id: 'website', title: 'Website project', description: 'Structure a website build from requirements to launch.', steps: ['Define users, goals and essential pages', 'Create a content and feature checklist', 'Choose a simple technical architecture', 'Build and test responsive pages', 'Review accessibility, performance and deployment'] }
];

function downloadText(filename, text, type = 'text/markdown') {
  const blob = new Blob([text], { type: type + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.click();
  URL.revokeObjectURL(url);
}

export default function WorkspaceFeatures({ active, conversations = [], projects = [], onUseWorkflowPrompt, onContextChange }) {
  const [documents, setDocuments] = useState(() => read('vincora-documents', []));
  const [selectedId, setSelectedId] = useState(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [search, setSearch] = useState('');
  const [workflowId, setWorkflowId] = useState('study-plan');
  const [workflowRuns, setWorkflowRuns] = useState(() => read('vincora-workflow-runs', {}));
  const [context, setContext] = useState(() => read('vincora-personal-context', ''));
  const [includeContext, setIncludeContext] = useState(() => read('vincora-include-personal-context', false));
  const [notice, setNotice] = useState('');

  useEffect(() => { try { localStorage.setItem('vincora-documents', JSON.stringify(documents)); } catch { setNotice('Could not save documents in this browser.'); } }, [documents]);
  useEffect(() => { try { localStorage.setItem('vincora-workflow-runs', JSON.stringify(workflowRuns)); } catch { setNotice('Could not save workflow progress.'); } }, [workflowRuns]);
  useEffect(() => {
    try {
      localStorage.setItem('vincora-personal-context', context);
      localStorage.setItem('vincora-include-personal-context', JSON.stringify(includeContext));
    } catch { setNotice('Could not save personal context in this browser.'); }
    onContextChange?.(includeContext ? context : '');
  }, [context, includeContext, onContextChange]);

  const selectedDoc = documents.find(item => item.id === selectedId);
  const activeWorkflow = workflowTemplates.find(item => item.id === workflowId) || workflowTemplates[0];
  const run = workflowRuns[workflowId] || { completed: [], notes: '' };
  const conversationSources = useMemo(() => conversations.flatMap(conversation =>
    (conversation.messages || []).filter(message => message.role === 'assistant' && message.content)
      .map(message => ({ id: conversation.id + ':' + message.id, conversationTitle: conversation.title, content: message.content }))
  ), [conversations]);

  const newDocument = () => {
    const doc = { id: 'doc-' + Date.now(), title: 'Untitled document', content: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    setDocuments(current => [doc, ...current]); setSelectedId(doc.id); setTitle(doc.title); setBody('');
  };
  const openDocument = doc => { setSelectedId(doc.id); setTitle(doc.title); setBody(doc.content); };
  const saveDocument = () => {
    if (!selectedId) return;
    setDocuments(current => current.map(doc => doc.id === selectedId ? { ...doc, title: title.trim() || 'Untitled document', content: body, updatedAt: new Date().toISOString() } : doc));
    setNotice('Document saved on this device.');
  };
  const deleteDocument = () => {
    if (!selectedId) return;
    setDocuments(current => current.filter(doc => doc.id !== selectedId)); setSelectedId(null); setTitle(''); setBody('');
    setNotice('Document deleted from this browser.');
  };
  const importAnswer = answer => {
    const doc = { id: 'doc-' + Date.now(), title: 'AI draft — ' + answer.conversationTitle.slice(0, 42), content: answer.content, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    setDocuments(current => [doc, ...current]); setSelectedId(doc.id); setTitle(doc.title); setBody(doc.content); setNotice('Assistant response added as an editable document.');
  };
  const toggleStep = index => {
    const completed = run.completed.includes(index) ? run.completed.filter(item => item !== index) : [...run.completed, index];
    setWorkflowRuns(current => ({ ...current, [workflowId]: { ...run, completed } }));
  };
  const updateRunNotes = notes => setWorkflowRuns(current => ({ ...current, [workflowId]: { ...run, notes } }));

  return <section className="workspace-features">
    <div className="features-heading"><div><div className="eyebrow"><span className="eyebrow-dot" /> VINCORA WORKSPACE</div><h1>{active === 'Creation Centre' ? 'Creation Centre.' : active === 'Workflows' ? 'Workflows.' : 'Memory & context.'}</h1><p>{active === 'Creation Centre' ? 'Create, edit and export useful work products.' : active === 'Workflows' ? 'Move complex goals forward one clear step at a time.' : 'Control what VINCORA remembers about your preferences.'}</p></div></div>

    {active === 'Creation Centre' && <div className="feature-layout">
      <aside className="feature-panel document-library">
        <div className="feature-panel-head"><div><strong>Your documents</strong><span>{documents.length} saved on this device</span></div><button className="feature-primary" onClick={newDocument}><Plus size={14}/> New</button></div>
        <input className="feature-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search documents"/>
        <div className="document-list">{documents.filter(doc => (doc.title + ' ' + doc.content).toLowerCase().includes(search.toLowerCase())).map(doc => <button key={doc.id} className={selectedId === doc.id ? 'document-row selected' : 'document-row'} onClick={() => openDocument(doc)}><FileText size={15}/><span><b>{doc.title}</b><small>{new Date(doc.updatedAt).toLocaleDateString()}</small></span></button>)}</div>
        {documents.length === 0 && <p className="feature-muted">Your saved documents will appear here.</p>}
      </aside>
      <div className="feature-panel editor-panel">
        {selectedDoc ? <>
          <div className="feature-panel-head"><div><strong>Document editor</strong><span>Edits are saved when you select Save.</span></div><div className="feature-actions"><button className="feature-secondary" onClick={() => downloadText((title || 'vincora-document').replace(/[^a-z0-9-_ ]/gi,'').trim().replace(/\s+/g,'-') + '.md', '# ' + title + '\n\n' + body)}><Download size={14}/> Export .md</button><button className="feature-secondary" onClick={() => downloadText((title || 'vincora-document') + '.txt', body, 'text/plain')}>.txt</button></div></div>
          <input className="document-title-input" value={title} onChange={event => setTitle(event.target.value)} aria-label="Document title"/>
          <textarea className="document-editor" value={body} onChange={event => setBody(event.target.value)} placeholder="Write here, or import an assistant response below…"/>
          <div className="feature-actions editor-actions"><button className="feature-danger" onClick={deleteDocument}><Trash2 size={14}/> Delete</button><button className="feature-primary" onClick={saveDocument}><Save size={14}/> Save document</button></div>
        </> : <div className="feature-empty"><FileText size={27}/><strong>Start creating.</strong><span>Create a document or turn an AI response into an editable draft.</span><button className="feature-primary" onClick={newDocument}><Plus size={14}/> New document</button></div>}
        <div className="import-answers"><strong><Sparkles size={15}/> Recent AI responses</strong>{conversationSources.slice(-6).reverse().map(answer => <div className="answer-import-row" key={answer.id}><span><b>{answer.conversationTitle}</b><small>{answer.content.slice(0,100).replace(/\s+/g,' ')}…</small></span><button className="feature-secondary" onClick={() => importAnswer(answer)}>Add to documents</button></div>)}{conversationSources.length === 0 && <p className="feature-muted">AI responses will be available here after you start a conversation.</p>}</div>
      </div>
    </div>}

    {active === 'Workflows' && <div className="workflow-layout">
      <div className="feature-panel"><div className="feature-panel-head"><div><strong>Workflow templates</strong><span>Choose a guided process to begin.</span></div></div>{workflowTemplates.map(item => <button key={item.id} className={workflowId === item.id ? 'workflow-choice selected' : 'workflow-choice'} onClick={() => setWorkflowId(item.id)}><b>{item.title}</b><small>{item.description}</small></button>)}</div>
      <div className="feature-panel workflow-detail"><div className="feature-panel-head"><div><strong>{activeWorkflow.title}</strong><span>{run.completed.length} of {activeWorkflow.steps.length} steps completed</span></div><button className="feature-secondary" onClick={() => setWorkflowRuns(current => ({ ...current, [workflowId]: { completed: [], notes: '' } }))}><RotateCcw size={13}/> Reset</button></div>
        <div className="workflow-progress"><span style={{ width: (run.completed.length / activeWorkflow.steps.length * 100) + '%' }}/></div>
        {activeWorkflow.steps.map((step, index) => <button key={step} className="workflow-step" onClick={() => toggleStep(index)}>{run.completed.includes(index) ? <CheckCircle2 size={19}/> : <Circle size={19}/>}<span><b>Step {index + 1}</b><small>{step}</small></span><ArrowRight size={15}/></button>)}
        <label className="feature-label">Working notes</label><textarea className="workflow-notes" value={run.notes} onChange={event => updateRunNotes(event.target.value)} placeholder="Record decisions, links, blockers and next actions…"/>
        <button className="feature-primary" onClick={() => onUseWorkflowPrompt?.('Help me work through the ' + activeWorkflow.title + ' workflow. Here are my current notes: ' + (run.notes || 'No notes yet') + '. Guide me through the next incomplete step: ' + (activeWorkflow.steps.find((_, index) => !run.completed.includes(index)) || 'Review the completed workflow') )}><Sparkles size={14}/> Work on next step with VINCORA</button>
      </div>
    </div>}

    {active === 'Memory & Context' && <div className="feature-panel memory-panel">
      <div className="feature-panel-head"><div><strong>Your personal context</strong><span>Stored only in this browser. You can inspect, change or delete it at any time.</span></div><ShieldCheck size={20}/></div>
      <div className="memory-notice">Your context is not sent with AI requests unless you turn on the sharing control below. Project briefs remain separate.</div>
      <label className="feature-label">Preferences and background for VINCORA</label>
      <textarea className="memory-editor" value={context} maxLength={3000} onChange={event => setContext(event.target.value)} placeholder="For example: preferred response style, current goals, tools you use, or recurring constraints. Avoid passwords and sensitive information."/>
      <div className="memory-controls"><span>{context.length}/3000 characters</span><label><input type="checkbox" checked={includeContext} onChange={event => setIncludeContext(event.target.checked)}/> Allow VINCORA to use this context in AI conversations</label></div>
      <div className="feature-actions"><button className="feature-danger" onClick={() => { setContext(''); setIncludeContext(false); setNotice('Personal context cleared from this browser.'); }}> <Trash2 size={14}/> Delete personal context</button><button className="feature-primary" onClick={() => setNotice('Your context settings are saved on this device.')}><Save size={14}/> Save preferences</button></div>
      {notice && <p className="feature-status">{notice}</p>}
      <p className="feature-muted">This is device-local memory, not account sync. Clearing browser storage or changing devices may make it unavailable. Do not store passwords, API keys, or highly sensitive personal details here.</p>
    </div>}
    {notice && active !== 'Memory & Context' && <p className="feature-status">{notice}</p>}
  </section>;
}
