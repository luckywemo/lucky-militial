import { createContext, useContext, useEffect, useState } from 'react';
import sdk from '@farcaster/miniapp-sdk';

export interface FarcasterUser {
    fid: number;
    username?: string;
    displayName?: string;
    pfpUrl?: string;
}

export interface FarcasterContext {
    user: FarcasterUser | null;
    isSDKLoaded: boolean;
    isInFarcaster: boolean;
}

const FarcasterContextValue = createContext<FarcasterContext>({
    user: null,
    isSDKLoaded: false,
    isInFarcaster: false,
});

export const useFarcaster = () => useContext(FarcasterContextValue);

export const FarcasterProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<FarcasterUser | null>(null);
    const [isSDKLoaded, setIsSDKLoaded] = useState(false);
    const [isInFarcaster, setIsInFarcaster] = useState(false);

    useEffect(() => {
        const initSDK = async () => {
            try {
                const inFarcaster = window.parent !== window;
                setIsInFarcaster(inFarcaster);

                if (inFarcaster) {
                    const context = await sdk.context;

                    if (context?.user) {
                        setUser({
                            fid: context.user.fid,
                            username: context.user.username,
                            displayName: context.user.displayName,
                            pfpUrl: context.user.pfpUrl,
                        });
                    }

                    sdk.actions.ready();
                }

                setIsSDKLoaded(true);
            } catch (error) {
                console.error('[Farcaster SDK] Initialization error:', error);
                setIsSDKLoaded(true);
            }
        };

        initSDK();
    }, []);

    return (
        <FarcasterContextValue.Provider value={{ user, isSDKLoaded, isInFarcaster }}>
            {children}
        </FarcasterContextValue.Provider>
    );
};

export const farcasterActions = {
    composeCast: (text: string, embeds?: string[]) => {
        try {
            // SDK expects a tuple of [string] or [string, string] for embeds
            const safeEmbeds = embeds ? (embeds.slice(0, 2) as any) : undefined;
            sdk.actions.composeCast({ text, embeds: safeEmbeds });
        } catch (error) {
            console.error('[Farcaster SDK] composeCast error:', error);
        }
    },

    close: () => {
        try {
            sdk.actions.close();
        } catch (error) {
            console.error('[Farcaster SDK] close error:', error);
        }
    },

    openUrl: (url: string) => {
        try {
            sdk.actions.openUrl(url);
        } catch (error) {
            console.error('[Farcaster SDK] openUrl error:', error);
        }
    },

    addMiniApp: () => {
        try {
            sdk.actions.addMiniApp();
        } catch (error) {
            console.error('[Farcaster SDK] addMiniApp error:', error);
        }
    },

    signIn: async () => {
        try {
            // signIn usually requires an options object
            return await sdk.actions.signIn({} as any);
        } catch (error) {
            console.error('[Farcaster SDK] signIn error:', error);
            return null;
        }
    },

    viewProfile: (fid: number) => {
        try {
            sdk.actions.viewProfile({ fid });
        } catch (error) {
            console.error('[Farcaster SDK] viewProfile error:', error);
        }
    },
};

export { sdk };
