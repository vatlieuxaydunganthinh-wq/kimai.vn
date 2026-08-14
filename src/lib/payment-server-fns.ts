import { createServerFn } from "@tanstack/react-start";
import { createAutoActiveAffiliate, sendAffiliateApprovedEmail } from "./affiliate-shared";

// ── Shared helpers ────────────────────────────────────────────────────────────

async function autoCreateAffiliate(
  supabase: any,
  email: string,
  name: string,
  affiliateRef?: string | null
): Promise<void> {
  const result = await createAutoActiveAffiliate(supabase, email, name, affiliateRef).catch((e) => {
    console.error("[autoCreateAffiliate] error:", e);
    return null;
  });
  if (!result || !result.created) return;

  await sendAffiliateApprovedEmail(
    process.env.GMAIL_USER ?? "",
    process.env.GMAIL_APP_PASSWORD ?? "",
    email,
    result.fullName,
    result.refCode
  );
}

/**
 * Called right after a customer registers a regular account (src/routes/auth.tsx).
 * Locks in "who referred this person" (affiliates.referred_by) immediately at signup time,
 * instead of only at first purchase — so the lifetime referral survives even if the customer
 * switches device/browser or clears localStorage before they actually buy anything.
 * Every future purchase by this person then credits the referrer, no matter how long it takes.
 */
export const registerAffiliateOnSignupServer = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; name: string; affiliateRef?: string | null }) => data)
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = process.env.SUPABASE_URL ?? "";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    if (!supabaseUrl || !supabaseServiceKey) return { ok: false as const };

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const result = await createAutoActiveAffiliate(supabase, data.email, data.name, data.affiliateRef).catch((e) => {
      console.error("[registerAffiliateOnSignupServer] error:", e);
      return null;
    });
    if (!result || !result.created) return { ok: false as const };

    await sendAffiliateApprovedEmail(
      process.env.GMAIL_USER ?? "",
      process.env.GMAIL_APP_PASSWORD ?? "",
      data.email,
      result.fullName,
      result.refCode
    );
    return { ok: true as const };
  });

async function autoCreateCommission(
  supabase: any,
  customerEmail: string,
  customerName: string,
  affiliateRef: string | null | undefined,
  productTitle: string,
  amountVnd: number
): Promise<void> {
  if (amountVnd <= 0) return;
  const { data: buyerAff } = await supabase.from("affiliates").select("referred_by").eq("email", customerEmail).maybeSingle();
  const referrerCode = buyerAff?.referred_by || affiliateRef;
  if (!referrerCode) return;

  const { data: referrerAff } = await supabase.from("affiliates").select("id,commission_rate").eq("ref_code", referrerCode).maybeSingle();
  if (!referrerAff) return;

  const commissionAmount = Math.round(amountVnd * (referrerAff.commission_rate || 35) / 100);
  await supabase.from("affiliate_orders").insert({
    affiliate_id: referrerAff.id,
    customer_name: customerName || "",
    customer_email: customerEmail || "",
    customer_phone: "",
    product_title: productTitle,
    amount: String(amountVnd),
    commission_amount: commissionAmount,
    commission_status: "pending",
    status: "confirmed",
  });
}

// Generate a random order code: product code prefix + 4 random digits
function generateOrderCode(codePrefix: string): string {
  const digits = Math.floor(1000 + Math.random() * 9000).toString();
  return `${codePrefix}${digits}`;
}

// Create a new order in the database
export const createOrder = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      customerEmail: string;
      customerName: string;
      productKey: string;
      productTitle: string;
      codePrefix: string;
      amount: number;
      affiliateRef?: string;
      productUrl?: string;
    }) => data
  )
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");

    const supabaseUrl = process.env.SUPABASE_URL ?? "";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return { ok: false as const, error: "Server not configured" };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Reuse an existing pending order for the same customer + product instead of creating a
    // new one every time the payment modal is reopened/refreshed — otherwise a customer who
    // already has a QR code on screen (or already transferred money against it) ends up on a
    // brand new, unpaid order code and the payment they made never gets recognized.
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: existingPending } = await supabase
      .from("product_orders")
      .select("order_code")
      .eq("customer_email", data.customerEmail)
      .eq("product_key", data.productKey)
      .eq("status", "pending")
      .gte("created_at", oneHourAgo)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingPending) {
      return { ok: true as const, orderCode: existingPending.order_code };
    }

    // Generate unique order code with retry
    let orderCode = "";
    let attempts = 0;
    while (attempts < 5) {
      orderCode = generateOrderCode(data.codePrefix);
      const { data: existing } = await supabase
        .from("product_orders")
        .select("id")
        .eq("order_code", orderCode)
        .single();

      if (!existing) break;
      attempts++;
    }

    if (attempts >= 5) {
      return { ok: false as const, error: "Could not generate unique order code" };
    }

    const { error } = await supabase.from("product_orders").insert({
      order_code: orderCode,
      customer_email: data.customerEmail,
      customer_name: data.customerName,
      product_key: data.productKey,
      product_title: data.productTitle,
      amount: data.amount,
      affiliate_ref: data.affiliateRef ?? null,
      product_url: data.productUrl ?? null,
    });

    if (error) {
      console.error("[createOrder]", error);
      return { ok: false as const, error: error.message };
    }

    return { ok: true as const, orderCode };
  });

