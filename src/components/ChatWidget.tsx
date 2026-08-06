import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Loader2, Bot, Brain, ChevronDown } from "lucide-react";
import { chatWithAssistant } from "@/lib/chat-server-fns";

type Msg = { role: "user" | "assistant"; content: string };

const QUICK_QUESTIONS = [
  "Bạn có thể giúp tôi gì?",
  "Cách mua sản phẩm?",
  "Chương trình affiliate?",
  "Tôi muốn tìm skill AI",
];

// Tạo session ID duy nhất, lưu localStorage để nhớ qua các lần truy cập
function getOrCreateSessionId(): string {
  const key = "stai_chat_session";
  let id = localStorage.getItem(key);
  if (!id) {
    id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

function MemoryBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-1 text-[10px] text-white/70">
      <Brain className="w-3 h-3" />
      <span>Nhớ {count} điều về bạn</span>
    </div>
  );
}

function renderText(text: string) {
  // Render **bold** và xuống dòng
  return text.split("\n").map((line, i) => {
    const parts: React.ReactNode[] = [];
    let rest = line;
    let key = 0;
    const boldRe = /\*\*(.+?)\*\*/g;
    let last = 0, m;
    while ((m = boldRe.exec(rest)) !== null) {
      if (m.index > last) parts.push(<span key={key++}>{rest.slice(last, m.index)}</span>);
      parts.push(<strong key={key++}>{m[1]}</strong>);
      last = m.index + m[0].length;
    }
    if (last < rest.length) parts.push(<span key={key++}>{rest.slice(last)}</span>);
    return (
      <p key={i} className={line.trim() === "" ? "h-2" : ""}>
        {parts.length ? parts : line}
      </p>
    );
  });
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState("pending");

  useEffect(() => {
    setSessionId(getOrCreateSessionId());
  }, []);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content: "Xin chào! 👋 Tôi là trợ lý AI của **Siêu Thị Số AI** — và tôi học hỏi từ mỗi cuộc trò chuyện để ngày càng hiểu bạn hơn.\n\nTôi có thể tìm sản phẩm, hướng dẫn mua hàng, giải thích affiliate, hoặc đơn giản là trò chuyện. Bạn cần gì?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const [memoryCount, setMemoryCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput("");

    const userMsg: Msg = { role: "user", content };
    setMessages((prev) => {
      const next = [...prev, userMsg];
      // Giữ tối đa 20 tin nhắn gần nhất để tiết kiệm token
      return next.slice(-20);
    });
    setLoading(true);

    try {
      const currentMessages = [...messages, userMsg].slice(-20);
      const result = await chatWithAssistant({
        data: { messages: currentMessages, sessionId },
      });

      const reply = result.ok ? result.reply : "Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);

      // Tăng memory count nếu bot đã nhớ gì đó (heuristic: kiểm tra từ khoá)
      if (reply.includes("ghi nhớ") || reply.includes("nhớ rồi") || reply.includes("lưu lại")) {
        setMemoryCount((n) => n + 1);
      }

      if (!open) setUnread((n) => n + 1);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Xin lỗi, mất kết nối. Vui lòng thử lại." },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, open, sessionId]);

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
        aria-label="Chat với trợ lý AI"
      >
        {open ? (
          <ChevronDown className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-bounce">
            {unread}
          </span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-50 w-[340px] sm:w-[390px] max-h-[580px] flex flex-col rounded-2xl shadow-2xl border border-border bg-background overflow-hidden">

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-primary text-primary-foreground flex-shrink-0">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm leading-none">Trợ lý Siêu Thị Số AI</p>
              <MemoryBadge count={memoryCount} />
              {memoryCount === 0 && (
                <p className="text-[11px] text-white/70 mt-0.5">AI · Học từ mỗi cuộc trò chuyện</p>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-full hover:bg-white/20 p-1.5 transition flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-[oklch(0.97_0.005_60)] min-h-0">
            {messages.map((m, i) => (
              <div key={i} className={`flex items-end gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mb-0.5">
                    <Bot className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-sm ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-background border border-border/60 text-foreground rounded-bl-sm"
                  }`}
                >
                  <div className="space-y-0.5">{renderText(m.content)}</div>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex items-end gap-2 justify-start">
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mb-0.5">
                  <Bot className="w-3.5 h-3.5 text-primary-foreground" />
                </div>
                <div className="bg-background border border-border/60 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Quick questions (chỉ tin nhắn đầu tiên) */}
          {messages.length === 1 && !loading && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5 bg-[oklch(0.97_0.005_60)]">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="text-[10px] rounded-full border border-primary/40 text-primary px-2.5 py-1 hover:bg-primary hover:text-primary-foreground transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-2.5 border-t border-border bg-background flex gap-2 items-center flex-shrink-0">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Nhắn tin tự nhiên..."
              disabled={loading}
              className="flex-1 rounded-xl border border-border bg-muted px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 transition"
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition flex-shrink-0"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
