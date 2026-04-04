interface SourceCardProps {
  url: string;
  title?: string;
}

function sourceBadge(url: string): { label: string; className: string } {
  if (url.includes("boe.es")) return { label: "BOE", className: "bg-red-100 text-red-700" };
  if (url.includes("sede.administracion") || url.includes("interior.gob"))
    return { label: "SEDE", className: "bg-blue-100 text-blue-700" };
  if (url.includes("sepe.es")) return { label: "SEPE", className: "bg-green-100 text-green-700" };
  return { label: "FUENTE", className: "bg-gray-100 text-gray-700" };
}

export default function SourceCard({ url, title }: SourceCardProps) {
  const badge = sourceBadge(url);
  const displayTitle = title ?? new URL(url).hostname;

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white text-sm">
      <div className="flex items-start gap-2">
        <span
          className={`inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide shrink-0 ${badge.className}`}
        >
          {badge.label}
        </span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-blue-600 hover:underline leading-tight"
        >
          {displayTitle}
        </a>
      </div>
    </div>
  );
}