// Check order status by order_code
export const checkOrderStatus = createServerFn({ method: "POST" })
  .inputValidator((data: { orderCode: string }) => data)
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");

    const supabaseUrl = process.env.SUPABASE_URL ?? "";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return { status: "error" as const };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: order, error } = await supabase
      .from("product_orders")
      .select("status, paid_at")
      .eq("order_code", data.orderCode)
      .single();

    if (error || !order) {
      return { status: "error" as const };
    }

    return {
      status: order.status as "pending" | "paid" | "cancelled",
      paidAt: order.paid_at,
    };
  });

export const uploadAvatarServer = createServerFn({ method: "POST" })
  .inputValidator((data: { affiliateId: string; displayName: string; avatarBase64?: string; avatarExt?: string }) => data)
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = process.env.SUPABASE_URL ?? "";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    if (!supabaseUrl || !supabaseServiceKey) return { ok: false as const, error: "Server not configured" };

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    let avatarUrl: string | null = null;

    if (data.avatarBase64 && data.avatarExt) {
      const buffer = Buffer.from(data.avatarBase64, "base64");
      const path = `${data.affiliateId}.${data.avatarExt}`;
      const contentType = data.avatarExt === "png" ? "image/png" : data.avatarExt === "webp" ? "image/webp" : "image/jpeg";

      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, buffer, { upsert: true, contentType });

      if (uploadErr) return { ok: false as const, error: uploadErr.message };

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      avatarUrl = urlData.publicUrl + "?t=" + Date.now();
    }

    const updateData: Record<string, any> = { display_name: data.displayName };
    if (avatarUrl) updateData.avatar_url = avatarUrl;

    const { error } = await supabase.from("affiliates").update(updateData).eq("id", data.affiliateId);
    if (error) return { ok: false as const, error: error.message };

    return { ok: true as const, avatarUrl };
  });

export const getLeaderboardServer = createServerFn({ method: "POST" })
  .handler(async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = process.env.SUPABASE_URL ?? "";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    if (!supabaseUrl || !supabaseServiceKey) return [];

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data } = await supabase.rpc("get_leaderboard");
    if (!data || data.length === 0) return [];

    const ids = data.map((d: any) => d.affiliate_id);
    const { data: profiles } = await supabase
      .from("affiliates")
      .select("id, display_name, avatar_url")
      .in("id", ids);

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
    return data.map((d: any) => {
      const p = profileMap.get(d.affiliate_id);
      return { ...d, display_name: p?.display_name || null, avatar_url: p?.avatar_url || null };
    });
  });

