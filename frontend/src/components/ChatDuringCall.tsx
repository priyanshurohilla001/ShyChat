"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, MessageSquare, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWebRTC } from "@/hooks/useWebRTC";

interface Message {
  id: string;
  text: string;
  timestamp: number;
  isSent: boolean;
}

interface ChatDuringCallProps {
  setShowChat: (show: boolean) => void;
}

export const ChatDuringCall: React.FC<ChatDuringCallProps> = ({
  setShowChat,
}) => {
  const { sendTextMessage } = useWebRTC();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]",
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, []);

  // Listen for incoming messages
  useEffect(() => {
    const handleIncomingMessage = (event: CustomEvent<string>) => {
      const newMessage: Message = {
        id: Date.now().toString(),
        text: event.detail,
        timestamp: Date.now(),
        isSent: false,
      };
      setMessages((prev) => [...prev, newMessage]);
    };

    window.addEventListener(
      "webrtc-text-message",
      handleIncomingMessage as EventListener,
    );

    return () => {
      window.removeEventListener(
        "webrtc-text-message",
        handleIncomingMessage as EventListener,
      );
    };
  }, []);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle sending messages
  const handleSendMessage = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputText.trim()) return;

      const newMessage: Message = {
        id: Date.now().toString(),
        text: inputText.trim(),
        timestamp: Date.now(),
        isSent: true,
      };

      setMessages((prev) => [...prev, newMessage]);
      sendTextMessage(inputText.trim());
      setInputText("");
    },
    [inputText, sendTextMessage],
  );

  // Format timestamp
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card className="w-[340px] max-w-[90vw] shadow-2xl border-border/50 bg-background/95 backdrop-blur-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Chat
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowChat(false)}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Messages Area */}
        <ScrollArea ref={scrollAreaRef} className="h-64 w-full pr-4">
          <div className="space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                No messages yet.
                <br />
                <span className="text-xs">Start the conversation! 💬</span>
                <br />
                <span className="text-xs opacity-60 mt-2 block">
                  Messages vanish when call ends 👻
                </span>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.isSent ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[70%] px-3 py-2 rounded-lg text-sm ${
                      message.isSent
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <p className="break-words">{message.text}</p>
                    <p
                      className={`text-xs mt-1 ${
                        message.isSent
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground/70"
                      }`}
                    >
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 text-sm"
            maxLength={500}
          />
          <Button
            type="submit"
            size="sm"
            disabled={!inputText.trim()}
            className="px-3"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>

        {/* Message Count & Ephemeral Note */}
        {messages.length > 0 && (
          <div className="text-xs text-muted-foreground text-center space-y-1">
            <div>
              {messages.length} message{messages.length !== 1 ? "s" : ""}
            </div>
            <div className="opacity-60">
              Chat history self-destructs on disconnect 👻
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ChatDuringCall;
