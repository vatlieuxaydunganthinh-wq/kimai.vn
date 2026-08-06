import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  LogOut, Copy, MousePointerClick, ShoppingCart, Clock, DollarSign,
  CheckCircle2, BarChart3, Link2, Package, ArrowLeft, Shield, Sparkles, Globe,
} from "lucide-react";
import { toast } from "sonner";
import { uploadAvatarServer, getLeaderboardServer, uploadProductImageServer, notifyNewProductServer } from "@/lib/payment-server-fns";
import { useLanguage } from "@/contexts/LanguageContext";

export const Route = createFileRoute("/affiliate-dashboard")({
  head: () => ({ meta: [{ title: "Affiliate Dashboard — AI Digital Supermarket" }] }),
  component: AffiliateDashboard,
});

type Affiliate = {
  id: string; user_id: string; ref_code: string; full_name: string | null;
  email: string; phone: string | null; commission_rate: number; status: string;
  created_at: string; avatar_url?: string | null; display_name?: string | null;
  bank_name?: string | null; bank_account?: string | null; bank_owner?: string | null;
};
type Click = { id: string; product_key: string; created_at: string };
type Order = {
  id: string; customer_name: string; customer_phone: string; customer_email: string;
  product_title: string; amount: string; status: string; commission_amount: number;
  commission_status: string; commission_approved_at: string | null; created_at: string;
};

const PRODUCTS = [
  { key: "kolaisystem", name: "KOL AI SYSTEM", price: 2700000, url: "kolaisystem.com" },
  { key: "matmatudo", name: "Mat Ma Tu Do", price: 686000, url: "phongmenlyai.com" },
];
const GUARANTEE_DAYS = 15;

