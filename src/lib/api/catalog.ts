import { invoke } from "@tauri-apps/api/core";
import type { CatalogResponse } from "$lib/types/catalog";

export function getCatalog(): Promise<CatalogResponse> {
  return invoke<CatalogResponse>("get_catalog");
}
