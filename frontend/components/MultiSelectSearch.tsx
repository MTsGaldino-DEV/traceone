"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

interface MultiSelectSearchProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}

/** Dropdown de seleção múltipla com busca interna. */
export function MultiSelectSearch({ label, options, selected, onChange }: MultiSelectSearchProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (v: string) => {
    onChange(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v]);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 h-8 px-3 text-xs border border-[#e5e7eb] rounded-lg bg-white hover:bg-[#f9fafb] text-[#374151] min-w-[120px] max-w-[200px] truncate"
      >
        <span className="truncate">
          {selected.length === 0
            ? label
            : selected.length === 1
            ? selected[0]
            : `${label} (${selected.length})`}
        </span>
        {selected.length > 0 && (
          <X
            size={10}
            className="flex-shrink-0 text-[#9ca3af] hover:text-[#374151]"
            onClick={(e) => {
              e.stopPropagation();
              onChange([]);
            }}
          />
        )}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-[#e5e7eb] rounded-lg shadow-lg min-w-[200px] max-h-60 flex flex-col">
          <div className="p-2 border-b border-[#f1f5f9]">
            <input
              autoFocus
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs px-2 py-1 border border-[#e5e7eb] rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-[#9ca3af] px-3 py-2">Nenhum resultado</p>
            ) : (
              filtered.map((o) => (
                <label
                  key={o}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#f9fafb] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(o)}
                    onChange={() => toggle(o)}
                    className="w-3 h-3 accent-blue-600"
                  />
                  <span className="text-xs text-[#374151] truncate">{o}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
