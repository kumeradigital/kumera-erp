"use client";

import { useEffect, useState } from "react";
import { Grid2X2, List, Search } from "lucide-react";

export type CollectionView = "cards" | "list";

export function useCollectionView(key: string) {
  const [view, setViewState] = useState<CollectionView>("cards");
  useEffect(() => {
    const saved = localStorage.getItem(`kumera-view-${key}`);
    if (saved === "cards" || saved === "list") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setViewState(saved);
    }
  }, [key]);
  function setView(next: CollectionView) {
    setViewState(next);
    localStorage.setItem(`kumera-view-${key}`, next);
  }
  return [view, setView] as const;
}

export function CollectionToolbar({
  view,
  onViewChange,
  search,
  onSearchChange,
  placeholder = "Buscar...",
  children,
}: {
  view: CollectionView;
  onViewChange: (view: CollectionView) => void;
  search: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
        <label className="relative block max-w-md flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#858a82]"
          />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={placeholder}
            className="input h-11 min-h-0 pl-9"
          />
        </label>
        {children}
      </div>
      <div
        className="flex w-fit rounded-xl border border-[#d8d8cf] bg-[#fffef9] p-1"
        aria-label="Tipo de vista"
      >
        <button
          onClick={() => onViewChange("cards")}
          className={`grid size-9 place-items-center rounded-lg ${view === "cards" ? "bg-[#235b45] text-white" : "text-[#747970]"}`}
          title="Vista de tarjetas"
          aria-label="Vista de tarjetas"
        >
          <Grid2X2 size={17} />
        </button>
        <button
          onClick={() => onViewChange("list")}
          className={`grid size-9 place-items-center rounded-lg ${view === "list" ? "bg-[#235b45] text-white" : "text-[#747970]"}`}
          title="Vista de lista"
          aria-label="Vista de lista"
        >
          <List size={19} />
        </button>
      </div>
    </div>
  );
}
