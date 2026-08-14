import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, ShoppingCart, ExternalLink, CheckCircle2, LogIn, Sparkles, Link2, MessageCircle, Store, Send, Globe } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PaymentModal } from "@/components/PaymentModal";
import { apps, skillEnTitles } from "@/lib/apps-data";
import { AnAnMark } from "@/components/Logo";
import { useLanguage } from "@/contexts/LanguageContext";

export const Route = createFileRoute("/san-pham")({
  head: () => ({ meta: [{ title: "Product Detail — AnAn" }] }),
  component: ProductDetailPage,
});

type MemberProduct = {
  id: string; title: string; description: string; product_url: string;
  preview_url: string | null; thumbnail_url: string | null; thumbnail_url_en: string | null; price_vnd: number;
  commission_rate: number; product_key: string; seller_name: string; shop_name: string | null;
  affiliate_id: string | null; video_url: string | null;
};

// ── RATING SECTION ──────────────────────────────────────────────────────────
function RatingSection({ productKey, hasPurchased }: { productKey: string; hasPurchased: boolean }) {
  const { t } = useLanguage();
  const [userRating, setUserRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [allRatings, setAllRatings] = useState<{ rater_id: string; rating: number }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const raterId = (() => {
    if (typeof window === "undefined") return "";
    let id = localStorage.getItem("rater_id");
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("rater_id", id); }
    return id;
  })();

  const loadRatings = async () => {
    if (!productKey) return;
    const { data } = await (supabase as any).from("product_ratings").select("rating,rater_id").eq("product_key", productKey);
    if (data) {
      setAllRatings(data);
      const mine = data.find((r: any) => r.rater_id === raterId);
      if (mine) setUserRating(mine.rating);
    }
  };

  useEffect(() => { loadRatings(); }, [productKey]);

  const avg = allRatings.length > 0 ? allRatings.reduce((s, r) => s + r.rating, 0) / allRatings.length : 0;
  const count = allRatings.length;
  const breakdown = [5, 4, 3, 2, 1].map(s => ({ star: s, n: allRatings.filter(r => r.rating === s).length }));

  const handleRate = async (star: number) => {
    if (!productKey || !raterId || submitting || !hasPurchased) return;
    setSubmitting(true);
    await (supabase as any).from("product_ratings").upsert(
      { product_key: productKey, rater_id: raterId, rating: star },
      { onConflict: "product_key,rater_id" }
    );
    setUserRating(star);
    await loadRatings();
    setSubmitting(false);
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-4">
        {t("Đánh giá sản phẩm", "Product Ratings")}
      </h2>
      <div className="flex flex-col sm:flex-row gap-6 items-start">
        <div className="flex flex-col items-center justify-center min-w-[120px]">
          <div className="text-5xl font-extrabold text-emerald-500">{count > 0 ? avg.toFixed(1) : "—"}</div>
          <div className="flex gap-0.5 my-1.5">
            {[1, 2, 3, 4, 5].map(s => (
              <span key={s} className={`text-xl ${s <= Math.round(avg) ? "text-yellow-400" : "text-gray-200"}`}>★</span>
            ))}
          </div>
          <div className="text-xs text-muted-foreground">{count} {t("đánh giá", "ratings")}</div>
        </div>
        <div className="flex-1 space-y-2 w-full">
          {breakdown.map(({ star, n }) => (
            <div key={star} className="flex items-center gap-2">
              <span className="text-xs w-10 text-right shrink-0 text-muted-foreground">{star} ★</span>
              <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                <div className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                  style={{ width: count > 0 ? `${(n / count) * 100}%` : "0%" }} />
              </div>
              <span className="text-xs text-muted-foreground w-5 shrink-0">{n}</span>
            </div>
          ))}
          {count === 0 && <p className="text-xs text-muted-foreground">{t("Chưa có đánh giá nào.", "No ratings yet.")}</p>}
        </div>
        <div className="flex flex-col items-center gap-1.5 shrink-0">
          {hasPurchased ? (
            <>
              <p className="text-xs text-muted-foreground whitespace-nowrap">
                {userRating > 0 ? t(`Bạn đánh giá: ${userRating} ★`, `Your rating: ${userRating} ★`) : t("Nhấn sao để đánh giá", "Click stars to rate")}
              </p>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} onClick={() => handleRate(star)}
                    onMouseEnter={() => setHovered(star)} onMouseLeave={() => setHovered(0)}
                    disabled={submitting}
                    className="text-3xl transition-transform hover:scale-110 active:scale-95 leading-none disabled:cursor-not-allowed">
                    <span className={star <= (hovered || userRating) ? "text-yellow-400" : "text-gray-200 dark:text-gray-600"}>★</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-center">
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(s => <span key={s} className="text-2xl text-gray-200 dark:text-gray-700">★</span>)}
              </div>
              <p className="text-[11px] text-muted-foreground max-w-[120px] leading-snug">
                🔒 {t("Mua sản phẩm để đánh giá", "Purchase to rate")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── COMMENTS SECTION ────────────────────────────────────────────────────────
type Comment = { id: string; commenter_name: string; content: string; created_at: string };

function CommentsSection({ productKey, defaultName, hasPurchased }: { productKey: string; defaultName?: string; hasPurchased: boolean }) {
  const { t } = useLanguage();
  const [comments, setComments] = useState<Comment[]>([]);
  const [name, setName] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("commenter_name") || defaultName || "";
  });
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const commenterId = (() => {
    if (typeof window === "undefined") return "";
    let id = localStorage.getItem("rater_id");
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("rater_id", id); }
    return id;
  })();

  const loadComments = async () => {
    const { data } = await (supabase as any)
      .from("product_comments")
      .select("id,commenter_name,content,created_at")
      .eq("product_key", productKey)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setComments(data);
  };

  useEffect(() => { if (productKey) loadComments(); }, [productKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimName = name.trim();
    const trimContent = content.trim();
    if (!trimName || !trimContent || submitting) return;
    setSubmitting(true);
    localStorage.setItem("commenter_name", trimName);
    const { error } = await (supabase as any).from("product_comments").insert({
      product_key: productKey,
      commenter_name: trimName,
      commenter_id: commenterId,
      content: trimContent,
    });
    if (!error) {
      setContent("");
      await loadComments();
    }
    setSubmitting(false);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) +
      " " + d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  };

  const avatarColor = (n: string) => {
    const colors = ["bg-emerald-400", "bg-blue-400", "bg-emerald-400", "bg-purple-400", "bg-pink-400", "bg-yellow-400"];
    return colors[n.charCodeAt(0) % colors.length];
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
        <MessageCircle className="w-4 h-4" /> {t("Bình luận", "Comments")} ({comments.length})
      </h2>

      {hasPurchased ? (
        <form onSubmit={handleSubmit} className="mb-5 space-y-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("Tên của bạn...", "Your name...")}
            maxLength={50}
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary transition"
          />
          <div className="flex gap-2">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t("Viết bình luận về sản phẩm này...", "Write a comment about this product...")}
              rows={3}
              maxLength={500}
              className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary transition resize-none"
            />
            <button type="submit" disabled={submitting || !name.trim() || !content.trim()}
              className="shrink-0 self-end rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-bold hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5">
              <Send className="w-4 h-4" /> {submitting ? "..." : t("Gửi", "Send")}
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-5 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-4 text-center">
          <p className="text-sm text-muted-foreground">🔒 {t("Chỉ khách hàng đã mua sản phẩm mới có thể bình luận", "Only customers who purchased can comment")}</p>
        </div>
      )}

      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">{t("Chưa có bình luận nào. Hãy là người đầu tiên!", "No comments yet. Be the first!")}</p>
      ) : (
        <div className="space-y-4">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <div className={`shrink-0 w-9 h-9 rounded-full ${avatarColor(c.commenter_name)} flex items-center justify-center text-white font-bold text-sm`}>
                {c.commenter_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{c.commenter_name}</span>
                  <span className="text-[10px] text-muted-foreground">{formatDate(c.created_at)}</span>
                </div>
                <p className="text-sm text-foreground mt-0.5 leading-relaxed whitespace-pre-wrap">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── MAIN PAGE ────────────────────────────────────────────────────────────────
function ProductDetailPage() {
  const { lang, setLang, t, price } = useLanguage();
  const [adminProduct, setAdminProduct] = useState<typeof apps[0] | null>(null);
  const [memberProduct, setMemberProduct] = useState<MemberProduct | null>(null);
  const [vipState, setVipState] = useState<"loading" | "not-logged-in" | "vip">("loading");
  const [userInfo, setUserInfo] = useState<{ name: string; email: string } | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [purchasedUrl, setPurchasedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedImg, setSelectedImg] = useState(0);
  const [affiliateInfo, setAffiliateInfo] = useState<{
    display_name: string | null; avatar_url: string | null; ref_code: string; created_at: string;
  } | null>(null);
  const [dbThumbVI, setDbThumbVI] = useState<string | null>(null);
  const [dbThumbEN, setDbThumbEN] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    const mp = params.get("mp");
    if (id) {
      const found = apps.find((a) => a.n === parseInt(id));
      if (found) setAdminProduct(found);
      // Fetch DB thumbnail (may be newer than static apps-data)
      (supabase as any).from("admin_products")
        .select("thumbnail_url, thumbnail_url_en")
        .eq("n", parseInt(id))
        .maybeSingle()
        .then(({ data }: any) => {
          if (data?.thumbnail_url) {
            try {
              const p = JSON.parse(data.thumbnail_url);
              setDbThumbVI(Array.isArray(p) ? p[0] ?? null : data.thumbnail_url);
            } catch { setDbThumbVI(data.thumbnail_url); }
          }
          if (data?.thumbnail_url_en) setDbThumbEN(data.thumbnail_url_en);
        });
    }
    if (mp) {
      (supabase as any).from("member_products").select("*").eq("product_key", mp).maybeSingle()
        .then(({ data }: any) => { if (data) setMemberProduct(data as MemberProduct); });
    }
  }, []);

  useEffect(() => {
    if (memberProduct?.affiliate_id) {
      (supabase as any).from("affiliates").select("display_name,avatar_url,ref_code,created_at")
        .eq("id", memberProduct.affiliate_id).maybeSingle()
        .then(({ data }: any) => { if (data) setAffiliateInfo(data); });
    }
  }, [memberProduct]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setVipState("not-logged-in"); return; }
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      setUserInfo({ name: profile?.full_name ?? user.email?.split("@")[0] ?? "", email: user.email ?? "" });
      setVipState("vip");
      const { data: orders } = await (supabase as any).from("product_orders")
        .select("product_key, product_url").eq("customer_email", user.email).eq("status", "paid");
      if (orders) {
        const params = new URLSearchParams(window.location.search);
        const id = params.get("id"); const mp = params.get("mp");
        if (id) {
          const product = apps.find((a) => a.n === parseInt(id));
          if (product) {
            const key = product.codeFormat.replace(/<[^>]+>/g, "");
            const match = orders.find((o: any) => o.product_key === key);
            if (match?.product_url) setPurchasedUrl(match.product_url);
          }
        }
        if (mp) {
          const match = orders.find((o: any) => o.product_key === mp);
          if (match?.product_url) setPurchasedUrl(match.product_url);
        }
      }
    })();
  }, []);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success(t("Đã copy link sản phẩm!", "Product link copied!"));
    setTimeout(() => setCopied(false), 2000);
  };

  const product = adminProduct || memberProduct;
  if (!product) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Sparkles className="w-10 h-10 text-primary animate-pulse" />
        <p className="text-muted-foreground text-sm">{t("Đang tải sản phẩm...", "Loading product...")}</p>
      </div>
    );
  }

  const parseImages = (raw: string | null | undefined): string[] => {
    if (!raw) return [];
    try { const p = JSON.parse(raw); if (Array.isArray(p)) return p.filter(Boolean); } catch {}
    return [raw];
  };

  const images = adminProduct
    ? (() => {
        const mainThumb = lang === "en" && dbThumbEN ? dbThumbEN : (dbThumbVI ?? adminProduct.image);
        const imgs = [mainThumb].filter(Boolean) as string[];
        // Show both VI and EN thumbnails as alternatives if both exist
        if (dbThumbVI && dbThumbEN) {
          const alt = lang === "en" ? dbThumbVI : dbThumbEN;
          if (alt && alt !== mainThumb) imgs.push(alt);
        }
        return imgs;
      })()
    : (() => {
        const enThumb = lang === "en" && memberProduct?.thumbnail_url_en ? memberProduct.thumbnail_url_en : null;
        const viImgs = parseImages(memberProduct?.thumbnail_url);
        return enThumb ? [enThumb, ...viImgs] : viImgs;
      })();
  const title = adminProduct ? adminProduct.title : memberProduct?.title ?? "";
  const titleEn = adminProduct?.titleEn ?? (memberProduct ? (skillEnTitles[memberProduct.product_key] ?? null) : null);
  const desc = adminProduct ? adminProduct.desc : memberProduct?.description ?? "";
  const descEn = adminProduct?.descEn ?? null;
  const priceVnd = adminProduct ? Number(adminProduct.priceVnd) : (memberProduct?.price_vnd ?? 0);
  const previewUrl = adminProduct ? adminProduct.previewUrl : memberProduct?.preview_url ?? null;
  const videoUrl = memberProduct?.video_url ?? null;
  const isAdmin = !!adminProduct;
  const ratingKey = adminProduct ? String(adminProduct.n) : memberProduct?.product_key ?? "";
  const shopName = isAdmin ? "Affiliate · AnAn" : (memberProduct?.shop_name || memberProduct?.seller_name || "");
  const sellerAvatar = isAdmin ? null : affiliateInfo?.avatar_url ?? null;
  const joinDate = isAdmin
    ? "01/2024"
    : affiliateInfo?.created_at
      ? new Date(affiliateInfo.created_at).toLocaleDateString("vi-VN", { month: "numeric", year: "numeric" })
      : "";
  const currentImg = images[selectedImg] ?? null;

  return (
    <div className="min-h-screen bg-[oklch(0.97_0.005_60)]">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-30 backdrop-blur bg-background/80 border-b border-border/60">
        <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
          <a href="/truy-cap-app"
            onClick={(e) => {
              if (window.history.length > 1 && document.referrer && document.referrer.includes(window.location.hostname)) {
                e.preventDefault(); window.history.back();
              }
            }}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-accent transition">
            <ArrowLeft className="w-4 h-4" /> {t("Quay lại", "Back")}
          </a>
          <AnAnMark className="w-5 h-5 text-primary shrink-0" />
          <span className="font-bold text-sm">An<span className="text-primary">An</span></span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === "vi" ? "en" : "vi")}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1.5 text-xs font-bold hover:bg-accent transition"
            >
              <Globe className="w-3 h-3" /> {lang === "vi" ? "EN" : "VI"}
            </button>
            <button onClick={copyLink} className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-accent transition">
              <Link2 className="w-4 h-4" /> {copied ? t("Đã copy!", "Copied!") : t("Chia sẻ", "Share")}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 space-y-3">

        {/* ── SECTION 1: PRODUCT ── */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="flex flex-col md:flex-row">

            {/* LEFT: Image Gallery */}
            <div className="md:w-[380px] shrink-0 p-4 border-b md:border-b-0 md:border-r border-border bg-card">
              <div className="rounded-xl overflow-hidden bg-muted aspect-video mb-3 relative border border-border">
                {currentImg ? (
                  <img src={currentImg} alt={title} className={`w-full h-full ${isAdmin ? "object-cover" : "object-contain"}`} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Sparkles className="w-16 h-16 text-muted-foreground/30" />
                  </div>
                )}
                {!isAdmin && (
                  <div className="absolute top-2 left-2 rounded-full bg-primary/90 text-primary-foreground text-[9px] font-bold px-2 py-0.5">
                    {t("Cộng đồng", "Community")}
                  </div>
                )}
                {isAdmin && (
                  <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-white/90 grid place-items-center text-xs font-bold text-primary shadow text-[10px]">
                    {adminProduct!.n}
                  </div>
                )}
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {images.map((img, idx) => (
                    <button key={idx} onClick={() => setSelectedImg(idx)}
                      className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors ${idx === selectedImg ? "border-primary" : "border-border hover:border-primary/40"}`}>
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              {videoUrl && (
                <div className="mt-3">
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">🎬 {t("Video demo", "Demo Video")}</div>
                  <video src={videoUrl} controls preload="metadata" className="w-full rounded-xl border border-border bg-black" />
                </div>
              )}
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{t("Chia sẻ:", "Share:")}</span>
                <button onClick={copyLink}
                  className="inline-flex items-center gap-1 text-xs text-primary border border-primary/30 rounded-full px-3 py-1 hover:bg-primary/5 transition">
                  <Link2 className="w-3 h-3" /> {copied ? t("Đã copy!", "Copied!") : "Copy link"}
                </button>
              </div>
            </div>

            {/* RIGHT: Product Info */}
            <div className="flex-1 p-5 flex flex-col min-h-[400px]">
              <h1 className="text-lg sm:text-xl font-bold leading-snug mb-3">
                {lang === "en" && titleEn ? titleEn : title}
              </h1>

              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-emerald-500 text-sm underline">{t("Đánh giá", "Rating")}</span>
                  <span className="text-yellow-400 text-sm">★</span>
                </div>
                {(isAdmin || memberProduct) && (
                  <>
                    <div className="h-4 w-px bg-border" />
                    <span className="text-xs text-muted-foreground">
                      {t("Hoa hồng affiliate", "Affiliate commission")} <b className="text-primary">{isAdmin ? 35 : memberProduct!.commission_rate}%</b>
                    </span>
                  </>
                )}
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3 mb-5">
                <span className="text-3xl sm:text-4xl font-extrabold text-emerald-500">
                  {price(priceVnd)}
                </span>
                {lang === "en" && (
                  <span className="text-sm text-muted-foreground">
                    ({Number(priceVnd).toLocaleString("vi-VN")}đ)
                  </span>
                )}
              </div>

              {previewUrl && (
                <a href={previewUrl} target="_blank" rel="noopener noreferrer"
                  className="mb-3 w-full rounded-xl border-2 border-primary text-primary py-3 text-sm font-bold hover:bg-primary/5 transition text-center flex items-center justify-center gap-2">
                  👁 {t("Xem trước miễn phí", "Free Preview")}
                </a>
              )}

              <div className="mt-auto space-y-2.5">
                {purchasedUrl ? (
                  <>
                    <a href={purchasedUrl} target="_blank" rel="noopener noreferrer"
                      className="w-full rounded-xl bg-emerald-500 text-white py-3.5 text-base font-bold hover:bg-emerald-400 transition flex items-center justify-center gap-2">
                      <ExternalLink className="w-5 h-5" /> {t("Truy cập sản phẩm ngay", "Access Product Now")}
                    </a>
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-center">
                      <p className="text-sm font-semibold text-emerald-700 flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4" /> {t("Đã mua — mở khóa vĩnh viễn", "Purchased — permanently unlocked")}
                      </p>
                    </div>
                  </>
                ) : vipState === "vip" ? (
                  <button
                    onClick={() => {
                      if (isAdmin) {
                        setSelectedProduct(adminProduct);
                      } else if (memberProduct) {
                        setSelectedProduct({
                          n: 999, title: memberProduct.title, price: "0$",
                          priceVnd: String(memberProduct.price_vnd),
                          codeFormat: memberProduct.product_key + "<SĐT>",
                          productUrl: memberProduct.product_url,
                          image: memberProduct.thumbnail_url as any,
                          desc: memberProduct.description || "",
                          previewUrl: memberProduct.preview_url || undefined,
                          codeExample: "",
                        });
                      }
                      setPaymentModalOpen(true);
                    }}
                    className="w-full rounded-xl bg-primary text-primary-foreground py-3.5 text-base font-bold hover:opacity-90 transition flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="w-5 h-5" /> {t("Mua ngay", "Buy Now")}
                  </button>
                ) : vipState === "loading" ? (
                  <button disabled className="w-full rounded-xl bg-primary/40 text-primary-foreground py-3.5 text-base font-bold flex items-center justify-center gap-2 cursor-not-allowed">
                    <ShoppingCart className="w-5 h-5" /> {t("Đang tải...", "Loading...")}
                  </button>
                ) : (
                  <Link to="/affiliate" className="w-full rounded-xl bg-primary text-primary-foreground py-3.5 text-base font-bold hover:opacity-90 transition flex items-center justify-center gap-2">
                    <LogIn className="w-5 h-5" /> {t("Đăng nhập để mua", "Login to Buy")}
                  </Link>
                )}
              </div>

              <div className="mt-4 p-3 rounded-xl bg-muted/50 border border-border">
                <p className="text-[10px] text-muted-foreground mb-1.5 font-semibold">
                  🔗 {t("Link sản phẩm (gửi khách):", "Product link (share with customers):")}
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-[10px] bg-background px-2 py-1.5 rounded-lg truncate text-foreground border border-border">
                    {typeof window !== "undefined" ? window.location.href : ""}
                  </code>
                  <button onClick={copyLink}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition">
                    {copied ? "✓" : "Copy"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── SECTION 2: SHOP INFO ── */}
        <div className="bg-card rounded-2xl border border-border p-4 sm:p-5">
          <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
            <div className="shrink-0">
              {sellerAvatar ? (
                <img src={sellerAvatar} alt={shopName}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-border" />
              ) : (
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
                  {isAdmin ? <Sparkles className="w-7 h-7 text-primary" /> : <Store className="w-7 h-7 text-primary" />}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-base truncate">{affiliateInfo?.display_name || shopName}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                <span className="text-xs text-emerald-600 font-medium">Online</span>
              </div>
              {joinDate && <div className="text-xs text-muted-foreground mt-0.5">{t("Tham gia:", "Joined:")} {joinDate}</div>}
            </div>
            <div className="flex gap-2 sm:ml-auto w-full sm:w-auto">
              <a href="https://zalo.me/0982101088" target="_blank" rel="noopener noreferrer"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-lg border border-primary text-primary px-4 py-2.5 text-xs font-semibold hover:bg-primary/5 transition">
                <MessageCircle className="w-3.5 h-3.5" /> {t("Chat ngay", "Chat Now")}
              </a>
              <a href={isAdmin ? "/truy-cap-app" : (affiliateInfo?.ref_code ? `/shop?ref=${affiliateInfo.ref_code}` : "/kenh-affiliate")}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary/10 text-primary px-4 py-2.5 text-xs font-semibold hover:bg-primary/20 transition">
                <Store className="w-3.5 h-3.5" /> {t("Xem shop", "View Shop")}
              </a>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-border pt-4">
            {[
              { label: t("Đánh giá", "Rating"), value: isAdmin ? "4.9 ★" : "5.0 ★" },
              { label: t("Tỉ lệ phản hồi", "Response Rate"), value: "100%" },
              { label: t("Thời gian phản hồi", "Response Time"), value: t("Vài giờ", "A few hours") },
              { label: t("Tham gia", "Joined"), value: joinDate || "2024" },
            ].map(({ label, value }) => (
              <div key={label} className="text-center px-2">
                <div className="text-sm font-bold text-emerald-500">{value}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── SECTION 3: DESCRIPTION ── */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <h2 className="text-sm font-bold mb-3 text-muted-foreground uppercase tracking-wide border-b border-border pb-2">
            {t("Mô tả sản phẩm", "Product Description")}
          </h2>
          <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
            {lang === "en" && descEn ? descEn : desc}
          </p>
        </div>

        {/* ── SECTION 4: RATING ── */}
        <RatingSection productKey={ratingKey} hasPurchased={!!purchasedUrl} />

        {/* ── SECTION 5: COMMENTS ── */}
        <CommentsSection productKey={ratingKey} defaultName={userInfo?.name} hasPurchased={!!purchasedUrl} />

      </div>

      <PaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        product={selectedProduct}
        userInfo={userInfo}
        affiliateRef={typeof window !== "undefined" ? localStorage.getItem("affiliate_ref") || undefined : undefined}
      />
    </div>
  );
}
