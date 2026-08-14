import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, Sparkles, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { apps, enThumbnailUrls, skillEnTitles } from "@/lib/apps-data";
import { AnAnMark } from "@/components/Logo";
import { useLanguage } from "@/contexts/LanguageContext";

export const Route = createFileRoute("/danh-muc")({
  head: () => ({ meta: [{ title: "Danh mục sản phẩm — AnAn" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    loai: ((search.loai as string) || "skill") as "skill" | "app" | "guide",
  }),
  component: DanhMucPage,
});

const BASE_DATE = new Date("2025-01-01").getTime();

function catOf(title: string): "skill" | "app" | "guide" {
  const low = title.toLowerCase();
  if (low.includes("skill") || low.includes("trợ lý") || low.includes("tài khoản") || low.includes("prompt") || low.includes("gemini") || low.includes("chatgpt")) return "skill";
  if (low.includes("app") || low.includes("flow") || low.includes("wf") || low.includes("kol") || low.includes("combo") || low.includes("studio") || low.includes("workflow") || low.includes("bot")) return "app";
  return "guide";
}

type Product = {
  type: "admin" | "community";
  key: string;
  n: number | null;
  title: string;
  titleEn: string | null;
  priceVnd: number;
  image: string | null;
  productKey: string | null;
  sortMs: number;
};

function DanhMucPage() {
  const { loai } = Route.useSearch();
  const { lang, setLang, t, price } = useLanguage();
  const [communityProducts, setCommunityProducts] = useState<any[]>([]);
  const [adminDbProducts, setAdminDbProducts] = useState<any[] | null>(null);
  const [ratings, setRatings] = useState<Record<string, { avg: number; count: number }>>({});

  useEffect(() => {
    (supabase as any)
      .from("member_products")
      .select("id,title,price_vnd,thumbnail_url,thumbnail_url_en,product_key,seller_name,shop_name,created_at")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .then(({ data }: any) => { if (data) setCommunityProducts(data); });

    (supabase as any)
      .from("admin_products")
      .select("n,title,price_vnd,thumbnail_url,thumbnail_url_en,is_active,sort_order")
      .eq("is_active", true)
      .order("sort_order")
      .order("n")
      .then(({ data }: any) => { if (data && data.length > 0) setAdminDbProducts(data); });

    (supabase as any)
      .from("product_ratings")
      .select("product_key,rating")
      .then(({ data }: any) => {
        if (!data) return;
        const map: Record<string, number[]> = {};
        data.forEach((r: any) => { if (!map[r.product_key]) map[r.product_key] = []; map[r.product_key].push(r.rating); });
        const result: Record<string, { avg: number; count: number }> = {};
        Object.entries(map).forEach(([k, vals]) => {
          result[k] = { avg: (vals as number[]).reduce((a: number, b: number) => a + b, 0) / vals.length, count: vals.length };
        });
        setRatings(result);
      });
  }, []);

  const adminsFallback = apps.map((a) => ({
    type: "admin" as const,
    key: `a-${a.n}`,
    n: a.n,
    title: a.title,
    titleEn: a.titleEn ?? null,
    priceVnd: Number(a.priceVnd),
    image: (lang === "en" ? (enThumbnailUrls[a.n] ?? a.image) : a.image) as string | null,
    productKey: null as string | null,
    sortMs: BASE_DATE + a.n * 86400000,
  }));

  const effectiveAdmins: Product[] = adminDbProducts
    ? adminDbProducts.map((p) => ({
        type: "admin" as const,
        key: `a-${p.n}`,
        n: p.n,
        title: p.title,
        titleEn: apps.find((a) => a.n === p.n)?.titleEn ?? null,
        priceVnd: p.price_vnd,
        image: lang === "en"
          ? (p.thumbnail_url_en ?? enThumbnailUrls[p.n] ?? p.thumbnail_url ?? (apps.find((a) => a.n === p.n)?.image as string | null ?? null))
          : (p.thumbnail_url ?? (apps.find((a) => a.n === p.n)?.image as string | null ?? null)),
        productKey: null,
        sortMs: BASE_DATE + p.n * 86400000,
      }))
    : adminsFallback;

  const communityList: Product[] = communityProducts.map((cp) => ({
    type: "community" as const,
    key: `c-${cp.product_key}`,
    n: null,
    title: cp.title,
    titleEn: skillEnTitles[cp.product_key] ?? null,
    priceVnd: cp.price_vnd,
    image: (() => {
      if (lang === "en" && cp.thumbnail_url_en) return cp.thumbnail_url_en;
      try { const p = JSON.parse(cp.thumbnail_url ?? ""); return Array.isArray(p) ? p[0] ?? null : cp.thumbnail_url; } catch { return cp.thumbnail_url; }
    })(),
    productKey: cp.product_key,
    sortMs: new Date(cp.created_at).getTime(),
  }));

  const allMerged = [...effectiveAdmins, ...communityList].sort((a, b) => {
    if (a.type === "admin" && b.type === "community") return -1;
    if (a.type === "community" && b.type === "admin") return 1;
    return b.sortMs - a.sortMs;
  });

  const filtered = allMerged.filter((p) => catOf(p.title) === loai);

  const sectionMeta: Record<string, { emoji: string; vi: string; en: string }> = {
    skill: { emoji: "🎓", vi: "SKILL / TÀI LIỆU", en: "SKILL / COURSES" },
    app:   { emoji: "⚡", vi: "APP / TOOL",        en: "APP / TOOL"      },
    guide: { emoji: "📖", vi: "HƯỚNG DẪN / KHÓA HỌC", en: "GUIDE / COURSES" },
  };
  const meta = sectionMeta[loai] ?? sectionMeta.skill;

  function ProductCard({ p }: { p: Product }) {
    const href = p.type === "community" ? `/san-pham?mp=${p.productKey}` : `/san-pham?id=${p.n}`;
    const rk = p.type === "community" ? p.productKey! : String(p.n!);
    const r = ratings[rk];
    const displayTitle = lang === "en" && p.titleEn ? p.titleEn : p.title;

    return (
      <a
        href={href}
        className="group border border-border rounded-xl overflow-hidden hover:shadow-lg hover:border-primary/40 transition-all bg-background"
      >
        <div className="aspect-video overflow-hidden bg-muted relative">
          {p.image ? (
            <img src={p.image} alt={displayTitle} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[oklch(0.3_0.08_280)] to-[oklch(0.2_0.05_260)] flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-white/30" />
            </div>
          )}
          {p.type === "community" && (
            <div className="absolute top-2 left-2 rounded-full bg-primary/90 text-primary-foreground text-[9px] font-bold px-2 py-0.5">
              {t("Cộng đồng", "Community")}
            </div>
          )}
        </div>
        <div className="p-2">
          <p className="text-foreground text-xs sm:text-sm font-bold line-clamp-2 leading-snug mb-1.5">{displayTitle}</p>
          <div className="text-primary font-bold text-sm">{price(p.priceVnd)}</div>
          {r && r.count > 0 && (
            <div className="flex items-center gap-0.5 mt-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <span key={s} className={`text-[11px] leading-none ${s <= Math.round(r.avg) ? "text-yellow-400" : "text-gray-300"}`}>★</span>
              ))}
              <span className="text-[9px] text-muted-foreground ml-0.5">{r.avg.toFixed(1)}</span>
            </div>
          )}
          <div className="mt-2 w-full py-1.5 bg-primary text-primary-foreground text-[10px] sm:text-xs font-bold rounded-lg text-center group-hover:opacity-90 transition">
            {t("Xem & Mua ngay", "View & Buy")}
          </div>
        </div>
      </a>
    );
  }

  return (
    <div className="min-h-screen bg-[oklch(0.96_0.01_60)] text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-primary shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            to="/"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white px-3 py-1.5 text-sm font-semibold transition"
          >
            <ArrowLeft className="w-4 h-4" /> {t("Quay lại", "Back")}
          </Link>
          <Link to="/" className="flex items-center gap-1.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 grid place-items-center">
              <AnAnMark className="w-5 h-5 text-white" />
            </div>
            <span className="hidden sm:block text-white font-extrabold text-base leading-tight">
              <>An<span className="text-yellow-300">An</span></>
            </span>
          </Link>
          <button
            onClick={() => setLang(lang === "vi" ? "en" : "vi")}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white px-3 py-1.5 text-sm font-bold transition"
          >
            <Globe className="w-3.5 h-3.5" />
            {lang === "vi" ? "EN" : "VI"}
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-3 py-5">
        {/* Section title */}
        <div className="flex items-center justify-between mb-4 px-1">
          <h1 className="text-lg sm:text-xl font-extrabold flex items-center gap-2">
            {meta.emoji} {lang === "en" ? meta.en : meta.vi}
          </h1>
          <span className="text-sm text-muted-foreground font-semibold">
            {filtered.length} {t("sản phẩm", "products")}
          </span>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>{t("Đang tải sản phẩm...", "Loading products...")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            {filtered.map((p) => <ProductCard key={p.key} p={p} />)}
          </div>
        )}

        {/* Back button bottom */}
        <div className="mt-8 flex justify-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-primary text-primary font-bold text-sm hover:bg-primary hover:text-primary-foreground transition"
          >
            <ArrowLeft className="w-4 h-4" /> {t("Quay lại trang chủ", "Back to Home")}
          </Link>
        </div>
      </main>
    </div>
  );
}
