import { type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
)

function extractTweetId(url: string): string | null {
  const match = url.match(/\/status\/(\d+)/)
  return match ? match[1] : null
}

export async function GET(request: NextRequest) {
  const tweetUrl = request.nextUrl.searchParams.get('url')

  if (!tweetUrl) {
    return Response.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  const tweetId = extractTweetId(tweetUrl)
  if (!tweetId) {
    return Response.json({ error: 'Invalid tweet URL' }, { status: 400 })
  }

  try {
    const syndicationUrl = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&lang=en&token=x`

    const res = await fetch(syndicationUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
      },
    })

    if (!res.ok) {
      return Response.json({ error: 'Could not fetch tweet' }, { status: res.status })
    }

    const data = await res.json()

    if (!data || !data.user) {
      return Response.json({ error: 'Tweet not found' }, { status: 404 })
    }

    // Save to Supabase (fire and forget — don't block the response)
    supabase.from('prints').insert({
      tweet_id: tweetId,
      author_name: data.user.name,
      author_handle: data.user.screen_name,
      profile_image_url: data.user.profile_image_url_https,
      tweet_text: data.full_text || data.text,
    }).then(() => {})

    return Response.json(data)
  } catch {
    return Response.json({ error: 'Failed to fetch tweet' }, { status: 500 })
  }
}
