import { invoke } from "@tauri-apps/api/core";
import type { CatalogResponse } from "../types/catalog";

export function getCatalog(): Promise<CatalogResponse> {
  return invoke<CatalogResponse>("get_catalog");
}
