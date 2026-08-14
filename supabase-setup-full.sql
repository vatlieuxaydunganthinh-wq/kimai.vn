-- ============================================================================
--  AnAn — FULL DATABASE SETUP (chạy 1 lần duy nhất)
-- ============================================================================
--  Cách dùng: Supabase Dashboard → SQL Editor → New query → dán toàn bộ file
--             này → Run. File idempotent, chạy lại nhiều lần vẫn an toàn.
--
--  File này THAY THẾ cả 3 file cũ (supabase-migration.sql,
--  supabase-affiliate-migration.sql, supabase-product-orders.sql) vì chúng
--  mâu thuẫn nhau. Các khác biệt quan trọng đã được xử lý:
--
--   1. has_role() — 2 file cũ định nghĩa 2 thứ tự tham số khác nhau. Ở đây chỉ
--      còn 1 chữ ký duy nhất: has_role(_role, _user_id).
--   2. affiliates.user_id để NULL được. Bản affiliate-migration cũ đặt
--      NOT NULL UNIQUE, sẽ làm hỏng luồng tự tạo affiliate khi khách mua hàng
--      mà chưa có tài khoản (xem createAutoActiveAffiliate ở affiliate-shared.ts).
--   3. product_orders KHÔNG dùng policy "USING (true)" của file cũ — policy đó
--      cho phép bất kỳ ai đọc đơn hàng + email của TẤT CẢ khách. Ở đây khách
--      chỉ đọc được đơn của chính mình, admin đọc tất cả.
--   4. promo_codes / promo_code_uses: bật RLS, KHÔNG có policy nào. Chỉ code
--      server (service_role) được đụng vào. File cũ cho SELECT công khai —
--      nghĩa là ai cũng liệt kê được mã khuyến mãi và tự lấy hàng miễn phí.
--   5. chat_memory: file cũ quên bật RLS → lộ toàn bộ hội thoại. Đã bật.
--   6. Bổ sung policy còn thiếu khiến app lỗi lúc chạy: INSERT affiliate_clicks,
--      UPDATE product_ratings (cần cho .upsert), admin SELECT affiliate_orders.
--   7. handle_new_user() dùng bản đã gỡ backdoor cấp admin theo số điện thoại.
-- ============================================================================


-- ── EXTENSIONS ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ── ENUMS ────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'vip', 'user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.vip_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================================
--  BẢNG
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email          TEXT NOT NULL,
  full_name      TEXT,
  phone          TEXT,
  vip_status     public.vip_status DEFAULT 'pending',
  vip_code       TEXT,
  vip_expires_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- Sản phẩm do admin đăng. Nếu bảng rỗng, trang chủ tự fallback về 55 sản phẩm
