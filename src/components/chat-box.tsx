"use client";

import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { useCall } from "@/contexts/call-context";
import { useUser } from "@/contexts/user-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Message } from "@/contexts/call-context";

export function ChatBox() {
  const { messages, sendMessage } = useCall();
  const user = useUser();
  const [text, setText] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewport = scrollAreaRef.current?.firstElementChild as HTMLDivElement | null;
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      sendMessage(text.trim());
      setText("");
    }
  };

  return (
    <div className="w-full flex flex-col h-[250px] p-4 pt-0">
      <ScrollArea className="flex-1 w-full pr-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((msg: Message) => (
            <div
              key={msg.id}
              className={cn(
                "flex items-end gap-2",
                msg.senderId === user?.id ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-xs rounded-lg px-3 py-2 text-sm",
                  msg.senderId === user?.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                <p className="font-bold">{msg.senderId === user?.id ? "You" : msg.senderName}</p>
                <p>{msg.text}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      <form onSubmit={handleSend} className="mt-4 flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          autoComplete="off"
        />
        <Button type="submit" size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
