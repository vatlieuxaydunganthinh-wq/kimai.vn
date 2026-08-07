import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shield, ArrowLeft, CheckCircle2, XCircle, Clock, Users, ShoppingCart, Link2, DollarSign, TrendingUp, Calendar, Package, Plus, Pencil, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { deleteMemberServer, notifyAffiliateApprovedServer, listPromoCodesServer, createPromoCodeServer, updatePromoCodeServer, deletePromoCodeServer, uploadProductImageServer, fetchAndStoreImageServer, updateMemberProductEnThumbServer } from "@/lib/payment-server-fns";
import { apps, enThumbnailUrls, skillEnThumbnailUrls } from "@/lib/apps-data";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Quản trị — Thịnh Vua App" }] }),
  component: AdminPage,
});

type Member = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  vip_code: string | null;
  vip_status: "pending" | "approved" | "rejected";
  vip_expires_at: string | null;
  created_at: string;
};

type Order = {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  product_number: number;
  product_title: string;
  product_code: string;
  amount: string;
  status: "pending" | "confirmed" | "cancelled";
  affiliate_id: string | null;
  commission_amount: number;
  commission_status: string;
  created_at: string;
};

type ProductOrder = {
  id: string;
  order_code: string;
  customer_email: string;
  customer_name: string;
  product_key: string;
  product_title: string;
  amount: number;
  status: string;
  paid_at: string | null;
  affiliate_ref: string | null;
  created_at: string;
};

type AffiliateInfo = {
  id: string;
  user_id: string;
  ref_code: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  commission_rate: number;
  status: string;
  created_at: string;
  total_clicks: number;
  total_orders: number;
  total_commission: number;
};

type AdminProduct = {
  id: number;
  n: number;
  title: string;
  description: string;
  price_vnd: number;
  code_format: string;
  code_example: string;
  thumbnail_url: string | null;
  thumbnail_url_en: string | null;
  preview_url: string | null;
  product_url: string | null;
  is_active: boolean;
  sort_order: number;
};

type PromoCode = {
  id: string;
  code: string;
  product_key: string | null;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
  note: string | null;
  product_url: string | null;
  created_at: string;
};

const EMPTY_PRODUCT: Omit<AdminProduct, "id"> = {
  n: 0, title: "", description: "", price_vnd: 0,
  code_format: "", code_example: "",
  thumbnail_url: null, thumbnail_url_en: null, preview_url: null, product_url: null,
  is_active: true, sort_order: 0,
};

function AdminPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"members" | "orders" | "affiliates" | "products" | "promoCodes">("members");
  const [members, setMembers] = useState<Member[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [productOrders, setProductOrders] = useState<ProductOrder[]>([]);
  const [affiliates, setAffiliates] = useState<AffiliateInfo[]>([]);
  const [adminProducts, setAdminProducts] = useState<AdminProduct[]>([]);
  const [editingProduct, setEditingProduct] = useState<Partial<AdminProduct> | null>(null);
  const [productSaving, setProductSaving] = useState(false);
  const [thumbUploading, setThumbUploading] = useState<"vi" | "en" | null>(null);
  const [thumbGenerating, setThumbGenerating] = useState<"vi" | "en" | null>(null);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [mascotUrl, setMascotUrl] = useState<string | null>(() => localStorage.getItem("admin_mascot_url"));
  const [storingMascot, setStoringMascot] = useState(false);
  // MayA — 9:16 portrait, empty top half designed for text overlay (job 20d97a55)
  const HIGGSFIELD_MASCOT = "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260729_101321_20d97a55-a2fe-475d-b5cb-95ee363924f5.png";
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [promoForm, setPromoForm] = useState({ code: "", productKey: "", maxUses: "", expiresAt: "", note: "", productUrl: "" });
  const [promoSaving, setPromoSaving] = useState(false);
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [orderFilter, setOrderFilter] = useState<"all" | "pending" | "confirmed" | "cancelled">("pending");
  const [timePeriod, setTimePeriod] = useState<"day" | "week" | "month" | "all">("month");
  const [affiliateUserIds, setAffiliateUserIds] = useState<Set<string>>(new Set());
  const [affiliateBankMap, setAffiliateBankMap] = useState<Map<string, { bank_name?: string; bank_account?: string; bank_owner?: string }>>(new Map());

  const loadMembers = async () => {
    const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setMembers((data ?? []) as Member[]);
  };

  const loadOrders = async () => {
    const { data, error } = await (supabase as any).from("affiliate_orders").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setOrders((data ?? []) as Order[]);
  };

  const loadProductOrders = async () => {
    const { data, error } = await (supabase as any).from("product_orders").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setProductOrders((data ?? []) as ProductOrder[]);
  };

  const loadAffiliates = async () => {
    const [{ data: affs, error }, { data: allClicks }, { data: allAffOrders }] = await Promise.all([
      (supabase as any).from("affiliates").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("affiliate_clicks").select("affiliate_id"),
      (supabase as any).from("affiliate_orders").select("affiliate_id,commission_amount,status"),
    ]);
    if (error) { toast.error(error.message); return; }

    const clickMap = new Map<string, number>();
    for (const c of (allClicks ?? [])) {
      clickMap.set(c.affiliate_id, (clickMap.get(c.affiliate_id) || 0) + 1);
    }

    const enriched: AffiliateInfo[] = (affs ?? []).map((a: any) => {
      const affOrders = (allAffOrders ?? []).filter((o: any) => o.affiliate_id === a.id);
      const confirmedOrders = affOrders.filter((o: any) => o.status === "confirmed");
      return {
        ...a,
        total_clicks: clickMap.get(a.id) || 0,
        total_orders: confirmedOrders.length,
        total_commission: confirmedOrders.reduce((s: number, o: any) => s + (o.commission_amount || 0), 0),
      };
    });

    setAffiliates(enriched);
    setAffiliateUserIds(new Set((affs ?? []).map((a: any) => a.user_id)));
    const bankMap = new Map<string, { bank_name?: string; bank_account?: string; bank_owner?: string }>();
    for (const a of (affs ?? [])) {
      if (a.user_id) bankMap.set(a.user_id, { bank_name: a.bank_name, bank_account: a.bank_account, bank_owner: a.bank_owner });
    }
    setAffiliateBankMap(bankMap);
  };

  const loadAffiliatesBasic = async () => {
    const { data: affs } = await (supabase as any)
      .from("affiliates")
      .select("id,user_id,bank_name,bank_account,bank_owner");
    if (!affs) return;
    setAffiliateUserIds(new Set(affs.map((a: any) => a.user_id).filter(Boolean)));
    const bankMap = new Map<string, { bank_name?: string; bank_account?: string; bank_owner?: string }>();
    for (const a of affs) {
      if (a.user_id) bankMap.set(a.user_id, { bank_name: a.bank_name, bank_account: a.bank_account, bank_owner: a.bank_owner });
    }
    setAffiliateBankMap(bankMap);
  };

  const loadAdminProducts = async () => {
    const { data, error } = await (supabase as any).from("admin_products").select("*").order("sort_order").order("n");
    if (error) { toast.error("Chưa có bảng admin_products. Hãy chạy SQL tạo bảng trước."); return; }
    setAdminProducts((data ?? []) as AdminProduct[]);
  };

  const loadPromoCodes = async () => {
    const data = await listPromoCodesServer();
    setPromoCodes((data ?? []) as PromoCode[]);
  };

  const saveProduct = async () => {
    if (!editingProduct) return;
    if (!editingProduct.title?.trim()) { toast.error("Nhập tên sản phẩm"); return; }
    if (!editingProduct.n) { toast.error("Nhập số thứ tự (n)"); return; }
    setProductSaving(true);
    try {
      const { id, ...rest } = editingProduct;
      const payload = { ...rest, updated_at: new Date().toISOString() };
      if (id) {
        const { error } = await (supabase as any).from("admin_products").update(payload).eq("id", id);
        if (error) { toast.error(error.message); return; }
        toast.success("Đã cập nhật sản phẩm");
      } else {
        const { error } = await (supabase as any).from("admin_products").insert(rest);
        if (error) { toast.error(error.message); return; }
        toast.success("Đã thêm sản phẩm mới");
      }
      setEditingProduct(null);
      await loadAdminProducts();
    } finally {
      setProductSaving(false);
    }
  };

  const deleteProduct = async (id: number, title: string) => {
    if (!confirm(`Xoá sản phẩm "${title}"? Không thể hoàn tác.`)) return;
    const { error } = await (supabase as any).from("admin_products").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Đã xoá sản phẩm");
    await loadAdminProducts();
  };

  useEffect(() => {
    (async () => {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) { navigate({ to: "/auth" }); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userData.user.id);
      if (!roles?.some((r) => r.role === "admin")) {
        toast.error("Ban khong co quyen truy cap");
        navigate({ to: "/dashboard" });
        return;
      }
      await Promise.all([loadMembers(), loadAffiliatesBasic()]);
      setLoadedTabs(new Set(["members"]));
      setLoading(false);
    })();
  }, []);

  const switchTab = async (newTab: "members" | "orders" | "affiliates" | "products" | "promoCodes") => {
    setTab(newTab);
    setEditingProduct(null);
    if (loadedTabs.has(newTab)) return;
    setTabLoading(true);
    if (newTab === "orders") await Promise.all([loadOrders(), loadProductOrders()]);
    if (newTab === "affiliates") await loadAffiliates();
    if (newTab === "products") await loadAdminProducts();
    if (newTab === "promoCodes") await loadPromoCodes();
    setLoadedTabs(prev => new Set([...prev, newTab]));
    setTabLoading(false);
  };

  const updateStatus = async (m: Member, newStatus: "approved" | "rejected") => {
    const expires = newStatus === "approved" ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : null;
    const { error } = await supabase.from("profiles").update({ vip_status: newStatus, vip_expires_at: expires }).eq("id", m.id);
    if (error) { toast.error(error.message); return; }
    if (newStatus === "approved") {
      await supabase.from("user_roles").insert({ user_id: m.id, role: "vip" });
    } else {
      await supabase.from("user_roles").delete().eq("user_id", m.id).eq("role", "vip");
    }
    toast.success(newStatus === "approved" ? "Đã duyệt VIP" : "Đã từ chối");
    void loadMembers();
  };

  const approveMember = async (m: Member) => {
    const name = m.full_name || m.email.split("@")[0] || "affiliate";
    const code = name.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "").slice(0, 20) || "affiliate";
    let finalCode = code;
    const { data: existing } = await (supabase as any).from("affiliates").select("id").eq("ref_code", code).maybeSingle();
    if (existing) finalCode = code + Math.floor(Math.random() * 9000 + 1000);

    const { error } = await (supabase as any).from("affiliates").insert({
      user_id: m.id,
      ref_code: finalCode,
      full_name: m.full_name || "",
      email: m.email,
      phone: m.phone || "",
      commission_rate: 35,
      status: "active",
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`Đã duyệt ${m.full_name || m.email} thành Affiliate!`);
    notifyAffiliateApprovedServer({
      data: { toEmail: m.email, toName: m.full_name || m.email.split("@")[0], refCode: finalCode },
    }).catch(() => {});
    void loadAffiliatesBasic();
  };

  const deleteMember = async (m: Member) => {
    if (!confirm(`Xoá thành viên ${m.full_name || m.email}? Tất cả dữ liệu sẽ bị xoá vĩnh viễn.`)) return;
    const result = await deleteMemberServer({ data: { userId: m.id } });
    if (!result.ok) { toast.error("Xoá thất bại"); return; }
    toast.success("Đã xoá thành viên và toàn bộ dữ liệu");
    void loadMembers();
    void loadAffiliates();
  };

  const updateOrderStatus = async (o: Order, newStatus: "confirmed" | "cancelled") => {
    const { error } = await supabase.from("affiliate_orders").update({ status: newStatus }).eq("id", o.id);
    if (error) { toast.error(error.message); return; }
    toast.success(newStatus === "confirmed" ? "Đã xác nhận đơn hàng" : "Đã hủy đơn hàng");
    void loadOrders();
  };

  const filtered = members.filter((m) => filter === "all" || m.vip_status === filter);
  const filteredOrders = orders.filter((o) => orderFilter === "all" || o.status === orderFilter);
  const pendingOrders = orders.filter((o) => o.status === "pending").length;

  const getPeriodStart = () => {
    const now = new Date();
    if (timePeriod === "day") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (timePeriod === "week") { const d = new Date(now); d.setDate(d.getDate() - 6); return d; }
    if (timePeriod === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
    return new Date(0);
  };

  const periodStart = getPeriodStart();
  const filteredProductOrders = productOrders.filter(o => {
    const inPeriod = new Date(o.created_at) >= periodStart;
    if (orderFilter === "all") return inPeriod;
    return inPeriod && o.status === orderFilter;
  });
  const paidProductOrders = productOrders.filter(o => o.status === "paid" && new Date(o.created_at) >= periodStart);
  const totalRevenue = paidProductOrders.reduce((s, o) => s + (o.amount || 0), 0);
  const totalCommission = orders.filter(o => o.status === "confirmed" && new Date(o.created_at) >= periodStart).reduce((s, o) => s + (o.commission_amount || 0), 0);

  const startNewProduct = () => {
    const maxN = adminProducts.length > 0 ? Math.max(...adminProducts.map(p => p.n)) + 1 : 1;
    setEditingProduct({ ...EMPTY_PRODUCT, n: maxN, sort_order: adminProducts.length });
  };

  const generateAdminThumb = async (isEn: boolean): Promise<string> => {
    const title = (editingProduct?.title ?? "").trim() || (isEn ? "AI Digital Skill" : "Kỹ năng AI số");
    const desc = (editingProduct?.description ?? "").trim();
    const canvas = document.createElement("canvas");
    canvas.width = 1200; canvas.height = 630;
    const ctx = canvas.getContext("2d")!;
    const bgGrad = ctx.createLinearGradient(0, 0, 1200, 630);
    bgGrad.addColorStop(0, "#0f172a"); bgGrad.addColorStop(0.5, "#1a1f3a"); bgGrad.addColorStop(1, "#0f172a");
    ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, 1200, 630);
    ctx.strokeStyle = "rgba(255,255,255,0.035)"; ctx.lineWidth = 1;
    for (let x = 0; x < 1200; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 630); ctx.stroke(); }
    for (let y = 0; y < 630; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1200, y); ctx.stroke(); }
    const glow = ctx.createRadialGradient(1100, 80, 0, 1100, 80, 340);
    glow.addColorStop(0, "rgba(16,185,129,0.18)"); glow.addColorStop(1, "rgba(16,185,129,0)");
    ctx.fillStyle = glow; ctx.fillRect(600, 0, 600, 400);
    const barGrad = ctx.createLinearGradient(0, 0, 0, 630);
    barGrad.addColorStop(0, "#064e3b"); barGrad.addColorStop(0.5, "#059669"); barGrad.addColorStop(1, "#10b981");
    ctx.fillStyle = barGrad; ctx.fillRect(0, 0, 10, 630);
    const badgeText = isEn ? "🤖 AI DIGITAL SKILL" : "🤖 KỸ NĂNG AI SỐ";
    ctx.font = "bold 16px Arial, sans-serif";
    const badgeW = ctx.measureText(badgeText).width + 40;
    ctx.fillStyle = "rgba(16,185,129,0.18)";
    ctx.beginPath(); (ctx as any).roundRect(48, 44, badgeW, 36, 18); ctx.fill();
    ctx.fillStyle = "#059669"; ctx.fillText(badgeText, 68, 68);
    ctx.font = "bold 66px Arial, sans-serif"; ctx.fillStyle = "#ffffff";
    const words = title.split(" "); const lines: string[] = []; let cur = "";
    for (const w of words) {
      const test = cur ? cur + " " + w : w;
      if (ctx.measureText(test).width > 1100) { if (cur) lines.push(cur); cur = w; } else { cur = test; }
    }
    if (cur) lines.push(cur);
    const maxL = 3; const disp = lines.slice(0, maxL);
    if (lines.length > maxL) disp[maxL - 1] = disp[maxL - 1].replace(/.{0,3}$/, "…");
    const startY = disp.length === 1 ? 340 : disp.length === 2 ? 300 : 255;
    disp.forEach((line, i) => ctx.fillText(line, 48, startY + i * 82));
    if (desc && disp.length <= 2) {
      const shortDesc = desc.length > 110 ? desc.slice(0, 107) + "…" : desc;
      ctx.font = "22px Arial, sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillText(shortDesc, 48, startY + disp.length * 82 + 26);
    }
    ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(48, 563); ctx.lineTo(1152, 563); ctx.stroke();
    ctx.font = "bold 26px Arial, sans-serif"; ctx.fillStyle = "#059669";
    ctx.fillText(isEn ? "KIM AI" : "KIM AI", 48, 605);
    ctx.font = "18px Arial, sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.45)";
    const siteText = "sieuthisoai.com";
    ctx.fillText(siteText, 1152 - ctx.measureText(siteText).width, 605);
    return canvas.toDataURL("image/png").split(",")[1];
  };

  const buildSquareEnThumb = async (title: string, desc: string, _productN: number, bgUrl?: string | null): Promise<string> => {
    const W = 1080, H = 1080;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    // Dark navy base
    ctx.fillStyle = "#060a12"; ctx.fillRect(0, 0, W, H);

    if (bgUrl) {
      // Scale portrait to fit full width, center vertically
      // 20d97a55 is 768x1376 (9:16) with empty top half & MayA in bottom half
      // Centering → top half of canvas = empty dark bg (text area), bottom = MayA
      try {
        const img = new Image(); img.crossOrigin = "anonymous";
        await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(); img.src = bgUrl; setTimeout(rej, 8000); });
        const scale = W / img.width;
        const sw = W, sh = img.height * scale;
        ctx.drawImage(img, 0, (H - sh) / 2, sw, sh);
      } catch { /* dark base */ }
      // Light top gradient so text pops (blends with portrait's own dark navy top)
      const tg = ctx.createLinearGradient(0, 0, 0, H * 0.58);
      tg.addColorStop(0, "rgba(4,8,18,0.72)"); tg.addColorStop(0.5, "rgba(4,8,18,0.35)"); tg.addColorStop(1, "rgba(4,8,18,0)");
      ctx.fillStyle = tg; ctx.fillRect(0, 0, W, H * 0.58);
      // Bottom gradient
      const bg2 = ctx.createLinearGradient(0, H*0.8, 0, H);
      bg2.addColorStop(0,"rgba(4,8,18,0)"); bg2.addColorStop(1,"rgba(4,8,18,0.55)");
      ctx.fillStyle = bg2; ctx.fillRect(0, H*0.8, W, H*0.2);
    } else {
      // Dark tech fallback (no mascot)
      const tG = ctx.createLinearGradient(0,0,W,500); tG.addColorStop(0,"#071220"); tG.addColorStop(0.6,"#0f2240"); tG.addColorStop(1,"#0d1117");
      ctx.fillStyle = tG; ctx.fillRect(0,0,W,500);
      ctx.strokeStyle = "rgba(0,140,255,0.13)"; ctx.lineWidth = 1;
      for (let x=0;x<=W;x+=72){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,500);ctx.stroke();}
      for (let y=0;y<=500;y+=72){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
      const bG = ctx.createLinearGradient(0,480,0,H); bG.addColorStop(0,"rgba(13,17,23,0.5)"); bG.addColorStop(0.2,"rgba(13,17,23,0.97)"); bG.addColorStop(1,"#0d1117");
      ctx.fillStyle = bG; ctx.fillRect(0,480,W,H-480);
    }

    // Orange left accent bar
    const bar = ctx.createLinearGradient(0,0,0,H); bar.addColorStop(0,"#064e3b"); bar.addColorStop(0.5,"#059669"); bar.addColorStop(1, "#10b981");
    ctx.fillStyle = bar; ctx.fillRect(0,0,7,H);

    // HD badge top-right
    ctx.fillStyle = "#059669"; ctx.beginPath(); (ctx as any).roundRect(W-100,18,74,36,8); ctx.fill();
    ctx.font = "bold 20px Arial"; ctx.fillStyle = "white"; ctx.textAlign = "left"; ctx.fillText("HD", W-80, 42);

    // ── Large neon title at top — same style as VI thumbnails ──
    ctx.textAlign = "center"; ctx.font = "bold 94px Arial";
    const words = title.split(" "); const lines: string[] = []; let cur = "";
    for (const w of words) {
      const t = cur ? cur+" "+w : w;
      if (ctx.measureText(t).width > W - 80) { if (cur) lines.push(cur); cur = w; } else cur = t;
    }
    if (cur) lines.push(cur);
    const maxL = 3; const disp = lines.slice(0,maxL);
    if (lines.length>maxL) disp[maxL-1]=disp[maxL-1].replace(/.{0,3}$/,"…");
    const lineH = 104, startY = 110 + 94;
    disp.forEach((line, i) => {
      const y = startY + i * lineH;
      ctx.shadowColor = "#059669"; ctx.shadowBlur = 32;
      ctx.fillStyle = "#059669"; ctx.font = "bold 94px Arial"; ctx.fillText(line, W/2, y);
      ctx.shadowColor = "rgba(255,220,100,0.4)"; ctx.shadowBlur = 8;
      ctx.fillStyle = "rgba(255,255,255,0.15)"; ctx.fillText(line, W/2, y);
      ctx.shadowBlur = 0;
    });

    // Description below title
    if (desc) {
      const shortDesc = desc.length > 55 ? desc.slice(0,52)+"…" : desc;
      const descY = startY + disp.length * lineH + 22;
      ctx.font = "bold 34px Arial"; ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.shadowColor = "rgba(0,0,0,0.95)"; ctx.shadowBlur = 12;
      ctx.fillText(shortDesc, W/2, descY);
      ctx.shadowBlur = 0;
    }

    // Bottom branding
    ctx.textAlign = "left"; ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,0.1)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(20,1014); ctx.lineTo(W-20,1014); ctx.stroke();
    ctx.font = "bold 28px Arial"; ctx.fillStyle = "#059669"; ctx.fillText("AI MARKET",20,1050);
    ctx.fillStyle = "white"; ctx.fillText("PLACE",20+ctx.measureText("AI MARKET").width,1050);
    ctx.font = "18px Arial"; ctx.fillStyle = "rgba(255,255,255,0.45)";
    const site = "sieuthisoai.com"; ctx.fillText(site, W-20-ctx.measureText(site).width, 1050);
    return canvas.toDataURL("image/jpeg",0.92).split(",")[1];
  };

  const generateAllEnThumbnails = async () => {
    const toProcess = adminProducts.filter(p => p.is_active);
    setBatchGenerating(true);
    setBatchProgress({ current: 0, total: toProcess.length });
    let done = 0;
    for (const prod of toProcess) {
      const higgsfieldUrl = enThumbnailUrls[prod.n];
      if (!higgsfieldUrl) {
        done++;
        setBatchProgress({ current: done, total: toProcess.length });
        continue;
      }
      try {
        const result = await fetchAndStoreImageServer({
          data: {
            sourceUrl: higgsfieldUrl,
            storagePath: `products/en/product-${prod.n}-en.jpg`,
          },
        });
        if (result.ok && result.url) {
          await (supabase as any).from("admin_products").update({ thumbnail_url_en: result.url }).eq("id", prod.id);
          setAdminProducts(prev => prev.map(p => p.id === prod.id ? { ...p, thumbnail_url_en: result.url } : p));
        }
      } catch (err: any) {
        console.error(`SP #${prod.n} error:`, err.message);
      }
      done++;
      setBatchProgress({ current: done, total: toProcess.length });
      await new Promise(r => setTimeout(r, 200));
    }
    setBatchGenerating(false);
    setBatchProgress(null);
    toast.success(`Đã import xong ${done}/${toProcess.length} Higgsfield EN thumbnail!`);
  };

  const [skillBatchGenerating, setSkillBatchGenerating] = useState(false);
  const [skillBatchProgress, setSkillBatchProgress] = useState<{ current: number; total: number } | null>(null);

  const generateSkillEnThumbnails = async () => {
    const entries = Object.entries(skillEnThumbnailUrls);
    if (entries.length === 0) { toast.error("Không tìm thấy URL skill nào"); return; }
    setSkillBatchGenerating(true);
    setSkillBatchProgress({ current: 0, total: entries.length });
    let done = 0;
    for (const [productKey, higgsfieldUrl] of entries) {
      try {
        const result = await fetchAndStoreImageServer({
          data: { sourceUrl: higgsfieldUrl, storagePath: `products/en/skill-${productKey}-en.jpg` },
        });
        if (result.ok && result.url) {
          await updateMemberProductEnThumbServer({ data: { productKey, thumbnailUrlEn: result.url } });
        }
      } catch (err: any) {
        console.error(`Skill ${productKey} error:`, err.message);
      }
      done++;
      setSkillBatchProgress({ current: done, total: entries.length });
      await new Promise(r => setTimeout(r, 200));
    }
    setSkillBatchGenerating(false);
    setSkillBatchProgress(null);
    toast.success(`Đã import xong ${done}/${entries.length} Higgsfield EN thumbnail cho skill!`);
  };

  const pf = (field: keyof AdminProduct) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const val = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setEditingProduct(prev => prev ? { ...prev, [field]: field === "price_vnd" || field === "n" || field === "sort_order" ? Number(val) : val } : null);
  };

  return (
    <div className="min-h-screen bg-[oklch(0.99_0.01_60)]">
      <header className="sticky top-0 z-30 backdrop-blur bg-background/80 border-b border-border/60">
        <div className="mx-auto max-w-6xl px-5 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold hover:text-primary"><ArrowLeft className="w-4 h-4" /> Dashboard</Link>
          <span className="inline-flex items-center gap-2 font-bold"><Shield className="w-5 h-5 text-primary" /> Quản trị viên</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="flex flex-wrap gap-2 mb-6">
          <button onClick={() => switchTab("members")} className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition ${tab === "members" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
            <Users className="w-4 h-4" /> Thành viên ({members.length})
          </button>
          <button onClick={() => switchTab("orders")} className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition relative ${tab === "orders" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
            <ShoppingCart className="w-4 h-4" /> Don hang ({productOrders.length})
            {pendingOrders > 0 && <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold grid place-items-center">{pendingOrders}</span>}
          </button>
          <button onClick={() => switchTab("affiliates")} className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition ${tab === "affiliates" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
            <Link2 className="w-4 h-4" /> Affiliates ({affiliates.length})
          </button>
          <button onClick={() => switchTab("products")} className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition ${tab === "products" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
            <Package className="w-4 h-4" /> SP Sàn ({adminProducts.length})
          </button>
          <button onClick={() => switchTab("promoCodes")} className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition ${tab === "promoCodes" ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"}`}>
            🎁 Mã KM ({promoCodes.length})
          </button>
        </div>

        {loading || tabLoading ? (
          <div className="text-center text-muted-foreground py-10">Đang tải...</div>
        ) : tab === "members" ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <h1 className="text-2xl font-black">Danh sách thành viên</h1>
            </div>
            {members.length === 0 ? (
              <div className="text-center text-muted-foreground py-10 bg-background border border-border rounded-xl">Không có thành viên</div>
            ) : (
              <div className="overflow-x-auto bg-background border border-border rounded-xl">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="px-4 py-3">Họ tên</th>
                      <th className="px-4 py-3">Gmail</th>
                      <th className="px-4 py-3">SĐT</th>
                      <th className="px-4 py-3">STK ngân hàng</th>
                      <th className="px-4 py-3">Đăng ký</th>
                      <th className="px-4 py-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => (
                      <tr key={m.id} className="border-t border-border">
                        <td className="px-4 py-3 font-semibold">{m.full_name || "—"}</td>
                        <td className="px-4 py-3">{m.email}</td>
                        <td className="px-4 py-3 font-mono">{m.phone || "—"}</td>
                        <td className="px-4 py-3 text-xs">
                          {affiliateBankMap.get(m.id)?.bank_account ? (
                            <div>
                              <div className="font-bold">{affiliateBankMap.get(m.id)?.bank_account}</div>
                              <div className="text-muted-foreground">{affiliateBankMap.get(m.id)?.bank_owner || "—"}</div>
                              <div className="text-muted-foreground">{affiliateBankMap.get(m.id)?.bank_name || "—"}</div>
                            </div>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{new Date(m.created_at).toLocaleDateString("vi-VN")}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            {!affiliateUserIds.has(m.id) ? (
                              <button onClick={() => approveMember(m)} className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700">Duyệt</button>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold"><CheckCircle2 className="w-3.5 h-3.5" />Affiliate</span>
                            )}
                            <button onClick={() => deleteMember(m)} className="px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground text-xs font-semibold hover:opacity-90">Xoá</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : tab === "orders" ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h1 className="text-2xl font-black">Đơn hàng & Doanh thu</h1>
              <div className="flex gap-1 bg-muted p-1 rounded-lg text-sm">
                {(["day", "week", "month", "all"] as const).map((p) => (
                  <button key={p} onClick={() => setTimePeriod(p)} className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1 ${timePeriod === p ? "bg-background shadow" : "text-muted-foreground"}`}>
                    <Calendar className="w-3.5 h-3.5" />
                    {p === "day" ? "Hôm nay" : p === "week" ? "7 ngày" : p === "month" ? "Tháng này" : "Tất cả"}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="text-xs text-muted-foreground uppercase font-semibold mb-1">Tổng đơn</div>
                <div className="text-2xl font-black">{filteredProductOrders.length}</div>
              </div>
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="text-xs text-muted-foreground uppercase font-semibold mb-1">Đã thanh toán</div>
                <div className="text-2xl font-black text-emerald-600">{paidProductOrders.length}</div>
              </div>
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="text-xs text-muted-foreground uppercase font-semibold mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" />Doanh thu</div>
                <div className="text-xl font-black text-primary">{totalRevenue.toLocaleString("vi-VN")}đ</div>
              </div>
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="text-xs text-muted-foreground uppercase font-semibold mb-1 flex items-center gap-1"><DollarSign className="w-3 h-3" />Hoa hồng</div>
                <div className="text-xl font-black text-destructive">{totalCommission.toLocaleString("vi-VN")}đ</div>
              </div>
            </div>

            <div className="flex gap-1 bg-muted p-1 rounded-lg text-sm mb-4 w-fit">
              {(["all", "paid", "pending"] as const).map((f) => (
                <button key={f} onClick={() => setOrderFilter(f as any)} className={`px-3 py-1.5 rounded-md font-semibold ${orderFilter === f ? "bg-background shadow" : "text-muted-foreground"}`}>
                  {f === "all" ? "Tất cả" : f === "paid" ? "Đã thanh toán" : "Chờ thanh toán"}
                </button>
              ))}
            </div>

            {filteredProductOrders.length === 0 ? (
              <div className="text-center text-muted-foreground py-10 bg-background border border-border rounded-xl">Không có đơn hàng</div>
            ) : (
              <div className="overflow-x-auto bg-background border border-border rounded-xl">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="px-4 py-3">Mã đơn</th>
                      <th className="px-4 py-3">Sản phẩm</th>
                      <th className="px-4 py-3">Khách hàng</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3 text-right">Số tiền</th>
                      <th className="px-4 py-3">Ref</th>
                      <th className="px-4 py-3">Trạng thái</th>
                      <th className="px-4 py-3">Ngày</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProductOrders.map((o) => (
                      <tr key={o.id} className="border-t border-border hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono text-xs font-bold text-primary">{o.order_code}</td>
                        <td className="px-4 py-3 font-semibold max-w-[180px] truncate">{o.product_title || o.product_key}</td>
                        <td className="px-4 py-3">{o.customer_name || "—"}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{o.customer_email}</td>
                        <td className="px-4 py-3 text-right font-bold text-primary">{(o.amount || 0).toLocaleString("vi-VN")}đ</td>
                        <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{o.affiliate_ref || "—"}</td>
                        <td className="px-4 py-3">
                          {o.status === "paid" && <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-xs"><CheckCircle2 className="w-3.5 h-3.5" />Đã thanh toán</span>}
                          {o.status === "pending" && <span className="inline-flex items-center gap-1 text-amber-600 font-semibold text-xs"><Clock className="w-3.5 h-3.5" />Chờ TT</span>}
                          {o.status === "cancelled" && <span className="inline-flex items-center gap-1 text-destructive font-semibold text-xs"><XCircle className="w-3.5 h-3.5" />Hủy</span>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(o.created_at).toLocaleDateString("vi-VN")}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-border bg-muted/30">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 font-bold">Tổng ({paidProductOrders.length} đơn đã TT)</td>
                      <td className="px-4 py-3 text-right font-black text-primary text-base">{totalRevenue.toLocaleString("vi-VN")}đ</td>
                      <td colSpan={3} className="px-4 py-3 text-xs text-muted-foreground">Hoa hồng: <span className="font-bold text-destructive">{totalCommission.toLocaleString("vi-VN")}đ</span></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </>
        ) : tab === "affiliates" ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <h1 className="text-2xl font-black">Quan ly Affiliates</h1>
            </div>
            {affiliates.length === 0 ? (
              <div className="text-center text-muted-foreground py-10 bg-background border border-border rounded-xl">Chua co affiliate nao</div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4 mb-5">
                  <div className="rounded-xl border border-border bg-background p-5">
                    <div className="text-xs text-muted-foreground uppercase font-semibold">Tong Affiliates</div>
                    <div className="mt-2 text-2xl font-black">{affiliates.length}</div>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-5">
                    <div className="text-xs text-muted-foreground uppercase font-semibold">Tong Clicks</div>
                    <div className="mt-2 text-2xl font-black">{affiliates.reduce((s, a) => s + a.total_clicks, 0)}</div>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-5">
                    <div className="text-xs text-muted-foreground uppercase font-semibold">Tong Hoa hong</div>
                    <div className="mt-2 text-2xl font-black text-destructive">{affiliates.reduce((s, a) => s + a.total_commission, 0).toLocaleString("vi-VN")}d</div>
                  </div>
                </div>
                <div className="overflow-x-auto bg-background border border-border rounded-xl">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr className="text-left">
                        <th className="px-4 py-3">Ho ten</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">SDT</th>
                        <th className="px-4 py-3">Mã ref</th>
                        <th className="px-4 py-3">Link affiliate</th>
                        <th className="px-4 py-3">% Hoa hồng</th>
                        <th className="px-4 py-3">Clicks</th>
                        <th className="px-4 py-3">Đơn hàng</th>
                        <th className="px-4 py-3">Tổng hoa hồng</th>
                        <th className="px-4 py-3">Trạng thái</th>
                        <th className="px-4 py-3">Ngày ĐK</th>
                      </tr>
                    </thead>
                    <tbody>
                      {affiliates.map((a) => (
                        <tr key={a.id} className="border-t border-border">
                          <td className="px-4 py-3 font-semibold">{a.full_name || "—"}</td>
                          <td className="px-4 py-3">{a.email}</td>
                          <td className="px-4 py-3 font-mono">{a.phone || "—"}</td>
                          <td className="px-4 py-3 font-mono text-primary font-semibold">{a.ref_code}</td>
                          <td className="px-4 py-3 text-xs font-mono text-muted-foreground max-w-[200px] truncate">{window.location.origin}/?ref={a.ref_code}</td>
                          <td className="px-4 py-3 font-bold text-primary">{a.commission_rate}%</td>
                          <td className="px-4 py-3 font-bold">{a.total_clicks}</td>
                          <td className="px-4 py-3 font-bold">{a.total_orders}</td>
                          <td className="px-4 py-3 font-bold text-destructive">{a.total_commission.toLocaleString("vi-VN")}đ</td>
                          <td className="px-4 py-3">
                            {a.status === "active" && <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold"><CheckCircle2 className="w-4 h-4" />Active</span>}
                            {a.status === "inactive" && <span className="inline-flex items-center gap-1 text-destructive font-semibold"><XCircle className="w-4 h-4" />Inactive</span>}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{new Date(a.created_at).toLocaleDateString("vi-VN")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        ) : tab === "products" ? (
          /* ── SP SÀNN TAB ── */
          <>
            {/* Mascot setup section */}
            <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50 p-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {mascotUrl ? (
                    <img src={mascotUrl} alt="Mascot" className="w-14 h-14 rounded-lg object-cover border-2 border-violet-400 shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-violet-100 border-2 border-dashed border-violet-300 grid place-items-center text-2xl shrink-0">🤖</div>
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-violet-800">Người mẫu AI cho thumbnail EN</div>
                    <div className="text-xs text-violet-600">{mascotUrl ? "✅ Đã lưu mascot — sẵn sàng tạo thumbnail kiểu Higgsfield" : "⚠️ Chưa có — bấm lưu để dùng mascot AI đã generate"}</div>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    disabled={storingMascot}
                    onClick={async () => {
                      setStoringMascot(true);
                      try {
                        const result = await fetchAndStoreImageServer({ data: { sourceUrl: HIGGSFIELD_MASCOT, storagePath: "platform/mascot-en-v1.jpg" } });
                        if (result.ok && result.url) {
                          setMascotUrl(result.url);
                          localStorage.setItem("admin_mascot_url", result.url);
                          toast.success("Đã lưu mascot vào sàn!");
                        } else toast.error("Lỗi lưu mascot: " + (result as any).error);
                      } catch (e: any) { toast.error("Error: " + e.message); }
                      setStoringMascot(false);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition ${storingMascot ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-violet-600 text-white hover:bg-violet-500 cursor-pointer"}`}
                  >
                    {storingMascot ? "Đang lưu..." : "⬇️ Lưu mascot vào sàn"}
                  </button>
                  {mascotUrl && (
                    <button onClick={() => { setMascotUrl(null); localStorage.removeItem("admin_mascot_url"); }} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold bg-red-100 text-red-600 hover:bg-red-200 transition">
                      🗑 Xoá mascot
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h1 className="text-2xl font-black">Sản phẩm sàn ({adminProducts.length})</h1>
              <div className="flex gap-2 flex-wrap">
                {!editingProduct && !batchGenerating && (
                  <button
                    onClick={generateAllEnThumbnails}
                    className="inline-flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-violet-500 transition"
                    title="Import 28 EN thumbnail từ Higgsfield → Supabase"
                  >
                    🤖 Import Higgsfield EN thumbnail
                  </button>
                )}
                {batchGenerating && batchProgress && (
                  <div className="flex items-center gap-3 bg-violet-50 border border-violet-300 rounded-lg px-4 py-2">
                    <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-bold text-violet-700">Đang tạo {batchProgress.current}/{batchProgress.total}...</span>
                    <div className="w-24 h-2 bg-violet-200 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${(batchProgress.current/batchProgress.total)*100}%` }} />
                    </div>
                  </div>
                )}
                {!editingProduct && !skillBatchGenerating && (
                  <button
                    onClick={generateSkillEnThumbnails}
                    className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-500 transition"
                    title="Import Higgsfield EN thumbnail cho 15 Skill trong member_products"
                  >
                    🎓 Import Skill EN thumbnail
                  </button>
                )}
                {skillBatchGenerating && skillBatchProgress && (
                  <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-300 rounded-lg px-4 py-2">
                    <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-bold text-emerald-700">Skill {skillBatchProgress.current}/{skillBatchProgress.total}...</span>
                    <div className="w-24 h-2 bg-emerald-200 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(skillBatchProgress.current/skillBatchProgress.total)*100}%` }} />
                    </div>
                  </div>
                )}
                {!editingProduct && (
                  <button onClick={startNewProduct} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary/90 transition">
                    <Plus className="w-4 h-4" /> Thêm sản phẩm
                  </button>
                )}
              </div>
            </div>

            {/* Edit / Add form */}
            {editingProduct && (
              <div className="mb-6 bg-background border-2 border-primary/40 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-black text-base">{editingProduct.id ? `Sửa SP #${editingProduct.n}` : "Thêm sản phẩm mới"}</h2>
                  <button onClick={() => setEditingProduct(null)} className="p-1.5 rounded-lg hover:bg-muted transition"><X className="w-4 h-4" /></button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Tên sản phẩm *</label>
                    <input value={editingProduct.title ?? ""} onChange={pf("title")} className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder="Tên sản phẩm..." />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Mô tả</label>
                    <textarea value={editingProduct.description ?? ""} onChange={pf("description")} rows={2} className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" placeholder="Mô tả ngắn..." />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Số TT (n) *</label>
                    <input type="number" value={editingProduct.n ?? 0} onChange={pf("n")} className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" min={1} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Giá (VND)</label>
                    <input type="number" value={editingProduct.price_vnd ?? 0} onChange={pf("price_vnd")} className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" min={0} step={1000} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Code Format</label>
                    <input value={editingProduct.code_format ?? ""} onChange={pf("code_format")} className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono" placeholder="LOVA<SĐT>" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Code Ví dụ</label>
                    <input value={editingProduct.code_example ?? ""} onChange={pf("code_example")} className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono" placeholder="LOVA0982101088" />
                  </div>
                  {/* Thumbnail VI */}
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">🇻🇳 Thumbnail Tiếng Việt</label>
                    <div className="flex gap-3 items-start">
                      {editingProduct.thumbnail_url && (
                        <img src={editingProduct.thumbnail_url} alt="" className="w-20 h-20 rounded-lg object-cover border border-border shrink-0" />
                      )}
                      <div className="flex-1 space-y-1.5">
                        <input value={editingProduct.thumbnail_url ?? ""} onChange={pf("thumbnail_url")} className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder="https://... hoặc tải lên bên dưới" />
                        <div className="flex gap-2 flex-wrap">
                        <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${thumbUploading === "vi" ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary hover:bg-primary/20"}`}>
                          {thumbUploading === "vi" ? "Đang tải..." : "📁 Tải ảnh VI lên"}
                          <input type="file" accept="image/*" className="hidden" disabled={!!thumbUploading}
                            onChange={async (e) => {
                              const file = e.target.files?.[0]; if (!file) return;
                              setThumbUploading("vi");
                              try {
                                const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
                                const base64 = await new Promise<string>((res) => {
                                  const reader = new FileReader();
                                  reader.onload = () => res((reader.result as string).split(",")[1]);
                                  reader.readAsDataURL(file);
                                });
                                const result = await uploadProductImageServer({ data: { base64, ext, affiliateId: "admin-thumb", index: Date.now() } });
                                if (result.ok && result.url) setEditingProduct(p => p ? { ...p, thumbnail_url: result.url } : null);
                                else toast.error("Lỗi upload ảnh VI");
                              } catch { toast.error("Lỗi upload"); }
                              setThumbUploading(null);
                              e.target.value = "";
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          disabled={!!thumbGenerating || !editingProduct?.title?.trim()}
                          onClick={async () => {
                            setThumbGenerating("vi");
                            try {
                              const base64 = await buildSquareEnThumb(editingProduct?.title ?? "", editingProduct?.description ?? "", editingProduct?.n ?? 0, null);
                              const result = await uploadProductImageServer({ data: { base64, ext: "png", affiliateId: "admin-thumb", index: Date.now() } });
                              if (result.ok && result.url) {
                                setEditingProduct(p => p ? { ...p, thumbnail_url: result.url } : null);
                                toast.success("Đã tạo thumbnail VI tự động!");
                              } else toast.error("Lỗi tạo thumbnail");
                            } catch (err: any) { toast.error("Error: " + err.message); }
                            setThumbGenerating(null);
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${(thumbGenerating === "vi" || !editingProduct?.title?.trim()) ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-violet-100 text-violet-700 hover:bg-violet-200 cursor-pointer"}`}
                        >
                          {thumbGenerating === "vi" ? "Đang tạo..." : "🤖 Tự tạo VI"}
                        </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Thumbnail EN */}
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">🇬🇧 Thumbnail Tiếng Anh — tự chuyển khi khách chọn EN</label>
                    <div className="flex gap-3 items-start">
                      {editingProduct.thumbnail_url_en && (
                        <img src={editingProduct.thumbnail_url_en} alt="" className="w-20 h-20 rounded-lg object-cover border-2 border-blue-400 shrink-0" />
                      )}
                      <div className="flex-1 space-y-1.5">
                        <input value={editingProduct.thumbnail_url_en ?? ""} onChange={pf("thumbnail_url_en")} className="w-full rounded-lg border border-blue-300 bg-blue-50/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/40" placeholder="https://... hoặc tải ảnh EN lên" />
                        <div className="flex gap-2 flex-wrap">
                        <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${thumbUploading === "en" ? "bg-muted text-muted-foreground" : "bg-blue-100 text-blue-700 hover:bg-blue-200"}`}>
                          {thumbUploading === "en" ? "Đang tải..." : "📁 Tải ảnh EN lên"}
                          <input type="file" accept="image/*" className="hidden" disabled={!!thumbUploading}
                            onChange={async (e) => {
                              const file = e.target.files?.[0]; if (!file) return;
                              setThumbUploading("en");
                              try {
                                const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
                                const base64 = await new Promise<string>((res) => {
                                  const reader = new FileReader();
                                  reader.onload = () => res((reader.result as string).split(",")[1]);
                                  reader.readAsDataURL(file);
                                });
                                const result = await uploadProductImageServer({ data: { base64, ext, affiliateId: "admin-thumb-en", index: Date.now() } });
                                if (result.ok && result.url) setEditingProduct(p => p ? { ...p, thumbnail_url_en: result.url } : null);
                                else toast.error("Lỗi upload ảnh EN");
                              } catch { toast.error("Lỗi upload"); }
                              setThumbUploading(null);
                              e.target.value = "";
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          disabled={!!thumbGenerating || !editingProduct?.title?.trim()}
                          onClick={async () => {
                            setThumbGenerating("en");
                            try {
                              const enTitleSingle = apps.find(a => a.n === editingProduct?.n)?.titleEn || editingProduct?.title || "";
                              const enDescSingle = apps.find(a => a.n === editingProduct?.n)?.descEn || "";
                              const base64 = await buildSquareEnThumb(enTitleSingle, enDescSingle, editingProduct?.n ?? 0, mascotUrl);
                              const result = await uploadProductImageServer({ data: { base64, ext: "png", affiliateId: "admin-thumb-en", index: Date.now() } });
                              if (result.ok && result.url) {
                                setEditingProduct(p => p ? { ...p, thumbnail_url_en: result.url } : null);
                                toast.success("Đã tạo thumbnail EN tự động!");
                              } else toast.error("Lỗi tạo thumbnail EN");
                            } catch (err: any) { toast.error("Error: " + err.message); }
                            setThumbGenerating(null);
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${(thumbGenerating === "en" || !editingProduct?.title?.trim()) ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-violet-100 text-violet-700 hover:bg-violet-200 cursor-pointer"}`}
                        >
                          {thumbGenerating === "en" ? "Đang tạo..." : "🤖 Tự tạo EN"}
                        </button>
                        </div>
                        {!editingProduct.thumbnail_url_en && (
                          <p className="text-[10px] text-muted-foreground">Chưa có ảnh EN — sẽ dùng overlay chữ tiếng Anh trên ảnh VI</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Link sản phẩm (productUrl)</label>
                    <input value={editingProduct.product_url ?? ""} onChange={pf("product_url")} className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder="https://docs.google.com/..." />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Link xem trước (previewUrl)</label>
                    <input value={editingProduct.preview_url ?? ""} onChange={pf("preview_url")} className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder="https://youtu.be/..." />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Thứ tự hiển thị</label>
                    <input type="number" value={editingProduct.sort_order ?? 0} onChange={pf("sort_order")} className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" min={0} />
                  </div>
                  <div className="flex items-center gap-3 pt-5">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={editingProduct.is_active ?? true} onChange={(e) => setEditingProduct(p => p ? { ...p, is_active: e.target.checked } : null)} className="w-4 h-4 rounded" />
                      <span className="text-sm font-semibold">Hiển thị trên sàn</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 mt-5 pt-4 border-t border-border">
                  <button onClick={saveProduct} disabled={productSaving} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-primary/90 disabled:opacity-50 transition">
                    <Save className="w-4 h-4" /> {productSaving ? "Đang lưu..." : "Lưu"}
                  </button>
                  <button onClick={() => setEditingProduct(null)} className="px-5 py-2.5 rounded-lg text-sm font-bold bg-muted hover:bg-muted/80 transition">
                    Huỷ
                  </button>
                </div>
              </div>
            )}

            {adminProducts.length === 0 ? (
              <div className="text-center text-muted-foreground py-10 bg-background border border-border rounded-xl space-y-2">
                <p className="font-semibold">Chưa có sản phẩm nào trong DB</p>
                <p className="text-xs">Chạy SQL migration trong Supabase để import 28 sản phẩm</p>
              </div>
            ) : (
              <div className="overflow-x-auto bg-background border border-border rounded-xl">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="px-3 py-3 w-10 text-center">n</th>
                      <th className="px-3 py-3">Ảnh</th>
                      <th className="px-3 py-3">Tên sản phẩm</th>
                      <th className="px-3 py-3 text-right">Giá</th>
                      <th className="px-3 py-3 text-center">Hiển thị</th>
                      <th className="px-3 py-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminProducts.map((p) => {
                      const fallbackImg = apps.find(a => a.n === p.n)?.image as string | undefined;
                      const imgSrc = p.thumbnail_url || fallbackImg;
                      return (
                        <tr key={p.id} className={`border-t border-border hover:bg-muted/20 ${!p.is_active ? "opacity-50" : ""}`}>
                          <td className="px-3 py-2.5 text-center font-mono text-xs font-bold text-muted-foreground">{p.n}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1">
                              {imgSrc ? (
                                <img src={imgSrc} alt="" className="w-12 h-9 object-cover rounded-md" />
                              ) : (
                                <div className="w-12 h-9 rounded-md bg-muted grid place-items-center text-[10px] text-muted-foreground">No img</div>
                              )}
                              {p.thumbnail_url_en ? (
                                <span className="text-[10px] bg-blue-100 text-blue-600 px-1 py-0.5 rounded font-bold" title="Đã có EN thumbnail">🇬🇧</span>
                              ) : (
                                <span className="text-[10px] bg-muted text-muted-foreground px-1 py-0.5 rounded" title="Chưa có EN thumbnail">–</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 max-w-[320px]">
                            <div className="font-semibold text-xs leading-snug line-clamp-2">{p.title}</div>
                            <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">{p.code_format}</div>
                          </td>
                          <td className="px-3 py-2.5 text-right font-bold text-primary whitespace-nowrap">{p.price_vnd.toLocaleString("vi-VN")}đ</td>
                          <td className="px-3 py-2.5 text-center">
                            {p.is_active
                              ? <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                              : <XCircle className="w-4 h-4 text-muted-foreground mx-auto" />}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => setEditingProduct({ ...p })}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition"
                              >
                                <Pencil className="w-3 h-3" /> Sửa
                              </button>
                              <button
                                onClick={() => deleteProduct(p.id, p.title)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 transition"
                              >
                                <Trash2 className="w-3 h-3" /> Xoá
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : tab === "promoCodes" ? (
          /* ── PROMO CODES TAB ── */
          <>
            <div className="mb-5">
              <h1 className="text-2xl font-black mb-1">Mã khuyến mãi ({promoCodes.length})</h1>
              <p className="text-sm text-muted-foreground">Tạo mã để mở khoá sản phẩm miễn phí. Mỗi email chỉ dùng được 1 lần cho 1 sản phẩm.</p>
            </div>

            {/* Create / Edit form */}
            <div className="mb-6 bg-background border-2 border-emerald-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-black text-base text-emerald-700">{editingPromoId ? "Chỉnh sửa mã" : "Tạo mã mới"}</h2>
                {editingPromoId && (
                  <button onClick={() => { setEditingPromoId(null); setPromoForm({ code: "", productKey: "", maxUses: "", expiresAt: "", note: "", productUrl: "" }); }} className="text-xs text-muted-foreground hover:text-foreground transition">✕ Huỷ sửa</button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {!editingPromoId && (
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Mã khuyến mãi *</label>
                    <input
                      value={promoForm.code}
                      onChange={e => setPromoForm(f => ({ ...f, code: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                      placeholder="vd: THINHVUAAPP"
                    />
                  </div>
                )}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Product key (để trống = mọi SP)</label>
                  <input
                    value={promoForm.productKey}
                    onChange={e => setPromoForm(f => ({ ...f, productKey: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                    placeholder="vd: LOVA (để trống = tất cả)"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Số lần dùng tối đa (để trống = không giới hạn)</label>
                  <input
                    type="number"
                    value={promoForm.maxUses}
                    onChange={e => setPromoForm(f => ({ ...f, maxUses: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                    placeholder="vd: 100"
                    min={1}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Hết hạn (để trống = không giới hạn)</label>
                  <input
                    type="date"
                    value={promoForm.expiresAt}
                    onChange={e => setPromoForm(f => ({ ...f, expiresAt: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Link sản phẩm (hiển thị ở trang chủ)</label>
                  <input
                    value={promoForm.productUrl}
                    onChange={e => setPromoForm(f => ({ ...f, productUrl: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                    placeholder="https://sieuthisoai.com/san-pham?id=..."
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Ghi chú</label>
                  <input
                    value={promoForm.note}
                    onChange={e => setPromoForm(f => ({ ...f, note: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                    placeholder="Ghi chú nội bộ..."
                  />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <button
                  disabled={promoSaving || (!editingPromoId && !promoForm.code.trim())}
                  onClick={async () => {
                    setPromoSaving(true);
                    try {
                      let res: { ok: boolean; error?: string };
                      if (editingPromoId) {
                        res = await updatePromoCodeServer({
                          data: {
                            id: editingPromoId,
                            productKey: promoForm.productKey.trim() || null,
                            maxUses: promoForm.maxUses ? Number(promoForm.maxUses) : null,
                            expiresAt: promoForm.expiresAt || null,
                            note: promoForm.note.trim() || null,
                            productUrl: promoForm.productUrl.trim() || null,
                          },
                        });
                        if (res.ok) {
                          toast.success("Đã cập nhật mã");
                          setEditingPromoId(null);
                          setPromoForm({ code: "", productKey: "", maxUses: "", expiresAt: "", note: "", productUrl: "" });
                          await loadPromoCodes();
                        } else toast.error((res as any).error ?? "Lỗi cập nhật");
                      } else {
                        if (!promoForm.code.trim()) { toast.error("Nhập mã khuyến mãi"); setPromoSaving(false); return; }
                        res = await createPromoCodeServer({
                          data: {
                            code: promoForm.code.trim(),
                            productKey: promoForm.productKey.trim() || undefined,
                            maxUses: promoForm.maxUses ? Number(promoForm.maxUses) : undefined,
                            expiresAt: promoForm.expiresAt || undefined,
                            note: promoForm.note.trim() || undefined,
                            productUrl: promoForm.productUrl.trim() || undefined,
                          },
                        });
                        if (res.ok) {
                          toast.success("Đã tạo mã khuyến mãi");
                          setPromoForm({ code: "", productKey: "", maxUses: "", expiresAt: "", note: "", productUrl: "" });
                          await loadPromoCodes();
                        } else toast.error((res as any).error ?? "Lỗi tạo mã");
                      }
                    } catch { toast.error("Lỗi hệ thống"); }
                    setPromoSaving(false);
                  }}
                  className="inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 transition"
                >
                  <Plus className="w-4 h-4" /> {promoSaving ? "Đang lưu..." : editingPromoId ? "Lưu thay đổi" : "Tạo mã"}
                </button>
              </div>
            </div>

            {/* Table */}
            {promoCodes.length === 0 ? (
              <div className="text-center text-muted-foreground py-10 bg-background border border-border rounded-xl">
                Chưa có mã khuyến mãi nào
              </div>
            ) : (
              <div className="overflow-x-auto bg-background border border-border rounded-xl">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="px-4 py-3 font-semibold">Mã</th>
                      <th className="px-4 py-3 font-semibold">Product key</th>
                      <th className="px-4 py-3 font-semibold text-center">Đã dùng</th>
                      <th className="px-4 py-3 font-semibold text-center">Giới hạn</th>
                      <th className="px-4 py-3 font-semibold">Hết hạn</th>
                      <th className="px-4 py-3 font-semibold">Link SP</th>
                      <th className="px-4 py-3 font-semibold">Ghi chú</th>
                      <th className="px-4 py-3 font-semibold text-center">Trạng thái</th>
                      <th className="px-4 py-3 font-semibold text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {promoCodes.map(pc => (
                      <tr key={pc.id} className="border-t border-border hover:bg-muted/20">
                        <td className="px-4 py-3 font-mono font-bold text-emerald-700 uppercase">{pc.code}</td>
                        <td className="px-4 py-3 font-mono text-xs">{pc.product_key ?? <span className="text-muted-foreground italic">mọi SP</span>}</td>
                        <td className="px-4 py-3 text-center font-bold">{pc.used_count}</td>
                        <td className="px-4 py-3 text-center text-muted-foreground">{pc.max_uses ?? "∞"}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {pc.expires_at ? new Date(pc.expires_at).toLocaleDateString("vi-VN") : <span className="italic">Không giới hạn</span>}
                        </td>
                        <td className="px-4 py-3 text-xs max-w-[140px] truncate">
                          {pc.product_url
                            ? <a href={pc.product_url} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">🔗 Xem SP</a>
                            : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground max-w-[160px] truncate">{pc.note ?? "—"}</td>
                        <td className="px-4 py-3 text-center">
                          {pc.is_active
                            ? <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">Hoạt động</span>
                            : <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Tắt</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingPromoId(pc.id);
                                setPromoForm({
                                  code: pc.code,
                                  productKey: pc.product_key ?? "",
                                  maxUses: pc.max_uses?.toString() ?? "",
                                  expiresAt: pc.expires_at ? pc.expires_at.split("T")[0] : "",
                                  note: pc.note ?? "",
                                  productUrl: pc.product_url ?? "",
                                });
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-blue-100 text-blue-700 text-xs font-semibold hover:bg-blue-200 transition"
                            >
                              ✏️ Sửa
                            </button>
                            <button
                              onClick={async () => {
                                if (!confirm(`Xoá mã "${pc.code}"?`)) return;
                                const res = await deletePromoCodeServer({ data: { id: pc.id } });
                                if (res.ok) { toast.success("Đã xoá mã"); await loadPromoCodes(); }
                                else toast.error((res as any).error ?? "Lỗi xoá");
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 transition"
                            >
                              <Trash2 className="w-3 h-3" /> Xoá
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}
