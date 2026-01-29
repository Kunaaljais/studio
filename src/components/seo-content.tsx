"use client"
import Link from "next/link"

export function SeoContent() {
  return (
    <section className="w-full max-w-lg md:max-w-xl text-left text-sm text-muted-foreground mt-8">
      <h1 className="text-2xl font-bold text-primary-foreground mb-4" itemProp="headline">RandomTalk: Your Premier Voice Chat with Strangers</h1>
      <p className="mb-4" itemProp="description">
        Welcome to <strong>RandomTalk.online</strong>, the ultimate platform for spontaneous <strong>voice chat</strong> with <strong>strangers</strong> from around the world. If you love the thrill of random conversations, you're in the right place. Our <strong>voice chat</strong> service connects you with new people instantly. This isn't just another <strong>chat</strong> app; it's an adventure in every call. Experience the excitement of a truly random <strong>chat</strong> on <strong>RandomTalk</strong>.
      </p>
      
      <h2 id="community-guidelines" className="text-xl font-semibold text-primary-foreground mb-2">Safe Voice Chat with Strangers on RandomTalk</h2>
      <p className="mb-4">
        At <strong>RandomTalk</strong>, your safety is our priority. While you enjoy a <strong>voice chat</strong> with <strong>strangers</strong>, we enforce strict community guidelines to ensure a respectful environment. Any inappropriate behavior during a <strong>chat</strong> is not tolerated. Our moderation team works hard to make every <strong>voice chat</strong> a positive experience. Please read our full <Link href="#" className="underline hover:text-primary">Community Guidelines</Link> before you start your first <strong>chat</strong> with <strong>strangers</strong>.
      </p>

      <h2 id="about-us" className="text-xl font-semibold text-primary-foreground mb-2">About The RandomTalk Platform</h2>
      <p>
        <strong>RandomTalk.online</strong> was born from a simple idea: to connect the world through <strong>voice</strong>. Our mission is to provide a fun, free, and easy platform for random <strong>voice chat</strong>. We believe that talking to <strong>strangers</strong> can be a powerful way to form genuine connections and broaden your perspective. Join the <strong>RandomTalk</strong> community today and start a new conversation.
      </p>
    </section>
  )
}
