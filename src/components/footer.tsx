"use client"
import Link from "next/link"

export function Footer() {
  return (
    <footer className="py-6 w-full max-w-lg md:max-w-xl text-center text-xs text-muted-foreground">
      <p>&copy; {new Date().getFullYear()} RandomTalk.online. All rights reserved.</p>
      <div className="flex justify-center gap-4 mt-2">
        <Link href="#" className="hover:underline">Terms of Service</Link>
        <Link href="#" className="hover:underline">Privacy Policy</Link>
      </div>
    </footer>
  )
}
