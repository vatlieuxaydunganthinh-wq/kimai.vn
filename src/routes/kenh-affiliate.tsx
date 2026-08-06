import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/kenh-affiliate")({
  head: () => ({ meta: [{ title: "Kênh Affiliate AI - Kiếm Tiền Thụ Động" }] }),
  component: KenhAffiliatePage,
});

const CHANNELS = [
  {
    key: "thinh-vua-app",
    name: "Thịnh Vua App",
    desc: "Sản phẩm số AI & khóa học kiếm tiền online",
    emoji: "⚡",
    color: "from-emerald-500 to-emerald-400",
  },
  {
    key: "phong-menly",
    name: "Phong Menly",
    desc: "Affiliate x AI – hệ thống KOL AI & thu nhập thụ động",
    emoji: "🎯",
    color: "from-purple-500 to-purple-400",
  },
  {
    key: "son-piaz",
    name: "Sơn Piaz",
    desc: "Kinh doanh online – sản phẩm đang cập nhật",
    emoji: "🌟",
    color: "from-blue-500 to-blue-400",
  },
  {
    key: "pham-thanh-long",
    name: "Phạm Thành Long",
    desc: "Marketing AI – sản phẩm đang cập nhật",
    emoji: "💡",
    color: "from-emerald-500 to-emerald-400",
  },
  {
    key: "nang-ba-mmo",
    name: "Nàng Ba MMO",
    desc: "MMO & kiếm tiền online – sản phẩm đang cập nhật",
    emoji: "💎",
    color: "from-pink-500 to-pink-400",
  },
];

function KenhAffiliatePage() {
  return (
    <div className="min-h-screen bg-[oklch(0.99_0.01_60)]">
      <header className="sticky top-0 z-30 backdrop-blur bg-background/80 border-b border-border/60">
        <div className="mx-auto max-w-3xl px-4 h-14 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-accent transition">
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </Link>
          <span className="font-bold text-sm">💰 KÊNH AFFILIATE AI</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl sm:text-3xl font-black text-center mb-2">
          Kênh Ngon <span className="text-primary">Affiliate AI</span>
        </h1>
        <p className="text-center text-muted-foreground text-sm mb-8">
          Chọn kênh, lấy link affiliate và chia sẻ để nhận hoa hồng thụ động
        </p>

        <div className="flex flex-col gap-3">
          {CHANNELS.map((ch, i) => (
            <a
              key={ch.key}
              href={`/affiliate-products/${ch.key}`}
              className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 hover:shadow-lg hover:border-primary/40 transition-all"
            >
              <div className={`shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br ${ch.color} text-white grid place-items-center text-2xl shadow-sm`}>
                {ch.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground">{i + 1}</span>
                  <h3 className="font-extrabold text-sm sm:text-base">{ch.name}</h3>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{ch.desc}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </a>
          ))}
        </div>

        <div className="mt-8 rounded-2xl bg-primary/5 border border-primary/20 px-5 py-4 text-center">
          <p className="text-sm font-semibold text-primary">🎁 Chưa có link affiliate?</p>
          <p className="text-xs text-muted-foreground mt-1">Đăng ký thành viên để nhận link affiliate và kiếm hoa hồng từ mỗi đơn hàng</p>
          <a href="/affiliate" className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-bold hover:opacity-90 transition">
            Đăng ký ngay →
          </a>
        </div>
      </main>
    </div>
  );
}