export const notifyNewProductServer = createServerFn({ method: "POST" })
  .inputValidator((data: { productTitle: string; productKey: string; sellerName: string; priceVnd: number; thumbnailUrl?: string | null; productType?: "member" | "admin" }) => data)
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const nodemailer = await import("nodemailer");

    const supabaseUrl = process.env.SUPABASE_URL ?? "";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    const gmailUser = process.env.GMAIL_USER ?? "";
    const gmailPass = process.env.GMAIL_APP_PASSWORD ?? "";

    if (!supabaseUrl || !supabaseServiceKey || !gmailUser || !gmailPass) {
      return { ok: false as const, error: `Missing config: url=${!!supabaseUrl} key=${!!supabaseServiceKey} gmail=${!!gmailUser} pass=${!!gmailPass}` };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all members from profiles table (has email + full_name), exclude admin
    const { data: profilesData, error: profilesErr } = await supabase
      .from("profiles")
      .select("email, full_name")
      .neq("email", gmailUser)
      .not("email", "is", null)
      .limit(500);

    if (profilesErr) return { ok: false as const, error: "profiles error: " + profilesErr.message };

    const members = (profilesData ?? [])
      .filter((p: any) => p.email)
      .map((p: any) => ({
        email: p.email as string,
        name: p.full_name || (p.email as string).split("@")[0] || "Bạn",
      }));

    if (members.length === 0) return { ok: true as const, sent: 0 };

    // Parse first image from possibly JSON array thumbnail
    let imgSrc = data.thumbnailUrl ?? "";
    try {
      const parsed = JSON.parse(imgSrc);
      if (Array.isArray(parsed) && parsed[0]) imgSrc = parsed[0];
    } catch {}

    const productUrl = data.productType === "admin"
      ? `https://kimai.vn/san-pham?id=${data.productKey}`
      : `https://kimai.vn/san-pham?mp=${data.productKey}`;
    const imgBlock = imgSrc ? `<img src="${imgSrc}" alt="" style="width:100%;max-height:240px;object-fit:cover;border-radius:8px;margin-bottom:16px;">` : "";

    const transporter = nodemailer.default.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailPass },
    });

    const makeHtml = (memberName: string) => `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <div style="background:linear-gradient(135deg,#f97316,#ea580c);padding:20px;border-radius:12px 12px 0 0;text-align:center;">
              <h1 style="color:white;margin:0;font-size:22px;">🛍️ SẢN PHẨM MỚI TRÊN AnAn</h1>
            </div>
            <div style="background:#fff;border:1px solid #eee;border-top:none;padding:24px;border-radius:0 0 12px 12px;">
              <p>Xin chào <b>${memberName}</b>,</p>
              <p>Có sản phẩm số mới vừa được đăng lên nền tảng AnAn!</p>
              ${imgBlock}
              <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px;margin:16px 0;">
                <p style="margin:0 0 8px;font-size:18px;font-weight:bold;color:#ea580c;">${data.productTitle}</p>
                <p style="margin:0 0 4px;color:#666;">👤 Người bán: <b>${data.sellerName}</b></p>
                <p style="margin:0;color:#666;">💰 Giá: <b style="color:#ea580c;">${data.priceVnd.toLocaleString("vi-VN")}đ</b></p>
              </div>
              <div style="text-align:center;margin:24px 0;">
                <a href="${productUrl}" style="background:#f97316;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">👉 Xem & Mua ngay</a>
              </div>
              <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
              <p style="color:#888;font-size:12px;text-align:center;">
                © AnAn<br>Hotline/Zalo: 0982101088
              </p>
            </div>
          </div>`;

    // Gửi song song theo batch 10 email/lần — tránh timeout Vercel
    const BATCH = 10;
    let sent = 0;
    const list = members.slice(0, 200);
    for (let i = 0; i < list.length; i += BATCH) {
      const batch = list.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        batch.map((member) =>
          transporter.sendMail({
            from: `"AnAn" <${gmailUser}>`,
            to: member.email,
            subject: `🛍️ Sản phẩm mới vừa lên nền tảng: ${data.productTitle}`,
            html: makeHtml(member.name),
          })
        )
      );
      sent += results.filter((r) => r.status === "fulfilled").length;
    }
    return { ok: true as const, sent };
  });

/**
 * Returns the list of affiliates directly referred by the given ref_code (1 level only —
 * not a multi-level tree). Uses service role because affiliates RLS only allows reading
 * one's own row, not other people's rows by referred_by.
 */
