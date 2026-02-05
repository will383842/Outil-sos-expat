/**
 * AI Response Preview Component
 * Shows the AI-generated response for a booking request
 */
import { useState } from 'react';
import { Sparkles, Copy, Check, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

interface AiResponsePreviewProps {
  content: string;
  generatedAt: Date;
  model: string;
  tokensUsed?: number;
  source: string;
}

export default function AiResponsePreview({
  content,
  generatedAt,
  model,
  tokensUsed,
  source,
}: AiResponsePreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="mt-3 border border-purple-200 rounded-lg bg-purple-50/50">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full px-3 py-2 min-h-[44px]"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-medium text-purple-700">Réponse IA</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-purple-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-purple-500" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-purple-200">
          {/* Response text */}
          <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
            {content}
          </div>

          {/* Actions + metadata */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-purple-100">
            <div className="flex items-center gap-3 text-xs text-purple-500">
              <span>{model}</span>
              {tokensUsed && <span>{tokensUsed} tokens</span>}
              <span>{generatedAt.toLocaleDateString('fr-FR')}</span>
              {source && <span>{source}</span>}
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] text-xs font-medium text-purple-600 bg-purple-100 rounded-lg hover:bg-purple-200 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Copié
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copier
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** AI Error badge */
export function AiErrorBadge({ error }: { error: string }) {
  return (
    <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
      <span className="text-xs text-red-600">{error}</span>
    </div>
  );
}
