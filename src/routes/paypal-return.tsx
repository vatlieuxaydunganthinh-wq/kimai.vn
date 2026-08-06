import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { capturePaypalOrder } from "@/lib/payment-server-fns";

export const Route = createFileRoute("/paypal-return")({
  head: () => ({ meta: [{ title: "Payment Processing — AI Digital Supermarket" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    token: (search.token as string) ?? "",
    PayerID: (search.PayerID as string) ?? "",
  }),
  component: PaypalReturnPage,
});

function PaypalReturnPage() {
  const { token: paypalOrderId, PayerID } = Route.useSearch();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [productUrl, setProductUrl] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    if (!paypalOrderId || !PayerID) {
      setErrMsg("Missing payment info. Payment may have been cancelled.");
      setStatus("error");
      return;
    }

    const raw = sessionStorage.getItem("paypal_pending");
    if (!raw) {
      setErrMsg("Session expired. If payment was deducted, contact support via Zalo: 0367337799");
      setStatus("error");
      return;
    }

    const info = JSON.parse(raw) as {
      customerEmail: string;
      customerName: string;
      productKey: string;
      productTitle: string;
      amountUsd: number;
      affiliateRef?: string;
      productUrl?: string;
    };

    capturePaypalOrder({
      data: {
        paypalOrderId,
        customerEmail: info.customerEmail,
        customerName: info.customerName,
        productKey: info.productKey,
        productTitle: info.productTitle,
        amountUsd: info.amountUsd,
        affiliateRef: info.affiliateRef,
        productUrl: info.productUrl,
      },
    })
      .then((res) => {
        if (res.ok) {
          sessionStorage.removeItem("paypal_pending");
          setProductUrl(info.productUrl ?? null);
          setStatus("success");
        } else {
          setErrMsg((res as any).error ?? "Payment capture failed. Contact support via Zalo: 0367337799");
          setStatus("error");
        }
      })
      .catch(() => {
        setErrMsg("Network error. Contact support via Zalo: 0367337799");
        setStatus("error");
      });
  }, [paypalOrderId, PayerID]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a1a2e] text-white p-4">
      {status === "loading" && (
        <div className="text-center">
          <Loader2 className="w-14 h-14 animate-spin text-[#0070ba] mx-auto mb-5" />
          <p className="text-lg font-semibold">Processing your payment...</p>
          <p className="text-sm text-white/40 mt-2">Please wait, do not close this page.</p>
        </div>
      )}

      {status === "success" && (
        <div className="text-center max-w-sm w-full">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-12 h-12 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-black mb-2">Payment Successful! 🎉</h1>
          <p className="text-white/60 mb-6">Product info has been sent to your email.</p>
          {productUrl && (
            <a
              href={productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3.5 rounded-xl bg-amber-500 text-black font-black text-base hover:bg-amber-400 transition mb-3 text-center"
            >
              👉 Access Product Now
            </a>
          )}
          <a href="/" className="block text-white/40 text-sm hover:text-white transition">
            ← Back to home
          </a>
        </div>
      )}

      {status === "error" && (
        <div className="text-center max-w-sm w-full">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-5">
            <XCircle className="w-12 h-12 text-red-400" />
          </div>
          <h1 className="text-2xl font-black mb-2">Something went wrong</h1>
          <p className="text-white/60 mb-6">{errMsg}</p>
          <a href="/" className="block w-full py-3 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 transition text-center mb-3">
            ← Back to home
          </a>
        </div>
      )}
    </div>
  );
}
