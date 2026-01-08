
// This is a serverless function for Vercel or similar providers
// It uses @vercel/og to generate dynamic stats images for Farcaster
import { ImageResponse } from '@vercel/og';

export const config = {
    runtime: 'edge',
};

export default function handler(req: Request) {
    try {
        const { searchParams } = new URL(req.url);

        // Parse player stats from query params
        const playerName = searchParams.get('player') || 'OPERATOR_1337';
        const kills = searchParams.get('kills') || '0';
        const wins = searchParams.get('wins') || '0';
        const character = searchParams.get('class') || 'STRIKER';

        return new ImageResponse(
            (
                <div
                    style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#050505',
                        backgroundImage: 'radial-gradient(circle at center, #1a1a1a 0%, #050505 100%)',
                        fontFamily: 'monospace',
                        padding: '40px',
                        border: '8px solid #f97316',
                    }}
                >
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '40px' }}>
                        <div style={{
                            backgroundColor: '#f97316',
                            padding: '10px 20px',
                            borderRadius: '8px',
                            fontSize: '48px',
                            marginRight: '20px'
                        }}>🎖️</div>
                        <h1 style={{
                            color: '#f97316',
                            fontSize: '72px',
                            fontWeight: 900,
                            letterSpacing: '0.2em',
                            textTransform: 'uppercase'
                        }}>LUCKY_MILITIA</h1>
                    </div>

                    {/* Player Identity */}
                    <div style={{
                        color: '#fff',
                        fontSize: '48px',
                        marginBottom: '20px',
                        borderBottom: '2px solid #22d3ee',
                        paddingBottom: '10px'
                    }}>
                        OPERATOR: {playerName}
                    </div>

                    {/* Stats Grid */}
                    <div style={{ display: 'flex', gap: '40px', marginTop: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ color: '#78716c', fontSize: '24px', textTransform: 'uppercase' }}>Kills</div>
                            <div style={{ color: '#22d3ee', fontSize: '64px', fontWeight: 900 }}>{kills}</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ color: '#78716c', fontSize: '24px', textTransform: 'uppercase' }}>Wins</div>
                            <div style={{ color: '#22d3ee', fontSize: '64px', fontWeight: 900 }}>{wins}</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ color: '#78716c', fontSize: '24px', textTransform: 'uppercase' }}>Class</div>
                            <div style={{ color: '#f97316', fontSize: '64px', fontWeight: 900 }}>{character}</div>
                        </div>
                    </div>

                    {/* Footer Call to Action */}
                    <div style={{
                        marginTop: '60px',
                        color: '#78716c',
                        fontSize: '24px',
                        letterSpacing: '0.1em'
                    }}>
                        UPLINK ACTIVE • CLICK "PLAY NOW" TO DEPLOY
                    </div>
                </div>
            ),
            {
                width: 1200,
                height: 630,
            }
        );
    } catch (e: any) {
        return new Response(`Failed to generate image`, { status: 500 });
    }
}
