import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy } from 'lucide-react';

function CodeBlock({ className = '', children, ...props }) {
  const code = String(children).replace(/\n$/, '');
  const language = /language-([\w-]+)/.exec(className)?.[1] || 'text';
  const [copied, setCopied] = React.useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="answer-code-block">
      <div className="answer-code-toolbar">
        <span>{language}</span>
        <button type="button" onClick={copyCode} aria-label="Copy code">
          {copied ? <Check size={13}/> : <Copy size={13}/>}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre><code className={className} {...props}>{code}</code></pre>
    </div>
  );
}

export default function FormattedMessage({ content = '' }) {
  return (
    <div className="formatted-answer">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h2 className="answer-heading answer-heading-main">{children}</h2>,
          h2: ({ children }) => <h2 className="answer-heading">{children}</h2>,
          h3: ({ children }) => <h3 className="answer-subheading">{children}</h3>,
          h4: ({ children }) => <h4 className="answer-subheading">{children}</h4>,
          p: ({ children }) => <p className="answer-paragraph">{children}</p>,
          ul: ({ children }) => <ul className="answer-list">{children}</ul>,
          ol: ({ children }) => <ol className="answer-list answer-list-ordered">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          blockquote: ({ children }) => <blockquote className="answer-quote">{children}</blockquote>,
          hr: () => <hr className="answer-divider"/>,
          table: ({ children }) => <div className="answer-table-wrap"><table className="answer-table">{children}</table></div>,
          th: ({ children }) => <th>{children}</th>,
          td: ({ children }) => <td>{children}</td>,
          a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer noopener">{children}</a>,
          strong: ({ children }) => <strong>{children}</strong>,
          em: ({ children }) => <em>{children}</em>,
          code: ({ className, children, ...props }) => className
            ? <CodeBlock className={className} {...props}>{children}</CodeBlock>
            : <code className="answer-inline-code">{children}</code>,
          pre: ({ children }) => <>{children}</>
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
