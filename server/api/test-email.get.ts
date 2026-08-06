import { defineEventHandler } from "h3";

export default defineEventHandler(async () => {
  const gmailUser = process.env.GMAIL_USER ?? "";
  const gmailPass = process.env.GMAIL_APP_PASSWORD ?? "";
  const supabaseUrl = process.env.SUPABASE_URL ?? "";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!gmailUser || !gmailPass) {
    return { ok: false, error: "GMAIL_USER or GMAIL_APP_PASSWORD not set in environment" };
  }

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: profilesData, error: profilesErr } = await supabase
      .from("profiles")
      .select("email, full_name")
      .neq("email", gmailUser)
      .not("email", "is", null)
      .limit(500);
    if (profilesErr) return { ok: false, error: "profiles: " + profilesErr.message, gmailUser, gmailConfigured: true };

    const memberCount = (profilesData ?? []).filter((p: any) => p.email).length;

    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({ service: "gmail", auth: { user: gmailUser, pass: gmailPass } });

    await transporter.sendMail({
      from: `"Siêu Thị Số AI Test" <${gmailUser}>`,
      to: gmailUser,
      subject: "✅ Test email thông báo SP mới - Siêu Thị Số AI",
      html: `<p>Email test hoạt động! Tìm thấy ${memberCount} thành viên trong bảng profiles (trừ admin).</p>`,
    });

    return { ok: true, gmailUser, totalUsers: memberCount, message: "Email test sent to " + gmailUser };
  } catch (e: any) {
    return { ok: false, gmailUser, error: e.message };
  }
});
