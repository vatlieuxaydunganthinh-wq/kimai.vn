import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles,
  Menu,
  X,
  LogOut,
  User,
  ExternalLink,
  Phone,
  Sun,
  Moon,
  Search,
  ShoppingBag,
  Zap,
  BookOpen,
  Workflow,
  Layers,
  DollarSign,
  Headphones,
  Users2,
  GraduationCap,
  Globe,
  Pencil,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { apps, skillEnTitles, enThumbnailUrls } from "@/lib/apps-data";
import { useLanguage } from "@/contexts/LanguageContext";
import { getFeaturedPromoServer } from "@/lib/payment-server-fns";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KIM AI - Sàn Sản Phẩm Số" },
      {
        name: "description",
        content: "Mua sắm sản phẩm số AI – công cụ, app, khóa học, workflow từ KIM AI",
      },
      { property: "og:title", content: "KIM AI - Sàn Sản Phẩm Số" },
      {
        property: "og:description",
        content: "Mua sắm sản phẩm số AI – công cụ, app, khóa học, workflow từ KIM AI",
      },
    ],
  }),
  component: Index,
});

const PAGE_SIZE = 18;
const BASE_DATE = new Date("2025-01-01").getTime();
const adminProductsFallback = apps.map((a) => ({
  type: "admin" as const,
  key: `a-${a.n}`,
  n: a.n,
  title: a.title,
  titleEn: a.titleEn ?? null,
  priceVnd: Number(a.priceVnd),
  image: a.image as string | null,
  imageEn: (a.thumbnailEnUrl ?? enThumbnailUrls[a.n] ?? null) as string | null,
  productKey: null as string | null,
  sortMs: BASE_DATE + a.n * 86400000,
}));

type DbAdminProduct = { n: number; title: string; price_vnd: number; thumbnail_url: string | null; thumbnail_url_en: string | null; is_active: boolean; sort_order: number };

