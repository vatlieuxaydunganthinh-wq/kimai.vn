// Nitro API route: GET /api/publish-daily-skill
// Chạy hàng ngày lúc 8h sáng (Vercel Cron)
// Tự động kích hoạt (is_active = true) skill KIMAI tiếp theo trong hàng đợi (n >= 1000, đã xếp thứ tự kimai1 → kimai27)

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

  // Tìm skill KIMAI tiếp theo trong hàng đợi (chưa active), n từ 1000 trở lên, theo đúng thứ tự
  const { data: nextSkill, error } = await supabase
    .from("admin_products")
    .select("n, title, code_format, price_vnd, thumbnail_url")
    .eq("is_active", false)
    .gte("n", 1000)
    .lt("n", 2000)
    .order("n", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[publish-daily-skill] DB error:", error);
    return { success: false, message: error.message };
  }

  if (!nextSkill) {
    console.log("[publish-daily-skill] Hết hàng đợi skill, không còn skill nào để đăng");
    return { success: true, message: "Hàng đợi skill đã hết — không còn skill nào để tự động đăng" };
  }

  const { error: updateError } = await supabase
    .from("admin_products")
    .update({ is_active: true })
    .eq("n", nextSkill.n);

  if (updateError) {
    console.error("[publish-daily-skill] Update error:", updateError);
    return { success: false, message: updateError.message };
  }

  // Gửi email báo cho admin (không bắt buộc — bỏ qua nếu chưa cấu hình Gmail)
  const gmailUser = process.env.GMAIL_USER ?? "";
  const gmailPass = process.env.GMAIL_APP_PASSWORD ?? "";
  if (gmailUser && gmailPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: gmailUser, pass: gmailPass },
      });
      await transporter.sendMail({
        from: `"Kim AI" <${gmailUser}>`,
        to: gmailUser,
        subject: `🤖 Đã tự động đăng skill mới: ${nextSkill.title}`,
        html: `<p>Skill <b>${nextSkill.title}</b> (mã <b>${nextSkill.code_format}</b>) vừa được tự động kích hoạt lên kimai.vn lúc 8h sáng nay.</p>
               <p>Xem tại: <a href="https://kimai.vn/truy-cap-app">kimai.vn/truy-cap-app</a></p>`,
      });
    } catch (err) {
      console.error("[publish-daily-skill] Gửi email lỗi:", err);
    }
  }

  console.log(`[publish-daily-skill] Đã kích hoạt skill n=${nextSkill.n} (${nextSkill.title})`);

  // Thông báo cho toàn bộ thành viên có sản phẩm mới lên nền tảng
  if (gmailUser && gmailPass) {
    try {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("email, full_name")
        .neq("email", gmailUser)
        .not("email", "is", null)
        .limit(500);

      const members = (profilesData ?? [])
        .filter((p: any) => p.email)
        .map((p: any) => ({ email: p.email as string, name: p.full_name || (p.email as string).split("@")[0] || "Bạn" }));

      if (members.length > 0) {
        const productUrl = `https://kimai.vn/san-pham?id=${nextSkill.n}`;
        const imgBlock = nextSkill.thumbnail_url
          ? `<img src="${nextSkill.thumbnail_url}" alt="" style="width:100%;max-height:240px;object-fit:cover;border-radius:8px;margin-bottom:16px;">`
          : "";
        const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: gmailUser, pass: gmailPass } });
        const makeHtml = (memberName: string) => `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <div style="background:linear-gradient(135deg,#f97316,#ea580c);padding:20px;border-radius:12px 12px 0 0;text-align:center;">
            <h1 style="color:white;margin:0;font-size:22px;">🛍️ SẢN PHẨM MỚI TRÊN KIM AI</h1>
          </div>
          <div style="background:#fff;border:1px solid #eee;border-top:none;padding:24px;border-radius:0 0 12px 12px;">
            <p>Xin chào <b>${memberName}</b>,</p>
            <p>Có sản phẩm số mới vừa được đăng lên nền tảng Kim AI!</p>
            ${imgBlock}
            <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px;margin:16px 0;">
              <p style="margin:0 0 8px;font-size:18px;font-weight:bold;color:#ea580c;">${nextSkill.title}</p>
              <p style="margin:0 0 4px;color:#666;">👤 Người bán: <b>KIM AI</b></p>
              <p style="margin:0;color:#666;">💰 Giá: <b style="color:#ea580c;">${Number(nextSkill.price_vnd).toLocaleString("vi-VN")}đ</b></p>
            </div>
            <div style="text-align:center;margin:24px 0;">
              <a href="${productUrl}" style="background:#f97316;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">👉 Xem & Mua ngay</a>
            </div>
            <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
            <p style="color:#888;font-size:12px;text-align:center;">© Kim AI<br>Hotline/Zalo: 0982101088</p>
          </div>
        </div>`;

        const BATCH = 10;
        const list = members.slice(0, 200);
        for (let i = 0; i < list.length; i += BATCH) {
          const batch = list.slice(i, i + BATCH);
          await Promise.allSettled(
            batch.map((member) =>
              transporter.sendMail({
                from: `"Kim AI" <${gmailUser}>`,
                to: member.email,
                subject: `🛍️ Sản phẩm mới vừa lên nền tảng: ${nextSkill.title}`,
                html: makeHtml(member.name),
              })
            )
          );
        }
        console.log(`[publish-daily-skill] Đã gửi mail thông báo cho ${list.length} thành viên`);
      }
    } catch (err) {
      console.error("[publish-daily-skill] Gửi mail thông báo thành viên lỗi:", err);
    }
  }

  return {
    success: true,
    message: `Đã tự động đăng: ${nextSkill.title}`,
    n: nextSkill.n,
    code: nextSkill.code_format,
  };
});
