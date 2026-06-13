import { createContext, useContext, type ReactNode } from 'react';

const Ctx = createContext({ lang: 'en' });
export function LanguageProvider({ children }: { children: ReactNode }) {
  return <Ctx.Provider value={{ lang: 'en' }}>{children}</Ctx.Provider>;
}
export function useLang() { return useContext(Ctx); }
