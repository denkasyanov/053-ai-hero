import type { Message } from "ai";
import ReactMarkdown, { type Components } from "react-markdown";

export type MessagePartType = NonNullable<Message["parts"]>[number];

const components: Components = {
  // Override default elements with custom styling
  p: ({ children }) => <p className="mb-4 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-4 list-disc pl-4">{children}</ul>,
  ol: ({ children }) => <ol className="mb-4 list-decimal pl-4">{children}</ol>,
  li: ({ children }) => <li className="mb-1">{children}</li>,
  code: ({ className, children, ...props }) => (
    <code className={`${className ?? ""}`} {...props}>
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mb-4 overflow-x-auto rounded-lg bg-gray-700 p-4">
      {children}
    </pre>
  ),
  a: ({ children, ...props }) => (
    <a
      className="text-blue-400 underline"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
};

const Markdown = ({ children }: { children: string }) => {
  return <ReactMarkdown components={components}>{children}</ReactMarkdown>;
};

interface MessagePartProps {
  part: MessagePartType;
}

const ToolInvocation = ({ toolInvocation }: { toolInvocation: any }) => {
  const { toolName, args, result, state } = toolInvocation;
  
  return (
    <div className="my-2 rounded-md bg-gray-700/50 p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-blue-400">🔧 Tool:</span>
        <span className="text-xs font-mono text-gray-300">{toolName}</span>
        <span className="text-xs text-gray-500">({state})</span>
      </div>
      
      {args && (
        <div className="mb-2">
          <span className="text-xs text-gray-400">Arguments:</span>
          <pre className="mt-1 text-xs bg-gray-800 p-2 rounded overflow-x-auto">
            {JSON.stringify(args, null, 2)}
          </pre>
        </div>
      )}
      
      {result && (
        <div>
          <span className="text-xs text-gray-400">Result:</span>
          <pre className="mt-1 text-xs bg-gray-800 p-2 rounded overflow-x-auto max-h-48 overflow-y-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export const MessagePart = ({ part }: MessagePartProps) => {
  switch (part.type) {
    case "text":
      return <Markdown>{part.text}</Markdown>;
    
    case "tool-invocation":
      return <ToolInvocation toolInvocation={part.toolInvocation} />;
    
    default:
      return null;
  }
};