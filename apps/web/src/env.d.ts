/// <reference types="vite/client" />

// Amplía el tipado de import.meta.env para tu variable
interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export {}; // evita el error con "isolatedModules"