export const getNetworkMembersServer = createServerFn({ method: "POST" })
  .inputValidator((data: { refCode: string; affiliateId: string }) => data)
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = process.env.SUPABASE_URL ?? "";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    if (!supabaseUrl || !supabaseServiceKey || !data.refCode) return { ok: false as const, members: [] };

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const [{ data: members, error }, { data: affOrders }] = await Promise.all([
      supabase
        .from("affiliates")
        .select("id, full_name, email, created_at")
        .eq("referred_by", data.refCode)
        .order("created_at", { ascending: false }),
      supabase
        .from("affiliate_orders")
        .select("customer_email, status")
        .eq("affiliate_id", data.affiliateId)
        .eq("status", "confirmed"),
    ]);

    if (error) return { ok: false as const, members: [] };

    const orderCountByEmail = new Map<string, number>();
    for (const o of affOrders ?? []) {
      const email = (o as any).customer_email as string;
      orderCountByEmail.set(email, (orderCountByEmail.get(email) || 0) + 1);
    }

    // Each network member may themselves be an affiliate with their own ref link —
    // count how many clicks their own link has gotten.
    const memberIds = (members ?? []).map((m: any) => m.id);
    const clickCountById = new Map<string, number>();
    if (memberIds.length > 0) {
      const { data: clicks } = await supabase
        .from("affiliate_clicks")
        .select("affiliate_id")
        .in("affiliate_id", memberIds);
      for (const c of clicks ?? []) {
        const id = (c as any).affiliate_id as string;
        clickCountById.set(id, (clickCountById.get(id) || 0) + 1);
      }
    }

    // Mask name + email server-side — never send full identifying info over the wire, even to a guessed ref_code.
    const masked = (members ?? []).map((m: any) => {
      const [user, domain] = String(m.email ?? "").split("@");
      const maskedEmail = user && domain ? `${user.slice(0, 1)}${"*".repeat(Math.max(user.length - 1, 3))}@${domain}` : "";
      const namePart = String(m.full_name ?? "").trim().split(/\s+/).pop() ?? "";
      const maskedName = namePart ? `${namePart.slice(0, 2)}***` : "";
      return {
        full_name: maskedName,
        email: maskedEmail,
        created_at: m.created_at,
        orderCount: orderCountByEmail.get(m.email) || 0,
        clickCount: clickCountById.get(m.id) || 0,
      };
    });
    return { ok: true as const, members: masked };
  });

export const approveAffiliateServer = createServerFn({ method: "POST" })
  .inputValidator((data: { affiliateId: string }) => data)
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = process.env.SUPABASE_URL ?? "";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    if (!supabaseUrl || !supabaseServiceKey) return { ok: false as const, error: "Server not configured" };

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: aff, error: fetchErr } = await supabase
      .from("affiliates")
      .select("id, email, full_name, ref_code")
      .eq("id", data.affiliateId)
      .maybeSingle();
    if (fetchErr || !aff) return { ok: false as const, error: fetchErr?.message ?? "Affiliate not found" };

    const { error: updateErr } = await supabase
      .from("affiliates")
      .update({ status: "active" })
      .eq("id", data.affiliateId);
    if (updateErr) return { ok: false as const, error: updateErr.message };

    return { ok: true as const, email: aff.email, name: aff.full_name ?? "", refCode: aff.ref_code };
  });

