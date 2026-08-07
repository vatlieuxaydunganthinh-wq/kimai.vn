import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { TrendingUp, Users, Package, Link2, Shield, Zap, DollarSign, CheckCircle2, Mail, Phone, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/dau-tu")({
  head: () => ({ meta: [{ title: "Cơ hội Đầu tư & Hợp tác — Kim AI" }] }),
  component: PitchPage,
});

function PitchPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent("Quan tâm đầu tư / mua lại Kim AI");
    const body = encodeURIComponent(
      `Họ tên: ${form.name}\nEmail: ${form.email}\nSĐT: ${form.phone}\n\nNội dung:\n${form.message}`
    );
    window.open(`mailto:thinhqb102@gmail.com?subject=${subject}&body=${body}`, "_blank");
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white font-sans">

      {/* HERO */}
      <section className="relative overflow-hidden px-5 pt-20 pb-24 text-center">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/30 via-transparent to-amber-900/20 pointer-events-none" />
        <div className="relative mx-auto max-w-3xl">
          <span className="inline-block px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-bold uppercase tracking-widest mb-6">
            🤝 Tìm kiếm Nhà đầu tư & Đối tác chiến lược
          </span>
          <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-5">
            Nền tảng Affiliate AI<br />
            <span className="bg-gradient-to-r from-amber-400 to-violet-400 bg-clip-text text-transparent">
              đầu tiên tại Việt Nam
            </span>
          </h1>
          <p className="text-lg text-white/60 max-w-xl mx-auto mb-10">
            Hệ thống affiliate hoàn chỉnh cho sản phẩm AI — đang hoạt động thực tế, có doanh thu,
            đang tìm đối tác để nhân rộng quy mô.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a href="#lien-he" className="inline-flex items-center gap-2 bg-amber-500 text-black font-black px-7 py-3.5 rounded-xl hover:bg-amber-400 transition text-base">
              Liên hệ ngay <ChevronRight className="w-4 h-4" />
            </a>
            <a href="#chi-tiet" className="inline-flex items-center gap-2 bg-white/10 text-white font-bold px-7 py-3.5 rounded-xl hover:bg-white/20 transition text-base border border-white/10">
              Xem chi tiết
            </a>
          </div>
        </div>
      </section>

      {/* METRICS */}
      <section className="px-5 pb-16">
        <div className="mx-auto max-w-4xl grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: DollarSign, label: "Doanh thu / tháng", value: "~7 triệu đ", color: "text-emerald-400" },
            { icon: Users, label: "Thành viên đăng ký", value: "86+", color: "text-violet-400" },
            { icon: Package, label: "Sản phẩm AI trên sàn", value: "28+", color: "text-amber-400" },
            { icon: Link2, label: "Affiliate đang hoạt động", value: "Đang tăng", color: "text-sky-400" },
          ].map((m) => (
            <div key={m.label} className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
              <m.icon className={`w-6 h-6 mx-auto mb-2 ${m.color}`} />
              <div className={`text-2xl font-black mb-1 ${m.color}`}>{m.value}</div>
              <div className="text-xs text-white/40 leading-snug">{m.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* BUSINESS MODEL */}
      <section id="chi-tiet" className="px-5 pb-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl font-black mb-8 text-center">Mô hình kinh doanh</h2>
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              {
                step: "01",
                title: "Chủ sản phẩm AI đăng sàn",
                desc: "Các chủ sản phẩm AI (khóa học, tool, phần mềm) đăng sản phẩm lên sàn để bán hàng qua affiliate.",
                color: "from-violet-600 to-violet-800",
              },
              {
                step: "02",
                title: "Affiliate quảng bá & bán",
                desc: "Affiliate nhận link riêng, quảng bá sản phẩm. Hoa hồng 35% tự động tính khi có đơn hàng.",
                color: "from-amber-500 to-amber-700",
              },
              {
                step: "03",
                title: "Sàn thu phí / % giao dịch",
                desc: "Nền tảng thu phí dịch vụ hoặc % mỗi giao dịch. Thanh toán VND + PayPal quốc tế.",
                color: "from-emerald-500 to-emerald-700",
              },
            ].map((s) => (
              <div key={s.step} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} text-white font-black text-sm mb-4`}>
                  {s.step}
                </div>
                <h3 className="font-bold mb-2">{s.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TECH STACK */}
      <section className="px-5 pb-20 bg-white/[0.02]">
        <div className="mx-auto max-w-4xl py-16">
          <h2 className="text-2xl font-black mb-2 text-center">Hệ thống kỹ thuật</h2>
          <p className="text-center text-white/40 text-sm mb-10">Công nghệ hiện đại, sẵn sàng mở rộng hàng trăm nghìn người dùng</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: Zap, title: "Frontend", desc: "React + TanStack Start (SSR) + Vite — tốc độ load nhanh, SEO tốt" },
              { icon: Shield, title: "Backend & Auth", desc: "Supabase (PostgreSQL) + Row Level Security — bảo mật cấp enterprise" },
              { icon: DollarSign, title: "Thanh toán", desc: "Chuyển khoản ngân hàng VND + PayPal quốc tế tích hợp sẵn" },
              { icon: TrendingUp, title: "Deploy & Scale", desc: "Vercel Edge Network — tự động scale, uptime 99.9%, CI/CD tự động" },
            ].map((t) => (
              <div key={t.title} className="flex gap-4 bg-white/5 border border-white/10 rounded-xl p-5">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-violet-500/20 grid place-items-center">
                  <t.icon className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <div className="font-bold text-sm mb-1">{t.title}</div>
                  <div className="text-xs text-white/40 leading-relaxed">{t.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY BUY */}
      <section className="px-5 pb-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl font-black mb-8 text-center">Tại sao nên đầu tư?</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              "Hệ thống hoàn chỉnh — không cần build từ đầu, tiết kiệm 6-12 tháng phát triển",
              "Doanh thu thực tế ngay từ đầu — không phải dự án trên giấy",
              "Thị trường AI Việt Nam đang bùng nổ — nhu cầu sản phẩm AI tăng mạnh 2024-2025",
              "Cộng đồng sẵn có — 86+ thành viên, affiliate network đang tăng",
              "Mô hình scalable — thêm sản phẩm, thêm affiliate không cần thay đổi hệ thống",
              "Thanh toán quốc tế — PayPal tích hợp, sẵn sàng phục vụ khách nước ngoài",
            ].map((item) => (
              <div key={item} className="flex gap-3 items-start bg-white/5 border border-white/10 rounded-xl p-4">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-white/70 leading-relaxed">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT FORM */}
      <section id="lien-he" className="px-5 pb-24">
        <div className="mx-auto max-w-lg">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
            <h2 className="text-2xl font-black mb-2 text-center">Liên hệ trao đổi</h2>
            <p className="text-center text-white/40 text-sm mb-8">Điền thông tin để tôi liên hệ lại trong 24h</p>

            {sent ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
                <div className="font-bold text-lg mb-2">Đã gửi thành công!</div>
                <p className="text-white/40 text-sm">Tôi sẽ liên hệ lại sớm nhất có thể.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-white/40 uppercase mb-1.5 block">Họ tên *</label>
                  <input
                    required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-500/60 focus:bg-white/15 transition"
                    placeholder="Nguyễn Văn A"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-white/40 uppercase mb-1.5 block">Email *</label>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-500/60 focus:bg-white/15 transition"
                      placeholder="email@gmail.com"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-white/40 uppercase mb-1.5 block">Số điện thoại</label>
                    <input
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-500/60 focus:bg-white/15 transition"
                      placeholder="0367..."
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-white/40 uppercase mb-1.5 block">Nội dung quan tâm</label>
                  <textarea
                    rows={4}
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-500/60 focus:bg-white/15 transition resize-none"
                    placeholder="Tôi muốn đầu tư / mua lại / hợp tác... Ngân sách dự kiến..."
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-amber-500 text-black font-black py-3.5 rounded-xl hover:bg-amber-400 transition text-base"
                >
                  Gửi thông tin liên hệ
                </button>
              </form>
            )}

            <div className="mt-6 pt-6 border-t border-white/10 flex flex-col sm:flex-row gap-3 justify-center text-sm text-white/40">
              <a href="mailto:thinhqb102@gmail.com" className="inline-flex items-center gap-2 hover:text-white transition justify-center">
                <Mail className="w-4 h-4" /> thinhqb102@gmail.com
              </a>
              <a href="https://zalo.me/0367337799" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-white transition justify-center">
                <Phone className="w-4 h-4" /> Zalo: 0367337799
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="text-center pb-10 text-white/20 text-xs">
        © 2025 Kim AI · Thịnh Vua App
      </footer>
    </div>
  );
}
