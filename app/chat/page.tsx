"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { LogOut, Send, Plus, Phone, Video, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  generateRandomMessage,
  getRandomReply,
  getRandomUser,
  formatTime,
} from "@/lib/utils"
import type { Message, User as UserType, Conversation } from "@/lib/types"

export default function ChatPage() {
  const [user, setUser] = useState<UserType | null>(null)
  const [contacts, setContacts] = useState<UserType[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversation, setActiveConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { toast } = useToast()

  const [callType, setCallType] = useState<"voice" | "video" | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [theme, setTheme] = useState<"dark" | "purple" | "blue">("dark")
  const [hiddenChats, setHiddenChats] = useState<string[]>([])

  // Load user and initialize demo data on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("user")
    if (!storedUser) {
      router.push("/login")
      return
    }

    try {
      const userData = JSON.parse(storedUser) as UserType
      setUser(userData)

      // Generate demo contacts excluding current user
      const demoContacts = Array.from({ length: 8 }, () => getRandomUser()).filter(
        (contact) => contact.id !== userData.id,
      )
      setContacts(demoContacts)

      // Create demo conversations with last messages and unread counts
      const demoConversations = demoContacts.map((contact) => ({
        id: contact.id,
        user: contact,
        lastMessage: generateRandomMessage(contact.id, userData.id, true),
        unread: Math.random() > 0.7 ? Math.floor(Math.random() * 5) + 1 : 0,
      }))
      setConversations(demoConversations)

      if (demoConversations.length > 0) {
        setActiveConversation(demoConversations[0].id)

        // Generate initial demo messages for the first conversation
        const demoMessages = Array.from({ length: 10 }, (_, i) => {
          const isUser = i % 2 !== 0
          return generateRandomMessage(
            isUser ? userData.id : demoConversations[0].user.id,
            isUser ? demoConversations[0].user.id : userData.id,
            false,
            new Date(Date.now() - (10 - i) * 1000 * 60 * 10),
          )
        })
        setMessages(demoMessages)
      }
    } catch (err) {
      // If parsing fails, redirect to login
      localStorage.removeItem("user")
      router.push("/login")
    }
  }, [router])

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // When changing active conversation, load new messages and reset unread count
  const handleConversationChange = (conversationId: string) => {
    setActiveConversation(conversationId)
    setConversations((prev) =>
      prev.map((conv) => (conv.id === conversationId ? { ...conv, unread: 0 } : conv)),
    )

    const conversation = conversations.find((c) => c.id === conversationId)
    if (conversation && user) {
      // Generate demo messages for selected conversation
      const demoMessages = Array.from({ length: 8 }, (_, i) => {
        const isUser = i % 2 !== 0
        return generateRandomMessage(
          isUser ? user.id : conversation.user.id,
          isUser ? conversation.user.id : user.id,
          false,
          new Date(Date.now() - (8 - i) * 1000 * 60 * 10),
        )
      })
      setMessages(demoMessages)
    }
  }

  // Send a new message and simulate a reply with typing indicator
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !user || !activeConversation) return

    const conversation = conversations.find((c) => c.id === activeConversation)
    if (!conversation) return

    const timestamp = new Date()

    const userMessage: Message = {
      id: timestamp.getTime().toString(),
      senderId: user.id,
      receiverId: conversation.user.id,
      text: newMessage.trim(),
      timestamp,
      status: "sent",
    }

    setMessages((prev) => [...prev, userMessage])
    setNewMessage("")

    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === activeConversation ? { ...conv, lastMessage: userMessage } : conv,
      ),
    )

    setIsTyping(true)

    // Simulate reply after a delay
    const replyDelay = 1000 + Math.random() * 2000
    setTimeout(() => {
      setIsTyping(false)

      const replyTimestamp = new Date()
      const replyMessage: Message = {
        id: (replyTimestamp.getTime() + 1).toString(),
        senderId: conversation.user.id,
        receiverId: user.id,
        text: getRandomReply(),
        timestamp: replyTimestamp,
        status: "delivered",
      }

      setMessages((prev) => [...prev, replyMessage])

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === activeConversation ? { ...conv, lastMessage: replyMessage } : conv,
        ),
      )
    }, replyDelay)
  }

  const handleLogout = () => {
    localStorage.removeItem("user")
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    })
    router.push("/login")
  }

  const handleNewChat = () => {
    setActiveConversation(null)
    setMessages([])
  }

  const activeConversationData = conversations.find((c) => c.id === activeConversation)

  // Modal for voice or video call
  const CallModal = () => (
    <div
      className="fixed inset-0 bg-black bg-opacity-90 flex flex-col items-center justify-center z-50 text-white p-6"
      onClick={() => setCallType(null)}
      role="dialog"
      aria-modal="true"
      aria-label={`${callType === "voice" ? "Voice call" : "Video call"} modal`}
    >
      <div
        className="bg-gray-800 rounded-2xl p-8 w-96 max-w-full text-center shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-3xl font-semibold mb-4">
          {callType === "voice" ? "Voice Call" : "Video Call"}
        </h2>
        <p className="mb-6 text-lg">
          {callType === "voice"
            ? `Calling ${activeConversationData?.user.name}...`
            : `Video calling ${activeConversationData?.user.name}...`}
        </p>

        {callType === "video" && (
          <div className="bg-black rounded-xl mb-6 w-full h-48 flex items-center justify-center border border-gray-700 shadow-inner">
            <p className="text-gray-400 italic select-none">[Video feed placeholder]</p>
          </div>
        )}

        <Button
          variant="destructive"
          onClick={() => setCallType(null)}
          className="px-8 py-3 text-lg flex items-center justify-center gap-3 mx-auto rounded-full shadow hover:bg-red-700 transition"
          aria-label="End call"
        >
          <X className="w-6 h-6" />
          End Call
        </Button>
      </div>
    </div>
  )

  // Modal for settings including hidden chats and theme
  const SettingsModal = () => (
    <div
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-6"
      onClick={() => setSettingsOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Settings modal"
    >
      <div
        className="bg-gray-900 rounded-2xl p-8 w-96 max-w-full shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-2xl font-semibold mb-6 text-white">Settings</h3>

        <div className="mb-8">
          <h4 className="text-lg text-white font-semibold mb-3">Hide Chats</h4>
          {conversations.length === 0 && <p className="text-gray-400">No chats available.</p>}
          <div className="max-h-48 overflow-y-auto border border-gray-700 rounded-lg p-3 bg-gray-800 shadow-inner">
            {conversations.map((conv) => (
              <label
                key={conv.id}
                className="flex items-center justify-between p-2 cursor-pointer select-none hover:bg-gray-700 rounded-md transition"
              >
                <span className="text-white font-medium">{conv.user.name}</span>
                <input
                  type="checkbox"
                  checked={hiddenChats.includes(conv.id)}
                  onChange={() => {
                    setHiddenChats((prev) =>
                      prev.includes(conv.id)
                        ? prev.filter((id) => id !== conv.id)
                        : [...prev, conv.id],
                    )
                  }}
                  className="cursor-pointer w-5 h-5 rounded border-gray-600 bg-gray-700 checked:bg-purple-600 checked:border-transparent transition"
                  aria-checked={hiddenChats.includes(conv.id)}
                  aria-label={`Hide chat with ${conv.user.name}`}
                />
              </label>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-lg text-white font-semibold mb-3">Change Theme</h4>
          <div className="flex space-x-4">
            {["dark", "purple", "blue"].map((t) => (
              <button
                key={t}
                className={`w-10 h-10 rounded-full border-4 focus:outline-none transition-transform hover:scale-110 ${
                  theme === t ? "border-white shadow-lg" : "border-transparent"
                }`}
                style={{
                  background:
                    t === "dark" ? "#111827" : t === "purple" ? "#7c3aed" : "#2563eb",
                }}
                onClick={() => setTheme(t as any)}
                aria-label={`Select ${t} theme`}
                type="button"
              />
            ))}
          </div>
        </div>

        <Button
          variant="secondary"
          onClick={() => setSettingsOpen(false)}
          className="mt-8 w-full rounded-full shadow hover:bg-gray-700 transition"
          aria-label="Close settings"
        >
          Close
        </Button>
      </div>
    </div>
  )

  const themeClasses = {
    dark: "bg-gray-900 text-white",
    purple: "bg-purple-900 text-purple-100",
    blue: "bg-blue-900 text-blue-100",
  }

  return (
    <div
      className={`min-h-screen flex flex-col ${themeClasses[theme]} font-sans`}
      data-theme={theme} // Optional: to support css variables or global styles
    >
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-gray-800 shadow-sm">
        <h1 className="text-3xl font-extrabold tracking-tight select-none">Night Chat</h1>
        <div className="flex items-center space-x-4">
          <Button
            onClick={() => setSettingsOpen(true)}
            className="rounded-full px-4 py-2 shadow-md hover:bg-gray-700 transition"
            aria-haspopup="dialog"
            aria-expanded={settingsOpen}
          >
            Settings
          </Button>
          <Button
            variant="destructive"
            onClick={handleLogout}
            className="rounded-full px-4 py-2 flex items-center space-x-2 shadow-md hover:bg-red-700 transition"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </Button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 border-r border-gray-700 flex flex-col bg-gray-850">
          <div className="p-4 border-b border-gray-700 flex justify-between items-center">
            <h2 className="text-xl font-semibold tracking-wide">Chats</h2>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full hover:bg-purple-600 hover:text-white transition"
              onClick={handleNewChat}
              aria-label="Start new chat"
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>

          <ScrollArea className="flex-1 p-3">
            {conversations.length === 0 && (
              <p className="text-gray-400 p-3 text-center italic">No conversations yet.</p>
            )}
            {conversations
              .filter((conv) => !hiddenChats.includes(conv.id))
              .map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleConversationChange(conv.id)}
                  className={`w-full p-3 mb-2 flex items-center space-x-4 rounded-lg transition ${
                    activeConversation === conv.id
                      ? "bg-purple-700 text-white"
                      : "hover:bg-gray-700 text-gray-300"
                  }`}
                  aria-current={activeConversation === conv.id ? "true" : undefined}
                  aria-label={`Chat with ${conv.user.name}${
                    conv.unread > 0 ? `, ${conv.unread} unread messages` : ""
                  }`}
                >
                  <Avatar>
                    <AvatarImage
                      src={conv.user.avatar}
                      alt={`Avatar of ${conv.user.name}`}
                      referrerPolicy="no-referrer"
                    />
                    <AvatarFallback>{conv.user.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold truncate max-w-[140px]">{conv.user.name}</h3>
                      {conv.unread > 0 && (
                        <span className="text-xs bg-purple-600 text-white rounded-full px-2 py-0.5">
                          {conv.unread}
                        </span>
                      )}
                    </div>
                    <p className="text-sm truncate max-w-[140px] text-gray-400">
                      {conv.lastMessage.text}
                    </p>
                  </div>
                </button>
              ))}
          </ScrollArea>
        </aside>

        {/* Chat area */}
        <section className="flex-1 flex flex-col bg-gray-900">
          {!activeConversation && (
            <div className="flex flex-col justify-center items-center h-full text-gray-400 select-none px-6">
              <p className="mb-3 text-2xl">No conversation selected</p>
              <p className="mb-6 text-lg">Start a new chat or select one from the list.</p>
              <Button
                onClick={handleNewChat}
                className="rounded-full px-8 py-3 shadow-lg hover:bg-purple-700 transition"
                aria-label="Start new chat"
              >
                New Chat
              </Button>
            </div>
          )}

          {activeConversation && (
            <>
              {/* Chat header */}
              <header className="flex items-center justify-between p-4 border-b border-gray-700">
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarImage
                      src={activeConversationData?.user.avatar}
                      alt={`Avatar of ${activeConversationData?.user.name}`}
                      referrerPolicy="no-referrer"
                    />
                    <AvatarFallback>
                      {activeConversationData?.user.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="text-xl font-semibold">{activeConversationData?.user.name}</h2>
                </div>

                <div className="flex space-x-4">
                  <Button
                    variant="ghost"
                    onClick={() => setCallType("voice")}
                    aria-label="Start voice call"
                    className="rounded-full hover:bg-purple-700 p-2 transition"
                  >
                    <Phone className="w-6 h-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setCallType("video")}
                    aria-label="Start video call"
                    className="rounded-full hover:bg-purple-700 p-2 transition"
                  >
                    <Video className="w-6 h-6" />
                  </Button>
                </div>
              </header>

              {/* Messages */}
              <ScrollArea className="flex-1 p-6 overflow-y-auto" type="auto" scrollHideDelay={300}>
                <ul role="list" aria-live="polite" aria-relevant="additions" className="space-y-4">
                  {messages.map((msg) => {
                    const isUser = msg.senderId === user?.id
                    return (
                      <li
                        key={msg.id}
                        className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                        aria-label={`${isUser ? "You" : activeConversationData?.user.name} said: ${
                          msg.text
                        }`}
                      >
                        <div
                          className={`max-w-xs px-4 py-2 rounded-xl shadow-sm break-words whitespace-pre-wrap ${
                            isUser
                              ? "bg-purple-600 text-white rounded-br-none"
                              : "bg-gray-800 text-gray-300 rounded-bl-none"
                          }`}
                        >
                          {msg.text}
                          <div className="text-xs text-gray-400 mt-1 text-right">
                            {formatTime(msg.timestamp)}
                          </div>
                        </div>
                      </li>
                    )
                  })}

                  {isTyping && (
                    <li className="flex justify-start animate-pulse text-gray-400" aria-live="polite">
                      <div className="bg-gray-700 text-gray-400 rounded-xl px-4 py-2 max-w-xs">
                        {activeConversationData?.user.name} is typing...
                      </div>
                    </li>
                  )}
                  <div ref={messagesEndRef} />
                </ul>
              </ScrollArea>

              {/* Message input */}
              <form
                onSubmit={handleSendMessage}
                className="flex items-center border-t border-gray-700 p-4 space-x-4 bg-gray-800"
                aria-label="Send message form"
              >
                <Input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  autoComplete="off"
                  className="flex-1 rounded-full px-6 py-3 shadow-inner bg-gray-900 text-white placeholder-gray-500"
                  aria-label="Message input"
                  disabled={isTyping}
                />
                <Button
                  type="submit"
                  disabled={!newMessage.trim() || isTyping}
                  aria-label="Send message"
                  className="rounded-full p-3 bg-purple-600 hover:bg-purple-700 text-white transition disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </form>
            </>
          )}
        </section>
      </main>

      {/* Modals */}
      {callType && <CallModal />}
      {settingsOpen && <SettingsModal />}
    </div>
  )
}