export const notifyAffiliateApprovedServer = createServerFn({ method: "POST" })
  .inputValidator((data: { toEmail: string; toName: string; refCode: string }) => data)
  .handler(async ({ data }) => {
    const nodemailer = await import("nodemailer");
    const gmailUser = process.env.GMAIL_USER ?? "";
    const gmailPass = process.env.GMAIL_APP_PASSWORD ?? "";
    if (!gmailUser || !gmailPass) return { ok: false as const };

    const affiliateLink = `https://sieuthisoai.com/?ref=${data.refCode}`;
    const dashboardLink = `https://sieuthisoai.com/affiliate-dashboard`;
    const videoLink = `https://www.facebook.com/reel/1792526835066848`;

    const transporter = nodemailer.default.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailPass },
    });

    try {
      await transporter.sendMail({
        from: `"AnAn" <${gmailUser}>`,
        to: data.toEmail,
        subject: `🎉 CHÚC MỪNG! Bạn đã được phê duyệt Link Affiliate — AnAn`,
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <div style="background:linear-gradient(135deg,#f97316,#ea580c);padding:24px;border-radius:12px 12px 0 0;text-align:center;">
            <h1 style="color:white;margin:0;font-size:22px;">🎉 CHÚC MỪNG!</h1>
            <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:16px;font-weight:bold;">BẠN ĐÃ ĐƯỢC PHÊ DUYỆT LINK AFFILIATE VÀ ĐĂNG SẢN PHẨM AI LÊN NỀN TẢNG</p>
          </div>
          <div style="background:#fff;border:1px solid #eee;border-top:none;padding:24px;border-radius:0 0 12px 12px;">
            <p>Xin chào <b>${data.toName}</b>,</p>
            <p style="font-size:16px;font-weight:bold;color:#ea580c;">HÃY BẮT ĐẦU AFFILIATE VÀ BÁN HÀNG ĐỂ KIẾM TIỀN TỪ NGÀY HÔM NAY NHÉ! 🚀</p>
            <p>Tài khoản Affiliate của bạn đã được <b style="color:#ea580c;">kích hoạt thành công</b> trên AnAn!</p>

            <div style="background:#fff7ed;border:2px solid #fed7aa;border-radius:10px;padding:18px;margin:20px 0;text-align:center;">
              <p style="margin:0 0 6px;font-size:13px;color:#666;">🔗 Link Affiliate của bạn:</p>
              <p style="margin:0 0 14px;font-family:monospace;font-size:14px;font-weight:bold;color:#ea580c;word-break:break-all;">${affiliateLink}</p>
              <a href="${affiliateLink}" style="display:inline-block;background:#f97316;color:white;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:bold;font-size:15px;">👉 Lấy link & Kiếm tiền ngay</a>
            </div>

            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px;margin:16px 0;">
              <p style="margin:0 0 8px;font-weight:bold;color:#15803d;">📹 Video hướng dẫn sử dụng:</p>
              <a href="${videoLink}" style="color:#15803d;font-weight:bold;">${videoLink}</a>
            </div>

            <div style="text-align:center;margin:20px 0;">
              <a href="${dashboardLink}" style="display:inline-block;background:#1e293b;color:white;text-decoration:none;padding:11px 24px;border-radius:8px;font-size:14px;font-weight:bold;">📊 Vào Dashboard Affiliate</a>
            </div>

            <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
            <p style="color:#888;font-size:12px;text-align:center;">
              © AnAn<br>Hotline/Zalo: 0982101088
            </p>
          </div>
        </div>`,
      });
      return { ok: true as const };
    } catch (e) {
      console.error("[notify-affiliate-approved] error:", e);
      return { ok: false as const };
    }
  });

export const uploadProductImageServer = createServerFn({ method: "POST" })
  .inputValidator((data: { base64: string; ext: string; affiliateId: string; index: number }) => data)
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = process.env.SUPABASE_URL ?? "";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    if (!supabaseUrl || !supabaseServiceKey) return { ok: false as const, error: "Server not configured" };

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const buffer = Buffer.from(data.base64, "base64");
    const path = `${data.affiliateId}/${Date.now()}_${data.index}.${data.ext}`;
    const contentType = data.ext === "png" ? "image/png" : data.ext === "webp" ? "image/webp" : "image/jpeg";

    const { error } = await supabase.storage
      .from("product-images")
      .upload(path, buffer, { upsert: false, contentType });

    if (error) return { ok: false as const, error: error.message };

    const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
    return { ok: true as const, url: urlData.publicUrl };
  });

// ── PAYPAL ──────────────────────────────────────────────────────────────
async function getPaypalAccessToken(): Promise<{ token: string | null; error?: string }> {
  const clientId = (process.env.PAYPAL_CLIENT_ID ?? "").trim();
  const secret = (process.env.PAYPAL_SECRET ?? "").trim();
  if (!clientId) return { token: null, error: "Missing PAYPAL_CLIENT_ID" };
  if (!secret) return { token: null, error: "Missing PAYPAL_SECRET" };
  // Debug: show last 6 chars to verify correct value loaded
  const dbg = `id:...${clientId.slice(-6)} sec:...${secret.slice(-6)} len:${clientId.length}/${secret.length}`;
  try {
    const res = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const data = await res.json();
    if (!data.access_token) return { token: null, error: `PayPal auth failed: ${data.error_description ?? data.error ?? "unknown"} [${dbg}]` };
    return { token: data.access_token as string };
  } catch (e: any) {
    return { token: null, error: `PayPal fetch error: ${e?.message ?? "unknown"}` };
  }
}

export const createPaypalOrder = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { productTitle: string; amountUsd: number; returnUrl: string; cancelUrl: string }) => data
  )
  .handler(async ({ data }) => {
    const { token, error: tokenError } = await getPaypalAccessToken();
    if (!token) return { ok: false as const, error: tokenError ?? "PayPal not configured" };

    const res = await fetch("https://api-m.paypal.com/v2/checkout/orders", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{ amount: { currency_code: "USD", value: data.amountUsd.toFixed(2) }, description: data.productTitle }],
        application_context: {
          brand_name: "AnAn",
          user_action: "PAY_NOW",
          return_url: data.returnUrl,
          cancel_url: data.cancelUrl,
        },
      }),
    });
    const order = await res.json();
    if (!order.id) return { ok: false as const, error: order.message ?? "Failed to create PayPal order" };

    const approvalLink = (order.links as any[])?.find((l: any) => l.rel === "approve");
    if (!approvalLink) return { ok: false as const, error: "No approval URL from PayPal" };

    return { ok: true as const, paypalOrderId: order.id as string, approvalUrl: approvalLink.href as string };
  });

export const capturePaypalOrder = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      paypalOrderId: string;
      customerEmail: string;
      customerName: string;
      productKey: string;
      productTitle: string;
      amountUsd: number;
      affiliateRef?: string;
      productUrl?: string;
    }) => data
  )
  .handler(async ({ data }) => {
    const { token, error: tokenError } = await getPaypalAccessToken();
    if (!token) return { ok: false as const, error: tokenError ?? "PayPal not configured" };

    const res = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${data.paypalOrderId}/capture`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    const capture = await res.json();
    if (capture.status !== "COMPLETED") return { ok: false as const, error: "Payment not completed" };

    // Record in Supabase
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(process.env.SUPABASE_URL ?? "", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "");
      const amountVnd = Math.round(data.amountUsd * 27000);
      await supabase.from("product_orders").insert({
        order_code: `PP-${data.paypalOrderId.slice(-8).toUpperCase()}`,
        customer_email: data.customerEmail,
        customer_name: data.customerName,
        product_key: data.productKey,
        product_title: data.productTitle,
        amount: amountVnd,
        affiliate_ref: data.affiliateRef ?? null,
        product_url: data.productUrl ?? null,
        status: "paid",
        paid_at: new Date().toISOString(),
      });

      // Auto-create affiliate + commission (same as VND/SePay webhook)
      await autoCreateAffiliate(supabase, data.customerEmail, data.customerName, data.affiliateRef);
      await autoCreateCommission(supabase, data.customerEmail, data.customerName, data.affiliateRef, data.productTitle, amountVnd);

      // Send confirmation email
      const nodemailer = await import("nodemailer");
      const gmailUser = process.env.GMAIL_USER ?? "";
      const gmailPass = process.env.GMAIL_APP_PASSWORD ?? "";
      if (gmailUser && gmailPass) {
        const transporter = nodemailer.default.createTransport({ service: "gmail", auth: { user: gmailUser, pass: gmailPass } });
        await transporter.sendMail({
          from: `"AnAn" <${gmailUser}>`,
          to: data.customerEmail,
          subject: `✅ Payment Confirmed – ${data.productTitle}`,
          html: `<div style="font-family:sans-serif;max-width:580px;margin:0 auto;padding:20px;">
            <div style="background:linear-gradient(135deg,#f97316,#ea580c);padding:24px;border-radius:12px 12px 0 0;text-align:center;">
              <h1 style="color:white;margin:0;font-size:22px;">✅ Payment Confirmed!</h1>
            </div>
            <div style="background:#fff;border:1px solid #eee;border-top:none;padding:24px;border-radius:0 0 12px 12px;">
              <p>Hi <b>${data.customerName}</b>,</p>
              <p>Thank you for your purchase. Your payment of <b>$${data.amountUsd.toFixed(2)} USD</b> has been confirmed.</p>
              <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px;margin:16px 0;">
                <p style="margin:0 0 8px;font-size:17px;font-weight:bold;color:#ea580c;">${data.productTitle}</p>
              </div>
              ${data.productUrl ? `<div style="text-align:center;margin:24px 0;"><a href="${data.productUrl}" style="background:#f97316;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">👉 Access Product</a></div>` : ""}
              <p style="color:#888;font-size:12px;">If you have any issues, contact us via Zalo: <b>0982101088</b> or reply to this email.</p>
              <hr style="border:none;border-top:1px solid #eee;margin:16px 0;">
              <p style="color:#aaa;font-size:11px;text-align:center;">© AnAn</p>
            </div>
          </div>`,
        });
      }
    } catch (e) {
      console.error("[capturePaypalOrder] DB/email error:", e);
    }

    return { ok: true as const };
  });

