"use client";

import { useState } from "react";

interface ToolCallChipProps {
  toolName: string;
  input?: unknown;
  output?: unknown;
  state?: string;
}

export default function ToolCallChip({ toolName, input, output, state }: ToolCallChipProps) {
  const [open, setOpen] = useState(false);
  const isDone = state === "output-available" || output !== undefined;

  return (
    <div className="my-2 rounded-lg border border-gray-200 bg-gray-50 text-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left"
      >
        <span className="flex items-center gap-2">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              isDone ? "bg-green-500" : "bg-amber-500 animate-pulse"
            }`}
          />
          <span className="font-mono font-semibold text-gray-700">{toolName}</span>
          {!isDone && <span className="text-gray-500">ejecutando…</span>}
        </span>
        <span className="text-gray-400">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="border-t border-gray-200 px-3 py-2 space-y-2">
          <div>
            <div className="font-semibold text-gray-500 uppercase tracking-wide">Input</div>
            <pre className="mt-1 overflow-x-auto rounded bg-white p-2 text-[11px] text-gray-800">
              {JSON.stringify(input ?? null, null, 2)}
            </pre>
          </div>
          {isDone && (
            <div>
              <div className="font-semibold text-gray-500 uppercase tracking-wide">Output</div>
              <pre className="mt-1 max-h-64 overflow-auto rounded bg-white p-2 text-[11px] text-gray-800">
                {JSON.stringify(output ?? null, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
