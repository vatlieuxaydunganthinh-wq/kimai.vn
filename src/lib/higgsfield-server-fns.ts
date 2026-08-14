import { createServerFn } from "@tanstack/react-start";

// ============================================================================
//  Higgsfield Platform API — sinh ảnh thumbnail tự động
// ----------------------------------------------------------------------------
//  Docs: https://docs.higgsfield.ai/docs  |  Lấy khoá: https://cloud.higgsfield.ai
//  Luồng bất đồng bộ: submit → nhận request_id → poll status → lấy images[].url
//
//  API chạy nền vài chục giây, dài hơn giới hạn của một serverless function,
//  nên phần poll do trình duyệt lặp (xem waitForHiggsfieldImage bên dưới),
//  mỗi lần gọi server chỉ hỏi trạng thái đúng 1 nhịp rồi trả về ngay.
// ============================================================================

const HF_BASE = "https://platform.higgsfield.ai";
const HF_MODEL_PATH = "/higgsfield-ai/soul/standard";

/** Ảnh thumbnail sản phẩm: 1:1 giống bộ thumbnail hiện có (1080x1080). */
export const HF_DEFAULT_ASPECT_RATIO = "1:1";
export const HF_DEFAULT_RESOLUTION = "1080p";

/** Phong cách mặc định — nối vào sau tên + mô tả sản phẩm khi dựng prompt. */
export const HF_DEFAULT_STYLE =
  "modern tech product thumbnail, dark navy background, emerald green neon accent lighting, " +
  "cinematic studio light, clean composition with empty space at the top for a text overlay, " +
  "high detail, photorealistic, no text, no watermark, no letters";

/**
 * Dựng prompt từ dữ liệu sản phẩm. Hàm thuần — gọi được ở cả client lẫn server.
 */
export function buildHiggsfieldPrompt(
  title: string,
  description?: string | null,
  style: string = HF_DEFAULT_STYLE
): string {
  const parts = [title.trim(), (description ?? "").trim(), style.trim()].filter(Boolean);
  return parts.join(". ");
}

function authHeader(): string | null {
  const id = process.env.HIGGSFIELD_API_KEY_ID;
  const secret = process.env.HIGGSFIELD_API_KEY_SECRET;
  if (!id || !secret) return null;
  return `Key ${id}:${secret}`;
}

/** Cắt bớt body lỗi để thông báo trên UI không quá dài. */
function short(text: string, max = 300): string {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

type HfStatus = "queued" | "in_progress" | "completed" | "failed" | "nsfw" | "canceled";

/** Kiểm tra đã cấu hình khoá API chưa — dùng để hiện trạng thái trong trang Admin. */
export const higgsfieldStatusServer = createServerFn({ method: "POST" }).handler(async () => {
  return { configured: !!authHeader() };
});

/**
 * Gửi yêu cầu sinh ảnh. Trả về ngay request_id, KHÔNG chờ ảnh xong.
 */
export const startHiggsfieldImageServer = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      prompt: string;
      aspectRatio?: string;
      resolution?: string;
    }) => data
  )
  .handler(async ({ data }) => {
    const auth = authHeader();
    if (!auth) {
      return {
        ok: false as const,
        error: "Chưa cấu hình HIGGSFIELD_API_KEY_ID / HIGGSFIELD_API_KEY_SECRET",
      };
    }
    const prompt = data.prompt?.trim();
    if (!prompt) return { ok: false as const, error: "Prompt trống" };

    let response: Response;
    try {
      response = await fetch(`${HF_BASE}${HF_MODEL_PATH}`, {
        method: "POST",
        headers: {
          Authorization: auth,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          prompt,
          aspect_ratio: data.aspectRatio || HF_DEFAULT_ASPECT_RATIO,
          resolution: data.resolution || HF_DEFAULT_RESOLUTION,
        }),
      });
    } catch (err: any) {
      return { ok: false as const, error: `Không gọi được Higgsfield: ${err.message}` };
    }

    const body = await response.text();
    if (!response.ok) {
      const hint =
        response.status === 401
          ? " (khoá API sai hoặc đã bị thu hồi)"
          : response.status === 429
            ? " (vượt giới hạn gọi — chờ chút rồi thử lại)"
            : "";
      return { ok: false as const, error: `Higgsfield ${response.status}${hint}: ${short(body)}` };
    }

    let json: any;
    try {
      json = JSON.parse(body);
    } catch {
      return { ok: false as const, error: `Higgsfield trả về dữ liệu lạ: ${short(body)}` };
    }

    if (!json?.request_id) {
      return { ok: false as const, error: `Higgsfield không trả request_id: ${short(body)}` };
    }
    return { ok: true as const, requestId: String(json.request_id), status: (json.status ?? "queued") as HfStatus };
  });

