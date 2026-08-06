import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CheckCircle2, Loader2, Copy, X } from "lucide-react";
import { toast } from "sonner";
import { createOrder, checkOrderStatus, createPaypalOrder, redeemPromoCode } from "@/lib/payment-server-fns";

interface PaymentProduct {
  n: number;
  title: string;
  price?: string;
  priceVnd?: string;
  codeFormat: string;
  productUrl?: string;
}

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: PaymentProduct | null;
  userInfo?: { name: string; email: string } | null;
  affiliateRef?: string;
}

const USD_TO_VND = 27000;

function parsePrice(price: string): number {
  return parseInt(price.replace(/[^0-9]/g, "")) || 0;
}

function getCodePrefix(codeFormat: string): string {
  return codeFormat.replace(/<[^>]+>/g, "");
}

export function PaymentModal({ open, onOpenChange, product, userInfo, affiliateRef }: PaymentModalProps) {
  const [step, setStep] = useState<"info" | "qr" | "success">("info");
  const [payMethod, setPayMethod] = useState<"vnd" | "paypal" | "promo">("vnd");
  const [email, setEmail] = useState(userInfo?.email ?? "");
  const [name, setName] = useState(userInfo?.name ?? "");
  const [orderCode, setOrderCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [ppLoading, setPpLoading] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const amountVnd = product
    ? parsePrice(product.priceVnd || "") || Math.round(parsePrice(product.price ?? "") * USD_TO_VND / 3)
    : 0;
  const amountUsd = Math.max(1, Math.round(amountVnd / USD_TO_VND * 100) / 100);
  const emailValid = !!email && email.includes("@");

  useEffect(() => {
    if (open) {
      setStep("info");
      setEmail(userInfo?.email ?? "");
      setName(userInfo?.name ?? "");
      setOrderCode("");
      setCreating(false);
      setPpLoading(false);
      setPromoCode("");
      setPromoLoading(false);
    } else {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    }
  }, [open, userInfo]);

  useEffect(() => {
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, []);

  const handleBuy = async () => {
    if (!product) return;
    if (!emailValid) { toast.error("Vui lòng nhập email hợp lệ"); return; }
    setCreating(true);
    try {
      const prefix = getCodePrefix(product.codeFormat);
      const result = await createOrder({
        data: {
          customerEmail: email,
          customerName: name || email.split("@")[0],
          productKey: prefix,
          productTitle: product.title,
          codePrefix: prefix,
          amount: amountVnd,
          affiliateRef,
          productUrl: product.productUrl,
        },
      });
      if (!result.ok) { toast.error(result.error ?? "Không thể tạo đơn hàng"); setCreating(false); return; }
      setOrderCode(result.orderCode!);
      setStep("qr");
      setCreating(false);

      pollRef.current = setInterval(async () => {
        try {
          const r = await checkOrderStatus({ data: { orderCode: result.orderCode! } });
          if (r.status === "paid") {
            setStep("success");
            if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
            toast.success("Thanh toán thành công!");
          }
        } catch {}
      }, 5000);
    } catch {
      toast.error("Lỗi hệ thống. Vui lòng thử lại.");
      setCreating(false);
    }
  };

  const handlePaypal = async () => {
    if (!product || !emailValid) return;
    setPpLoading(true);
    try {
      const prefix = getCodePrefix(product.codeFormat);
      const origin = window.location.origin;
      const returnUrl = `${origin}/paypal-return`;
      const cancelUrl = product.productUrl ?? origin;

      // Save pending order info to sessionStorage — read back on /paypal-return
      sessionStorage.setItem("paypal_pending", JSON.stringify({
        customerEmail: email,
        customerName: name || email.split("@")[0],
        productKey: prefix,
        productTitle: product.title,
        amountUsd,
        affiliateRef,
        productUrl: product.productUrl,
      }));

      const res = await createPaypalOrder({
        data: { productTitle: product.title, amountUsd, returnUrl, cancelUrl },
      });

      if (!res.ok) {
        toast.error((res as any).error ?? "Cannot connect to PayPal. Try again.");
        setPpLoading(false);
        return;
      }

      window.location.href = (res as any).approvalUrl;
    } catch {
      toast.error("Error connecting to PayPal. Try again.");
      setPpLoading(false);
    }
  };

  const handlePromo = async () => {
    if (!product || !emailValid || !promoCode.trim()) return;
    setPromoLoading(true);
    try {
      const prefix = getCodePrefix(product.codeFormat);
      const res = await redeemPromoCode({
        data: {
          code: promoCode.trim(),
          email,
          name: name || email.split("@")[0],
          productKey: prefix,
          productTitle: product.title,
          productUrl: product.productUrl,
          affiliateRef,
        },
      });
      if (res.ok) {
        setOrderCode(res.orderCode!);
        setStep("success");
        toast.success("Mở khoá thành công!");
      } else {
        toast.error((res as any).error ?? "Mã không hợp lệ");
      }
    } catch {
      toast.error("Lỗi hệ thống. Vui lòng thử lại.");
    }
    setPromoLoading(false);
  };

  const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success("Đã sao chép!"); };

  if (!product) return null;

  const qrUrl = `https://qr.sepay.vn/img?acc=2210189178888&bank=MB&amount=${amountVnd}&des=${orderCode}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden bg-[#1a1a2e] text-white border-none rounded-2xl">
        <div className="relative px-6 pt-6 pb-6 text-center">
          <button onClick={() => onOpenChange(false)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 grid place-items-center hover:bg-white/20 transition">
            <X className="w-4 h-4" />
          </button>

          {/* ── SUCCESS ── */}
          {step === "success" ? (
            <div className="py-6">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 mx-auto flex items-center justify-center mb-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-black">
                {payMethod === "paypal" ? "Payment Successful! 🎉" : "Thanh toán thành công!"}
              </h2>
              <p className="text-sm text-white/60 mt-2">
                {payMethod === "paypal"
                  ? <>Product delivered to <span className="font-bold text-white">{email}</span></>
                  : <>Sản phẩm được gửi về email <span className="font-bold text-white">{email}</span></>}
              </p>
              {orderCode && (
                <p className="text-xs text-white/40 mt-1">
                  {payMethod === "paypal" ? "Order" : "Mã đơn"}: <span className="font-mono text-emerald-400">{orderCode}</span>
                </p>
              )}
              {product.productUrl && (
                <a href={product.productUrl} target="_blank" rel="noopener noreferrer"
                  className="mt-4 block w-full rounded-xl bg-emerald-500 text-black py-3.5 font-black text-base hover:bg-emerald-400 transition text-center">
                  👉 {payMethod === "paypal" ? "Access Product" : "Truy cập sản phẩm ngay"}
                </a>
              )}
              <div className="mt-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-sm text-emerald-400">
                {payMethod === "paypal"
                  ? <>Issues? Contact us via Zalo: <span className="font-bold">0367337799</span></>
                  : <>Nếu chưa nhận được email, liên hệ Zalo: <span className="font-bold">0367337799</span></>}
              </div>
              <button onClick={() => onOpenChange(false)} className="mt-3 w-full rounded-xl bg-emerald-500 text-white py-3 font-bold hover:bg-emerald-400 transition">
                {payMethod === "paypal" ? "Close" : "Đóng"}
              </button>
            </div>

          /* ── QR (VND) ── */
          ) : step === "qr" ? (
            <>
              <h2 className="text-xl font-black">{product.title}</h2>
              <p className="text-sm text-white/50 mt-1">Mã đơn: {orderCode}</p>
              <div className="mt-4 text-center">
                <div className="text-sm text-white/50">Số tiền chuyển</div>
                <div className="text-3xl font-black text-emerald-400 mt-1">{amountVnd.toLocaleString("vi-VN")}đ</div>
              </div>
              <div className="mt-4 bg-white rounded-2xl p-3 mx-auto max-w-[260px]">
                <img src={qrUrl} alt="QR Thanh toán" className="w-full h-auto" loading="eager" />
              </div>
              <div className="mt-4 rounded-xl bg-white/5 border border-white/10 p-4 text-left text-sm space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  Quét QR — nội dung & số tiền tự động điền, <span className="underline">không cần sửa</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Số TK:</span>
                  <div className="flex items-center gap-1">
                    <span className="font-bold font-mono">2210 1891 78888</span>
                    <button onClick={() => copy("2210189178888")} className="p-1 hover:bg-white/10 rounded"><Copy className="w-3 h-3" /></button>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Ngân hàng:</span>
                  <span className="font-bold">MBBank · PHẠM VĂN THỊNH</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/50">Nội dung CK:</span>
                  <div className="flex items-center gap-1">
                    <span className="font-black text-emerald-400 font-mono">{orderCode}</span>
                    <button onClick={() => copy(orderCode)} className="p-1 hover:bg-white/10 rounded"><Copy className="w-3 h-3" /></button>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-center gap-2 text-emerald-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm font-semibold animate-pulse">Đang chờ thanh toán...</span>
              </div>
              <p className="text-xs text-white/30 mt-2">Mở app ngân hàng → quét QR → xác nhận chuyển tiền. Hệ thống tự mở khoá ngay khi nhận được tiền.</p>
            </>

          /* ── INFO ── */
          ) : (
            <>
              <h2 className="text-xl font-black">
                {payMethod === "paypal" ? `Buy: ${product.title}` : `Mở khoá: ${product.title}`}
              </h2>
              <p className="text-sm text-white/50 mt-1">
                {payMethod === "paypal"
                  ? "Enter your details to receive the product"
                  : "Nhập thông tin để nhận sản phẩm sau khi thanh toán"}
              </p>

              {/* Payment method tabs */}
              <div className="mt-5 flex rounded-xl overflow-hidden border border-white/15">
                <button
                  onClick={() => setPayMethod("vnd")}
                  className={`flex-1 py-2.5 text-xs font-bold transition ${payMethod === "vnd" ? "bg-emerald-500 text-black" : "bg-white/5 text-white/60 hover:bg-white/10"}`}
                >
                  🏦 VND
                </button>
                <button
                  onClick={() => setPayMethod("paypal")}
                  className={`flex-1 py-2.5 text-xs font-bold transition ${payMethod === "paypal" ? "bg-[#0070ba] text-white" : "bg-white/5 text-white/60 hover:bg-white/10"}`}
                >
                  💳 PayPal
                </button>
                <button
                  onClick={() => setPayMethod("promo")}
                  className={`flex-1 py-2.5 text-xs font-bold transition ${payMethod === "promo" ? "bg-emerald-600 text-white" : "bg-white/5 text-white/60 hover:bg-white/10"}`}
                >
                  🎁 Mã KM
                </button>
              </div>

              {/* Price — hide for promo tab */}
              <div className="mt-4 text-center">
                {payMethod === "promo" ? null : payMethod === "vnd" ? (
                  <>
                    <div className="text-sm text-white/50">Số tiền</div>
                    <div className="text-4xl font-black text-emerald-400 mt-1">{amountVnd.toLocaleString("vi-VN")}đ</div>
                  </>
                ) : (
                  <>
                    <div className="text-sm text-white/50">Amount</div>
                    <div className="text-4xl font-black text-[#0070ba] mt-1">${amountUsd.toFixed(2)} USD</div>
                    <div className="text-xs text-white/30 mt-0.5">≈ {amountVnd.toLocaleString("vi-VN")}đ</div>
                  </>
                )}
              </div>

              {/* Form */}
              <div className="mt-5 space-y-4 text-left">
                <div>
                  <label className="text-sm font-semibold text-white/80">
                    {payMethod === "paypal" ? "Your name" : "Tên của bạn"}
                  </label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                    placeholder={payMethod === "paypal" ? "John Doe" : "Nguyễn Văn A"}
                    className="mt-1 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-white/80">
                    {payMethod === "paypal" ? "Email to receive product" : "Email nhận sản phẩm"} <span className="text-emerald-400">*</span>
                  </label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@gmail.com" required
                    className="mt-1 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
                  <p className="text-xs text-white/30 mt-1">
                    {payMethod === "paypal"
                      ? "Product will be sent to this email after payment"
                      : "Sản phẩm sẽ được gửi về email này sau khi thanh toán"}
                  </p>
                </div>
                {/* Promo code input */}
                {payMethod === "promo" && (
                  <div>
                    <label className="text-sm font-semibold text-white/80">Mã khuyến mãi <span className="text-emerald-400">*</span></label>
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="Nhập mã khuyến mãi..."
                      className="mt-1 w-full rounded-xl border border-emerald-500/40 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 uppercase tracking-wider"
                    />
                  </div>
                )}
              </div>

              {/* VND button */}
              {payMethod === "vnd" && (
                <>
                  <button onClick={handleBuy} disabled={creating || !emailValid}
                    className="mt-6 w-full rounded-xl bg-emerald-500 text-black py-3.5 font-black text-base hover:bg-emerald-400 transition disabled:opacity-50 flex items-center justify-center gap-2">
                    {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang tạo đơn...</> : "⚡ Mua ngay"}
                  </button>
                  <p className="text-xs text-white/30 mt-3 text-center">
                    ⚡ Mua ngay → hiện QR thanh toán ngay · Hệ thống tự mở khoá khi nhận được tiền
                  </p>
                </>
              )}

              {/* PayPal button */}
              {payMethod === "paypal" && (
                <div className="mt-6">
                  <button
                    onClick={handlePaypal}
                    disabled={ppLoading || !emailValid}
                    className="w-full rounded-xl bg-[#0070ba] text-white py-3.5 font-black text-base hover:bg-[#005ea6] transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {ppLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Connecting to PayPal...</>
                    ) : (
                      <>
                        <img src="https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_37x23.jpg" alt="PayPal" className="h-5 rounded" />
                        Pay with PayPal
                      </>
                    )}
                  </button>
                  {!emailValid && (
                    <p className="text-xs text-white/40 mt-2 text-center">Please enter a valid email above</p>
                  )}
                  <p className="text-xs text-white/30 mt-2 text-center">
                    You will be redirected to PayPal to complete payment · Credit/Debit cards accepted
                  </p>
                </div>
              )}

              {/* Promo code button */}
              {payMethod === "promo" && (
                <div className="mt-6">
                  <button
                    onClick={handlePromo}
                    disabled={promoLoading || !emailValid || !promoCode.trim()}
                    className="w-full rounded-xl bg-emerald-600 text-white py-3.5 font-black text-base hover:bg-emerald-500 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {promoLoading
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang kiểm tra...</>
                      : "🎁 Kích hoạt mã khuyến mãi"
                    }
                  </button>
                  <p className="text-xs text-white/30 mt-2 text-center">
                    Nhập đúng mã → sản phẩm mở khoá ngay · 1 email chỉ dùng 1 lần/sản phẩm
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
