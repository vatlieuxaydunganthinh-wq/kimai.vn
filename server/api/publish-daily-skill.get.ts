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
    .select("n, title, code_format")
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

  return {
    success: true,
    message: `Đã tự động đăng: ${nextSkill.title}`,
    n: nextSkill.n,
    code: nextSkill.code_format,
  };
});
