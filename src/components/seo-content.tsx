"use client"
import Link from "next/link"

export function SeoContent() {
  return (
    <section className="w-full max-w-lg md:max-w-xl text-left text-sm text-muted-foreground mt-8">
      <h1 className="text-2xl font-bold text-primary-foreground mb-4">Connect and Chat Anonymously</h1>
      <p className="mb-4">
        Welcome to RandomTalk.online, the best place to have spontaneous voice conversations with people from all over the world. Our platform is designed for those who love the thrill of meeting new people and engaging in interesting, random chats. Whether you're looking to practice a new language, discuss your favorite hobby, or just have a casual talk, you'll find a welcoming community here. Check out our <Link href="#community-guidelines" className="underline hover:text-primary">Community Guidelines</Link> and learn more <Link href="#about-us" className="underline hover:text-primary">about us</Link> below.
      </p>
      
      <h2 id="community-guidelines" className="text-xl font-semibold text-primary-foreground mb-2">Community Guidelines</h2>
      <p className="mb-4">
        We strive to maintain a safe and respectful community. Please be kind and courteous to others. Any form of harassment, hate speech, or inappropriate behavior is strictly forbidden and will result in a ban. You can report any user who violates these rules during your call. Read our full <Link href="#" className="underline hover:text-primary">Community Guidelines</Link>.
      </p>

      <h2 id="about-us" className="text-xl font-semibold text-primary-foreground mb-2">About Us</h2>
      <p>
        RandomTalk.online was created to bring people together through the power of voice. In a world dominated by text and video, we believe that simple voice conversations can create more genuine connections. Our mission is to provide a fun, safe, and easy-to-use platform for random voice chats. Learn more <Link href="#" className="underline hover:text-primary">about our story</Link>.
      </p>
    </section>
  )
}
