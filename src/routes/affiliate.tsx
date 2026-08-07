import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Users, Loader2, TrendingUp, DollarSign, MousePointerClick, Sun, Moon, Globe } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { notifyAffiliateApprovedServer } from "@/lib/payment-server-fns";

export const Route = createFileRoute("/affiliate")({
  head: () => ({
    meta: [
      { title: "Affiliate Registration — KIM AI" },
      { name: "description", content: "Register as an Affiliate of KIM AI. Share links, earn 35% commission per order." },
    ],
  }),
  component: AffiliatePage,
});

function isGmail(email: string) {
  return /^[a-z0-9._%+-]+@gmail\.com$/i.test(email.trim());
}

function isPhone(phone: string) {
  return /^0\d{9,10}$/.test(phone.trim());
}

function AffiliatePage() {
  const navigate = useNavigate();
  const { lang, setLang, t } = useLanguage();
  const [tab, setTab] = useState<"login" | "register">("register");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [refCode, setRefCode] = useState("");
  const [darkMode, setDarkMode] = useState(false);

  const toggleDark = () => {
    setDarkMode((v) => {
      document.documentElement.classList.toggle("dark", !v);
      return !v;
    });
  };

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data, error }) => {
      if (!error && data.user) {
        const { data: aff } = await (supabase as any).from("affiliates").select("id").eq("user_id", data.user.id).maybeSingle();
        if (aff) {
          navigate({ to: "/affiliate-dashboard" });
        }
      }
      setCheckingAuth(false);
    });
  }, [navigate]);

  const handleGoogle = () => {
    setLoading(true);
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const redirectTo = encodeURIComponent(`${window.location.origin}/affiliate-dashboard`);
    window.location.href = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${redirectTo}`;
  };

  const generateRefCode = (name: string) => {
    return name
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 20) || "affiliate";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isGmail(email)) {
      toast.error(t("Bắt buộc dùng địa chỉ Gmail (@gmail.com)", "Must use a Gmail address (@gmail.com)"));
      return;
    }
    setLoading(true);
    try {
      if (tab === "register") {
        if (!fullName.trim()) { toast.error(t("Nhập họ và tên", "Enter your full name")); setLoading(false); return; }
        if (!isPhone(phone)) { toast.error(t("Số điện thoại không hợp lệ", "Invalid phone number")); setLoading(false); return; }
        if (password.length < 6) { toast.error(t("Mật khẩu tối thiểu 6 ký tự", "Password must be at least 6 characters")); setLoading(false); return; }

        const code = refCode.trim() || generateRefCode(fullName);

        const { data: existingCode } = await (supabase as any).from("affiliates").select("id").eq("ref_code", code).maybeSingle();
        if (existingCode) {
          toast.error(t("Mã giới thiệu này đã tồn tại, vui lòng chọn mã khác", "This referral code already exists, please choose another"));
          setLoading(false);
          return;
        }

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/affiliate-dashboard`,
            data: { full_name: fullName.trim(), phone: phone.trim() },
          },
        });

        if (signUpError) {
          if (signUpError.message.toLowerCase().includes("already registered") || signUpError.message.toLowerCase().includes("already exists")) {
            toast.error(t("Gmail này đã đăng ký. Hãy đăng nhập.", "This Gmail is already registered. Please login."));
            setTab("login");
          } else {
            toast.error(signUpError.message);
          }
          setLoading(false);
          return;
        }

        if (signUpData.user) {
          const { error: affError } = await (supabase as any).from("affiliates").insert({
            user_id: signUpData.user.id,
            ref_code: code,
            full_name: fullName.trim(),
            email: email.trim(),
            phone: phone.trim(),
            commission_rate: 35,
            status: "active",
          });

          if (affError) {
            console.error("Affiliate insert error:", affError);
            toast.error(t("Tạo tài khoản affiliate thất bại: ", "Failed to create affiliate account: ") + affError.message);
            setLoading(false);
            return;
          }
        }

        toast.success(t("Đăng ký thành công! Đang vào dashboard...", "Registration successful! Redirecting to dashboard..."));
        notifyAffiliateApprovedServer({
          data: { toEmail: email.trim(), toName: fullName.trim() || email.split("@")[0], refCode: code },
        }).catch(() => {});
        navigate({ to: "/affiliate-dashboard" });
      } else {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) {
          if (signInError.message.toLowerCase().includes("invalid login")) {
            toast.error(t("Sai email hoặc mật khẩu", "Incorrect email or password"));
          } else {
            toast.error(signInError.message);
          }
          setLoading(false);
          return;
        }

        if (signInData.user) {
          const { data: aff } = await (supabase as any).from("affiliates").select("id").eq("user_id", signInData.user.id).maybeSingle();
          if (!aff) {
            toast.error(t("Tài khoản này chưa đăng ký Affiliate. Vui lòng đăng ký trước.", "This account hasn't registered as Affiliate. Please register first."));
            setTab("register");
            setLoading(false);
            return;
          }
        }

        toast.success(t("Đăng nhập thành công!", "Login successful!"));
        navigate({ to: "/affiliate-dashboard" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("Có lỗi xảy ra", "An error occurred");
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">{t("Đang tải...", "Loading...")}</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/80 border-b border-border/60">
        <div className="mx-auto max-w-5xl px-5 h-16 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-accent transition">
            <ArrowLeft className="w-4 h-4" /> {t("Quay lại", "Back")}
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg hidden sm:inline">KIM <span className="text-primary">AI</span></span>
            <button
              onClick={() => setLang(lang === "vi" ? "en" : "vi")}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-bold hover:bg-accent transition"
            >
              <Globe className="w-3.5 h-3.5" /> {lang === "vi" ? "EN" : "VI"}
            </button>
            <button onClick={toggleDark} className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-border bg-background hover:bg-accent transition">
              {darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-10 space-y-8">
        <section className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-1.5 text-sm font-semibold text-primary">
            <Users className="w-4 h-4" /> {t("Chương trình Affiliate", "Affiliate Program")}
          </div>
          <h1 className="text-3xl md:text-4xl font-black">
            {t("Kiếm tiền cùng", "Earn with")} <span className="text-primary">KIM AI</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {t(
              "Chia sẻ link giới thiệu sản phẩm, nhận hoa hồng cho mỗi đơn hàng thành công. Theo dõi chi tiết trên dashboard cá nhân.",
              "Share product referral links and earn commissions on every successful order. Track everything on your personal dashboard."
            )}
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: DollarSign, title: t("Hoa hồng 35%", "35% Commission"), desc: t("Nhận 35% hoa hồng cho mỗi đơn hàng thành công qua link giới thiệu của bạn.", "Earn 35% commission for every successful order through your referral link.") },
            { icon: MousePointerClick, title: t("Theo dõi clicks", "Track Clicks"), desc: t("Theo dõi số lượt click, đơn hàng và hoa hồng chi tiết trên dashboard.", "Track clicks, orders and commissions in detail on your dashboard.") },
            { icon: TrendingUp, title: t("Thu nhập thụ động", "Passive Income"), desc: t("Chỉ cần chia sẻ link, hệ thống tự động theo dõi và tính hoa hồng cho bạn.", "Just share your link, the system automatically tracks and calculates commissions.") },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 grid place-items-center">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="font-bold text-sm">{title}</div>
                <div className="text-xs text-muted-foreground mt-1">{desc}</div>
              </div>
            </div>
          ))}
        </div>

        <section className="rounded-2xl bg-card border border-border p-6 md:p-8">
          <div className="flex gap-2 p-1 bg-muted rounded-lg w-full max-w-sm mx-auto">
            <button type="button" onClick={() => setTab("register")} className={`flex-1 py-2 text-sm font-semibold rounded-md transition ${tab === "register" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-white"}`}>
              {t("Đăng ký Affiliate", "Register Affiliate")}
            </button>
            <button type="button" onClick={() => setTab("login")} className={`flex-1 py-2 text-sm font-semibold rounded-md transition ${tab === "login" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-white"}`}>
              {t("Đăng nhập", "Login")}
            </button>
          </div>

          <button type="button" onClick={handleGoogle} disabled={loading} className="mt-6 max-w-sm mx-auto w-full flex items-center justify-center gap-3 rounded-lg border border-border bg-background py-3 text-sm font-semibold hover:bg-accent transition disabled:opacity-50">
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            {t("Tiếp tục với Google", "Continue with Google")}
          </button>

          <div className="mt-5 max-w-sm mx-auto flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex-1 h-px bg-white/10" /> {t("hoặc dùng Gmail", "or use Gmail")} <span className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={handleSubmit} className="mt-5 max-w-sm mx-auto space-y-4">
            {tab === "register" && (
              <>
                <div>
                  <label className="text-sm font-semibold text-foreground">{t("Họ và tên", "Full Name")}</label>
                  <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder={t("Nguyễn Văn A", "John Doe")} />
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground">{t("Số điện thoại", "Phone Number")}</label>
                  <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder="0982101088" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground">
                    {t("Mã giới thiệu", "Referral Code")} <span className="text-xs text-primary">({t("link của bạn: .../?ref=mã_này", "your link: .../?ref=your_code")})</span>
                  </label>
                  <input type="text" value={refCode} onChange={(e) => setRefCode(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))} className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder={t("vd: thinhvuaapp (để trống sẽ tự tạo)", "e.g. myname (auto-generated if empty)")} />
                </div>
              </>
            )}
            <div>
              <label className="text-sm font-semibold text-foreground">Gmail <span className="text-xs text-primary">({t("bắt buộc @gmail.com", "must be @gmail.com")})</span></label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder="you@gmail.com" />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground">{t("Mật khẩu", "Password")}</label>
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder="••••••" />
            </div>
            <button type="submit" disabled={loading} className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground font-bold py-3 hover:bg-primary/90 disabled:opacity-50 transition">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {tab === "login" ? t("Đăng nhập", "Login") : t("Đăng ký Affiliate", "Register as Affiliate")}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
