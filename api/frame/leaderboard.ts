
// This endpoint handles POST requests from Farcaster Frame buttons
export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const body = await req.json();
        const { untrustedData } = body;
        const { fid, buttonIndex } = untrustedData;

        // Logic based on which button was clicked
        // Button 1: Play Now (handled by metadata link in index.html, usually redirects)
        // Button 2: Post to this endpoint for Leaderboard

        if (buttonIndex === 2) {
            // Return a new frame that shows the leaderboard
            return new Response(JSON.stringify({
                type: 'frame',
                image: `${process.env.NEXT_PUBLIC_URL}/api/frame/leaderboard-image?fid=${fid}`,
                buttons: [
                    {
                        label: '🎮 Back to Play',
                        action: 'post',
                        target: `${process.env.NEXT_PUBLIC_URL}/api/frame/welcome`
                    },
                    {
                        label: '🔄 Refresh',
                        action: 'post'
                    }
                ],
            }), {
                headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response('Invalid Action', { status: 400 });
    } catch (error) {
        return new Response('Internal Server Error', { status: 500 });
    }
}
