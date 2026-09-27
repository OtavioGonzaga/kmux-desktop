import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ptBR from "./locales/pt-BR/catalog.json";
import enUS from "./locales/en-US/catalog.json";
import es from "./locales/es/catalog.json";
import de from "./locales/de/catalog.json";
import { detectSystemLanguage, resolveLanguage } from "./language";
export { detectSystemLanguage, resolveLanguage } from "./language";
export { supportedLanguages } from "./language";
export type { AppLanguage } from "./language";

const storedLanguage = localStorage.getItem("kmux.language");
const initialLanguage = storedLanguage ? resolveLanguage(storedLanguage) : detectSystemLanguage();

void i18n.use(initReactI18next).init({
  resources: {
    "pt-BR": { translation: ptBR },
    "en-US": { translation: enUS },
    es: { translation: es },
    de: { translation: de },
  },
  lng: initialLanguage,
  fallbackLng: "en-US",
  interpolation: { escapeValue: false },
});

export default i18n;
