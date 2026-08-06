// Nitro API route: GET /api/check-commissions
// Chạy hàng ngày lúc 8h sáng (Vercel Cron)
// Tìm hoa hồng đủ 7 ngày → gửi email nhắc admin → đổi status = approved

import { defineEventHandler, getHeader } from "h3";
import { createClient } from "@supabase/supabase-js";
// @ts-ignore
import nodemailer from "nodemailer";

export default defineEventHandler(async (event) => {
  // Bảo vệ endpoint bằng Vercel cron secret
  const authHeader = getHeader(event, "authorization");
  const cronSecret = process.env.CRON_SECRET ?? "";
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return { success: false, message: "Unauthorized" };
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? "";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!supabaseUrl || !supabaseServiceKey) {
    return { success: false, message: "Missing env vars" };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Tìm hoa hồng pending đủ 7 ngày
  const sevenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();

  const { data: pendingOrders, error } = await supabase
    .from("affiliate_orders")
    .select("*, affiliates(full_name, email, bank_name, bank_account, bank_owner, ref_code)")
    .eq("commission_status", "pending")
    .lte("created_at", sevenDaysAgo);

  if (error) {
    console.error("[check-commissions] DB error:", error);
    return { success: false, message: error.message };
  }

  if (!pendingOrders || pendingOrders.length === 0) {
    console.log("[check-commissions] Không có hoa hồng nào cần thanh toán");
    return { success: true, message: "Không có hoa hồng đến hạn" };
  }

  // Gom nhóm theo affiliate
  const grouped: Record<string, {
    name: string;
    email: string;
    bank_name: string;
    bank_account: string;
    bank_owner: string;
    ref_code: string;
    total: number;
    orders: number;
    ids: string[];
  }> = {};

  for (const order of pendingOrders) {
    const aff = order.affiliates as any;
    const key = order.affiliate_id;
    if (!grouped[key]) {
      grouped[key] = {
        name: aff?.full_name ?? "—",
        email: aff?.email ?? "—",
        bank_name: aff?.bank_name ?? "Chưa cập nhật",
        bank_account: aff?.bank_account ?? "Chưa cập nhật",
        bank_owner: aff?.bank_owner ?? "Chưa cập nhật",
        ref_code: aff?.ref_code ?? "—",
        total: 0,
        orders: 0,
        ids: [],
      };
    }
    grouped[key].total += order.commission_amount ?? 0;
    grouped[key].orders += 1;
    grouped[key].ids.push(order.id);
  }

  const affiliateList = Object.values(grouped);
  const totalAmount = affiliateList.reduce((s, a) => s + a.total, 0);

  // Tạo bảng HTML
  const rows = affiliateList.map((a, i) => `
    <tr style="background:${i % 2 === 0 ? '#f9fafb' : '#fff'}">
      <td style="padding:10px 12px;border-bottom:1px solid #eee">${a.name}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee">${a.ref_code}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee">${a.bank_name}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee">${a.bank_account}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee">${a.bank_owner}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;color:#e94560">
        ${a.total.toLocaleString("vi-VN")}đ
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center">${a.orders}</td>
    </tr>
  `).join("");

  const html = `
    <div style="font-family:sans-serif;max-width:800px;margin:0 auto;padding:20px">
      <div style="background:linear-gradient(135deg,#e94560,#ff6b6b);padding:20px;border-radius:12px 12px 0 0;text-align:center">
        <h1 style="color:white;margin:0;font-size:22px">SIÊU THỊ SỐ AI — Nhắc Thanh Toán Hoa Hồng</h1>
      </div>
      <div style="background:#fff;border:1px solid #eee;border-top:none;padding:24px;border-radius:0 0 12px 12px">
        <div style="background:#fff7ed;border:2px solid #f97316;border-radius:8px;padding:16px;margin-bottom:20px;text-align:center">
          <p style="margin:0;font-size:16px">Có <b>${affiliateList.length} affiliate</b> cần thanh toán hoa hồng</p>
          <p style="margin:8px 0 0;font-size:22px;font-weight:bold;color:#e94560">
            Tổng: ${totalAmount.toLocaleString("vi-VN")}đ
          </p>
        </div>

        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <thead>
            <tr style="background:#f3f4f6">
              <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e5e7eb">Họ tên</th>
              <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e5e7eb">Ref code</th>
              <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e5e7eb">Ngân hàng</th>
              <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e5e7eb">STK</th>
              <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e5e7eb">Chủ TK</th>
              <th style="padding:10px 12px;text-align:right;border-bottom:2px solid #e5e7eb">Hoa hồng</th>
              <th style="padding:10px 12px;text-align:center;border-bottom:2px solid #e5e7eb">Đơn</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <div style="margin-top:20px;padding:16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px">
          <p style="margin:0;font-size:13px;color:#166534">
            ✅ Vui lòng chuyển khoản cho từng affiliate và đánh dấu đã thanh toán trong trang quản trị.
          </p>
          <p style="margin:8px 0 0;font-size:13px;color:#166534">
            👉 Trang quản trị: <a href="https://sieuthisoai.com/admin">sieuthisoai.com/admin</a>
          </p>
        </div>

        <hr style="margin:20px 0;border:none;border-top:1px solid #eee">
        <p style="color:#888;font-size:12px;text-align:center">
          Siêu Thị Số AI — Email tự động, không cần trả lời
        </p>
      </div>
    </div>
  `;

  // Gửi email cho admin
  const gmailUser = process.env.GMAIL_USER ?? "";
  const gmailPass = process.env.GMAIL_APP_PASSWORD ?? "";

  if (gmailUser && gmailPass) {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailPass },
    });
    try {
      await transporter.sendMail({
        from: `"Siêu Thị Số AI" <${gmailUser}>`,
        to: gmailUser,
        subject: `[NHẮC HOA HỒNG] ${affiliateList.length} affiliate - Tổng ${totalAmount.toLocaleString("vi-VN")}đ`,
        html,
      });
      console.log("[check-commissions] Email đã gửi đến admin");
    } catch (err) {
      console.error("[check-commissions] Gửi email lỗi:", err);
    }
  }

  // Đổi commission_status → approved
  const allIds = affiliateList.flatMap(a => a.ids);
  const { error: updateError } = await supabase
    .from("affiliate_orders")
    .update({ commission_status: "approved" })
    .in("id", allIds);

  if (updateError) {
    console.error("[check-commissions] Update status error:", updateError);
  }

  return {
    success: true,
    message: `Đã xử lý ${affiliateList.length} affiliate, tổng ${totalAmount.toLocaleString("vi-VN")}đ`,
    count: affiliateList.length,
    total: totalAmount,
  };
});
