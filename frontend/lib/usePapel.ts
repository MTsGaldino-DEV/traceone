"use client";

import { useEffect, useState } from "react";
import { getProfile } from "./api";
import type { Role } from "./supabase";

/** Papel do usuário logado. `undefined` enquanto carrega, `null` se não achou. */
export function usePapel(): Role | null | undefined {
  const [papel, setPapel] = useState<Role | null | undefined>(undefined);
  useEffect(() => {
    getProfile()
      .then((p) => setPapel(p?.role ?? null))
      .catch(() => setPapel(null));
  }, []);
  return papel;
}
