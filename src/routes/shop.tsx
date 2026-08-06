import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, MessageCircle, Store, Star, Package, Users, Clock, MapPin, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

export const Route = createFileRoute("/shop")({
  head: () => ({ meta: [{ title: "Shop — Siêu Thị Số AI" }] }),
  component: ShopPage,
});

type Affiliate = {
  id: string;
  ref_code: string;
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  commission_rate: number;
};

type Product = {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string | null;
  thumbnail_url_en: string | null;
  price_vnd: number;
  commission_rate: number;
  product_key: string;
  preview_url: string | null;
};

function ShopPage() {
  const { lang } = useLanguage();
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "hot">("all");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (!ref) { setLoading(false); return; }

    (async () => {
      // Fetch affiliate info
      const { data: aff } = await (supabase as any)
        .from("affiliates")
        .select("id,ref_code,display_name,full_name,avatar_url,created_at,commission_rate")
        .eq("ref_code", ref)
        .maybeSingle();

      if (!aff) { setLoading(false); return; }
      setAffiliate(aff);

      // Fetch their products
      const { data: prods } = await (supabase as any)
        .from("member_products")
        .select("id,title,description,thumbnail_url,thumbnail_url_en,price_vnd,commission_rate,product_key,preview_url")
        .eq("affiliate_id", aff.id)
        .order("created_at", { ascending: false });

      if (prods) setProducts(prods);
      setLoading(false);
    })();
  }, []);

  const shopName = affiliate?.display_name || affiliate?.full_name || "Shop";
  const joinDate = affiliate?.created_at
    ? new Date(affiliate.created_at).toLocaleDateString("vi-VN", { month: "long", year: "numeric" })
    : "";

  const parseFirstImg = (raw: string | null): string | null => {
    if (!raw) return null;
    try { const p = JSON.parse(raw); if (Array.isArray(p) && p[0]) return p[0]; } catch {}
    return raw;
  };

  const displayProducts = activeTab === "hot"
    ? [...products].sort((a, b) => b.price_vnd - a.price_vnd).slice(0, 8)
    : products;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <Sparkles className="w-10 h-10 text-primary animate-pulse" />
        <p className="text-muted-foreground text-sm">Đang tải shop...</p>
      </div>
    );
  }

  if (!affiliate) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
        <Store className="w-12 h-12 text-muted-foreground/40" />
        <p className="text-muted-foreground">Không tìm thấy shop này.</p>
        <Link to="/" className="text-primary text-sm underline">Về trang chủ</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[oklch(0.97_0.005_60)]">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-30 backdrop-blur bg-background/80 border-b border-border/60">
        <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
          <button onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-accent transition">
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </button>
          <span className="font-bold text-sm">SIÊU THỊ SỐ <span className="text-primary">AI</span></span>
          <div className="w-24" />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 space-y-4">

        {/* ── SHOP PROFILE ── */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {/* Banner gradient */}
          <div className="h-28 sm:h-36 bg-gradient-to-br from-primary/80 via-primary to-emerald-400 relative">
            <div className="absolute inset-0 opacity-20"
              style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
          </div>

          {/* Profile row */}
          <div className="px-4 sm:px-6 pb-5">
            <div className="flex flex-col sm:flex-row sm:items-end gap-3 -mt-10 sm:-mt-12">
              {/* Avatar */}
              <div className="shrink-0">
                {affiliate.avatar_url ? (
                  <img src={affiliate.avatar_url} alt={shopName}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-card shadow-lg" />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary/10 border-4 border-card shadow-lg flex items-center justify-center">
                    <Store className="w-10 h-10 text-primary" />
                  </div>
                )}
              </div>

              {/* Name + status */}
              <div className="flex-1 min-w-0 pb-1">
                <h1 className="text-xl font-bold truncate">{shopName}</h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                  <span className="text-xs text-emerald-600 font-medium">Online</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 sm:pb-1">
                <a href="https://zalo.me/0367337799" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary text-primary px-4 py-2 text-sm font-semibold hover:bg-primary/5 transition">
                  <MessageCircle className="w-4 h-4" /> Chat
                </a>
              </div>
            </div>

            {/* Stats grid */}
            <div className="mt-4 grid grid-cols-3 sm:grid-cols-5 gap-3 pt-4 border-t border-border">
              {[
                { icon: Package, label: "Sản phẩm", value: products.length },
                { icon: Star, label: "Đánh giá", value: "5.0 ★" },
                { icon: Users, label: "Tỉ lệ phản hồi", value: "100%" },
                { icon: Clock, label: "Phản hồi", value: "Vài giờ" },
                { icon: MapPin, label: "Tham gia", value: joinDate || "2024" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="text-center px-1">
                  <Icon className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                  <div className="text-sm font-bold text-emerald-500">{value}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="flex border-b border-border">
            {[
              { key: "all", label: "TẤT CẢ SẢN PHẨM" },
              { key: "hot", label: "BÁN CHẠY" },
            ].map(({ key, label }) => (
              <button key={key}
                onClick={() => setActiveTab(key as "all" | "hot")}
                className={`flex-1 py-3 text-sm font-bold transition border-b-2 ${activeTab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                {label}
              </button>
            ))}
          </div>

          {/* ── PRODUCT GRID ── */}
          <div className="p-4">
            {displayProducts.length === 0 ? (
              <div className="text-center py-16">
                <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Shop chưa có sản phẩm nào.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {displayProducts.map((p) => {
                  const thumb = lang === "en" && p.thumbnail_url_en ? p.thumbnail_url_en : parseFirstImg(p.thumbnail_url);
                  return (
                    <a key={p.id} href={`/san-pham?mp=${p.product_key}`}
                      className="group bg-background rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow">
                      {/* Product image */}
                      <div className="aspect-video bg-muted overflow-hidden relative">
                        {thumb ? (
                          <img src={thumb} alt={p.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Sparkles className="w-8 h-8 text-muted-foreground/30" />
                          </div>
                        )}
                        {/* Badge */}
                        <div className="absolute top-1.5 left-1.5 bg-primary/90 text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                          Cộng đồng
                        </div>
                      </div>
                      {/* Info */}
                      <div className="p-2.5">
                        <p className="text-xs font-semibold line-clamp-2 leading-snug mb-1.5">{p.title}</p>
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-sm font-extrabold text-emerald-500">
                            {Number(p.price_vnd).toLocaleString("vi-VN")}đ
                          </span>
                        </div>
                        <div className="mt-1 text-[10px] text-emerald-600 font-medium">
                          HH {p.commission_rate}%
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
