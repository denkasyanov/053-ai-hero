import { MessagePart, type MessagePartType } from "./message-part";

interface ChatMessageProps {
  parts?: MessagePartType[];
  role: string;
  userName: string;
}

export const ChatMessage = ({ parts, role, userName }: ChatMessageProps) => {
  const isAI = role === "assistant";

  return (
    <div className="mb-6">
      <div
        className={`rounded-lg p-4 ${
          isAI ? "bg-gray-800 text-gray-300" : "bg-gray-900 text-gray-300"
        }`}
      >
        <p className="mb-2 text-sm font-semibold text-gray-400">
          {isAI ? "AI" : userName}
        </p>

        <div className="prose prose-invert max-w-none">
          {parts?.map((part, index) => (
            <MessagePart key={index} part={part} />
          ))}
        </div>
      </div>
    </div>
  );
};