function AffiliateDashboard() {
  const navigate = useNavigate();
  const { lang, setLang, t, price } = useLanguage();
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [clicks, setClicks] = useState<Click[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "honor" | "partners" | "payment" | "sell">("overview");
  const [memberProducts, setMemberProducts] = useState<any[]>([]);
  const [sellSection, setSellSection] = useState<"profile" | "add" | "manage">("profile");
  const [spSellerName, setSpSellerName] = useState("");
  const [spShopName, setSpShopName] = useState("");
  const [spCccd, setSpCccd] = useState("");
  const [spBankName, setSpBankName] = useState("");
  const [spBankAccount, setSpBankAccount] = useState("");
  const [spBankOwner, setSpBankOwner] = useState("");
  const [spBio, setSpBio] = useState("");
  const [savingSellerProfile, setSavingSellerProfile] = useState(false);
  const [spTitle, setSpTitle] = useState("");
  const [spDesc, setSpDesc] = useState("");
  const [spProductUrl, setSpProductUrl] = useState("");
  const [spPreviewUrl, setSpPreviewUrl] = useState("");
  const [spPriceVnd, setSpPriceVnd] = useState("");
  const [spCommission, setSpCommission] = useState("20");
  const [spThumbnailUrl, setSpThumbnailUrl] = useState("");
  const [spThumbnailUrlEn, setSpThumbnailUrlEn] = useState("");
  const [spUploadedImages, setSpUploadedImages] = useState<string[]>([]);
  const [spUploadingImages, setSpUploadingImages] = useState(false);
  const [spUploadingImageEn, setSpUploadingImageEn] = useState(false);
  const [spGeneratingThumb, setSpGeneratingThumb] = useState(false);
  const [spGeneratingThumbEn, setSpGeneratingThumbEn] = useState(false);
  const [submittingSP, setSubmittingSP] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [sellStatsRange, setSellStatsRange] = useState<"day" | "week" | "month">("month");
  const [memberProductOrders, setMemberProductOrders] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<{ affiliate_id: string; full_name: string; ref_code: string; total_clicks: number; total_orders: number; display_name?: string | null; avatar_url?: string | null }[]>([]);
  const [chartRange, setChartRange] = useState<7 | 28 | 60 | 90>(7);
  const [editRefCode, setEditRefCode] = useState("");
  const [editingRef, setEditingRef] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankOwner, setBankOwner] = useState("");
  const [editingBank, setEditingBank] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const avatarFileRef = useRef<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) { navigate({ to: "/affiliate" }); return; }
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userData.user.id);
    if (roles?.some((r) => r.role === "admin")) setIsAdmin(true);
    const { data: aff, error: affErr } = await (supabase as any).from("affiliates").select("*").eq("user_id", userData.user.id).maybeSingle();
    if (affErr || !aff) { setLoading(false); return; }
    setAffiliate(aff as Affiliate);
    setEditRefCode(aff.ref_code);
    setDisplayName(aff.display_name || aff.full_name || "");
    setAvatarPreview(aff.avatar_url || null);
    setBankName(aff.bank_name || "");
    setBankAccount(aff.bank_account || "");
    setBankOwner(aff.bank_owner || "");
    setSpSellerName(aff.full_name || "");
    setSpBankName(aff.bank_name || "");
    setSpBankAccount(aff.bank_account || "");
    setSpBankOwner(aff.bank_owner || "");
    setSpCccd(localStorage.getItem("seller_cccd") || "");
    setSpBio(localStorage.getItem("seller_bio") || "");
    setSpShopName(localStorage.getItem("seller_shop_name") || "");
    const [{ data: clicksData }, { data: ordersData }, { data: mpData }] = await Promise.all([
      (supabase as any).from("affiliate_clicks").select("*").eq("affiliate_id", aff.id).order("created_at", { ascending: false }),
      (supabase as any).from("affiliate_orders").select("*").eq("affiliate_id", aff.id).order("created_at", { ascending: false }),
      (supabase as any).from("member_products").select("*").eq("user_id", userData.user.id).order("created_at", { ascending: false }),
    ]);
    setClicks((clicksData ?? []) as Click[]);
    setOrders((ordersData ?? []) as Order[]);
    setMemberProducts(mpData ?? []);
    const { data: mpoData } = await (supabase as any).from("member_product_orders").select("*").eq("seller_user_id", userData.user.id).order("created_at", { ascending: false });
    setMemberProductOrders(mpoData ?? []);
    setLoading(false);
  };

  const loadLeaderboard = async () => {
    const data = await getLeaderboardServer();
    if (data && data.length > 0) setLeaderboard(data);
  };

  useEffect(() => { void load(); void loadLeaderboard(); }, []);

  const stats = useMemo(() => {
    const totalClicks = clicks.length;
    const successOrders = orders.filter((o) => o.status === "confirmed").length;
    const pendingCommission = orders.filter((o) => o.status === "confirmed" && o.commission_status === "pending").reduce((sum, o) => sum + (o.commission_amount || 0), 0);
    const paidCommission = orders.filter((o) => o.commission_status === "paid" || o.commission_status === "approved").reduce((sum, o) => sum + (o.commission_amount || 0), 0);
    return { totalClicks, successOrders, pendingCommission, paidCommission };
  }, [clicks, orders]);

  const chartData = useMemo(() => {
    const now = new Date();
    const days: { date: string; clicks: number }[] = [];
    for (let i = chartRange - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayClicks = clicks.filter((c) => c.created_at.startsWith(dateStr)).length;
      days.push({ date: `${d.getDate()}/${d.getMonth() + 1}`, clicks: dayClicks });
    }
    return days;
  }, [clicks, chartRange]);

  const maxClicks = Math.max(...chartData.map((d) => d.clicks), 1);

  const filteredMPOrders = useMemo(() => {
    const now = new Date();
    return memberProductOrders.filter((o) => {
      const d = new Date(o.created_at);
      if (sellStatsRange === "day") return d.toDateString() === now.toDateString();
      if (sellStatsRange === "week") { const c = new Date(now); c.setDate(c.getDate() - 7); return d >= c; }
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }, [memberProductOrders, sellStatsRange]);

  const productStats = useMemo(() => {
    return PRODUCTS.map((p) => {
      const pClicks = clicks.filter((c) => c.product_key === p.key).length;
      const pOrders = orders.filter((o) => o.product_title?.toLowerCase().includes(p.name.toLowerCase().slice(0, 5)));
      const successCount = pOrders.filter((o) => o.status === "confirmed").length;
      const commission = pOrders.reduce((sum, o) => sum + (o.commission_amount || 0), 0);
      return { ...p, clicks: pClicks, orders: successCount, commission };
    });
  }, [clicks, orders]);

  const copyLink = async (url: string) => {
    await navigator.clipboard.writeText(url);
    toast.success(t("Đã copy link!", "Link copied!"));
  };

  const updateRefCode = async () => {
    if (!affiliate || !editRefCode.trim()) return;
    const code = editRefCode.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!code) { toast.error(t("Mã không hợp lệ", "Invalid code")); return; }
    const { data: existing } = await (supabase as any).from("affiliates").select("id").eq("ref_code", code).neq("id", affiliate.id).maybeSingle();
    if (existing) { toast.error(t("Mã này đã tồn tại", "Code already exists")); return; }
    const { error } = await (supabase as any).from("affiliates").update({ ref_code: code }).eq("id", affiliate.id);
    if (error) { toast.error(error.message); return; }
    setAffiliate({ ...affiliate, ref_code: code });
    setEditingRef(false);
    toast.success(t("Đã cập nhật mã giới thiệu!", "Referral code updated!"));
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error(t("Ảnh tối đa 2MB", "Image max 2MB")); return; }
    avatarFileRef.current = file;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    if (!affiliate) return;
    setSavingProfile(true);
    try {
      let avatarBase64: string | undefined;
      let avatarExt: string | undefined;
      if (avatarFileRef.current) {
        avatarExt = avatarFileRef.current.name.split(".").pop() || "jpg";
        const b64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => { const result = reader.result as string; resolve(result.split(",")[1]); };
          reader.onerror = reject;
          reader.readAsDataURL(avatarFileRef.current!);
        });
        avatarBase64 = b64;
        avatarFileRef.current = null;
      }
      const result = await uploadAvatarServer({ data: { affiliateId: affiliate.id, displayName: displayName.trim() || affiliate.full_name || "", avatarBase64, avatarExt } });
      if (!result.ok) { toast.error(result.error || t("Lỗi lưu hồ sơ", "Error saving profile")); setSavingProfile(false); return; }
      const newAvatarUrl = result.avatarUrl || affiliate.avatar_url || null;
      setAffiliate({ ...affiliate, display_name: displayName.trim(), avatar_url: newAvatarUrl });
      if (newAvatarUrl) setAvatarPreview(newAvatarUrl);
      toast.success(t("Đã lưu hồ sơ!", "Profile saved!"));
    } catch (err: any) {
      toast.error("Error: " + err.message);
    }
    setSavingProfile(false);
  };

  const saveBank = async () => {
    if (!affiliate) return;
    setSavingBank(true);
    const { error } = await (supabase as any).from("affiliates").update({ bank_name: bankName.trim(), bank_account: bankAccount.trim(), bank_owner: bankOwner.trim() }).eq("id", affiliate.id);
    if (error) { toast.error(error.message); } else {
      setAffiliate({ ...affiliate, bank_name: bankName.trim(), bank_account: bankAccount.trim(), bank_owner: bankOwner.trim() });
      setEditingBank(false);
      toast.success(t("Đã lưu tài khoản ngân hàng!", "Bank account saved!"));
    }
    setSavingBank(false);
  };

  const saveSellerProfile = async () => {
    if (!affiliate) return;
    setSavingSellerProfile(true);
    const { error } = await (supabase as any).from("affiliates").update({ full_name: spSellerName.trim(), bank_name: spBankName.trim(), bank_account: spBankAccount.trim(), bank_owner: spBankOwner.trim() }).eq("id", affiliate.id);
    if (error) { toast.error(error.message); } else {
      localStorage.setItem("seller_cccd", spCccd.trim());
      localStorage.setItem("seller_bio", spBio.trim());
      localStorage.setItem("seller_shop_name", spShopName.trim());
      setAffiliate({ ...affiliate, full_name: spSellerName.trim(), bank_name: spBankName.trim(), bank_account: spBankAccount.trim(), bank_owner: spBankOwner.trim() });
      toast.success(t("Đã lưu thông tin người bán!", "Seller info saved!"));
    }
    setSavingSellerProfile(false);
  };

  const generateAutoThumbnail = async (isEn: boolean): Promise<string> => {
    const title = spTitle.trim() || (isEn ? "AI Digital Product" : "Sản phẩm AI");
    const desc = spDesc.trim();
    const canvas = document.createElement("canvas");
    canvas.width = 1200; canvas.height = 630;
    const ctx = canvas.getContext("2d")!;
    // Background
    const bgGrad = ctx.createLinearGradient(0, 0, 1200, 630);
    bgGrad.addColorStop(0, "#0f172a"); bgGrad.addColorStop(0.5, "#1a1f3a"); bgGrad.addColorStop(1, "#0f172a");
    ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, 1200, 630);
    // Grid pattern
    ctx.strokeStyle = "rgba(255,255,255,0.035)"; ctx.lineWidth = 1;
    for (let x = 0; x < 1200; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 630); ctx.stroke(); }
    for (let y = 0; y < 630; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1200, y); ctx.stroke(); }
    // Orange glow top-right
    const glow = ctx.createRadialGradient(1100, 80, 0, 1100, 80, 340);
    glow.addColorStop(0, "rgba(16,185,129,0.18)"); glow.addColorStop(1, "rgba(16,185,129,0)");
    ctx.fillStyle = glow; ctx.fillRect(600, 0, 600, 400);
    // Left accent bar
    const barGrad = ctx.createLinearGradient(0, 0, 0, 630);
    barGrad.addColorStop(0, "#064e3b"); barGrad.addColorStop(0.5, "#059669"); barGrad.addColorStop(1, "#10b981");
    ctx.fillStyle = barGrad; ctx.fillRect(0, 0, 10, 630);
    // Badge pill
    const badgeText = isEn ? "🤖 AI DIGITAL SKILL" : "🤖 KỸ NĂNG AI SỐ";
    ctx.font = "bold 16px Arial, sans-serif";
    const badgeW = ctx.measureText(badgeText).width + 40;
    ctx.fillStyle = "rgba(16,185,129,0.18)";
    ctx.beginPath(); (ctx as any).roundRect(48, 44, badgeW, 36, 18); ctx.fill();
    ctx.fillStyle = "#059669"; ctx.fillText(badgeText, 68, 68);
    // Title — word wrap
    ctx.font = "bold 66px Arial, sans-serif"; ctx.fillStyle = "#ffffff";
    const words = title.split(" ");
    const lines: string[] = []; let cur = "";
    for (const w of words) {
      const test = cur ? cur + " " + w : w;
      if (ctx.measureText(test).width > 1100) { if (cur) lines.push(cur); cur = w; } else { cur = test; }
    }
    if (cur) lines.push(cur);
    const maxL = 3; const disp = lines.slice(0, maxL);
    if (lines.length > maxL) disp[maxL - 1] = disp[maxL - 1].replace(/.{0,3}$/, "…");
    const startY = disp.length === 1 ? 340 : disp.length === 2 ? 300 : 255;
    disp.forEach((line, i) => ctx.fillText(line, 48, startY + i * 82));
    // Description
    if (desc && disp.length <= 2) {
      const shortDesc = desc.length > 110 ? desc.slice(0, 107) + "…" : desc;
      ctx.font = "22px Arial, sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillText(shortDesc, 48, startY + disp.length * 82 + 26);
    }
    // Divider
    ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(48, 563); ctx.lineTo(1152, 563); ctx.stroke();
    // Branding
    ctx.font = "bold 26px Arial, sans-serif"; ctx.fillStyle = "#059669";
    ctx.fillText(isEn ? "AI DIGITAL MARKET" : "SIÊU THỊ SỐ AI", 48, 605);
    ctx.font = "18px Arial, sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.45)";
    const siteText = "sieuthisoai.com";
    ctx.fillText(siteText, 1152 - ctx.measureText(siteText).width, 605);
    return canvas.toDataURL("image/png").split(",")[1];
  };

  const clearAddForm = () => {
    setSpTitle(""); setSpDesc(""); setSpProductUrl(""); setSpPreviewUrl(""); setSpPriceVnd(""); setSpCommission("20"); setSpThumbnailUrl(""); setSpThumbnailUrlEn(""); setSpUploadedImages([]);
    setEditingProductId(null);
  };

  const submitProduct = async () => {
    if (!spTitle.trim() || !spProductUrl.trim() || !spPriceVnd.trim() || !spSellerName.trim()) {
      toast.error(t("Vui lòng điền đầy đủ thông tin bắt buộc", "Please fill all required fields"));
      return;
    }
    setSubmittingSP(true);
    const commonFields = {
      title: spTitle.trim(), description: spDesc.trim(), product_url: spProductUrl.trim(),
      preview_url: spPreviewUrl.trim() || null, price_vnd: parseInt(spPriceVnd.replace(/\D/g, "")) || 0,
      commission_rate: parseInt(spCommission) || 20,
      thumbnail_url: spUploadedImages.length > 1 ? JSON.stringify(spUploadedImages) : spThumbnailUrl.trim() || null,
      thumbnail_url_en: spThumbnailUrlEn.trim() || null,
    };
    if (editingProductId) {
      const { error } = await (supabase as any).from("member_products").update(commonFields).eq("id", editingProductId);
      if (error) { toast.error("Error: " + error.message); } else {
        setMemberProducts((prev) => prev.map((p) => p.id === editingProductId ? { ...p, ...commonFields } : p));
        clearAddForm(); setSellSection("manage");
        toast.success(t("Đã cập nhật sản phẩm!", "Product updated!"));
      }
    } else {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { setSubmittingSP(false); return; }
      const productKey = "MP" + crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
      const { data, error } = await (supabase as any).from("member_products").insert({
        user_id: userData.user.id, seller_name: spSellerName.trim(), shop_name: spShopName.trim() || spSellerName.trim(),
        cccd: spCccd.trim(), bank_name: spBankName.trim(), bank_account: spBankAccount.trim(),
        bank_owner: spBankOwner.trim(), seller_bio: spBio.trim(), product_key: productKey, status: "active", ...commonFields,
      }).select().single();
      if (error) { toast.error("Error: " + error.message); } else {
        setMemberProducts((prev) => [data, ...prev]); clearAddForm(); setSellSection("manage");
        toast.success(t("Sản phẩm đã được đăng lên thành công!", "Product listed successfully!"));
        notifyNewProductServer({ data: { productTitle: commonFields.title, productKey, sellerName: spSellerName.trim(), priceVnd: commonFields.price_vnd, thumbnailUrl: commonFields.thumbnail_url } })
          .then((r) => { if (r.ok) toast.success(t(`Đã gửi email thông báo đến ${r.sent} thành viên!`, `Notified ${r.sent} members!`)); })
          .catch(() => {});
      }
    }
    setSubmittingSP(false);
  };

  const editProduct = (mp: any) => {
    setEditingProductId(mp.id); setSpTitle(mp.title || ""); setSpDesc(mp.description || "");
    setSpProductUrl(mp.product_url || ""); setSpPreviewUrl(mp.preview_url || "");
    setSpPriceVnd(String(mp.price_vnd || "")); setSpCommission(String(mp.commission_rate || 20));
    setSpThumbnailUrl(mp.thumbnail_url || ""); setSpThumbnailUrlEn(mp.thumbnail_url_en || ""); setSpUploadedImages([]); setSellSection("add");
  };

  const toggleProductStatus = async (mp: any) => {
    const newStatus = mp.status === "active" ? "paused" : "active";
    const { error } = await (supabase as any).from("member_products").update({ status: newStatus }).eq("id", mp.id);
    if (error) { toast.error(error.message); return; }
    setMemberProducts((prev) => prev.map((p) => p.id === mp.id ? { ...p, status: newStatus } : p));
    toast.success(newStatus === "active" ? t("Đã bật bán lại", "Product activated") : t("Đã tạm dừng", "Product paused"));
  };

  const logout = async () => { await supabase.auth.signOut(); navigate({ to: "/" }); };

  const formatMoney = (n: number) => price(n);

  if (loading) return <div className="min-h-screen bg-background grid place-items-center text-muted-foreground">{t("Đang tải...", "Loading...")}</div>;

  if (!affiliate) return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 grid place-items-center mx-auto mb-6">
          <Sparkles className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-2xl font-black mb-3">{t("Kích hoạt Affiliate", "Activate Affiliate")}</h1>
        <p className="text-muted-foreground mb-6">{t("Mua ít nhất 1 sản phẩm Thịnh Vua App để kích hoạt lấy link affiliate kiếm tiền", "Buy at least 1 Thinh Vua App product to activate your affiliate link and earn commissions")}</p>
        <div className="flex gap-3 justify-center">
          <Link to="/" className="px-5 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-accent transition">{t("Trang chủ", "Home")}</Link>
          <Link to="/truy-cap-app" className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition">{t("Mua sản phẩm ngay", "Buy Now")}</Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/80 border-b border-border/60">
        <div className="mx-auto max-w-6xl px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-accent transition">
              <ArrowLeft className="w-3.5 h-3.5" /> {t("Quay lại", "Back")}
            </Link>
            <Link to="/" className="font-bold text-base sm:text-lg">
              {t("KIẾM TIỀN AFFILIATE", "AFFILIATE EARNINGS")} <span className="text-primary">{t("SIÊU THỊ SỐ AI", "AI DIGITAL MARKET")}</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold text-sm">
                {(affiliate.full_name || affiliate.email).charAt(0).toUpperCase()}
              </div>
              <div className="text-right">
                <div className="text-sm font-bold leading-tight">{affiliate.full_name || affiliate.email}</div>
                <div className="text-[10px] text-muted-foreground leading-tight">Affiliate</div>
              </div>
            </div>
            {isAdmin && (
              <Link to="/admin" className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 text-white px-4 py-2 text-sm font-bold hover:bg-amber-400 transition">
                <Shield className="w-4 h-4" /> {t("Quản trị", "Admin")}
              </Link>
            )}
            <button
              onClick={() => setLang(lang === "vi" ? "en" : "vi")}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-bold hover:bg-accent transition"
            >
              <Globe className="w-3.5 h-3.5" /> {lang === "vi" ? "EN" : "VI"}
            </button>
            <button onClick={logout} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-accent transition">
              <LogOut className="w-4 h-4" /> {t("Đăng xuất", "Logout")}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">{t("Dashboard của tôi", "My Dashboard")}</h1>
            <p className="text-sm text-muted-foreground">{t("Hoa hồng", "Commission")} {affiliate.commission_rate}% | {affiliate.email}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted p-1 rounded-xl w-full max-w-2xl mx-auto">
          {([
            { key: "overview" as const, label: t("📊 Tổng quan", "📊 Overview") },
            { key: "honor" as const, label: t("🏆 Vinh danh", "🏆 Leaderboard") },
            { key: "partners" as const, label: t("🤝 Đối tác", "🤝 Partners") },
            { key: "payment" as const, label: t("💰 Thanh toán", "💰 Payment") },
            { key: "sell" as const, label: t("🛒 Bán SP", "🛒 Sell") },
          ]).map((tb) => (
            <button key={tb.key} onClick={() => setActiveTab(tb.key)} className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-semibold transition ${activeTab === tb.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {tb.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === "overview" && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-xl bg-card border border-border p-5">
                <div className="text-xs font-semibold text-muted-foreground uppercase">{t("Tổng Clicks", "Total Clicks")}</div>
                <div className="mt-2 text-3xl font-black text-foreground">{stats.totalClicks}</div>
                <div className="mt-1 text-xs text-muted-foreground">{t("tháng này:", "this month:")} {clicks.filter((c) => new Date(c.created_at).getMonth() === new Date().getMonth()).length}</div>
              </div>
              <div className="rounded-xl bg-card border border-border p-5">
                <div className="text-xs font-semibold text-muted-foreground uppercase">{t("Đơn thành công", "Successful Orders")}</div>
                <div className="mt-2 text-3xl font-black text-foreground">{stats.successOrders}</div>
                <div className="mt-1 text-xs text-muted-foreground">{t("đang chờ:", "pending:")} {orders.filter((o) => o.status === "pending").length}</div>
              </div>
              <div className="rounded-xl bg-card border border-border p-5">
                <div className="text-xs font-semibold text-muted-foreground uppercase">{t(`Chờ xác nhận (${GUARANTEE_DAYS} ngày)`, `Awaiting (${GUARANTEE_DAYS} days)`)}</div>
                <div className="mt-2 text-2xl font-black text-primary">{formatMoney(stats.pendingCommission)}</div>
                <div className="mt-1 text-xs text-muted-foreground">{t("đang trong thời gian bảo đảm", "within guarantee period")}</div>
              </div>
              <div className="rounded-xl bg-card border border-border p-5">
                <div className="text-xs font-semibold text-muted-foreground uppercase">{t("Đã nhận", "Received")}</div>
                <div className="mt-2 text-2xl font-black text-emerald-400">{formatMoney(stats.paidCommission)}</div>
                <div className="mt-1 text-xs text-muted-foreground">{stats.paidCommission === 0 ? t("chưa có giao dịch", "no transactions yet") : t("tổng đã thanh toán", "total paid")}</div>
              </div>
            </div>

            {/* Chart */}
            <div className="rounded-xl bg-card border border-border p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h2 className="font-bold flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" /> {t("Hiệu quả hoạt động", "Performance")}</h2>
                <div className="flex gap-1 bg-muted p-1 rounded-lg text-xs">
                  {([7, 28, 60, 90] as const).map((d) => (
                    <button key={d} onClick={() => setChartRange(d)} className={`px-3 py-1 rounded-md font-semibold ${chartRange === d ? "bg-primary text-primary-foreground" : "text-white/60"}`}>
                      {d} {t("ngày", "days")}
                    </button>
                  ))}
                </div>
              </div>
              <div className="text-2xl font-black mb-4">
                {clicks.filter((c) => { const d = new Date(c.created_at); const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - chartRange); return d >= cutoff; }).length}{" "}
                <span className="text-sm font-normal text-muted-foreground">clicks {chartRange} {t("ngày qua", "days ago")}</span>
              </div>
              <div className="flex items-end gap-1 h-40">
                {chartData.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-primary/80 rounded-t" style={{ height: `${(d.clicks / maxClicks) * 100}%`, minHeight: d.clicks > 0 ? "4px" : "1px" }} />
                    {chartRange <= 14 && <span className="text-[9px] text-muted-foreground/60">{d.date}</span>}
                  </div>
                ))}
              </div>
              {chartRange > 14 && (
                <div className="flex justify-between mt-1 text-[9px] text-muted-foreground/60">
                  <span>{chartData[0]?.date}</span>
                  <span>{chartData[Math.floor(chartData.length / 2)]?.date}</span>
                  <span>{chartData[chartData.length - 1]?.date}</span>
                </div>
              )}
            </div>

            {/* Referral link */}
            <div className="rounded-xl bg-card border border-border p-5">
              <h2 className="font-bold flex items-center gap-2 mb-4"><Link2 className="w-5 h-5 text-primary" /> {t("Link giới thiệu của bạn", "Your Referral Link")}</h2>
              <div className="flex items-center gap-3 bg-muted rounded-lg p-4">
                <span className="flex-1 font-mono text-sm truncate">
                  {window.location.origin}/?ref=<span className="text-primary font-bold">{affiliate.ref_code}</span>
                </span>
                <button onClick={() => copyLink(`${window.location.origin}/?ref=${affiliate.ref_code}`)} className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:bg-primary transition">
                  <Copy className="w-4 h-4" /> {t("Sao chép", "Copy")}
                </button>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t("Tuỳ chỉnh tên:", "Custom name:")}</span>
                <input value={editRefCode} onChange={(e) => setEditRefCode(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))} className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground w-48 focus:outline-none focus:ring-2 focus:ring-primary/40" />
                <button onClick={updateRefCode} className="px-3 py-1.5 rounded-lg bg-accent text-sm font-semibold hover:bg-accent transition">{t("Lưu", "Save")}</button>
                <button onClick={() => copyLink(`${window.location.origin}/?ref=${editRefCode}`)} className="px-3 py-1.5 rounded-lg bg-accent text-sm font-semibold hover:bg-accent transition">{t("Kiểm tra", "Check")}</button>
              </div>
            </div>

            {/* Orders */}
            <div className="rounded-xl bg-card border border-border p-5">
              <h2 className="font-bold flex items-center gap-2 mb-4"><ShoppingCart className="w-5 h-5 text-primary" /> {t("Đơn hàng được giới thiệu", "Referred Orders")}</h2>
              {orders.length === 0 ? (
                <div className="text-center text-muted-foreground py-10">{t("Chưa có đơn hàng nào", "No orders yet")}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-white/5">
                      <tr className="text-left text-muted-foreground">
                        <th className="px-4 py-3">{t("KHÁCH HÀNG", "CUSTOMER")}</th>
                        <th className="px-4 py-3">{t("SĐT", "PHONE")}</th>
                        <th className="px-4 py-3">{t("SỐ TIỀN", "AMOUNT")}</th>
                        <th className="px-4 py-3">{t("NGÀY ĐẶT", "DATE")}</th>
                        <th className="px-4 py-3">{t("ĐƠN HÀNG", "ORDER")}</th>
                        <th className="px-4 py-3">{t("HOA HỒNG CỦA BẠN", "YOUR COMMISSION")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => {
                        const orderDate = new Date(o.created_at);
                        const approveDate = o.commission_approved_at ? new Date(o.commission_approved_at) : null;
                        const daysLeft = approveDate ? Math.max(0, GUARANTEE_DAYS - Math.floor((Date.now() - approveDate.getTime()) / 86400000)) : GUARANTEE_DAYS;
                        return (
                          <tr key={o.id} className="border-t border-border/50">
                            <td className="px-4 py-3 font-semibold">{maskName(o.customer_name)}</td>
                            <td className="px-4 py-3 font-mono text-white/60">{maskPhone(o.customer_phone)}</td>
                            <td className="px-4 py-3 font-bold text-primary">{o.amount}</td>
                            <td className="px-4 py-3 text-white/60">{orderDate.toLocaleDateString("vi-VN")}</td>
                            <td className="px-4 py-3">
                              {o.status === "confirmed" && <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-semibold"><CheckCircle2 className="w-3 h-3" /> {t("Đã TT", "Paid")}</span>}
                              {o.status === "pending" && <span className="inline-flex items-center gap-1 text-primary text-xs font-semibold"><Clock className="w-3 h-3" /> {t("Chờ", "Pending")}</span>}
                            </td>
                            <td className="px-4 py-3">
                              <div className="inline-flex items-center gap-2">
                                <span className="text-primary font-bold text-sm">{formatMoney(o.commission_amount || 0)}</span>
                                {o.commission_status === "pending" && (
                                  <span className="text-[10px] bg-primary/20 text-primary rounded-full px-2 py-0.5">{t(`Chờ xác nhận · còn ${daysLeft} ngày`, `Awaiting · ${daysLeft} days left`)}</span>
                                )}
                                {o.commission_status === "paid" && (
                                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 rounded-full px-2 py-0.5">{t("Đã thanh toán", "Paid")}</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── HONOR TAB ── */}
        {activeTab === "honor" && (
          <>
            <div className="rounded-xl bg-card border border-border p-5">
              <h2 className="font-bold flex items-center gap-2 mb-4">💼 {t("Hồ sơ hiển thị", "Public Profile")}</h2>
              <div className="flex flex-col sm:flex-row items-start gap-6">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-24 h-24 rounded-full border-3 border-primary/40 overflow-hidden bg-accent grid place-items-center">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl font-black text-muted-foreground">{(displayName || affiliate.full_name || "?").charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <input type="file" accept="image/*" ref={fileInputRef} onChange={handleAvatarSelect} className="hidden" />
                  <button onClick={() => fileInputRef.current?.click()} className="px-4 py-1.5 rounded-lg border border-border text-sm font-semibold hover:bg-accent transition">{t("Chọn ảnh", "Choose Photo")}</button>
                </div>
                <div className="flex-1 w-full space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("Tên hiển thị", "Display Name")}</label>
                    <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder={t("Nhập tên hiển thị...", "Enter display name...")} />
                  </div>
                  <button onClick={saveProfile} disabled={savingProfile} className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition disabled:opacity-50">
                    {savingProfile ? t("Đang lưu...", "Saving...") : t("Lưu hồ sơ", "Save Profile")}
                  </button>
                  <p className="text-xs text-muted-foreground">{t("Ảnh & tên này hiển thị trên Bảng Vinh Danh. Không ai thấy doanh thu hay % hoa hồng của bạn.", "This photo & name appears on the Leaderboard. Nobody sees your revenue or commission %.")}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-gradient-to-r from-primary via-purple-500 to-pink-500 p-6">
              <h2 className="text-2xl font-black flex items-center gap-2">🏆 {t("BẢNG VINH DANH · Top 20", "LEADERBOARD · Top 20")}</h2>
              <p className="mt-1 text-sm opacity-90">{t("Top đối tác xuất sắc nhất theo đơn & lượt click", "Top partners by orders & clicks")}</p>
            </div>

            {leaderboard.length === 0 ? (
              <div className="rounded-xl bg-card border border-border p-10 text-center text-muted-foreground">{t("Chưa có dữ liệu xếp hạng", "No ranking data yet")}</div>
            ) : (
              <>
                {leaderboard.length >= 3 && (
                  <div className="flex items-end justify-center gap-4 py-6">
                    {[leaderboard[1], leaderboard[0], leaderboard[2]].map((a, idx) => {
                      if (!a) return null;
                      const pos = idx === 0 ? 2 : idx === 1 ? 1 : 3;
                      const size = pos === 1 ? "w-24 h-24" : "w-20 h-20";
                      const border = pos === 1 ? "border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)]" : pos === 2 ? "border-gray-400" : "border-amber-700";
                      const badge = pos === 1 ? "🥇" : pos === 2 ? "🥈" : "🥉";
                      const isMe = affiliate && a.affiliate_id === affiliate.id;
                      return (
                        <div key={a.affiliate_id} className={`flex flex-col items-center gap-2 ${pos === 1 ? "-mt-6" : ""}`}>
                          <div className="relative">
                            <div className={`${size} rounded-full border-3 ${border} overflow-hidden bg-gradient-to-br from-white/20 to-white/5 grid place-items-center text-2xl font-black`}>
                              {a.avatar_url ? <img src={a.avatar_url} alt="" className="w-full h-full object-cover" /> : (a.display_name || a.full_name)?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                            <span className="absolute -top-2 -right-2 text-xl">{badge}</span>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-sm">{a.display_name || a.full_name || a.ref_code}{isMe && <span className="text-primary"> · {t("Bạn", "You")}</span>}</div>
                            <div className="text-primary font-bold text-sm">🛒 {a.total_orders} {t("đơn", "orders")}</div>
                            <div className="text-muted-foreground text-xs">👆 {a.total_clicks} clicks</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="space-y-2">
                  {leaderboard.map((a, i) => {
                    const isMe = affiliate && a.affiliate_id === affiliate.id;
                    const isTop3 = i < 3;
                    return (
                      <div key={a.affiliate_id} className={`rounded-xl p-4 flex items-center gap-4 ${isMe ? "bg-primary/10 border-2 border-primary/40" : isTop3 ? "bg-white/5 border border-primary/20" : "bg-card border border-border"}`}>
                        <div className="shrink-0 w-10 text-center">
                          {i === 0 ? <span className="text-lg">🥇</span> : i === 1 ? <span className="text-lg">🥈</span> : i === 2 ? <span className="text-lg">🥉</span> : <span className="text-sm text-muted-foreground font-bold">#{i + 1}</span>}
                        </div>
                        <div className="shrink-0 w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-white/20 to-white/5 border border-border grid place-items-center font-bold text-sm">
                          {a.avatar_url ? <img src={a.avatar_url} alt="" className="w-full h-full object-cover" /> : (a.display_name || a.full_name)?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm">{a.display_name || a.full_name || a.ref_code}{isMe && <span className="text-primary"> · {t("Bạn", "You")}</span>}</div>
                          <div className="text-xs text-primary/60">🚀 {t("Tập Sự", "Rookie")}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-primary font-bold text-sm">🛒 {a.total_orders} {t("đơn", "orders")}</div>
                          <div className="text-muted-foreground text-xs">👆 {a.total_clicks} clicks</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {/* ── PARTNERS TAB ── */}
        {activeTab === "partners" && affiliate && (() => {
          const totalOrders = orders.filter((o) => o.status === "confirmed").length;
          const currentTier = totalOrders >= 50 ? 2 : totalOrders >= 20 ? 1 : 0;
          const tiers = [
            { name: t("ĐỐI TÁC", "PARTNER"), rate: "30-35%", desc: t("Mặc định khi đăng ký", "Default on registration"), sub: t("từ 810.000đ / đơn", "from $30 / order") },
            { name: t("ĐỐI TÁC VÀNG", "GOLD PARTNER"), rate: "40%", desc: t("20 giới thiệu thành công", "20 successful referrals"), sub: t("1.080.000đ / đơn", "$40 / order") },
            { name: t("ĐẠI SỨ THƯƠNG HIỆU", "BRAND AMBASSADOR"), rate: "50%", desc: t("50 giới thiệu thành công", "50 successful referrals"), sub: t("1.350.000đ / đơn", "$50 / order") },
          ];
          const nextTier = currentTier < 2 ? currentTier + 1 : null;
          const nextTarget = nextTier === 1 ? 20 : nextTier === 2 ? 50 : 0;
          const progress = nextTarget > 0 ? Math.min((totalOrders / nextTarget) * 100, 100) : 100;
          return (
            <>
              <div className="rounded-xl bg-card border border-border p-5">
                <h2 className="font-bold flex items-center gap-2 mb-4">🤝 {t("Đối Tác Giới Thiệu", "Referral Partner")}</h2>
                <div className="rounded-xl bg-card border border-border p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><span className="text-lg">🎉</span><span className="font-bold">{t("Đối Tác Giới Thiệu", "Referral Partner")}</span></div>
                    <span className="text-xs bg-accent text-muted-foreground rounded-full px-3 py-1 font-semibold flex items-center gap-1">🔓 {totalOrders >= 5 ? t("Đã mở", "Unlocked") : t("Chưa mở", "Locked")}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{t("Hoa hồng 35-50% · Phí tham gia $60 · Link riêng sau khi mở khoá", "35-50% commission · $60 join fee · Private link after unlock")}</p>
                  <div className="mt-3 flex items-center gap-3 bg-muted rounded-lg p-3">
                    <span className="flex-1 font-mono text-sm text-muted-foreground/40 tracking-widest">• • • • • • • • • • • • • • • • •</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">🔒 {totalOrders >= 5 ? t("Mở khoá", "Unlock") : t("Khoá", "Locked")}</span>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span>🎯</span>
                      <span className="text-white/60">{t("Đạt 5 đơn thành công để mở khoá link Đối Tác Giới Thiệu —", "Reach 5 successful orders to unlock Referral Partner link —")} <span className="text-primary font-bold">{totalOrders}/5</span></span>
                    </div>
                    <div className="mt-2 h-2 bg-accent rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary to-amber-400 rounded-full transition-all" style={{ width: `${Math.min((totalOrders / 5) * 100, 100)}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-card border border-border p-5">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-bold text-lg">{t("Cấp độ đối tác", "Partner Level")}</h2>
                  <span className="text-sm text-muted-foreground">· {t("Hoa hồng hiện tại:", "Current commission:")} <span className="text-primary font-bold">{tiers[currentTier].rate}</span></span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {tiers.map((tier, i) => (
                    <div key={tier.name} className={`rounded-xl p-5 text-center relative ${i === currentTier ? "bg-accent border-2 border-primary/60" : "bg-card border border-border"}`}>
                      {i === currentTier && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-0.5 rounded-full">{t("Cấp hiện tại", "Current Level")}</span>}
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{tier.name}</div>
                      <div className={`mt-2 text-3xl font-black ${i === currentTier ? "text-primary" : "text-muted-foreground/60"}`}>{tier.rate}</div>
                      <div className="mt-1 text-xs text-muted-foreground/60">{tier.desc}</div>
                      <div className="text-xs text-muted-foreground/40">{tier.sub}</div>
                    </div>
                  ))}
                </div>
                {nextTier !== null && (
                  <div className="mt-5">
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                      <span>{t("Tiến độ đến", "Progress to")} {tiers[nextTier].name} ({tiers[nextTier].rate})</span>
                      <span className="text-primary font-bold">{totalOrders} / {nextTarget} {t("giới thiệu", "referrals")}</span>
                    </div>
                    <div className="h-2.5 bg-accent rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}
                <div className="mt-5 rounded-xl bg-card border border-border p-4 text-sm text-white/60">
                  <p>{t("Bạn đang là thành viên đội ngũ", "You are a member of")} <span className="font-bold text-white">SIÊU THỊ SỐ AI</span> — {t("tiếp tục giới thiệu để tăng cấp độ", "keep referring to level up")}</p>
                  <p className="mt-1">{t("Nhận hướng dẫn từng bước qua nhóm Zalo riêng ·", "Get step-by-step guidance via private Zalo group ·")} <a href="https://zalo.me/0367337799" target="_blank" rel="noopener noreferrer" className="text-primary font-semibold hover:underline">{t("Liên hệ hỗ trợ →", "Contact support →")}</a></p>
                </div>
              </div>
            </>
          );
        })()}

        {/* ── PAYMENT TAB ── */}
        {activeTab === "payment" && affiliate && (() => {
          const paidTotal = orders.filter((o) => o.commission_status === "paid" || o.commission_status === "approved").reduce((s, o) => s + (o.commission_amount || 0), 0);
          const pendingTotal = orders.filter((o) => o.status === "confirmed" && o.commission_status === "pending").reduce((s, o) => s + (o.commission_amount || 0), 0);
          const commissionOrders = orders.filter((o) => o.status === "confirmed");
          return (
            <>
              <div className="rounded-xl bg-card border border-border p-5">
                <h2 className="font-bold flex items-center gap-2 mb-4">💰 {t("Rút tiền hoa hồng", "Withdraw Commission")}</h2>
                <div className="rounded-xl bg-card border border-border p-5 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">{t("Có thể rút ngay", "Available to withdraw")}</div>
                    <div className="text-3xl font-black text-emerald-400 mt-1">{formatMoney(paidTotal)}</div>
                    <div className="text-xs text-muted-foreground mt-1">{t("Chờ xác nhận:", "Awaiting:")} {formatMoney(pendingTotal)}</div>
                  </div>
                  <button className="rounded-xl bg-accent border border-border px-6 py-3 font-bold text-sm hover:bg-accent transition">{t("Rút tiền", "Withdraw")}</button>
                </div>
                <div className="mt-4 flex items-start gap-2 text-sm text-muted-foreground bg-white/5 rounded-lg p-4">
                  <span>ℹ️</span>
                  <p>{t("Hoa hồng được", "Commission is")} <span className="font-bold text-white">{t("xác nhận sau 15 ngày", "confirmed after 15 days")}</span> {t("kể từ ngày đơn thành công (đảm bảo chính sách hoàn tiền cho khách chưa hài lòng). Sau khi bạn yêu cầu rút, admin sẽ", "from the order date (ensures refund policy). After you request withdrawal, admin will")} <span className="font-bold text-white">{t("thanh toán trong 1-3 ngày làm việc", "pay within 1-3 business days")}</span>.</p>
                </div>
              </div>

              <div className="rounded-xl bg-card border border-border p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold flex items-center gap-2">🏦 {t("Tài khoản nhận hoa hồng", "Commission Account")}</h2>
                  {!editingBank && (
                    <button onClick={() => setEditingBank(true)} className="rounded-lg bg-accent border border-border px-4 py-1.5 text-xs font-semibold hover:bg-accent/80 transition">{t("Chỉnh sửa", "Edit")}</button>
                  )}
                </div>
                {editingBank ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("Số tài khoản", "Account Number")}</label>
                      <input value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder="e.g. 2210189178888" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("Chủ tài khoản", "Account Owner")}</label>
                      <input value={bankOwner} onChange={(e) => setBankOwner(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder="e.g. PHAM VAN THINH" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("Tên ngân hàng", "Bank Name")}</label>
                      <input value={bankName} onChange={(e) => setBankName(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder="e.g. MBBank, Vietcombank..." />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={saveBank} disabled={savingBank} className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition disabled:opacity-50">
                        {savingBank ? t("Đang lưu...", "Saving...") : t("Lưu", "Save")}
                      </button>
                      <button onClick={() => { setEditingBank(false); setBankName(affiliate.bank_name || ""); setBankAccount(affiliate.bank_account || ""); setBankOwner(affiliate.bank_owner || ""); }} className="px-5 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-accent transition">{t("Huỷ", "Cancel")}</button>
                    </div>
                  </div>
                ) : (
                  affiliate.bank_account ? (
                    <div className="space-y-1.5 text-sm">
                      <div className="flex gap-2"><span className="text-muted-foreground w-36 shrink-0">{t("Số tài khoản:", "Account Number:")}</span><span className="font-bold">{affiliate.bank_account}</span></div>
                      <div className="flex gap-2"><span className="text-muted-foreground w-36 shrink-0">{t("Chủ tài khoản:", "Account Owner:")}</span><span className="font-bold">{affiliate.bank_owner || "—"}</span></div>
                      <div className="flex gap-2"><span className="text-muted-foreground w-36 shrink-0">{t("Ngân hàng:", "Bank:")}</span><span className="font-bold">{affiliate.bank_name || "—"}</span></div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground mb-3">{t("Chưa có thông tin ngân hàng", "No bank info yet")}</p>
                      <button onClick={() => setEditingBank(true)} className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition">{t("Thêm tài khoản ngân hàng", "Add Bank Account")}</button>
                    </div>
                  )
                )}
              </div>

              <div className="rounded-xl bg-card border border-border p-5">
                <h2 className="font-bold flex items-center gap-2 mb-4">📋 {t("Lịch sử hoa hồng", "Commission History")}</h2>
                {commissionOrders.length === 0 ? (
                  <div className="text-center text-muted-foreground py-10">{t("Chưa có lịch sử hoa hồng", "No commission history")}</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-white/5">
                        <tr className="text-left text-muted-foreground">
                          <th className="px-4 py-3">{t("TỶ LỆ", "RATE")}</th>
                          <th className="px-4 py-3">{t("HOA HỒNG", "COMMISSION")}</th>
                          <th className="px-4 py-3">{t("NGÀY TẠO", "DATE")}</th>
                          <th className="px-4 py-3">{t("TRẠNG THÁI", "STATUS")}</th>
                          <th className="px-4 py-3">{t("NGÀY NHẬN", "RECEIVED")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {commissionOrders.map((o) => {
                          const approveDate = o.commission_approved_at ? new Date(o.commission_approved_at) : null;
                          const hoursLeft = approveDate ? Math.max(0, Math.floor(((approveDate.getTime() + GUARANTEE_DAYS * 86400000) - Date.now()) / 3600000)) : GUARANTEE_DAYS * 24;
                          const dLeft = Math.floor(hoursLeft / 24);
                          const hLeft = hoursLeft % 24;
                          return (
                            <tr key={o.id} className="border-t border-border/50">
                              <td className="px-4 py-3 text-white/60">{affiliate.commission_rate}%</td>
                              <td className="px-4 py-3 font-bold text-primary">{formatMoney(o.commission_amount || 0)}</td>
                              <td className="px-4 py-3 text-white/60">{new Date(o.created_at).toLocaleDateString("vi-VN")}</td>
                              <td className="px-4 py-3">
                                {o.commission_status === "paid" ? (
                                  <span className="text-xs bg-emerald-500/20 text-emerald-400 rounded-full px-2.5 py-1 font-semibold">{t("Đã thanh toán", "Paid")}</span>
                                ) : (
                                  <span className="text-xs bg-primary/20 text-primary rounded-full px-2.5 py-1 font-semibold">⏱ {dLeft}{t("n", "d")} {hLeft}{t("h", "h")}</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">{o.commission_status === "paid" && approveDate ? approveDate.toLocaleDateString("vi-VN") : "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          );
        })()}

        {/* ── SELL TAB ── */}
        {activeTab === "sell" && (
          <>
            <div className="grid grid-cols-3 gap-3">
              {([
                { key: "profile" as const, icon: "👤", label: t("Thông tin người bán", "Seller Info"), desc: t("Hồ sơ & tài khoản nhận tiền", "Profile & payment account") },
                { key: "add" as const, icon: "➕", label: t("Đưa sản phẩm lên bán", "List Product"), desc: t("Đăng sản phẩm số mới", "Post new digital product") },
                { key: "manage" as const, icon: "📋", label: t("Quản lý bán hàng", "Sales Management"), desc: `${memberProducts.length} ${t("sản phẩm", "products")}` },
              ]).map((s) => (
                <button key={s.key} onClick={() => setSellSection(s.key)}
                  className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${sellSection === s.key ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"}`}>
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <div className={`font-bold text-sm ${sellSection === s.key ? "text-primary" : "text-foreground"}`}>{s.label}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{s.desc}</div>
                </button>
              ))}
            </div>

            {sellSection === "profile" && (
              <div className="rounded-xl bg-card border border-border p-6 space-y-4">
                <h3 className="font-bold text-base">👤 {t("Thông tin người bán", "Seller Info")}</h3>
                <p className="text-sm text-muted-foreground">{t("Lưu sẵn thông tin để tự động điền khi đăng sản phẩm mới.", "Save info to auto-fill when listing new products.")}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("Tên shop *", "Shop Name *")}</label>
                    <input value={spShopName} onChange={(e) => setSpShopName(e.target.value)} className="mt-1 w-full rounded-lg border border-primary/40 bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder={t("VD: Shop AI Thịnh Phạm", "e.g. Thinh Pham AI Shop")} />
                    <p className="text-[10px] text-muted-foreground mt-1">{t("Tên shop hiển thị trên trang sản phẩm", "Shop name shown on product page")}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("Họ và tên *", "Full Name *")}</label>
                    <input value={spSellerName} onChange={(e) => setSpSellerName(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder={t("Nguyễn Văn A", "John Doe")} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("CCCD / CMND", "ID Number")}</label>
                    <input value={spCccd} onChange={(e) => setSpCccd(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder="012345678901" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("STK ngân hàng *", "Bank Account *")}</label>
                    <input value={spBankAccount} onChange={(e) => setSpBankAccount(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder="2210189178888" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("Tên ngân hàng *", "Bank Name *")}</label>
                    <input value={spBankName} onChange={(e) => setSpBankName(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder="MBBank, Vietcombank..." />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("Chủ tài khoản *", "Account Owner *")}</label>
                    <input value={spBankOwner} onChange={(e) => setSpBankOwner(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder="NGUYEN VAN A" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("Hồ sơ / Giới thiệu bản thân", "Bio / About You")}</label>
                  <textarea value={spBio} onChange={(e) => setSpBio(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" placeholder={t("Giới thiệu ngắn về bạn, kinh nghiệm, chuyên môn...", "Brief intro about you, experience, expertise...")} />
                </div>
                <button onClick={saveSellerProfile} disabled={savingSellerProfile} className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-bold text-sm hover:opacity-90 transition disabled:opacity-50">
                  {savingSellerProfile ? t("Đang lưu...", "Saving...") : `💾 ${t("Lưu thông tin người bán", "Save Seller Info")}`}
                </button>
              </div>
            )}

            {sellSection === "add" && (
              <div className="rounded-xl bg-card border border-border p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base">{editingProductId ? `✏️ ${t("Chỉnh sửa sản phẩm", "Edit Product")}` : `➕ ${t("Đưa sản phẩm số lên bán", "List Digital Product")}`}</h3>
                  {editingProductId && (
                    <button onClick={() => { clearAddForm(); setSellSection("manage"); }} className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-accent transition">{t("Huỷ chỉnh sửa", "Cancel Edit")}</button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{editingProductId ? t("Cập nhật thông tin sản phẩm của bạn.", "Update your product info.") : t("Sản phẩm tự động hiển thị ngay trên Siêu Thị Số AI sau khi đăng.", "Product appears instantly on AI Digital Supermarket after posting.")}</p>

                {(!spSellerName || !spBankAccount) && (
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-sm">
                    <span className="text-amber-400 font-semibold">⚠️ {t("Chưa có thông tin người bán.", "No seller info yet.")}</span>{" "}
                    <button onClick={() => setSellSection("profile")} className="text-primary font-semibold hover:underline">{t("Điền ngay →", "Fill now →")}</button>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("Tên sản phẩm *", "Product Name *")}</label>
                    <input value={spTitle} onChange={(e) => setSpTitle(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder={t("VD: Bộ workflow tạo ảnh AI ngành mỹ phẩm", "e.g. AI image workflow for cosmetics industry")} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("Mô tả sản phẩm", "Product Description")}</label>
                    <textarea value={spDesc} onChange={(e) => setSpDesc(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" placeholder={t("Mô tả ngắn về sản phẩm, giá trị mang lại...", "Brief description of the product and its value...")} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("Link file sản phẩm *", "Product File Link *")} <span className="normal-case font-normal">(Google Drive, Docs, Notion...)</span></label>
                    <input value={spProductUrl} onChange={(e) => setSpProductUrl(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder="https://drive.google.com/..." />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("Link xem trước / demo", "Preview / Demo Link")} <span className="normal-case font-normal text-muted-foreground">({t("tuỳ chọn", "optional")})</span></label>
                    <input value={spPreviewUrl} onChange={(e) => setSpPreviewUrl(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder="https://youtu.be/..." />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("Ảnh thumbnail sản phẩm", "Product Thumbnail")} <span className="normal-case font-normal text-muted-foreground">({t("tuỳ chọn — tối đa 5 ảnh", "optional — max 5 images")})</span></label>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-primary/50 bg-primary/5 text-primary text-sm font-semibold cursor-pointer hover:bg-primary/10 transition ${spUploadingImages ? "opacity-50 pointer-events-none" : ""}`}>
                        {spUploadingImages ? t("Đang tải lên...", "Uploading...") : `📁 ${t("Chọn ảnh từ máy (tối đa 5)", "Choose images (max 5)")}`}
                        <input type="file" accept="image/*" multiple className="hidden" disabled={spUploadingImages}
                          onChange={async (e) => {
                            const files = Array.from(e.target.files ?? []).slice(0, 5 - spUploadedImages.length);
                            if (!files.length) return;
                            setSpUploadingImages(true);
                            try {
                              const { data: { user } } = await supabase.auth.getUser();
                              const affiliateId = affiliate?.id ?? user?.id ?? "unknown";
                              const urls: string[] = [];
                              for (let i = 0; i < files.length; i++) {
                                const file = files[i];
                                const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
                                const base64 = await new Promise<string>((res) => {
                                  const reader = new FileReader();
                                  reader.onload = () => res((reader.result as string).split(",")[1]);
                                  reader.readAsDataURL(file);
                                });
                                const result = await uploadProductImageServer({ data: { base64, ext, affiliateId, index: spUploadedImages.length + i } });
                                if (result.ok) urls.push(result.url);
                                else toast.error(t("Lỗi tải ảnh: ", "Image upload error: ") + result.error);
                              }
                              const newImages = [...spUploadedImages, ...urls].slice(0, 5);
                              setSpUploadedImages(newImages);
                              if (newImages[0]) setSpThumbnailUrl(newImages[0]);
                            } catch (err: any) {
                              toast.error("Error: " + err.message);
                            } finally {
                              setSpUploadingImages(false);
                              e.target.value = "";
                            }
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        disabled={spGeneratingThumb || !spTitle.trim()}
                        onClick={async () => {
                          setSpGeneratingThumb(true);
                          try {
                            const base64 = await generateAutoThumbnail(false);
                            const { data: { user } } = await supabase.auth.getUser();
                            const affiliateId = affiliate?.id ?? user?.id ?? "unknown";
                            const result = await uploadProductImageServer({ data: { base64, ext: "png", affiliateId, index: Date.now() } });
                            if (result.ok && result.url) {
                              const newImages = [result.url, ...spUploadedImages].slice(0, 5);
                              setSpUploadedImages(newImages);
                              setSpThumbnailUrl(newImages[0]);
                              toast.success(t("Đã tạo thumbnail tự động!", "Auto thumbnail generated!"));
                            } else toast.error(t("Lỗi tạo thumbnail", "Thumbnail error"));
                          } catch (err: any) { toast.error("Error: " + err.message); }
                          finally { setSpGeneratingThumb(false); }
                        }}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-violet-400/60 bg-violet-50 text-violet-700 text-sm font-semibold hover:bg-violet-100 transition ${(spGeneratingThumb || !spTitle.trim()) ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        {spGeneratingThumb ? t("Đang tạo...", "Generating...") : `🤖 ${t("Sàn tự tạo thumbnail", "Auto-generate thumbnail")}`}
                      </button>
                      {spUploadedImages.length > 0 && <span className="text-[10px] text-muted-foreground">{spUploadedImages.length}/5 {t("ảnh", "images")}</span>}
                    </div>
                    {spUploadedImages.length > 0 && (
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {spUploadedImages.map((url, idx) => (
                          <div key={url} className={`relative w-24 h-16 rounded-lg overflow-hidden border-2 cursor-pointer transition ${spThumbnailUrl === url ? "border-primary" : "border-border"}`} onClick={() => setSpThumbnailUrl(url)}>
                            <img src={url} alt="" className="w-full h-full object-cover" />
                            {spThumbnailUrl === url && <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center text-[8px] text-white font-bold">✓</div>}
                            <button onClick={(e) => { e.stopPropagation(); const next = spUploadedImages.filter((_, i) => i !== idx); setSpUploadedImages(next); if (spThumbnailUrl === url) setSpThumbnailUrl(next[0] ?? ""); }} className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white text-[10px] flex items-center justify-center hover:bg-red-500 transition">×</button>
                          </div>
                        ))}
                      </div>
                    )}
                    <input value={spThumbnailUrl} onChange={(e) => setSpThumbnailUrl(e.target.value)} className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder={t("Hoặc dán link ảnh trực tiếp (https://i.imgur.com/...)", "Or paste image URL directly (https://i.imgur.com/...)")} />
                  </div>

                  {/* EN Thumbnail */}
                  <div>
                    <label className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">🇬🇧 {t("Ảnh thumbnail tiếng Anh", "English Thumbnail")} <span className="normal-case font-normal text-muted-foreground">({t("tự chuyển khi khách chọn EN", "auto-switch when EN selected")})</span></label>
                    <div className="mt-1 flex items-center gap-3">
                      {spThumbnailUrlEn && (
                        <div className="relative shrink-0">
                          <img src={spThumbnailUrlEn} alt="" className="w-16 h-16 rounded-lg object-cover border-2 border-blue-400" />
                          <button onClick={() => setSpThumbnailUrlEn("")} className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">×</button>
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex gap-2 flex-wrap">
                        <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-blue-400/60 bg-blue-50 text-blue-700 text-sm font-semibold cursor-pointer hover:bg-blue-100 transition ${spUploadingImageEn ? "opacity-50 pointer-events-none" : ""}`}>
                          {spUploadingImageEn ? t("Đang tải lên...", "Uploading...") : `🇬🇧 ${t("Tải ảnh EN lên", "Upload EN image")}`}
                          <input type="file" accept="image/*" className="hidden" disabled={spUploadingImageEn}
                            onChange={async (e) => {
                              const file = e.target.files?.[0]; if (!file) return;
                              setSpUploadingImageEn(true);
                              try {
                                const { data: { user } } = await supabase.auth.getUser();
                                const affiliateId = (affiliate?.id ?? user?.id ?? "unknown") + "-en";
                                const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
                                const base64 = await new Promise<string>((res) => {
                                  const reader = new FileReader();
                                  reader.onload = () => res((reader.result as string).split(",")[1]);
                                  reader.readAsDataURL(file);
                                });
                                const result = await uploadProductImageServer({ data: { base64, ext, affiliateId, index: Date.now() } });
                                if (result.ok && result.url) setSpThumbnailUrlEn(result.url);
                                else toast.error(t("Lỗi tải ảnh EN", "EN image upload error"));
                              } catch (err: any) { toast.error("Error: " + err.message); }
                              finally { setSpUploadingImageEn(false); e.target.value = ""; }
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          disabled={spGeneratingThumbEn || !spTitle.trim()}
                          onClick={async () => {
                            setSpGeneratingThumbEn(true);
                            try {
                              const base64 = await generateAutoThumbnail(true);
                              const { data: { user } } = await supabase.auth.getUser();
                              const affiliateId = (affiliate?.id ?? user?.id ?? "unknown") + "-en";
                              const result = await uploadProductImageServer({ data: { base64, ext: "png", affiliateId, index: Date.now() } });
                              if (result.ok && result.url) {
                                setSpThumbnailUrlEn(result.url);
                                toast.success(t("Đã tạo thumbnail EN tự động!", "EN thumbnail auto-generated!"));
                              } else toast.error(t("Lỗi tạo thumbnail EN", "EN thumbnail error"));
                            } catch (err: any) { toast.error("Error: " + err.message); }
                            finally { setSpGeneratingThumbEn(false); }
                          }}
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-violet-400/60 bg-violet-50 text-violet-700 text-sm font-semibold hover:bg-violet-100 transition ${(spGeneratingThumbEn || !spTitle.trim()) ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          {spGeneratingThumbEn ? t("Đang tạo...", "Generating...") : `🤖 ${t("Tự tạo EN", "Auto EN")}`}
                        </button>
                        </div>
                        <input value={spThumbnailUrlEn} onChange={(e) => setSpThumbnailUrlEn(e.target.value)} className="mt-1.5 w-full rounded-lg border border-blue-300 bg-blue-50/50 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/40" placeholder={t("Hoặc dán link ảnh EN...", "Or paste EN image URL...")} />
                        {!spThumbnailUrlEn && <p className="text-[10px] text-muted-foreground mt-1">{t("Chưa có — dùng overlay chữ EN trên ảnh VI", "None yet — EN text overlay will be used")}</p>}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("Giá sản phẩm (VNĐ) *", "Product Price (VND) *")}</label>
                      <input value={spPriceVnd} onChange={(e) => setSpPriceVnd(e.target.value)} type="number" className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder="79000" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("Hoa hồng affiliate (%)", "Affiliate Commission (%)")}</label>
                      <input value={spCommission} onChange={(e) => setSpCommission(e.target.value)} type="number" min="0" max="80" className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder="20" />
                      <p className="text-[10px] text-muted-foreground mt-1">{t("% cho người giới thiệu", "% for the referrer")}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm text-muted-foreground">
                  {t("Thanh toán từ khách → tài khoản admin → admin chuyển cho bạn (trừ 1 phí vận hành và thuế)", "Customer payment → admin account → admin transfers to you (minus operating fee & tax)")}
                </div>

                <button onClick={submitProduct} disabled={submittingSP} className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-bold text-sm hover:opacity-90 transition disabled:opacity-50">
                  {submittingSP
                    ? (editingProductId ? t("Đang cập nhật...", "Updating...") : t("Đang đăng...", "Posting..."))
                    : editingProductId ? `💾 ${t("Lưu thay đổi", "Save Changes")}` : `🚀 ${t("Đăng sản phẩm lên bán ngay", "List Product Now")}`}
                </button>
              </div>
            )}

            {sellSection === "manage" && (
              <div className="space-y-4">
                <div className="rounded-xl bg-card border border-border p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                    <h3 className="font-bold text-base">📊 {t("Thống kê đơn hàng", "Order Statistics")}</h3>
                    <div className="flex gap-1 bg-muted p-1 rounded-lg">
                      {([
                        { key: "day" as const, label: t("Ngày", "Day") },
                        { key: "week" as const, label: t("Tuần", "Week") },
                        { key: "month" as const, label: t("Tháng", "Month") },
                      ]).map((r) => (
                        <button key={r.key} onClick={() => setSellStatsRange(r.key)}
                          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${sellStatsRange === r.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-5">
                    <div className="rounded-xl bg-muted p-4 text-center">
                      <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide">{t("Số đơn", "Orders")}</div>
                      <div className="text-2xl font-black mt-1">{filteredMPOrders.length}</div>
                    </div>
                    <div className="rounded-xl bg-muted p-4 text-center">
                      <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide">{t("Doanh thu", "Revenue")}</div>
                      <div className="text-lg font-black mt-1 text-primary">{formatMoney(filteredMPOrders.reduce((s, o) => s + (o.amount || 0), 0))}</div>
                    </div>
                    <div className="rounded-xl bg-muted p-4 text-center">
                      <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide">{t("Nhận về (−20%)", "Net (−20%)")}</div>
                      <div className="text-lg font-black mt-1 text-emerald-400">{formatMoney(filteredMPOrders.reduce((s, o) => s + (o.net_amount || Math.floor((o.amount || 0) * 0.8)), 0))}</div>
                    </div>
                  </div>

                  {filteredMPOrders.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
                      {t(`Chưa có đơn hàng nào ${sellStatsRange === "day" ? "hôm nay" : sellStatsRange === "week" ? "tuần này" : "tháng này"}.`,
                         `No orders ${sellStatsRange === "day" ? "today" : sellStatsRange === "week" ? "this week" : "this month"}.`)}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border">
                            <th className="pb-2.5 pr-4">{t("Tên SP bán", "Product")}</th>
                            <th className="pb-2.5 pr-4">{t("Người mua", "Buyer")}</th>
                            <th className="pb-2.5 pr-4">{t("Số đơn", "Date")}</th>
                            <th className="pb-2.5 pr-4">{t("Số tiền", "Amount")}</th>
                            <th className="pb-2.5">{t("Nhận về", "Net")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredMPOrders.map((o, idx) => (
                            <tr key={o.id} className="border-t border-border/40">
                              <td className="py-3 pr-4 font-medium text-sm max-w-[160px] truncate">{o.product_title || "—"}</td>
                              <td className="py-3 pr-4 text-muted-foreground text-sm">
                                <div>{maskName(o.buyer_name || t("Ẩn danh", "Anonymous"))}</div>
                                {o.buyer_phone && <div className="text-[10px]">{maskPhone(o.buyer_phone)}</div>}
                              </td>
                              <td className="py-3 pr-4 text-muted-foreground text-xs">{new Date(o.created_at).toLocaleDateString("vi-VN")}</td>
                              <td className="py-3 pr-4 font-bold text-primary">{formatMoney(o.amount || 0)}</td>
                              <td className="py-3 font-bold text-emerald-400">{formatMoney(o.net_amount || Math.floor((o.amount || 0) * 0.8))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="rounded-xl bg-card border border-border p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-base">📦 {t("Sản phẩm của bạn", "Your Products")}</h3>
                    <button onClick={() => setSellSection("add")} className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-xs font-bold hover:opacity-90 transition">
                      + {t("Đăng thêm SP", "Add Product")}
                    </button>
                  </div>
                  {memberProducts.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <p>{t("Chưa có sản phẩm nào.", "No products yet.")}</p>
                      <button onClick={() => setSellSection("add")} className="mt-3 text-primary font-semibold text-sm hover:underline">+ {t("Đăng sản phẩm đầu tiên →", "List your first product →")}</button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {memberProducts.map((mp: any) => (
                        <div key={mp.id} className="rounded-xl border border-border p-4">
                          <div className="flex items-start gap-3">
                            {mp.thumbnail_url && (
                              <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-border">
                                <img src={mp.thumbnail_url} alt="" className="w-full h-full object-cover" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="font-semibold text-sm flex-1">{mp.title}</div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button onClick={() => editProduct(mp)} className="text-[10px] font-bold rounded-full px-3 py-1.5 bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition">
                                    ✏️ {t("Sửa", "Edit")}
                                  </button>
                                  <button onClick={() => toggleProductStatus(mp)}
                                    className={`text-[10px] font-bold rounded-full px-3 py-1.5 transition ${mp.status === "active" ? "bg-emerald-500/20 text-emerald-400 hover:bg-red-500/20 hover:text-red-400" : "bg-amber-500/20 text-amber-400 hover:bg-emerald-500/20 hover:text-emerald-400"}`}>
                                    {mp.status === "active" ? `✅ ${t("Đang bán", "Active")}` : `⏸ ${t("Tạm dừng", "Paused")}`}
                                  </button>
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {Number(mp.price_vnd).toLocaleString("vi-VN")}đ · {t("Hoa hồng affiliate", "Affiliate commission")} {mp.commission_rate}%
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">Shop: {mp.shop_name || mp.seller_name} · {t("Mã:", "Key:")} {mp.product_key} · {new Date(mp.created_at).toLocaleDateString("vi-VN")}</div>
                            </div>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <a href={mp.product_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary border border-primary/30 rounded-lg px-3 py-1.5 hover:bg-primary/10 transition">{t("Xem file SP", "View File")}</a>
                            {mp.preview_url && <a href={mp.preview_url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-accent transition">{t("Xem demo", "View Demo")}</a>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

      </main>
    </div>
  );
}

function maskName(name: string) {
  if (!name) return "***";
  const parts = name.split(" ");
  return parts.map((p) => p.charAt(0) + "***").join(" ");
}

function maskPhone(phone: string) {
  if (!phone || phone.length < 6) return "****";
  return phone.slice(0, 4) + "****" + phone.slice(-2);
}
