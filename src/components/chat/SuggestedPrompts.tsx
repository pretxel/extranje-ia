"use client";

interface SuggestedPromptsProps {
  onSelect: (prompt: string) => void;
}

// Curated starter prompts for the empty state. Fixed set for predictability.
const PROMPTS = [
  {
    label: "Sacar el NIE por primera vez",
    prompt: "¿Cómo solicito el NIE por primera vez y qué documentos necesito?",
  },
  { label: "Documentos para la TIE", prompt: "¿Qué documentos necesito para obtener la TIE?" },
  {
    label: "Requisitos del arraigo social",
    prompt: "¿Cuáles son los requisitos del arraigo social en España?",
  },
  {
    label: "Renovar la residencia",
    prompt: "¿Cómo renuevo mi permiso de residencia y con cuánta antelación?",
  },
];

export default function SuggestedPrompts({ onSelect }: SuggestedPromptsProps) {
  return (
    <div className="grid w-full max-w-xl grid-cols-1 gap-2.5 sm:grid-cols-2">
      {PROMPTS.map((p, i) => (
        <button
          key={p.prompt}
          type="button"
          onClick={() => onSelect(p.prompt)}
          className={`group/chip fade-up-${i + 1} flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition-all hover:border-[var(--chat-ring)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chat-ring)]`}
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
        >
          <span
            aria-hidden="true"
            className="text-base leading-none transition-transform group-hover/chip:translate-x-0.5"
            style={{ color: "var(--accent)" }}
          >
            →
          </span>
          <span>{p.label}</span>
        </button>
      ))}
    </div>
  );
}