/**
 * Hỏi trạng thái 1 lần. Khi ảnh xong:
 *  - có storagePath  → tải ảnh về, đẩy lên Supabase Storage, trả URL vĩnh viễn
 *  - không storagePath → trả thẳng URL của Higgsfield (chỉ sống ~7 ngày)
 *
 * Chỉ nhận requestId rồi tự dựng URL — không nhận status_url từ client để
 * server không bị lừa gọi sang địa chỉ bất kỳ.
 */
export const checkHiggsfieldImageServer = createServerFn({ method: "POST" })
  .inputValidator((data: { requestId: string; storagePath?: string }) => data)
  .handler(async ({ data }) => {
    const auth = authHeader();
    if (!auth) return { ok: false as const, error: "Chưa cấu hình khoá Higgsfield" };

    const requestId = (data.requestId ?? "").trim();
    if (!/^[A-Za-z0-9-]{8,64}$/.test(requestId)) {
      return { ok: false as const, error: "requestId không hợp lệ" };
    }

    let response: Response;
    try {
      response = await fetch(`${HF_BASE}/requests/${requestId}/status`, {
        headers: { Authorization: auth, Accept: "application/json" },
      });
    } catch (err: any) {
      return { ok: false as const, error: `Không hỏi được trạng thái: ${err.message}` };
    }

    const body = await response.text();
    if (!response.ok) {
      return { ok: false as const, error: `Higgsfield ${response.status}: ${short(body)}` };
    }

    let json: any;
    try {
      json = JSON.parse(body);
    } catch {
      return { ok: false as const, error: `Trạng thái trả về dữ liệu lạ: ${short(body)}` };
    }

    const status = (json?.status ?? "queued") as HfStatus;

    if (status === "failed" || status === "canceled" || status === "nsfw") {
      const reason =
        status === "nsfw"
          ? "ảnh bị chặn vì nội dung nhạy cảm — sửa prompt rồi thử lại"
          : (json?.error ?? "không rõ nguyên nhân");
      return { ok: false as const, status, error: `Higgsfield ${status}: ${reason}` };
    }

    if (status !== "completed") {
      return { ok: true as const, status, done: false as const };
    }

    const sourceUrl: string | undefined = json?.images?.[0]?.url;
    if (!sourceUrl) {
      return { ok: false as const, status, error: "Đã xong nhưng không có URL ảnh" };
    }

    if (!data.storagePath) {
      return { ok: true as const, status, done: true as const, url: sourceUrl, sourceUrl };
    }

    // Ảnh Higgsfield chỉ được giữ tối thiểu 7 ngày → copy sang Supabase Storage.
    const imageRes = await fetch(sourceUrl);
    if (!imageRes.ok) {
      return { ok: false as const, status, error: `Tải ảnh về lỗi: ${imageRes.status}` };
    }
    const buffer = Buffer.from(await imageRes.arrayBuffer());
    const isPng = sourceUrl.toLowerCase().includes(".png");

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL ?? "",
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
    );
    const { error } = await supabase.storage
      .from("product-images")
      .upload(data.storagePath, buffer, {
        contentType: isPng ? "image/png" : "image/jpeg",
        upsert: true,
      });
    if (error) return { ok: false as const, status, error: `Lưu Supabase lỗi: ${error.message}` };

    const {
      data: { publicUrl },
    } = supabase.storage.from("product-images").getPublicUrl(data.storagePath);
    return { ok: true as const, status, done: true as const, url: publicUrl, sourceUrl };
  });

export type HiggsfieldResult =
  | { ok: true; url: string; sourceUrl: string }
  | { ok: false; error: string };

/**
 * Helper phía trình duyệt: submit rồi poll cho tới khi có ảnh.
 * Mặc định chờ tối đa 4 phút, hỏi lại mỗi 3 giây.
 */
export async function generateHiggsfieldImage(opts: {
  prompt: string;
  storagePath?: string;
  aspectRatio?: string;
  resolution?: string;
  timeoutMs?: number;
  intervalMs?: number;
  onStatus?: (status: string) => void;
}): Promise<HiggsfieldResult> {
  const started = await startHiggsfieldImageServer({
    data: {
      prompt: opts.prompt,
      aspectRatio: opts.aspectRatio,
      resolution: opts.resolution,
    },
  });
  if (!started.ok) return { ok: false, error: started.error };

  const timeoutMs = opts.timeoutMs ?? 240_000;
  const intervalMs = opts.intervalMs ?? 3_000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const check = await checkHiggsfieldImageServer({
      data: { requestId: started.requestId, storagePath: opts.storagePath },
    });
    if (!check.ok) return { ok: false, error: check.error };
    opts.onStatus?.(check.status ?? "queued");
    if (check.done) return { ok: true, url: check.url!, sourceUrl: check.sourceUrl! };
  }
  return { ok: false, error: "Quá thời gian chờ Higgsfield (4 phút)" };
}
