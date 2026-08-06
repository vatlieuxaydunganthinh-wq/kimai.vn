import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, GraduationCap, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { apps, skillEnTitles } from "@/lib/apps-data";

export const Route = createFileRoute("/skills")({
  head: () => ({ meta: [{ title: "Skill — Tất Cả Ngành Nghề | Siêu Thị Số AI" }] }),
  component: SkillsPage,
});

type Product = {
  key: string;
  title: string;
  titleEn: string | null;
  priceVnd: number;
  image: string | null;
  href: string;
  isAdmin: boolean;
};

function SkillsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const storedLang = typeof localStorage !== "undefined" ? localStorage.getItem("lang") ?? "vi" : "vi";

  useEffect(() => {
    (async () => {
      // Admin skills (từ apps-data)
      const adminSkills: Product[] = apps
        .filter((a) => a.title.toLowerCase().includes("skill"))
        .map((a) => ({
          key: `admin-${a.n}`,
          title: a.title,
          titleEn: a.titleEn ?? null,
          priceVnd: Number(a.priceVnd.replace(/\D/g, "")) || 0,
          image: a.image ?? null,
          href: `/san-pham?id=${a.n}`,
          isAdmin: true,
        }));

      // Community skills (từ member_products)
      const { data } = await (supabase as any)
        .from("member_products")
        .select("id,title,price_vnd,thumbnail_url,thumbnail_url_en,product_key,created_at")
        .ilike("title", "%skill%")
        .order("created_at", { ascending: false });

      const storedLang = typeof localStorage !== "undefined" ? localStorage.getItem("lang") ?? "vi" : "vi";
      const communitySkills: Product[] = (data ?? []).map((p: any) => {
        let image: string | null = null;
        try { const parsed = JSON.parse(p.thumbnail_url ?? ""); image = Array.isArray(parsed) ? parsed[0] ?? null : p.thumbnail_url; } catch { image = p.thumbnail_url; }
        const displayImage = storedLang === "en" && p.thumbnail_url_en ? p.thumbnail_url_en : image;
        return {
          key: `mp-${p.product_key}`,
          title: p.title,
          titleEn: skillEnTitles[p.product_key] ?? null,
          priceVnd: p.price_vnd,
          image: displayImage,
          href: `/san-pham?mp=${p.product_key}`,
          isAdmin: false,
        };
      });

      // Merge: community mới nhất trước, admin sau
      setProducts([...communitySkills, ...adminSkills]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-[oklch(0.97_0.005_60)]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-primary text-white shadow-md">
        <div className="px-3 sm:px-4 h-14 flex items-center gap-3">
          <button onClick={() => window.history.back()}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/15 hover:bg-white/25 px-3 py-1.5 text-sm font-semibold transition">
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </button>
          <div className="flex items-center gap-2 font-bold text-base">
            <GraduationCap className="w-5 h-5" />
            SKILL TẤT CẢ NGÀNH NGHỀ GÌ CŨNG CÓ
          </div>
        </div>
      </header>

      {/* Banner */}
      <div className="bg-gradient-to-r from-primary to-orange-400 px-4 py-5 text-center text-white">
        <h1 className="text-lg sm:text-2xl font-extrabold mb-1">🎓 KHO SKILL AI — MỌI NGÀNH NGHỀ</h1>
        <p className="text-sm text-white/85">Bộ kỹ năng AI chuyên sâu · Dễ học · Ứng dụng ngay · Kiếm tiền liền</p>
      </div>

      <main className="w-full px-1.5 sm:px-3 py-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Sparkles className="w-10 h-10 text-primary animate-pulse" />
            <p className="text-muted-foreground text-sm">Đang tải...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">Chưa có skill nào.</div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-3 px-1">{products.length} skill</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
              {products.map((p) => (
                <a key={p.key} href={p.href}
                  className="group border border-border rounded-xl overflow-hidden hover:shadow-lg hover:border-primary/40 transition-all bg-background">
                  {/* Image thumbnail */}
                  <div className="aspect-square overflow-hidden bg-muted relative">
                    {p.image ? (
                      <img src={p.image} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[oklch(0.3_0.08_280)] to-[oklch(0.2_0.05_260)] flex items-center justify-center">
                        <GraduationCap className="w-12 h-12 text-white/30" />
                      </div>
                    )}
                    {!p.isAdmin && (
                      <div className="absolute top-2 left-2 rounded-full bg-primary/90 text-primary-foreground text-[9px] font-bold px-2 py-0.5">Cộng đồng</div>
                    )}
                  </div>
                  {/* Info below image */}
                  <div className="p-2">
                    <p className="text-foreground text-xs sm:text-sm font-bold line-clamp-2 leading-snug mb-1.5">
                      {storedLang === "en" && p.titleEn ? p.titleEn : p.title}
                    </p>
                    <div className="text-primary font-bold text-sm">{p.priceVnd.toLocaleString("vi-VN")}đ</div>
                    <div className="mt-2 w-full py-1.5 bg-primary text-primary-foreground text-[10px] sm:text-xs font-bold rounded-lg text-center group-hover:opacity-90 transition">
                      {storedLang === "en" ? "View & Buy" : "Xem & Mua ngay"}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
