// Shared affiliate creation + notification logic.
// Framework-agnostic (no "@/..." aliases, no TanStack/Nitro-specific imports) so it can be
// imported both from TanStack Start server functions (src/lib/payment-server-fns.ts) and
// from Nitro API routes (server/api/*.ts).

export function generateAffiliateRefCode(name: string, fallbackEmail: string): string {
  const namePart = name || fallbackEmail.split("@")[0] || "";
  const baseCode = namePart.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10) || "user";
  return baseCode + Math.floor(Math.random() * 9000 + 1000);
}

/**
 * Creates an active affiliate record for a buyer if one doesn't already exist.
 * Used by every purchase-triggered flow (PayPal, VND/SePay, promo code) — these are
 * verified paying customers, so they're auto-approved with no manual review step.
 * (Self-registered affiliates via /affiliate go through a separate "pending" + admin-approval
 * path instead — see approveAffiliateServer in payment-server-fns.ts.)
 */
export async function createAutoActiveAffiliate(
  supabase: any,
  email: string,
  name: string,
  referredBy?: string | null
): Promise<{ created: boolean; refCode: string; fullName: string }> {
  const { data: existingAff } = await supabase
    .from("affiliates")
    .select("id, ref_code, full_name")
    .eq("email", email)
    .maybeSingle();
  if (existingAff) {
    return { created: false, refCode: existingAff.ref_code, fullName: existingAff.full_name ?? "" };
  }

  const namePart = name || email.split("@")[0] || "";
  const refCode = generateAffiliateRefCode(name, email);

  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const matchedUser = authUsers?.users?.find((u: any) => u.email === email);

  const { error: createAffErr } = await supabase.from("affiliates").insert({
    user_id: matchedUser?.id || null,
    ref_code: refCode,
    full_name: namePart,
    email,
    phone: "",
    commission_rate: 35,
    status: "active",
    referred_by: referredBy || null,
  });
  if (createAffErr) {
    console.error("[createAutoActiveAffiliate] error:", createAffErr);
    throw createAffErr;
  }

  return { created: true, refCode, fullName: namePart };
}

/** Shared HTML email sent whenever an affiliate account becomes active (auto or admin-approved). */
export async function sendAffiliateApprovedEmail(
  gmailUser: string,
  gmailPass: string,
  toEmail: string,
  toName: string,
  refCode: string
): Promise<void> {
  if (!gmailUser || !gmailPass) return;

  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.default.createTransport({ service: "gmail", auth: { user: gmailUser, pass: gmailPass } });
  const affiliateLink = `https://kimai.vn/?ref=${refCode}`;

  try {
    await transporter.sendMail({
      from: `"Kim AI" <${gmailUser}>`,
      to: toEmail,
      subject: `🎉 Bạn đã được duyệt Affiliate thành công — Kim AI`,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:linear-gradient(135deg,#f97316,#ea580c);padding:24px;border-radius:12px 12px 0 0;text-align:center;">
          <h1 style="color:white;margin:0;font-size:22px;">🎉 CHÚC MỪNG!</h1>
          <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:15px;">Bạn đã được duyệt Affiliate thành công</p>
        </div>
        <div style="background:#fff;border:1px solid #eee;border-top:none;padding:24px;border-radius:0 0 12px 12px;">
          <p>Xin chào <b>${toName}</b>,</p>
          <p>Tài khoản Affiliate của bạn đã được <b style="color:#ea580c;">kích hoạt</b>.</p>
          <div style="background:#fff7ed;border:2px solid #fed7aa;border-radius:10px;padding:18px;margin:20px 0;text-align:center;">
            <p style="margin:0 0 6px;font-size:13px;color:#666;">🔗 Link Affiliate của bạn:</p>
            <p style="margin:0 0 14px;font-family:monospace;font-size:14px;font-weight:bold;color:#ea580c;word-break:break-all;">${affiliateLink}</p>
            <a href="${affiliateLink}" style="display:inline-block;background:#f97316;color:white;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:bold;font-size:15px;">👉 Lấy link & Kiếm tiền ngay</a>
          </div>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px;margin:16px 0;">
            <p style="margin:0 0 8px;font-weight:bold;color:#15803d;">📹 Video hướng dẫn sử dụng:</p>
            <a href="https://www.facebook.com/reel/1792526835066848" style="color:#15803d;font-weight:bold;">https://www.facebook.com/reel/1792526835066848</a>
          </div>
          <div style="text-align:center;margin:20px 0;">
            <a href="https://kimai.vn/affiliate-dashboard" style="display:inline-block;background:#1e293b;color:white;text-decoration:none;padding:11px 24px;border-radius:8px;font-size:14px;font-weight:bold;">📊 Vào Dashboard Affiliate</a>
          </div>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
          <p style="color:#888;font-size:12px;text-align:center;">© Kim AI<br>Hotline/Zalo: 0982101088</p>
        </div>
      </div>`,
    });
  } catch (e) {
    console.error("[sendAffiliateApprovedEmail] error:", e);
  }
}
