'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/utils/supabase/client'

interface TweetUser {
  name: string
  screen_name: string
  profile_image_url_https: string
  verified?: boolean
  is_blue_verified?: boolean
}

interface TweetData {
  id_str: string
  text: string
  full_text?: string
  created_at: string
  favorite_count: number
  retweet_count?: number
  conversation_count?: number
  user: TweetUser
}

interface PrintRecord {
  id: string
  tweet_id: string
  author_name: string
  author_handle: string
  profile_image_url: string
  tweet_text: string
  created_at: string
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`
  return n.toString()
}

function formatDate(createdAt: string): string {
  const d = new Date(createdAt)
  return d.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function Home() {
  const [url, setUrl] = useState('')
  const [tweet, setTweet] = useState<TweetData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [recentPrints, setRecentPrints] = useState<PrintRecord[]>([])

  const supabase = createClient()

  async function loadRecentPrints() {
    const { data } = await supabase
      .from('prints')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setRecentPrints(data)
  }

  useEffect(() => {
    loadRecentPrints()
  }, [])

  async function fetchTweet(tweetUrl: string) {
    setError('')
    setTweet(null)
    setLoading(true)

    try {
      const res = await fetch(`/api/tweet?url=${encodeURIComponent(tweetUrl)}`)
      const data = await res.json()

      if (!res.ok || data.error) {
        setError(data.error || 'Something went wrong')
      } else {
        setTweet(data)
        setTimeout(loadRecentPrints, 500)
      }
    } catch {
      setError('Failed to fetch tweet')
    } finally {
      setLoading(false)
    }
  }

  function handleUrlChange(value: string) {
    setUrl(value)
    // Auto-fetch when it looks like a complete tweet URL
    if (value.match(/^https?:\/\/(twitter\.com|x\.com)\/.+\/status\/\d+/)) {
      fetchTweet(value)
    }
  }

  const tweetText = tweet?.full_text || tweet?.text || ''
  const isVerified = tweet?.user?.is_blue_verified || tweet?.user?.verified

  return (
    <div className="min-h-screen bg-white">
      {/* Input UI — hidden when printing */}
      <div className="no-print p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold mb-2 text-gray-900">Print Tweet</h1>
        <p className="text-gray-500 mb-6 text-sm">Paste a tweet URL to get a clean, printable version.</p>

        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={e => handleUrlChange(e.target.value)}
            placeholder="https://x.com/jack/status/20"
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {loading && <span className="flex items-center text-sm text-gray-400">Loading...</span>}
        </div>

        {error && <p className="mt-3 text-red-500 text-sm">{error}</p>}
      </div>

      {/* Print area */}
      {tweet && (
        <div className="print-area max-w-2xl mx-auto px-8 py-4">
          <div className="tweet-card border border-gray-200 rounded-xl p-6">

            {/* Author row */}
            <div className="flex items-center gap-3 mb-4">
              <Image
                src={tweet.user.profile_image_url_https.replace('_normal', '_bigger')}
                alt={tweet.user.name}
                width={48}
                height={48}
                className="rounded-full"
              />
              <div>
                <div className="flex items-center gap-1">
                  <span className="font-bold text-gray-900 text-base">{tweet.user.name}</span>
                  {isVerified && (
                    <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91C2.88 9.33 2 10.57 2 12s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.66 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.33-2.19c1.4.46 2.91.2 3.92-.81s1.26-2.52.8-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"/>
                    </svg>
                  )}
                </div>
                <p className="text-gray-500 text-sm">@{tweet.user.screen_name}</p>
              </div>
            </div>

            {/* Tweet text */}
            <p className="text-gray-900 text-lg leading-relaxed mb-4 whitespace-pre-wrap">
              {tweetText}
            </p>

            {/* Date/time */}
            <p className="text-gray-500 text-sm mb-4">{formatDate(tweet.created_at)}</p>

            {/* Stats + print button */}
            <div className="border-t border-gray-100 pt-3 flex items-center justify-between gap-6 text-sm text-gray-600">
              {tweet.conversation_count !== undefined && (
                <span>
                  <span className="font-semibold text-gray-900">{formatCount(tweet.conversation_count)}</span>
                  {' '}Replies
                </span>
              )}
              {tweet.retweet_count !== undefined && (
                <span>
                  <span className="font-semibold text-gray-900">{formatCount(tweet.retweet_count)}</span>
                  {' '}Retweets
                </span>
              )}
              <span>
                <span className="font-semibold text-gray-900">{formatCount(tweet.favorite_count)}</span>
                {' '}Likes
              </span>
              <button
                onClick={() => window.print()}
                className="ml-auto bg-blue-500 hover:bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
              >
                Print
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Recent prints feed */}
      {recentPrints.length > 0 && (
        <div className="no-print max-w-2xl mx-auto px-8 py-8">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Recently Printed</h2>
          <div className="flex flex-col gap-3 pb-16">
            {recentPrints.map(print => (
              <div
                key={print.id}
                className="border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors cursor-pointer"
                onClick={() => window.open(`https://x.com/${print.author_handle}/status/${print.tweet_id}`, '_blank')}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Image
                    src={print.profile_image_url.replace('_normal', '_bigger')}
                    alt={print.author_name}
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                  <span className="font-semibold text-sm text-gray-900">{print.author_name}</span>
                  <span className="text-gray-400 text-sm">@{print.author_handle}</span>
                </div>
                <p className="text-gray-700 text-sm line-clamp-2">{print.tweet_text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="no-print w-full text-center py-8 text-sm text-gray-400">
        Made with ❤️ and 〰️ by{' '}
        <a
          href="https://x.com/cynthiamcgillis"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-gray-600"
        >
          Cynthia Bell McGillis
        </a>
      </footer>
    </div>
  )
}
