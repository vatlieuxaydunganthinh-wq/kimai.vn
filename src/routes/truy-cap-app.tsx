import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Sparkles, CheckCircle2, ShoppingCart, LogIn, Crown, ExternalLink, Search, Link2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PaymentModal } from "@/components/PaymentModal";
import { apps } from "@/lib/apps-data";

const ACTIVE_PRODUCT_NS = [5, 6, 7, 9, 10, 11, 13, 14, 15, 17, 18, 19, 20, 21, 22, 23, 28];

export const Route = createFileRoute("/truy-cap-app")({
  head: () => ({
    meta: [
      { title: "Truy cập App — Thịnh Vua App" },
      { name: "description", content: "Khám phá bộ công cụ AI mạnh mẽ – 12 công cụ AI được thiết kế dành riêng cho phụ nữ kinh doanh và xây dựng thương hiệu cá nhân." },
    ],
  }),
  component: Page,
});

type VipState = "loading" | "not-logged-in" | "vip";

type MemberProduct = {
  id: string; title: string; description: string; product_url: string;
  preview_url: string | null; thumbnail_url: string | null; price_vnd: number; commission_rate: number;
  product_key: string; seller_name: string; shop_name: string | null; status: string;
};

function Page() {
  const [vipState, setVipState] = useState<VipState>("loading");
  const [userInfo, setUserInfo] = useState<{ id: string; name: string; phone: string; email: string } | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<typeof apps[0] | null>(null);
  const [purchasedProducts, setPurchasedProducts] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [memberProductsList, setMemberProductsList] = useState<MemberProduct[]>([]);
  const [highlightMpKey, setHighlightMpKey] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const sp = params.get("sp");
      if (sp) {
        const found = apps.find((a) => a.n === parseInt(sp));
        if (found) setSearchQuery(found.title);
      }
      const q = params.get("q");
      if (q) setSearchQuery(q);
      const mp = params.get("mp");
      if (mp) setHighlightMpKey(mp);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setVipState("not-logged-in"); return; }

      const { data: profile } = await supabase.from("profiles").select("full_name, phone").eq("id", user.id).single();
      setUserInfo({ id: user.id, name: profile?.full_name ?? "", phone: profile?.phone ?? "", email: user.email ?? "" });
      setVipState("vip" as VipState);

      const { data: paidOrders } = await (supabase as any)
        .from("product_orders")
        .select("product_key, product_url")
        .eq("customer_email", user.email)
        .eq("status", "paid");

      if (paidOrders && paidOrders.length > 0) {
        const map: Record<string, string> = {};
        paidOrders.forEach((o: any) => {
          if (o.product_url) map[o.product_key] = o.product_url;
        });
        setPurchasedProducts(map);
      }
    })();

    // Load member products (public — no auth needed)
    (supabase as any).from("member_products").select("*").eq("status", "active").order("created_at", { ascending: false }).then(({ data }: any) => {
      if (data) {
        setMemberProductsList(data as MemberProduct[]);
        const mpKey = new URLSearchParams(window.location.search).get("mp");
        if (mpKey) {
          const found = (data as MemberProduct[]).find((mp) => mp.product_key === mpKey);
          if (found) setSearchQuery(found.title);
          setTimeout(() => {
            document.getElementById(`mp-${mpKey}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 300);
        }
      }
    });
  }, []);

  const handleOrder = (app: typeof apps[0]) => {
    setSelectedProduct(app);
    setPaymentModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[oklch(0.99_0.01_60)]">
      <header className="sticky top-0 z-30 backdrop-blur bg-background/80 border-b border-border/60">
        <div className="mx-auto max-w-7xl px-5 h-16 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-accent transition">
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </Link>
          <span className="font-bold">KIM <span className="text-primary">AI</span></span>
        </div>
      </header>

      <section className="px-5 pt-16 pb-6 max-w-5xl mx-auto text-center">
        <h1 className="font-black tracking-tight font-sans leading-[1.1] flex flex-col items-center gap-2">
          <span className="block text-4xl md:text-6xl bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            SẢN PHẨM KIM AI
          </span>
        </h1>
        <div className="mt-6 mx-auto h-1 w-24 rounded-full bg-gradient-to-r from-primary to-primary/40" />

        <div className="mt-6 max-w-md mx-auto relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm sản phẩm..."
            className="w-full rounded-full border border-border bg-background pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm font-bold">✕</button>
          )}
        </div>
      </section>

      <section className="px-5 pb-20 max-w-7xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Member products first */}
        {memberProductsList.filter((mp) => {
          if (!searchQuery.trim()) return true;
          const q = searchQuery.toLowerCase();
          return mp.title.toLowerCase().includes(q) || (mp.description || "").toLowerCase().includes(q);
        }).map((mp) => (
          <div key={mp.id} id={`mp-${mp.product_key}`} className={`rounded-2xl overflow-hidden border bg-background hover:shadow-xl hover:-translate-y-1 transition ${highlightMpKey === mp.product_key ? "border-primary ring-2 ring-primary/40" : "border-border"}`}>
            <div className="relative aspect-video w-full bg-gradient-to-br from-[oklch(0.3_0.08_280)] to-[oklch(0.2_0.05_260)] overflow-hidden">
              <a href={`/san-pham?mp=${mp.product_key}`} className="absolute inset-0 flex items-center justify-center">
                {mp.thumbnail_url ? (
                  <img src={(() => { try { const p = JSON.parse(mp.thumbnail_url!); return Array.isArray(p) ? p[0] : mp.thumbnail_url; } catch { return mp.thumbnail_url; } })()} alt={mp.title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                ) : (
                  <Sparkles className="w-10 h-10 text-white/30" />
                )}
              </a>
              <div className="absolute top-3 left-3 rounded-full bg-primary/90 text-primary-foreground text-[10px] font-bold px-2 py-0.5 pointer-events-none">Cộng đồng</div>
              <button
                onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/san-pham?mp=${mp.product_key}`); toast.success("Đã copy link sản phẩm!"); }}
                className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-white/90 grid place-items-center hover:bg-white transition"
                title="Copy link sản phẩm"
              >
                <Link2 className="w-3.5 h-3.5 text-foreground" />
              </button>
            </div>
            <div className="p-5">
              <a href={`/san-pham?mp=${mp.product_key}`} className="hover:text-primary transition">
                <h3 className="font-bold text-sm leading-snug min-h-[2.5rem]">{mp.title}</h3>
              </a>
              <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{mp.description}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">🏪 {mp.shop_name || mp.seller_name}</p>
              {purchasedProducts[mp.product_key] ? (
                <>
                  <a href={purchasedProducts[mp.product_key]} target="_blank" rel="noopener noreferrer" className="mt-3 w-full rounded-lg bg-emerald-500 text-white py-2.5 text-sm font-bold hover:bg-emerald-400 transition flex items-center justify-center gap-2">
                    <ExternalLink className="w-4 h-4" /> Truy cập sản phẩm
                  </a>
                  <div className="mt-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-center">
                    <p className="text-xs font-semibold text-emerald-700 flex items-center justify-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Đã mua — mở khóa vĩnh viễn</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Hoa hồng {mp.commission_rate}%</span>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">KM {Number(mp.price_vnd).toLocaleString("vi-VN")}đ</span>
                  </div>
                  {mp.preview_url && (
                    <a href={mp.preview_url} target="_blank" rel="noopener noreferrer" className="mt-2 w-full rounded-lg border border-primary text-primary py-2 text-sm font-semibold hover:bg-primary/10 transition text-center inline-block">
                      👁 ẤN VÀO ĐÂY XEM TRƯỚC
                    </a>
                  )}
                  {vipState === "vip" ? (
                    <button onClick={() => {
                      setSelectedProduct({ n: 999, title: mp.title, price: "0$", priceVnd: String(mp.price_vnd), codeFormat: mp.product_key + "<SĐT>", codeExample: "", productUrl: mp.product_url, image: null as any, desc: mp.description || "", previewUrl: mp.preview_url || undefined });
                      setPaymentModalOpen(true);
                    }} className="mt-2 w-full rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:opacity-90 transition flex items-center justify-center gap-2">
                      <ShoppingCart className="w-4 h-4" /> Mua ngay
                    </button>
                  ) : vipState === "loading" ? (
                    <button disabled className="mt-2 w-full rounded-lg bg-primary/40 text-primary-foreground py-2.5 text-sm font-semibold flex items-center justify-center gap-2 cursor-not-allowed">
                      <ShoppingCart className="w-4 h-4" /> Đang tải...
                    </button>
                  ) : (
                    <Link to="/affiliate" className="mt-2 w-full rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:opacity-90 transition flex items-center justify-center gap-2">
                      <LogIn className="w-4 h-4" /> Đăng nhập để mua
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
        {/* Admin products */}
        {[...apps].filter((a) => ACTIVE_PRODUCT_NS.includes(a.n)).sort((a, b) => b.n - a.n).filter((a) => {
          if (!searchQuery.trim()) return true;
          const q = searchQuery.toLowerCase();
          return a.title.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q);
        }).map((a) => (
          <div key={a.n} className="rounded-2xl overflow-hidden border border-border bg-background hover:shadow-xl hover:-translate-y-1 transition">
            <div className="relative aspect-video w-full bg-gradient-to-br from-[oklch(0.3_0.05_260)] to-[oklch(0.2_0.05_260)] overflow-hidden">
              <a href={`/san-pham?id=${a.n}`} className="absolute inset-0 flex items-center justify-center">
                {a.image ? (
                  <img src={a.image} alt={a.title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                ) : (
                  <Sparkles className="w-12 h-12 text-white/40" />
                )}
              </a>
              <div className="absolute top-3 left-3 w-7 h-7 rounded-full bg-white/90 grid place-items-center text-xs font-bold z-10 pointer-events-none">{a.n}</div>
              <button
                onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/san-pham?id=${a.n}`); toast.success("Đã copy link sản phẩm!"); }}
                className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-white/90 grid place-items-center hover:bg-white transition"
                title="Copy link sản phẩm"
              >
                <Link2 className="w-3.5 h-3.5 text-foreground" />
              </button>
            </div>
            <div className="p-5">
              <a href={`/san-pham?id=${a.n}`} className="hover:text-primary transition">
                <h3 className="font-bold text-sm leading-snug min-h-[2.5rem]">{a.title}</h3>
              </a>
              <p className="mt-2 text-xs text-muted-foreground line-clamp-3">{a.desc}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">Hoa hồng affiliate <b className="text-primary">35%</b></p>

              {a.priceVnd && (
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground line-through opacity-60">Giá gốc</span>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
                    KM {Number(a.priceVnd).toLocaleString("vi-VN")}đ
                  </span>
                </div>
              )}

              {(() => {
                const productKey = a.codeFormat.replace(/<[^>]+>/g, "");
                const purchasedUrl = purchasedProducts[productKey];

                if (purchasedUrl) {
                  return (
                    <>
                      <a
                        href={purchasedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 w-full rounded-lg bg-emerald-500 text-white py-2.5 text-sm font-bold hover:bg-emerald-400 transition flex items-center justify-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4" /> Truy cập sản phẩm
                      </a>
                      <div className="mt-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-center">
                        <p className="text-xs font-semibold text-emerald-700 flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Đã mua — mở khóa vĩnh viễn
                        </p>
                      </div>
                    </>
                  );
                }

                return (
                  <>
                    {a.previewUrl ? (
                      <a href={a.previewUrl} target="_blank" rel="noopener noreferrer" className="mt-3 w-full rounded-lg border border-primary text-primary py-2 text-sm font-semibold hover:bg-primary/10 transition text-center inline-block">
                        👁 ẤN VÀO ĐÂY XEM TRƯỚC
                      </a>
                    ) : (
                      <button onClick={() => alert("Nội dung xem trước đang được chuẩn bị. Vui lòng liên hệ Zalo 0982101088 để xem demo trực tiếp.")} className="mt-3 w-full rounded-lg border border-primary text-primary py-2 text-sm font-semibold hover:bg-primary/10 transition">
                        👁 ẤN VÀO ĐÂY XEM TRƯỚC
                      </button>
                    )}

                    {vipState === "vip" ? (
                      <button
                        onClick={() => handleOrder(a)}
                        className="mt-2 w-full rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:opacity-90 transition flex items-center justify-center gap-2"
                      >
                        <ShoppingCart className="w-4 h-4" /> Mua ngay
                      </button>
                    ) : vipState === "loading" ? (
                      <button disabled className="mt-2 w-full rounded-lg bg-primary/40 text-primary-foreground py-2.5 text-sm font-semibold flex items-center justify-center gap-2 cursor-not-allowed">
                        <ShoppingCart className="w-4 h-4" /> Đang tải...
                      </button>
                    ) : (
                      <Link to="/affiliate" className="mt-2 w-full rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:opacity-90 transition flex items-center justify-center gap-2">
                        <LogIn className="w-4 h-4" /> Đăng nhập để mua
                      </Link>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        ))}
      </section>

      <PaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        product={selectedProduct}
        userInfo={userInfo ? { name: userInfo.name, email: userInfo.email } : null}
        affiliateRef={typeof window !== "undefined" ? localStorage.getItem("affiliate_ref") || undefined : undefined}
      />
    </div>
  );
}