export const deleteMemberServer = createServerFn({ method: "POST" })
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = process.env.SUPABASE_URL ?? "";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    if (!supabaseUrl || !supabaseServiceKey) return { ok: false, error: "Server not configured" };

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    await supabase.from("affiliate_clicks").delete().eq("affiliate_id", data.userId);
    await supabase.from("affiliate_orders").delete().eq("affiliate_id", data.userId);
    await supabase.from("affiliates").delete().eq("user_id", data.userId);
    await supabase.from("user_roles").delete().eq("user_id", data.userId);
    await supabase.from("product_orders").delete().eq("customer_email", data.userId);
    await supabase.from("profiles").delete().eq("id", data.userId);
    await supabase.auth.admin.deleteUser(data.userId);

    return { ok: true };
  });

// ── PROMO CODES ─────────────────────────────────────────────────────────────

export const redeemPromoCode = createServerFn({ method: "POST" })
  .inputValidator((data: {
    code: string;
    email: string;
    name: string;
    productKey: string;
    productTitle: string;
    productUrl?: string;
    affiliateRef?: string;
  }) => data)
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(process.env.SUPABASE_URL ?? "", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "");
    const code = data.code.trim().toLowerCase();

    // 1. Check already used for this product
    const { data: existing } = await supabase
      .from("promo_code_uses")
      .select("id")
      .eq("email", data.email.toLowerCase().trim())
      .eq("product_key", data.productKey)
      .maybeSingle();
    if (existing) return { ok: false as const, error: "Mã KM: 1 lần/Gmail. Email này đã được dùng rồi." };

    // 2. Find promo code
    const { data: promo } = await supabase
      .from("promo_codes")
      .select("*")
      .eq("code", code)
      .eq("is_active", true)
      .maybeSingle();
    if (!promo) return { ok: false as const, error: "Mã khuyến mãi không hợp lệ hoặc đã hết hạn." };

    // 3. Check product scope (product_key OR product_url)
    if (promo.product_key && promo.product_key !== data.productKey) {
      return { ok: false as const, error: "Mã khuyến mãi không áp dụng cho sản phẩm này." };
    }

    // 3b. If product_url is set, restrict to that specific product
    if (promo.product_url) {
      try {
        const url = new URL(promo.product_url);
        const idParam = url.searchParams.get("id");
        const mpParam = url.searchParams.get("mp");
        if (mpParam) {
          if (data.productKey !== mpParam) {
            return { ok: false as const, error: "Mã này chỉ áp dụng cho một sản phẩm cụ thể." };
          }
        } else if (idParam) {
          const { data: prod } = await supabase
            .from("admin_products")
            .select("code_format")
            .eq("n", parseInt(idParam))
            .maybeSingle();
          if (prod) {
            const prefix = prod.code_format.split("<")[0].trim().toUpperCase();
            if (data.productKey !== prefix) {
              return { ok: false as const, error: "Mã này chỉ áp dụng cho một sản phẩm cụ thể." };
            }
          }
        }
      } catch {}
    }

    // 4. Check expiry
    if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
      return { ok: false as const, error: "Mã khuyến mãi đã hết hạn." };
    }

    // 5. Check max uses
    if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
      return { ok: false as const, error: "Mã khuyến mãi đã hết lượt sử dụng." };
    }

    // 6. Record use + increment count
    await supabase.from("promo_code_uses").insert({
      code,
      email: data.email.toLowerCase().trim(),
      product_key: data.productKey,
    });
    await supabase.from("promo_codes").update({ used_count: (promo.used_count ?? 0) + 1 }).eq("id", promo.id);

    // 7. Create paid order (amount = 0)
    const orderCode = `KM-${code.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    await supabase.from("product_orders").insert({
      order_code: orderCode,
      customer_email: data.email,
      customer_name: data.name,
      product_key: data.productKey,
      product_title: data.productTitle,
      amount: 0,
      status: "paid",
      paid_at: new Date().toISOString(),
      affiliate_ref: data.affiliateRef ?? null,
      product_url: data.productUrl ?? null,
    });

    // 8. Auto-create affiliate (same as VND/SePay webhook; no commission since amount=0)
    await autoCreateAffiliate(supabase, data.email, data.name, data.affiliateRef);

    // 9. Send confirmation email
    try {
      const nodemailer = await import("nodemailer");
      const gmailUser = process.env.GMAIL_USER ?? "";
      const gmailPass = process.env.GMAIL_APP_PASSWORD ?? "";
      if (gmailUser && gmailPass) {
        const transporter = nodemailer.default.createTransport({ service: "gmail", auth: { user: gmailUser, pass: gmailPass } });
        await transporter.sendMail({
          from: `"AnAn" <${gmailUser}>`,
          to: data.email,
          subject: `🎁 Mở khoá thành công — ${data.productTitle}`,
          html: `<div style="font-family:sans-serif;max-width:580px;margin:0 auto;padding:20px;">
            <div style="background:linear-gradient(135deg,#f97316,#ea580c);padding:24px;border-radius:12px 12px 0 0;text-align:center;">
              <h1 style="color:white;margin:0;font-size:22px;">🎁 Mở khoá thành công!</h1>
            </div>
            <div style="background:#fff;border:1px solid #eee;border-top:none;padding:24px;border-radius:0 0 12px 12px;">
              <p>Xin chào <b>${data.name}</b>,</p>
              <p>Bạn đã dùng mã khuyến mãi <b style="color:#ea580c;">${data.code.toUpperCase()}</b> để mở khoá sản phẩm:</p>
              <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px;margin:16px 0;">
                <p style="margin:0;font-size:17px;font-weight:bold;color:#ea580c;">${data.productTitle}</p>
              </div>
              ${data.productUrl ? `<div style="text-align:center;margin:24px 0;"><a href="${data.productUrl}" style="background:#f97316;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">👉 Truy cập sản phẩm ngay</a></div>` : ""}
              <p style="color:#888;font-size:12px;">Nếu có vấn đề, liên hệ Zalo: <b>0982101088</b></p>
              <hr style="border:none;border-top:1px solid #eee;margin:16px 0;">
              <p style="color:#aaa;font-size:11px;text-align:center;">© AnAn</p>
            </div>
          </div>`,
        });
      }
    } catch (e) {
      console.error("[redeemPromoCode] email error:", e);
    }

    return { ok: true as const, orderCode };
  });

export const getFeaturedPromoServer = createServerFn({ method: "POST" })
  .handler(async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(process.env.SUPABASE_URL ?? "", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "");
    const { data } = await supabase
      .from("promo_codes")
      .select("code,product_url,expires_at,max_uses,used_count")
      .eq("is_active", true)
      .not("product_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(1);
    if (!data || data.length === 0) return null;
    const p = data[0];
    if (p.expires_at && new Date(p.expires_at) < new Date()) return null;
    if (p.max_uses !== null && p.used_count >= p.max_uses) return null;
    return { code: p.code as string, product_url: p.product_url as string };
  });

export const listPromoCodesServer = createServerFn({ method: "POST" })
  .handler(async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(process.env.SUPABASE_URL ?? "", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "");
    const { data } = await supabase.from("promo_codes").select("*").order("created_at", { ascending: false });
    return data ?? [];
  });

export const createPromoCodeServer = createServerFn({ method: "POST" })
  .inputValidator((data: {
    code: string;
    productKey?: string;
    maxUses?: number;
    expiresAt?: string;
    note?: string;
    productUrl?: string;
  }) => data)
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(process.env.SUPABASE_URL ?? "", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "");
    const { error } = await supabase.from("promo_codes").insert({
      code: data.code.trim().toLowerCase(),
      product_key: data.productKey?.trim() || null,
      max_uses: data.maxUses || null,
      expires_at: data.expiresAt || null,
      note: data.note?.trim() || null,
      product_url: data.productUrl?.trim() || null,
    });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const deletePromoCodeServer = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(process.env.SUPABASE_URL ?? "", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "");
    const { error } = await supabase.from("promo_codes").delete().eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const updatePromoCodeServer = createServerFn({ method: "POST" })
  .inputValidator((data: {
    id: string;
    maxUses?: number | null;
    expiresAt?: string | null;
    note?: string | null;
    productUrl?: string | null;
    productKey?: string | null;
    isActive?: boolean;
  }) => data)
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(process.env.SUPABASE_URL ?? "", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "");
    const { error } = await supabase.from("promo_codes").update({
      max_uses: data.maxUses ?? null,
      expires_at: data.expiresAt || null,
      note: data.note?.trim() || null,
      product_url: data.productUrl?.trim() || null,
      product_key: data.productKey?.trim() || null,
      is_active: data.isActive ?? true,
    }).eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const fetchAndStoreImageServer = createServerFn({ method: "POST" })
  .inputValidator((data: { sourceUrl: string; storagePath: string }) => data)
  .handler(async ({ data }) => {
    const response = await fetch(data.sourceUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!response.ok) return { ok: false as const, error: `Fetch failed: ${response.status}` };
    const buffer = Buffer.from(await response.arrayBuffer());
    const ext = data.sourceUrl.toLowerCase().includes(".png") ? "png" : "jpg";
    const contentType = ext === "png" ? "image/png" : "image/jpeg";
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(process.env.SUPABASE_URL ?? "", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "");
    const { error } = await supabase.storage.from("product-images").upload(data.storagePath, buffer, { contentType, upsert: true });
    if (error) return { ok: false as const, error: error.message };
    const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(data.storagePath);
    return { ok: true as const, url: publicUrl };
  });

export const updateMemberProductEnThumbServer = createServerFn({ method: "POST" })
  .inputValidator((data: { productKey: string; thumbnailUrlEn: string }) => data)
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(process.env.SUPABASE_URL ?? "", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "");
    const { error } = await (supabase as any)
      .from("member_products")
      .update({ thumbnail_url_en: data.thumbnailUrlEn })
      .eq("product_key", data.productKey);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
