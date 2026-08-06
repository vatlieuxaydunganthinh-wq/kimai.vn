-- ============================================================
-- AI DIGITAL SUPERMARKET — Database Migration
-- Chạy toàn bộ file này trong Supabase SQL Editor
-- ============================================================

-- ── ENUMS ────────────────────────────────────────────────────
CREATE TYPE IF NOT EXISTS public.app_role AS ENUM ('admin', 'vip', 'user');
CREATE TYPE IF NOT EXISTS public.vip_status AS ENUM ('pending', 'approved', 'rejected');

-- ── PROFILES (tự động tạo khi user đăng ký) ─────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name     TEXT,
  phone         TEXT,
  vip_status    public.vip_status DEFAULT 'pending',
  vip_code      TEXT,
  vip_expires_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── USER ROLES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- ── ADMIN PRODUCTS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  n               INTEGER UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  price_vnd       INTEGER NOT NULL DEFAULT 0,
  thumbnail_url   TEXT,
  thumbnail_url_en TEXT,
  preview_url     TEXT,
  code_format     TEXT NOT NULL DEFAULT '',
  is_active       BOOLEAN DEFAULT TRUE,
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── MEMBER PRODUCTS (sản phẩm cộng đồng) ────────────────────
CREATE TABLE IF NOT EXISTS public.member_products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  affiliate_id    UUID,
  product_key     TEXT UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  price_vnd       INTEGER NOT NULL DEFAULT 0,
  thumbnail_url   TEXT,
  thumbnail_url_en TEXT,
  preview_url     TEXT,
  product_url     TEXT,
  seller_name     TEXT,
  shop_name       TEXT,
  status          TEXT DEFAULT 'active',
  commission_rate INTEGER DEFAULT 35,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── PRODUCT ORDERS (đơn hàng) ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.product_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code      TEXT UNIQUE NOT NULL,
  customer_email  TEXT NOT NULL,
  customer_name   TEXT,
  product_key     TEXT NOT NULL,
  product_title   TEXT,
  amount          INTEGER NOT NULL DEFAULT 0,
  status          TEXT DEFAULT 'pending',
  paid_at         TIMESTAMPTZ,
  email_sent      BOOLEAN DEFAULT FALSE,
  affiliate_ref   TEXT,
  product_url     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── AFFILIATES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.affiliates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ref_code        TEXT UNIQUE NOT NULL,
  full_name       TEXT,
  display_name    TEXT,
  email           TEXT,
  phone           TEXT,
  avatar_url      TEXT,
  bank_name       TEXT,
  bank_account    TEXT,
  bank_owner      TEXT,
  commission_rate INTEGER DEFAULT 35,
  status          TEXT DEFAULT 'active',
  referred_by     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── AFFILIATE CLICKS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id  UUID REFERENCES public.affiliates(id) ON DELETE CASCADE,
  product_key   TEXT DEFAULT 'main',
  referrer_url  TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── AFFILIATE ORDERS (hoa hồng) ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.affiliate_orders (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id            UUID REFERENCES public.affiliates(id) ON DELETE SET NULL,
  customer_name           TEXT DEFAULT '',
  customer_email          TEXT DEFAULT '',
  customer_phone          TEXT DEFAULT '',
  product_title           TEXT NOT NULL,
  amount                  TEXT DEFAULT '0',
  commission_amount       INTEGER DEFAULT 0,
  commission_status       TEXT DEFAULT 'pending',
  commission_approved_at  TIMESTAMPTZ,
  status                  TEXT DEFAULT 'confirmed',
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ── MEMBER PRODUCT ORDERS (doanh thu người bán) ──────────────
CREATE TABLE IF NOT EXISTS public.member_product_orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_product_id UUID REFERENCES public.member_products(id) ON DELETE SET NULL,
  seller_user_id    UUID,
  product_key       TEXT,
  product_title     TEXT,
  buyer_name        TEXT DEFAULT '',
  buyer_email       TEXT DEFAULT '',
  amount            INTEGER DEFAULT 0,
  net_amount        INTEGER DEFAULT 0,
  status            TEXT DEFAULT 'confirmed',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── PROMO CODES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT UNIQUE NOT NULL,
  product_key TEXT,
  product_url TEXT,
  max_uses    INTEGER,
  used_count  INTEGER DEFAULT 0,
  expires_at  TIMESTAMPTZ,
  is_active   BOOLEAN DEFAULT TRUE,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── PROMO CODE USES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.promo_code_uses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL,
  email       TEXT NOT NULL,
  product_key TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email, product_key)
);

