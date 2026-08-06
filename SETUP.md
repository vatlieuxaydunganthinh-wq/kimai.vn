# HƯỚNG DẪN SETUP — AI Digital Supermarket

## Yêu cầu tài khoản (tự đăng ký, miễn phí/có phí)

| Dịch vụ | Link | Ghi chú |
|---------|------|---------|
| Supabase | https://supabase.com | Free tier đủ dùng |
| Vercel | https://vercel.com | Free tier, deploy tự động |
| Gmail | Gmail thường | Cần bật 2FA để tạo App Password |
| SePay | https://sepay.vn | Nhận tiền VND tự động qua webhook |
| PayPal | https://developer.paypal.com | Tài khoản Business |
| GitHub | https://github.com | Để deploy lên Vercel |

---

## Bước 1 — Upload code lên GitHub

1. Tạo repository mới trên GitHub (private)
2. Upload toàn bộ source code lên repo đó
3. Đảm bảo file `.env` KHÔNG được đẩy lên (đã có trong `.gitignore`)

---

## Bước 2 — Tạo Supabase project

1. Vào https://supabase.com → New project
2. Ghi lại các thông tin:
   - **Project URL**: `https://xxxx.supabase.co`
   - **anon/public key** (SUPABASE_PUBLISHABLE_KEY)
   - **service_role key** (SUPABASE_SERVICE_ROLE_KEY) — Project Settings → API
3. Vào **SQL Editor** → chạy file `supabase/migrations/` (nếu có) để tạo bảng

### Các bảng cần có trong Supabase:
- `profiles` — thông tin thành viên
- `admin_products` — sản phẩm của admin
- `member_products` — sản phẩm cộng đồng
- `product_orders` — đơn hàng
- `affiliates` — tài khoản affiliate
- `affiliate_orders` — hoa hồng
- `affiliate_clicks` — click tracking
- `promo_codes` — mã khuyến mãi
- `promo_code_uses` — lịch sử dùng mã
- `product_ratings` — đánh giá sản phẩm

---

## Bước 3 — Tạo Gmail App Password

1. Bật xác minh 2 bước tại https://myaccount.google.com/security
2. Vào **Mật khẩu ứng dụng** → Tạo mật khẩu mới
3. Chọn "Ứng dụng khác" → đặt tên "SieuthisoAI" → Copy mật khẩu 16 ký tự

---

## Bước 4 — Cài đặt SePay (nhận tiền VND tự động)

1. Đăng ký tại https://sepay.vn
2. Kết nối tài khoản ngân hàng của bạn
3. Vào **Webhook** → URL: `https://your-domain.com/api/sepay-webhook`
4. Copy API Key → điền vào `SEPAY_API_KEY`

---

## Bước 5 — Tạo PayPal App

1. Vào https://developer.paypal.com → **My Apps & Credentials**
2. Chuyển sang **Live** (không phải Sandbox)
3. Create App → Copy `Client ID` và `Secret`

---

## Bước 6 — Deploy lên Vercel

1. Vào https://vercel.com → New Project → Import từ GitHub
2. Vào **Settings → Environment Variables** → thêm tất cả biến trong `.env.example`
3. Vào **Settings → Cron Jobs** → kiểm tra cron `/api/check-commissions` đã active
4. **Deploy**

---

## Bước 7 — Cấu hình domain

1. Mua domain tại bất kỳ nhà cung cấp nào
2. Trong Vercel → Settings → Domains → Add domain
3. Trỏ DNS theo hướng dẫn của Vercel

---

## Bước 8 — Setup tài khoản Admin

1. Vào `your-domain.com/auth` → đăng ký tài khoản với email của bạn
2. Trong Supabase → Table `user_roles` → thêm dòng:
   ```
   user_id: [id của bạn]
   role: admin
   ```
3. Vào `your-domain.com/admin` để quản lý

---

## Lưu ý quan trọng

- **Database không bán kèm** — bạn phải tự tạo Supabase project mới, dữ liệu bắt đầu trống
- **Tài khoản ngân hàng** dùng trong QR code cần thay bằng STK của bạn (trong `PaymentModal.tsx`)
- **Domain** trong code cần tìm-thay `sieuthisoai.com` → domain của bạn
- Sau khi deploy, kiểm tra webhook SePay hoạt động bằng cách test chuyển khoản nhỏ

---

## Hỗ trợ

Liên hệ người bán qua Zalo nếu cần hỗ trợ setup.