function Index() {
  const { lang, setLang, t, price } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string } | null>(null);
  const [hasAffiliate, setHasAffiliate] = useState(false);
  const [showAffiliateMsg, setShowAffiliateMsg] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [communityProducts, setCommunityProducts] = useState<{ id: string; title: string; price_vnd: number; thumbnail_url: string | null; thumbnail_url_en: string | null; product_key: string; seller_name: string; shop_name: string | null; created_at: string }[]>([]);
  const [ratings, setRatings] = useState<Record<string, { avg: number; count: number }>>({});
  const [adminDbProducts, setAdminDbProducts] = useState<DbAdminProduct[] | null>(null);
  const [sortOrder, setSortOrder] = useState<"default" | "price_asc" | "price_desc">("default");
  const [featuredPromo, setFeaturedPromo] = useState<{ code: string; product_url: string } | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);
  const currentUserIdRef = useRef<string | null>(null);

  const saveDisplayName = async () => {
    const newName = nameInput.trim();
    const uid = currentUserIdRef.current;
    if (!newName || !uid) return;
    setSavingName(true);
    // Lưu vào bảng profiles (không dùng user_metadata vì đăng nhập Google sẽ ghi đè lại tên cũ mỗi lần login)
    const { error } = await supabase.from("profiles").update({ full_name: newName }).eq("id", uid);
    setSavingName(false);
    if (!error) {
      setCurrentUser((u) => (u ? { ...u, name: newName } : u));
      setEditingName(false);
    }
  };

  const toggleDark = () => {
    setDarkMode((v) => {
      document.documentElement.classList.toggle("dark", !v);
      return !v;
    });
  };

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        currentUserIdRef.current = data.user.id;
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", data.user.id)
          .maybeSingle();
        setCurrentUser({
          name: (profileData as any)?.full_name || data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "",
          email: data.user.email || "",
        });
        const { data: affData } = await supabase
          .from("affiliates")
          .select("id")
          .eq("user_id", data.user.id)
          .maybeSingle();
        setHasAffiliate(!!affData);
      }
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      localStorage.setItem("affiliate_ref", ref);
      (async () => {
        try {
          const { data: aff } = await (supabase as any).rpc("get_affiliate_by_ref", { p_ref_code: ref });
          if (aff && aff.length > 0) {
            await (supabase as any).from("affiliate_clicks").insert({
              affiliate_id: aff[0].id,
              product_key: "main",
              referrer_url: document.referrer || null,
            });
          }
        } catch {}
      })();
    }
  }, []);

  useEffect(() => {
    (supabase as any).from("member_products").select("id,title,price_vnd,thumbnail_url,thumbnail_url_en,product_key,seller_name,shop_name,created_at").eq("status", "active").order("created_at", { ascending: false }).then(({ data }: any) => {
      if (data) setCommunityProducts(data);
    });
  }, []);

  useEffect(() => {
    (supabase as any)
      .from("admin_products")
      .select("n,title,price_vnd,thumbnail_url,thumbnail_url_en,is_active,sort_order")
      .eq("is_active", true)
      .order("sort_order")
      .order("n")
      .then(({ data }: any) => {
        if (data && data.length > 0) setAdminDbProducts(data as DbAdminProduct[]);
      });
  }, []);

  useEffect(() => {
    getFeaturedPromoServer().then((p) => {
      if (p) setFeaturedPromo(p);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    (supabase as any).from("product_ratings").select("product_key,rating").then(({ data }: any) => {
      if (!data) return;
      const map: Record<string, number[]> = {};
      data.forEach((r: any) => {
        if (!map[r.product_key]) map[r.product_key] = [];
        map[r.product_key].push(r.rating);
      });
      const result: Record<string, { avg: number; count: number }> = {};
      Object.entries(map).forEach(([k, vals]) => {
        result[k] = { avg: (vals as number[]).reduce((a, b) => a + b, 0) / vals.length, count: vals.length };
      });
      setRatings(result);
    });
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/truy-cap-app?q=${encodeURIComponent(searchQuery.trim())}`;
    } else {
      window.location.href = "/truy-cap-app";
    }
  };

  return (
    <div className="min-h-screen bg-[oklch(0.96_0.01_60)] text-foreground">

      {/* ── TOP BAR ── */}
      <div className="bg-primary text-primary-foreground text-[11px] px-4 py-1 hidden sm:block">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            {t("Sàn sản phẩm số AI ·", "AI Digital Products ·")}
            <span className="text-base sm:text-lg font-black tracking-wide leading-none">
              <span className="text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.9)]">KIM</span>{" "}
              <span className="text-yellow-300 drop-shadow-[0_0_8px_rgba(253,224,71,0.95)]">AI</span>
            </span>
          </span>
          <div className="flex items-center gap-4">
            {currentUser ? (
              <>
                <span>{t("Xin chào,", "Hello,")} <b>{currentUser.name}</b></span>
                <button onClick={handleLogout} className="underline opacity-80 hover:opacity-100">{t("Đăng xuất", "Logout")}</button>
              </>
            ) : (
              <>
                <Link to="/affiliate" className="underline opacity-80 hover:opacity-100">{t("Đăng nhập", "Login")}</Link>
                <Link to="/affiliate" className="underline opacity-80 hover:opacity-100">{t("Đăng ký", "Sign Up")}</Link>
              </>
            )}
            <button onClick={toggleDark} className="opacity-80 hover:opacity-100">
              {darkMode ? <Moon className="w-3.5 h-3.5 inline" /> : <Sun className="w-3.5 h-3.5 inline" />}
            </button>
            {/* Language Toggle */}
            <button
              onClick={() => setLang(lang === "vi" ? "en" : "vi")}
              className="flex items-center gap-1 opacity-80 hover:opacity-100 font-bold border border-white/40 rounded px-1.5 py-0.5"
            >
              <Globe className="w-3 h-3" />
              {lang === "vi" ? "EN" : "VI"}
            </button>
          </div>
        </div>
      </div>

      {/* ── MAIN HEADER ── */}
      <header className="sticky top-0 z-30 bg-primary shadow-md">
        {/* ── MOBILE HEADER (2 rows) ── */}
        <div className="sm:hidden px-3 pt-2.5 pb-1.5">
          {/* Row 1: Logo + user info + globe + menu */}
          <div className="flex items-center justify-between mb-2">
            <Link to="/" className="flex items-center gap-1.5">
              <div className="w-8 h-8 rounded-lg bg-white/20 grid place-items-center shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-extrabold text-sm leading-tight">
                <>KIM <span className="text-yellow-300">AI</span></>
              </span>
            </Link>
            <div className="flex items-center gap-1.5">
              {currentUser ? (
                hasAffiliate ? (
                  <Link
                    to="/affiliate-dashboard"
                    className="flex items-center gap-1 bg-yellow-300 text-emerald-900 rounded-lg px-2.5 py-1.5 text-xs font-extrabold"
                    style={{ boxShadow: "0 0 10px 2px rgba(253,224,71,0.5)" }}
                  >
                    📊 <span className="max-w-[60px] truncate">{currentUser.name.split(" ").pop()}</span>
                  </Link>
                ) : (
                  <button
                    onClick={() => setShowAffiliateMsg(true)}
                    className="flex items-center gap-1 bg-yellow-300 text-emerald-900 rounded-lg px-2.5 py-1.5 text-xs font-extrabold"
                  >
                    👤 <span className="max-w-[60px] truncate">{currentUser.name.split(" ").pop()}</span>
                  </button>
                )
              ) : (
                <Link to="/affiliate" className="flex items-center gap-1 bg-white/15 text-white rounded-lg px-2.5 py-1.5 text-xs font-semibold">
                  <User className="w-3.5 h-3.5" /> {t("Đăng nhập", "Login")}
                </Link>
              )}
              <button
                onClick={() => setLang(lang === "vi" ? "en" : "vi")}
                className="flex items-center gap-0.5 text-white text-[11px] font-bold border border-white/40 rounded px-1.5 py-1"
              >
                <Globe className="w-3 h-3" /> {lang === "vi" ? "EN" : "VI"}
              </button>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="grid place-items-center w-8 h-8 rounded-lg bg-white/15 text-white"
              >
                {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {/* Row 2: Search bar */}
          <form onSubmit={handleSearch} className="flex">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("Tìm sản phẩm số AI, app, công cụ...", "Search AI products, apps, tools...")}
              className="flex-1 rounded-l-md px-3 py-2 text-sm bg-white text-gray-800 placeholder:text-gray-400 outline-none"
            />
            <button type="submit" className="bg-emerald-600 text-white rounded-r-md px-3 py-2">
              <Search className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* ── DESKTOP HEADER (single row) ── */}
        <div className="hidden sm:flex max-w-7xl mx-auto px-4 py-3 items-center gap-3">
          <Link to="/" className="shrink-0 flex items-center gap-1.5">
            <div className="w-9 h-9 rounded-lg bg-white/20 grid place-items-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="text-white font-extrabold text-lg leading-tight">
              <>KIM <span className="text-yellow-300">AI</span></>
            </div>
          </Link>
          <form onSubmit={handleSearch} className="flex-1 flex max-w-2xl">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("Tìm sản phẩm số AI, app, công cụ...", "Search AI products, apps, tools...")}
              className="flex-1 rounded-l-md px-4 py-2 text-sm bg-white text-gray-800 placeholder:text-gray-400 outline-none"
            />
            <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-r-md px-4 py-2 transition">
              <Search className="w-4 h-4" />
            </button>
          </form>
          <div className="flex items-center gap-2 shrink-0">
            {currentUser ? (
              <div className="relative flex items-center gap-2">
                {hasAffiliate ? (
                  <Link
                    to="/affiliate-dashboard"
                    className="flex items-center gap-1.5 bg-yellow-300 text-emerald-900 rounded-xl px-4 py-2 text-sm font-extrabold transition hover:bg-yellow-200 whitespace-nowrap"
                    style={{ boxShadow: "0 0 16px 4px rgba(253,224,71,0.55), 0 2px 8px rgba(0,0,0,0.15)" }}
                  >
                    📊 Dashboard
                  </Link>
                ) : (
                  <button
                    onClick={() => setShowAffiliateMsg(true)}
                    className="flex items-center gap-1.5 bg-yellow-300 text-emerald-900 rounded-xl px-4 py-2 text-sm font-extrabold transition hover:bg-yellow-200 whitespace-nowrap"
                    style={{ boxShadow: "0 0 16px 4px rgba(253,224,71,0.55), 0 2px 8px rgba(0,0,0,0.15)" }}
                  >
                    📊 Dashboard
                  </button>
                )}
                <button
                  onClick={() => setDropdownOpen((v) => !v)}
                  className="flex items-center gap-2 bg-white/15 hover:bg-white/25 rounded-xl px-3 py-1.5 transition"
                >
                  <div className="w-7 h-7 rounded-full bg-yellow-300 text-emerald-800 grid place-items-center font-bold text-xs">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-white text-sm font-semibold max-w-[100px] truncate">{currentUser.name}</span>
                </button>
                {dropdownOpen && (
                  <div className="absolute top-11 right-0 w-64 rounded-2xl border border-border bg-card shadow-xl z-50 overflow-hidden">
                    <div className="p-4 border-b border-border">
                      {editingName ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            autoFocus
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && saveDisplayName()}
                            className="flex-1 min-w-0 rounded-lg border border-border bg-background px-2 py-1 text-sm font-bold outline-none"
                          />
                          <button
                            onClick={saveDisplayName}
                            disabled={savingName}
                            className="text-xs font-bold text-primary shrink-0 disabled:opacity-50"
                          >
                            {savingName ? "..." : t("Lưu", "Save")}
                          </button>
                          <button
                            onClick={() => setEditingName(false)}
                            className="text-xs font-semibold text-muted-foreground shrink-0"
                          >
                            {t("Huỷ", "Cancel")}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <div className="font-bold text-sm truncate">{currentUser.name}</div>
                          <button
                            onClick={() => { setNameInput(currentUser.name); setEditingName(true); }}
                            className="text-muted-foreground hover:text-primary transition shrink-0"
                            aria-label={t("Sửa tên hiển thị", "Edit display name")}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-0.5">{currentUser.email}</div>
                    </div>
                    <div className="p-2 flex flex-col">
                      {hasAffiliate ? (
                        <Link to="/affiliate-dashboard" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent transition text-sm font-semibold">
                          <User className="w-4 h-4 text-primary" /> {t("Dashboard Affiliate", "Affiliate Dashboard")}
                        </Link>
                      ) : (
                        <button onClick={() => { setDropdownOpen(false); setShowAffiliateMsg(true); }} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent transition text-sm font-semibold text-left w-full">
                          <User className="w-4 h-4 text-primary" /> {t("Dashboard Affiliate", "Affiliate Dashboard")}
                        </button>
                      )}
                      <Link to="/truy-cap-app" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent transition text-sm font-semibold">
                        <Sparkles className="w-4 h-4 text-primary" /> {t("Sản Phẩm Số", "Digital Products")}
                      </Link>
                      <div className="my-1 h-px bg-border" />
                      <button onClick={() => { handleLogout(); setDropdownOpen(false); }} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent transition text-sm font-semibold text-destructive">
                        <LogOut className="w-4 h-4" /> {t("Đăng xuất", "Logout")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/affiliate" className="inline-flex items-center gap-1.5 bg-white text-primary rounded-xl px-4 py-2 text-sm font-bold hover:bg-white/90 transition">
                <User className="w-4 h-4" /> {t("Đăng nhập", "Login")}
              </Link>
            )}
            <button
              onClick={() => setLang(lang === "vi" ? "en" : "vi")}
              className="flex items-center gap-1 text-white text-xs font-bold border border-white/40 rounded px-2 py-1 hover:bg-white/10 transition"
            >
              <Globe className="w-3.5 h-3.5" /> {lang === "vi" ? "EN" : "VI"}
            </button>
          </div>
        </div>

        {/* ── CATEGORY NAV (mobile: scrollable, desktop: full) ── */}
        <div className="bg-primary/90 border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 overflow-x-auto py-1.5 scrollbar-none">
            <a href="/truy-cap-app" className="shrink-0 text-white/90 hover:text-white text-xs font-semibold px-3 py-1 rounded-full hover:bg-white/15 transition whitespace-nowrap">
              🛍️ {t("Tất Cả SP", "All Products")}
            </a>
            <span className="shrink-0 text-white/90 text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap cursor-default">
              🎓 SKILL
            </span>
            <span className="shrink-0 text-white/90 text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap cursor-default">
              ⚡ {t("Công Cụ AI", "AI Tools")}
            </span>
            <span className="shrink-0 text-white/90 text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap cursor-default">
              📖 {t("Khóa Học", "Courses")}
            </span>
            <span className="shrink-0 text-white/90 text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap cursor-default">
              💬 {t("CSKH-ZALO", "Support-ZALO")}
            </span>
            <span className="shrink-0 text-white/90 text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap cursor-default">
              ✈️ {t("CSKH-Telegram", "Support-Telegram")}
            </span>
            <span className="shrink-0 text-white/90 text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap cursor-default">
              📐 Template
            </span>
            <span className="shrink-0 text-white/90 text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap cursor-default">
              💰 Affiliate
            </span>
            <span className="shrink-0 text-white/90 text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap cursor-default">
              🎬 {t("Hướng dẫn trên điện thoại", "Mobile Guide")}
            </span>
            <span className="shrink-0 text-white/90 text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap cursor-default">
              🖥️ {t("Hướng dẫn trên máy tính", "Desktop Guide")}
            </span>
            <span className="shrink-0 text-white/90 text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap cursor-default">
              👥 {t("Cộng Đồng Facebook", "Facebook Community")}
            </span>
          </div>
        </div>
      </header>

      {/* ── MOBILE MENU ── */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 sm:hidden" onClick={() => setMenuOpen(false)} />
      )}
      {menuOpen && (
        <nav className="fixed inset-0 z-[70] bg-[#1a1a2e] text-white flex flex-col overflow-y-auto sm:hidden">
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <div>
              <div className="font-extrabold text-lg">
                <>KIM <span className="text-primary">AI</span></>
              </div>
              <div className="text-xs text-white/50 mt-0.5">{t("Sàn Sản Phẩm Số", "Digital Products Platform")}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLang(lang === "vi" ? "en" : "vi")}
                className="flex items-center gap-1 text-white text-xs font-bold border border-white/30 rounded px-2 py-1"
              >
                <Globe className="w-3.5 h-3.5" /> {lang === "vi" ? "EN" : "VI"}
              </button>
              <button onClick={() => setMenuOpen(false)} className="w-10 h-10 rounded-xl bg-white/10 grid place-items-center hover:bg-white/20 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          {currentUser ? (
            <div className="mx-4 mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold">{currentUser.name.charAt(0).toUpperCase()}</div>
                <div>
                  <div className="font-bold text-sm">{currentUser.name}</div>
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">AFFILIATE</span>
                </div>
              </div>
              <div className="text-xs text-white/40 mt-2">{currentUser.email}</div>
            </div>
          ) : (
            <div className="mx-4 mt-4">
              <Link to="/affiliate" onClick={() => setMenuOpen(false)} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold hover:opacity-90 transition">
                <User className="w-4 h-4" /> {t("Đăng nhập / Đăng ký", "Login / Sign Up")}
              </Link>
            </div>
          )}
          <div className="mt-4 px-3 text-[10px] font-bold text-white/60 uppercase tracking-wider">Menu</div>
          <div className="mt-1 px-3 flex flex-col gap-0.5">
            <Link to="/truy-cap-app" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-primary/10 text-primary font-semibold text-sm transition">
              <Sparkles className="w-4 h-4" /> {t("Sản Phẩm Số", "Digital Products")}
            </Link>
            {currentUser ? (
              hasAffiliate ? (
                <Link to="/affiliate-dashboard" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 text-white text-sm font-semibold transition">
                  <User className="w-4 h-4" /> {t("Dashboard Affiliate", "Affiliate Dashboard")}
                </Link>
              ) : (
                <button onClick={() => { setMenuOpen(false); setShowAffiliateMsg(true); }} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 text-white text-sm font-semibold transition text-left w-full">
                  <User className="w-4 h-4" /> {t("Dashboard Affiliate", "Affiliate Dashboard")}
                </button>
              )
            ) : (
              <Link to="/affiliate" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 text-white text-sm font-semibold transition">
                <User className="w-4 h-4" /> {t("Dashboard Affiliate", "Affiliate Dashboard")}
              </Link>
            )}
            <a href="tel:0367337799" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 text-white text-sm font-semibold transition">
              <Phone className="w-4 h-4" /> {t("Tư vấn", "Consult")}
            </a>
            <a href="https://zalo.me/0367337799" target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 text-white text-sm font-semibold transition">
              <ExternalLink className="w-4 h-4" /> {t("Hỗ trợ ZALO", "Support ZALO")}
            </a>
            <a href="https://t.me/+HnMAk17nl9I3OTY1" target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 text-white text-sm font-semibold transition">
              <ExternalLink className="w-4 h-4" /> {t("CSKH-Telegram", "Support Telegram")}
            </a>
            <div className="mt-2 border-t border-white/10 pt-2">
              <div className="text-[10px] font-bold text-white/60 uppercase tracking-wider px-3 mb-1">{t("Kênh Affiliate", "Affiliate Channels")}</div>
              {[
                { title: "Thịnh Vua App", href: "/affiliate-products/thinh-vua-app" },
                { title: "Phong Menly", href: "/affiliate-products/phong-menly" },
                { title: "Sơn Piaz", href: "/affiliate-products/son-piaz" },
                { title: "Phạm Thành Long", href: "/affiliate-products/pham-thanh-long" },
                { title: t("Sản Phẩm Vật Lý", "Physical Products"), href: "/affiliate-products/san-pham-vat-ly" },
              ].map((item) => (
                <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/10 text-white/80 text-sm transition">
                  → {item.title}
                </a>
              ))}
            </div>
          </div>
          {currentUser && (
            <div className="mt-auto px-3 pb-5">
              <button onClick={() => { handleLogout(); setMenuOpen(false); }} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 text-white/70 text-sm font-semibold transition">
                <LogOut className="w-4 h-4" /> {t("Đăng xuất", "Logout")}
              </button>
            </div>
          )}
        </nav>
      )}

      {/* ── AFFILIATE MESSAGE POPUP ── */}
      {showAffiliateMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAffiliateMsg(false)}>
          <div className="bg-card rounded-2xl shadow-2xl p-6 max-w-sm mx-4 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full bg-primary/10 grid place-items-center mx-auto mb-4">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-bold text-lg mb-2">{t("Kích hoạt Affiliate", "Activate Affiliate")}</h3>
            <p className="text-sm text-muted-foreground mb-5">
              {t(
                "Mua ít nhất 1 sản phẩm Thịnh Vua App để kích hoạt lấy link affiliate kiếm tiền",
                "Buy at least 1 Thinh Vua App product to activate your affiliate link and earn commissions"
              )}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowAffiliateMsg(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-accent transition">{t("Đóng", "Close")}</button>
              <Link to="/truy-cap-app" onClick={() => setShowAffiliateMsg(false)} className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition text-center">{t("Mua ngay", "Buy Now")}</Link>
            </div>
          </div>
        </div>
      )}

      {/* ── PAGE CONTENT ── */}
      <main className="w-full px-1.5 sm:px-3 py-3 space-y-3">

        {/* ── FEATURED PROMO BANNER ── */}
        {featuredPromo && (
          <a
            href={featuredPromo.product_url}
            className="promo-banner relative flex items-center gap-3 rounded-xl px-4 py-3.5 hover:opacity-95 transition overflow-hidden"
          >
            <span className="promo-badge text-2xl drop-shadow-lg">🎁</span>
            <div className="flex-1 min-w-0">
              <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/80 mb-0.5">
                {lang === "en" ? "⚡ PRODUCT ON PROMO THIS WEEK" : "⚡ SẢN PHẨM NHẬN KM TUẦN NÀY"}
              </div>
              <div className="text-sm font-black truncate drop-shadow">
                {lang === "en" ? (
                  <>Enter code{" "}
                    <span className="promo-badge inline-block bg-white text-emerald-600 px-2 py-0.5 rounded-md font-black font-mono uppercase text-xs tracking-wider shadow">
                      PROMO
                    </span>{" "}
                    to unlock for free</>
                ) : (
                  <>Nhập mã{" "}
                    <span className="promo-badge inline-block bg-white text-emerald-600 px-2 py-0.5 rounded-md font-black font-mono uppercase text-xs tracking-wider shadow">
                      KHUYẾN MÃI
                    </span>{" "}
                    để mở khoá miễn phí</>
                )}
              </div>
            </div>
            <span className="text-xs font-black whitespace-nowrap bg-white/25 px-2.5 py-1 rounded-lg border border-white/40">
              {lang === "en" ? "View now →" : "Xem ngay →"}
            </span>
          </a>
        )}

        {/* SẢN PHẨM — 3 SECTION */}
        {(() => {
          const communityWithDate = communityProducts.map((cp) => ({
            type: "community" as const,
            key: `c-${cp.product_key}`,
            n: null as number | null,
            title: cp.title,
            titleEn: skillEnTitles[cp.product_key] ?? null,
            priceVnd: cp.price_vnd,
            image: (() => { try { const p = JSON.parse(cp.thumbnail_url ?? ""); return Array.isArray(p) ? p[0] ?? null : cp.thumbnail_url; } catch { return cp.thumbnail_url; } })(),
            imageEn: cp.thumbnail_url_en ?? null,
            productKey: cp.product_key,
            sortMs: new Date(cp.created_at).getTime(),
          }));
          const effectiveAdminProducts = adminDbProducts
            ? adminDbProducts.map(p => ({
                type: "admin" as const,
                key: `a-${p.n}`,
                n: p.n,
                title: p.title,
                titleEn: apps.find(a => a.n === p.n)?.titleEn ?? null,
                priceVnd: p.price_vnd,
                image: p.thumbnail_url ?? (apps.find(a => a.n === p.n)?.image as string | null ?? null),
                imageEn: p.thumbnail_url_en ?? enThumbnailUrls[p.n] ?? null,
                productKey: null as string | null,
                sortMs: BASE_DATE + p.n * 86400000,
              }))
            : adminProductsFallback;
          const allMerged = [...communityWithDate, ...effectiveAdminProducts].sort((a, b) => {
            if (sortOrder === "price_asc") return a.priceVnd - b.priceVnd;
            if (sortOrder === "price_desc") return b.priceVnd - a.priceVnd;
            if (a.type === "admin" && b.type === "community") return -1;
            if (a.type === "community" && b.type === "admin") return 1;
            return b.sortMs - a.sortMs;
          });

          function catOf(title: string): "skill" | "app" | "guide" {
            const titleLow = title.toLowerCase();
            if (titleLow.includes("skill") || titleLow.includes("trợ lý") || titleLow.includes("tài khoản") || titleLow.includes("prompt") || titleLow.includes("gemini") || titleLow.includes("chatgpt")) return "skill";
            if (titleLow.includes("app") || titleLow.includes("flow") || titleLow.includes("wf") || titleLow.includes("kol") || titleLow.includes("combo") || titleLow.includes("studio") || titleLow.includes("workflow") || titleLow.includes("bot")) return "app";
            return "guide";
          }

          const skillProducts = allMerged.filter(p => catOf(p.title) === "skill");
          const appProducts   = allMerged.filter(p => catOf(p.title) === "app");
          const guideProducts = allMerged.filter(p => catOf(p.title) === "guide");

          const ROW = 6;

          function ProductCard({ p }: { p: typeof allMerged[0] }) {
            const href = p.type === "community" ? `/san-pham?mp=${p.productKey}` : `/san-pham?id=${p.n}`;
            const rk = p.type === "community" ? p.productKey! : String(p.n!);
            const r = ratings[rk];
            const showEnMode = lang === "en";
            const displayImg = showEnMode && p.imageEn ? p.imageEn : p.image;
            const showEnOverlay = showEnMode && !p.imageEn && p.titleEn && p.image;
            return (
              <a href={href} className="group border border-border rounded-xl overflow-hidden hover:shadow-lg hover:border-primary/40 transition-all bg-background">
                <div className="aspect-video overflow-hidden bg-muted relative">
                  {displayImg ? (
                    <img src={displayImg} alt={showEnMode && p.titleEn ? p.titleEn : p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[oklch(0.3_0.08_280)] to-[oklch(0.2_0.05_260)] flex items-center justify-center">
                      <Sparkles className="w-10 h-10 text-white/30" />
                    </div>
                  )}
                  {/* EN overlay when no EN thumbnail uploaded yet */}
                  {showEnOverlay && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-2.5">
                      <div className="text-[8px] font-black uppercase tracking-widest text-white/60 mb-1">🇬🇧 English</div>
                      <div className="text-white text-[11px] font-black leading-tight line-clamp-3 drop-shadow-lg">{p.titleEn}</div>
                    </div>
                  )}
                  {p.type === "community" && (
                    <div className="absolute top-2 left-2 rounded-full bg-primary/90 text-primary-foreground text-[9px] font-bold px-2 py-0.5">
                      {t("Cộng đồng", "Community")}
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-foreground text-xs sm:text-sm font-bold line-clamp-2 leading-snug mb-1.5">
                    {lang === "en" && p.titleEn ? p.titleEn : p.title}
                  </p>
                  <div className="text-primary font-bold text-sm">{price(p.priceVnd)}</div>
                  {r && r.count > 0 && (
                    <div className="flex items-center gap-0.5 mt-0.5">
                      {[1,2,3,4,5].map(s => <span key={s} className={`text-[11px] leading-none ${s <= Math.round(r.avg) ? "text-yellow-400" : "text-gray-300"}`}>★</span>)}
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

          function Section({ emoji, title, catKey, products }: {
            emoji: string; title: string; catKey: "skill" | "app" | "guide";
            products: typeof allMerged;
          }) {
            const visible = products.slice(0, ROW);
            return (
              <div className="bg-card rounded-xl px-2 py-3 shadow-sm">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h2 className="font-extrabold text-sm sm:text-base text-foreground flex items-center gap-2">
                    {emoji} {title}
                  </h2>
                  <span className="text-[11px] text-muted-foreground">{products.length} {t("SP", "items")}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                  {visible.map(p => <ProductCard key={p.key} p={p} />)}
                </div>
                {products.length > ROW && (
                  <div className="mt-3 text-center">
                    <Link
                      to="/danh-muc"
                      search={{ loai: catKey }}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-primary text-primary text-xs font-bold hover:bg-primary hover:text-primary-foreground transition"
                    >
                      {t(`Xem tất cả ${products.length} sản phẩm →`, `See all ${products.length} products →`)}
                    </Link>
                  </div>
                )}
              </div>
            );
          }

          return (
            <>
              {/* Sort bar */}
              <div className="flex items-center gap-2 px-1">
                <span className="text-xs text-muted-foreground font-semibold shrink-0">{t("Sắp xếp:", "Sort:")}</span>
                <div className="flex gap-1.5 flex-wrap">
                  {([
                    { key: "default" as const, label: t("Mặc định", "Default"), icon: "↕" },
                    { key: "price_asc" as const, label: t("Giá tăng dần", "Price ↑ Low–High"), icon: "↑" },
                    { key: "price_desc" as const, label: t("Giá giảm dần", "Price ↓ High–Low"), icon: "↓" },
                  ]).map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setSortOrder(opt.key)}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                        sortOrder === opt.key
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground border-border hover:border-primary/50"
                      }`}
                    >
                      <span>{opt.icon}</span> {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <Section emoji="🎓" title={t("SKILL / TÀI LIỆU", "SKILL / COURSES")} catKey="skill" products={skillProducts} />
              <Section emoji="⚡" title="APP / TOOL" catKey="app" products={appProducts} />
              <Section emoji="📖" title={t("HƯỚNG DẪN / KHÓA HỌC", "GUIDE / COURSES")} catKey="guide" products={guideProducts} />
            </>
          );
        })()}

      </main>

      {/* ── FOOTER ── */}
      <footer className="mt-6 py-8 border-t border-border bg-card">
        <div className="px-4 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <Sparkles className="w-4 h-4 text-primary" /> {lang === "en" ? "KIM AI" : "KIM AI"}
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span>
              💬 {t("Zalo Cộng Đồng", "Zalo Community")}
            </span>
          </div>
          <div>© {new Date().getFullYear()} KIM AI</div>
        </div>
      </footer>
    </div>
  );
}
