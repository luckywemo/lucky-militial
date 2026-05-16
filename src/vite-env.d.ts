/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_ONCHAINKIT_API_KEY: string;
    readonly VITE_PAYMASTER_URL?: string;
    readonly GEMINI_API_KEY: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