-- hard-code trong src/lib/apps-data.ts — site vẫn hiển thị đầy đủ.
CREATE TABLE IF NOT EXISTS public.admin_products (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  n                INTEGER UNIQUE NOT NULL,
  title            TEXT NOT NULL,
  description      TEXT,
  price_vnd        INTEGER NOT NULL DEFAULT 0,
  thumbnail_url    TEXT,
  thumbnail_url_en TEXT,
  preview_url      TEXT,
  code_format      TEXT NOT NULL DEFAULT '',
  is_active        BOOLEAN DEFAULT TRUE,
  sort_order       INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Sản phẩm cộng đồng (member tự đăng bán)
CREATE TABLE IF NOT EXISTS public.member_products (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  affiliate_id     UUID,
  product_key      TEXT UNIQUE NOT NULL,
  title            TEXT NOT NULL,
  description      TEXT,
  price_vnd        INTEGER NOT NULL DEFAULT 0,
  thumbnail_url    TEXT,
  thumbnail_url_en TEXT,
  preview_url      TEXT,
  product_url      TEXT,
  video_url        TEXT,
  seller_name      TEXT,
  shop_name        TEXT,
  status           TEXT DEFAULT 'active',
  commission_rate  INTEGER DEFAULT 35,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
-- Cho DB cũ đã tạo bảng trước khi có cột video_url
ALTER TABLE public.member_products ADD COLUMN IF NOT EXISTS video_url TEXT;

CREATE TABLE IF NOT EXISTS public.product_orders (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code     TEXT UNIQUE NOT NULL,
  customer_email TEXT NOT NULL,
  customer_name  TEXT,
  product_key    TEXT NOT NULL,
  product_title  TEXT,
  amount         INTEGER NOT NULL DEFAULT 0,
  status         TEXT DEFAULT 'pending',
  paid_at        TIMESTAMPTZ,
  email_sent     BOOLEAN DEFAULT FALSE,
  affiliate_ref  TEXT,
  product_url    TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.product_orders ADD COLUMN IF NOT EXISTS product_url TEXT;

CREATE TABLE IF NOT EXISTS public.affiliates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- user_id CỐ Ý để NULL được: affiliate được tạo tự động từ email lúc khách
  -- thanh toán, thời điểm đó có thể chưa tồn tại tài khoản auth tương ứng.
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

CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE CASCADE,
  product_key  TEXT DEFAULT 'main',
  referrer_url TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.affiliate_orders (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id           UUID REFERENCES public.affiliates(id) ON DELETE SET NULL,
  customer_name          TEXT DEFAULT '',
  customer_email         TEXT DEFAULT '',
  customer_phone         TEXT DEFAULT '',
  product_title          TEXT NOT NULL,
  amount                 TEXT DEFAULT '0',
  commission_amount      INTEGER DEFAULT 0,
  commission_status      TEXT DEFAULT 'pending',
  commission_approved_at TIMESTAMPTZ,
  status                 TEXT DEFAULT 'confirmed',
  created_at             TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS public.promo_code_uses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL,
  email       TEXT NOT NULL,
  product_key TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (email, product_key)
);

CREATE TABLE IF NOT EXISTS public.product_ratings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_key TEXT NOT NULL,
  rater_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (product_key, rater_id)
);

CREATE TABLE IF NOT EXISTS public.product_comments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_key    TEXT NOT NULL,
  commenter_name TEXT,
  content        TEXT NOT NULL,
  importance     INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_memory (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================================
--  INDEX
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_affiliates_ref_code          ON public.affiliates (ref_code);
CREATE INDEX IF NOT EXISTS idx_affiliates_user_id           ON public.affiliates (user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_affiliate   ON public.affiliate_clicks (affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_created_at  ON public.affiliate_clicks (created_at);
CREATE INDEX IF NOT EXISTS idx_affiliate_orders_affiliate   ON public.affiliate_orders (affiliate_id);
CREATE INDEX IF NOT EXISTS idx_product_orders_order_code    ON public.product_orders (order_code);
CREATE INDEX IF NOT EXISTS idx_product_orders_email         ON public.product_orders (customer_email);
CREATE INDEX IF NOT EXISTS idx_product_orders_pending       ON public.product_orders (status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_member_products_user         ON public.member_products (user_id);
CREATE INDEX IF NOT EXISTS idx_mp_orders_seller             ON public.member_product_orders (seller_user_id);
CREATE INDEX IF NOT EXISTS idx_product_ratings_key          ON public.product_ratings (product_key);
CREATE INDEX IF NOT EXISTS idx_product_comments_key         ON public.product_comments (product_key);


-- ============================================================================
--  FUNCTIONS
-- ============================================================================

-- Kiểm tra vai trò. SECURITY DEFINER để policy trên user_roles không tự đệ quy.
-- Chữ ký (_role, _user_id) — mọi policy bên dưới đều gọi đúng thứ tự này.
-- Lưu ý: KHÔNG revoke execute khỏi authenticated. Biểu thức RLS được đánh giá
-- bằng quyền của người gọi, revoke sẽ làm mọi policy admin lỗi "permission denied".
CREATE OR REPLACE FUNCTION public.has_role(_role public.app_role, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Tra affiliate theo ref_code (dùng cho link giới thiệu, gọi được khi chưa login)
CREATE OR REPLACE FUNCTION public.get_affiliate_by_ref(p_ref_code TEXT)
RETURNS TABLE (id UUID, ref_code TEXT, status TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.ref_code, a.status
  FROM public.affiliates a
  WHERE a.ref_code = p_ref_code AND a.status = 'active'
  LIMIT 1;
$$;

-- Bảng xếp hạng affiliate
CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE (affiliate_id UUID, total_commission BIGINT, total_orders BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.affiliate_id,
         SUM(o.commission_amount)::BIGINT AS total_commission,
         COUNT(*)::BIGINT                 AS total_orders
  FROM public.affiliate_orders o
  WHERE o.commission_status IN ('pending', 'approved')
  GROUP BY o.affiliate_id
  ORDER BY total_commission DESC
  LIMIT 20;
$$;

-- Tự tạo profile khi có user mới.
-- Bản này ĐÃ GỠ backdoor tự cấp quyền admin theo số điện thoại cứng trong bản cũ.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _phone     TEXT;
  _full_name TEXT;
  _vip_code  TEXT;
BEGIN
  _phone     := COALESCE(NEW.raw_user_meta_data->>'phone', '');
  _full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  _vip_code  := CASE WHEN _phone <> '' THEN 'VIP' || _phone ELSE NULL END;

  INSERT INTO public.profiles (id, email, full_name, phone, vip_code, vip_status, vip_expires_at)
  VALUES (NEW.id, NEW.email, _full_name, NULLIF(_phone, ''), _vip_code, 'pending'::public.vip_status, NULL)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Chỉ trigger được gọi 2 hàm này, không cần cấp cho client
REVOKE EXECUTE ON FUNCTION public.handle_new_user()   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at()  FROM PUBLIC, anon, authenticated;


-- ============================================================================
--  TRIGGERS
-- ============================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS affiliates_updated_at ON public.affiliates;
CREATE TRIGGER affiliates_updated_at
  BEFORE UPDATE ON public.affiliates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS admin_products_updated_at ON public.admin_products;
CREATE TRIGGER admin_products_updated_at
  BEFORE UPDATE ON public.admin_products
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS member_products_updated_at ON public.member_products;
CREATE TRIGGER member_products_updated_at
  BEFORE UPDATE ON public.member_products
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- ============================================================================
--  ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_products       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliates            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_clicks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_product_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_code_uses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_ratings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_comments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_memory           ENABLE ROW LEVEL SECURITY;

-- Xoá sạch policy cũ (kể cả policy do 3 file SQL cũ tạo) để chạy lại không lỗi trùng tên
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'profiles','user_roles','admin_products','member_products','product_orders',
        'affiliates','affiliate_clicks','affiliate_orders','member_product_orders',
        'promo_codes','promo_code_uses','product_ratings','product_comments','chat_memory'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;


-- ── profiles ────────────────────────────────────────────────────────────────
CREATE POLICY "profiles_select_own"  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);
CREATE POLICY "profiles_select_admin" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role('admin', auth.uid()));

-- User sửa được profile của mình NHƯNG không tự nâng cấp VIP cho bản thân
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND vip_status     IS NOT DISTINCT FROM (SELECT p.vip_status     FROM public.profiles p WHERE p.id = auth.uid())
    AND vip_expires_at IS NOT DISTINCT FROM (SELECT p.vip_expires_at FROM public.profiles p WHERE p.id = auth.uid())
    AND vip_code       IS NOT DISTINCT FROM (SELECT p.vip_code       FROM public.profiles p WHERE p.id = auth.uid())
  );
CREATE POLICY "profiles_update_admin" ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role('admin', auth.uid()))
  WITH CHECK (public.has_role('admin', auth.uid()));


-- ── user_roles ──────────────────────────────────────────────────────────────
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "user_roles_admin_all"  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role('admin', auth.uid()))
  WITH CHECK (public.has_role('admin', auth.uid()));


-- ── admin_products (ai cũng xem, chỉ admin sửa) ─────────────────────────────
CREATE POLICY "admin_products_select"       ON public.admin_products FOR SELECT USING (true);
CREATE POLICY "admin_products_admin_insert" ON public.admin_products FOR INSERT TO authenticated
  WITH CHECK (public.has_role('admin', auth.uid()));
CREATE POLICY "admin_products_admin_update" ON public.admin_products FOR UPDATE TO authenticated
  USING (public.has_role('admin', auth.uid()))
  WITH CHECK (public.has_role('admin', auth.uid()));
CREATE POLICY "admin_products_admin_delete" ON public.admin_products FOR DELETE TO authenticated
  USING (public.has_role('admin', auth.uid()));


-- ── member_products (ai cũng xem, chủ sản phẩm sửa) ─────────────────────────
CREATE POLICY "member_products_select"       ON public.member_products FOR SELECT USING (true);
CREATE POLICY "member_products_owner_insert" ON public.member_products FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "member_products_owner_update" ON public.member_products FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "member_products_admin_all"    ON public.member_products FOR ALL TO authenticated
  USING (public.has_role('admin', auth.uid()))
  WITH CHECK (public.has_role('admin', auth.uid()));


-- ── product_orders ──────────────────────────────────────────────────────────
-- Không có policy INSERT/UPDATE: đơn hàng chỉ được tạo/cập nhật bởi server
-- (payment-server-fns.ts và webhook SePay dùng service_role, bỏ qua RLS).
CREATE POLICY "product_orders_select_own"   ON public.product_orders FOR SELECT TO authenticated
  USING (customer_email = auth.email());
CREATE POLICY "product_orders_select_admin" ON public.product_orders FOR SELECT TO authenticated
  USING (public.has_role('admin', auth.uid()));


-- ── affiliates ──────────────────────────────────────────────────────────────
CREATE POLICY "affiliates_select_own"   ON public.affiliates FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "affiliates_select_admin" ON public.affiliates FOR SELECT TO authenticated
  USING (public.has_role('admin', auth.uid()));
CREATE POLICY "affiliates_insert_self"  ON public.affiliates FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "affiliates_insert_admin" ON public.affiliates FOR INSERT TO authenticated
  WITH CHECK (public.has_role('admin', auth.uid()));
CREATE POLICY "affiliates_update_own"   ON public.affiliates FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "affiliates_update_admin" ON public.affiliates FOR UPDATE TO authenticated
  USING (public.has_role('admin', auth.uid()))
  WITH CHECK (public.has_role('admin', auth.uid()));


-- ── affiliate_clicks ────────────────────────────────────────────────────────
-- INSERT mở cho cả khách vãng lai — đây là tracking click link giới thiệu,
-- xảy ra trước khi người dùng đăng nhập. (Policy này thiếu ở file SQL cũ.)
CREATE POLICY "aff_clicks_insert_any"   ON public.affiliate_clicks FOR INSERT TO anon, authenticated
  WITH CHECK (true);
CREATE POLICY "aff_clicks_select_own"   ON public.affiliate_clicks FOR SELECT TO authenticated
  USING (affiliate_id IN (SELECT a.id FROM public.affiliates a WHERE a.user_id = auth.uid()));
CREATE POLICY "aff_clicks_select_admin" ON public.affiliate_clicks FOR SELECT TO authenticated
  USING (public.has_role('admin', auth.uid()));


-- ── affiliate_orders ────────────────────────────────────────────────────────
CREATE POLICY "aff_orders_select_own"   ON public.affiliate_orders FOR SELECT TO authenticated
  USING (affiliate_id IN (SELECT a.id FROM public.affiliates a WHERE a.user_id = auth.uid()));
CREATE POLICY "aff_orders_select_admin" ON public.affiliate_orders FOR SELECT TO authenticated
  USING (public.has_role('admin', auth.uid()));
CREATE POLICY "aff_orders_update_admin" ON public.affiliate_orders FOR UPDATE TO authenticated
  USING (public.has_role('admin', auth.uid()))
  WITH CHECK (public.has_role('admin', auth.uid()));


-- ── member_product_orders ───────────────────────────────────────────────────
CREATE POLICY "mp_orders_select_seller" ON public.member_product_orders FOR SELECT TO authenticated
  USING (auth.uid() = seller_user_id);
CREATE POLICY "mp_orders_select_admin"  ON public.member_product_orders FOR SELECT TO authenticated
  USING (public.has_role('admin', auth.uid()));


-- ── promo_codes / promo_code_uses ───────────────────────────────────────────
-- CỐ Ý KHÔNG CÓ POLICY NÀO. RLS bật + 0 policy = chặn hoàn toàn anon/authenticated.
-- Toàn bộ nghiệp vụ mã khuyến mãi chạy trong payment-server-fns.ts bằng
-- service_role (bỏ qua RLS). Nếu mở SELECT công khai như file cũ thì bất kỳ ai
-- cũng liệt kê được toàn bộ mã và tự đổi lấy sản phẩm miễn phí.


-- ── product_ratings ─────────────────────────────────────────────────────────
-- Cần cả INSERT lẫn UPDATE vì san-pham.tsx dùng .upsert() trên (product_key, rater_id)
CREATE POLICY "ratings_select" ON public.product_ratings FOR SELECT USING (true);
CREATE POLICY "ratings_insert" ON public.product_ratings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = rater_id);
CREATE POLICY "ratings_update" ON public.product_ratings FOR UPDATE TO authenticated
  USING (auth.uid() = rater_id)
  WITH CHECK (auth.uid() = rater_id);


-- ── product_comments ────────────────────────────────────────────────────────
CREATE POLICY "comments_select" ON public.product_comments FOR SELECT USING (true);
CREATE POLICY "comments_insert" ON public.product_comments FOR INSERT TO anon, authenticated
  WITH CHECK (true);


-- ── chat_memory ─────────────────────────────────────────────────────────────
-- CỐ Ý KHÔNG CÓ POLICY. Chỉ chat-server-fns.ts (service_role) đọc/ghi.
-- File SQL cũ quên bật RLS ở bảng này → lộ toàn bộ lịch sử chat của mọi người.


-- ============================================================================
--  STORAGE
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars',        'avatars',        TRUE, NULL,     NULL),
  ('product-images', 'product-images', TRUE, NULL,     NULL),
  ('product-videos', 'product-videos', TRUE, 52428800, ARRAY['video/mp4','video/webm','video/quicktime','video/x-matroska'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars_public_read"         ON storage.objects;
DROP POLICY IF EXISTS "avatars_auth_upload"         ON storage.objects;
DROP POLICY IF EXISTS "product_images_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "product_images_auth_upload"  ON storage.objects;
DROP POLICY IF EXISTS "product_videos_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "product_videos_auth_upload"  ON storage.objects;
DROP POLICY IF EXISTS "product_videos_owner_delete" ON storage.objects;

CREATE POLICY "avatars_public_read"        ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars_auth_upload"        ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "product_images_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "product_images_auth_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images');
CREATE POLICY "product_videos_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'product-videos');
CREATE POLICY "product_videos_auth_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-videos');
CREATE POLICY "product_videos_owner_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product-videos');


-- ============================================================================
--  BƯỚC CUỐI — TỰ CẤP QUYỀN ADMIN CHO CHÍNH BẠN
-- ============================================================================
--  1. Chạy xong file này.
--  2. Vào <domain>/auth đăng ký tài khoản bằng email của bạn.
--  3. Quay lại SQL Editor, bỏ comment và chạy 2 dòng dưới (thay email của bạn):
--
--  INSERT INTO public.user_roles (user_id, role)
--  SELECT id, 'admin' FROM auth.users WHERE email = 'email-cua-ban@gmail.com'
--  ON CONFLICT (user_id, role) DO NOTHING;
--
--  4. Đăng xuất, đăng nhập lại → vào <domain>/admin.
-- ============================================================================