-- ── PRODUCT RATINGS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.product_ratings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_key TEXT NOT NULL,
  rater_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_key, rater_id)
);

-- ── PRODUCT COMMENTS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.product_comments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_key    TEXT NOT NULL,
  commenter_name TEXT,
  content        TEXT NOT NULL,
  importance     INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── CHAT MEMORY ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_memory (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Hàm lấy affiliate theo ref_code
CREATE OR REPLACE FUNCTION public.get_affiliate_by_ref(p_ref_code TEXT)
RETURNS TABLE(id UUID, ref_code TEXT, status TEXT)
LANGUAGE sql STABLE AS $$
  SELECT id, ref_code, status
  FROM public.affiliates
  WHERE affiliates.ref_code = p_ref_code
  LIMIT 1;
$$;

-- Hàm kiểm tra role
CREATE OR REPLACE FUNCTION public.has_role(_role public.app_role, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Hàm tự động tạo profile khi user đăng ký
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger gắn với auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Hàm leaderboard affiliate
CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE(affiliate_id UUID, total_commission BIGINT, total_orders BIGINT)
LANGUAGE sql STABLE AS $$
  SELECT affiliate_id,
         SUM(commission_amount) AS total_commission,
         COUNT(*) AS total_orders
  FROM public.affiliate_orders
  WHERE commission_status IN ('pending','approved')
  GROUP BY affiliate_id
  ORDER BY total_commission DESC
  LIMIT 20;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_products    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_products   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_orders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliates        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_clicks  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_orders  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_code_uses   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_ratings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_comments  ENABLE ROW LEVEL SECURITY;

-- Profiles: user chỉ đọc/sửa profile của mình
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Admin products: ai cũng đọc được
CREATE POLICY "admin_products_select" ON public.admin_products FOR SELECT USING (true);

-- Member products: ai cũng đọc được
CREATE POLICY "member_products_select" ON public.member_products FOR SELECT USING (true);

-- Product ratings: ai cũng đọc được, user đăng nhập mới rate
CREATE POLICY "ratings_select" ON public.product_ratings FOR SELECT USING (true);
CREATE POLICY "ratings_insert" ON public.product_ratings FOR INSERT WITH CHECK (auth.uid() = rater_id);

-- Product comments: ai đọc được
CREATE POLICY "comments_select" ON public.product_comments FOR SELECT USING (true);
CREATE POLICY "comments_insert" ON public.product_comments FOR INSERT WITH CHECK (true);

-- Promo codes: ai đọc (để validate), chỉ service_role mới tạo/xóa
CREATE POLICY "promo_codes_select" ON public.promo_codes FOR SELECT USING (true);

-- Affiliate: user đọc record của mình
CREATE POLICY "affiliates_select" ON public.affiliates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "affiliates_update" ON public.affiliates FOR UPDATE USING (auth.uid() = user_id);

-- Affiliate orders: user đọc orders của mình
CREATE POLICY "aff_orders_select" ON public.affiliate_orders
  FOR SELECT USING (
    affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
  );

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('avatars',        'avatars',        true),
  ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars_auth_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "product_images_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "product_images_auth_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- ============================================================
-- SEED: Tạo tài khoản admin sau khi đăng ký
-- Thay 'your-user-id-here' bằng UUID từ Authentication > Users
-- ============================================================
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('your-user-id-here', 'admin');
