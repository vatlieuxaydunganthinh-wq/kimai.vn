import { createServerFn } from "@tanstack/react-start";

const SYSTEM_PROMPT = `Bạn là trợ lý AI cá nhân của AnAn (sieuthisoai.com) — nền tảng thương mại điện tử sản phẩm số AI Việt Nam.

=== TÍNH CÁCH & PHONG CÁCH ===
• Thông minh, khéo léo, chân thành — như người bạn đồng hành, không như bot cứng nhắc
• Trả lời bằng tiếng Việt tự nhiên, ngắn gọn, đúng trọng tâm
• Dùng emoji phù hợp nhưng không lạm dụng
• KHÔNG dùng ngôn ngữ lệnh hay bullet point cứng nhắc — hãy nói chuyện như con người
• Khi chưa rõ → hỏi lại để hiểu đúng, đừng đoán mò

=== KHẢ NĂNG HỌC TẬP & GHI NHỚ ===
Bạn có bộ nhớ vĩnh viễn. Trong mỗi cuộc trò chuyện:
• Chủ động KHAI THÁC thông tin người dùng bằng câu hỏi tự nhiên — nghề nghiệp, mục tiêu, khó khăn hiện tại
• Khi học được điều quan trọng → LUÔN dùng tool remember_fact để lưu ngay
• Phiên sau tự động thông minh hơn vì đã có context từ trước
• Khi nhận phản hồi tiêu cực ("sai rồi", "không đúng", "không hài lòng") → ghi nhận, xin lỗi, điều chỉnh, lưu lại để không lặp sai lần sau

=== CÁCH ĐÀO SÂU THÔNG TIN ===
Tìm cơ hội tự nhiên để hỏi (1 câu mỗi lần, không hỏi dồn):
• "Bạn đang làm trong ngành gì vậy?"
• "Mục tiêu lớn nhất của bạn hiện tại là gì?"
• "Bạn đang gặp khó khăn gì với [chủ đề họ đề cập]?"
Sau khi họ trả lời → dùng remember_fact lưu ngay.

=== THÔNG TIN NỀN TẢNG ===
• Tên: AnAn — sieuthisoai.com | Chủ: Thịnh Phạm (@thinh.vua.app)
• Sản phẩm: Skill AI, App AI, Workflow tự động hóa, Tài liệu AI cho mọi ngành nghề
• Giá từ 5.000đ–300.000đ

=== ĐĂNG KÝ / ĐĂNG NHẬP ===
• Vào sieuthisoai.com → "Đăng nhập" → Đăng ký email + mật khẩu hoặc Google
• Sau đăng ký nhận email xác nhận → Click link kích hoạt
• Quên mật khẩu: "Quên mật khẩu" → nhận link reset qua email

=== PHÂN LOẠI SẢN PHẨM ===
1. SKILL AI (5k–79k): Kỹ năng AI từng ngành — marketing, bán hàng, content, thiết kế, tài chính, crypto
2. APP / WORKFLOW: Tự động hóa tạo ảnh/video hàng loạt, viết content, quản lý bán hàng
3. Tài liệu hướng dẫn: PDF/Doc dùng AI từ A–Z cho người mới
4. Tài khoản AI: Gemini Pro, ChatGPT Plus giá rẻ

=== CÁCH MUA HÀNG ===
Chọn SP → Nhập email+tên → Đặt hàng → Chuyển khoản → Nhận link qua email tự động (vài giây)

=== AFFILIATE ===
• Mua bất kỳ SP → tự nhận link affiliate cá nhân
• Chia sẻ link → có người mua → nhận hoa hồng (sau trừ phí vận hành và thuế)
• Xem Dashboard → mục Affiliate Dashboard | Rút tiền: nhập tài khoản ngân hàng trong Dashboard

=== HỖ TRỢ ===
• Zalo cộng đồng: Bấm "CSKH-ZALO" trên menu | Email: thinhqb102@gmail.com`;

export const chatWithAssistant = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      messages: { role: "user" | "assistant"; content: string }[];
      sessionId: string;
    }) => data
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return { ok: false as const, error: "Chưa cấu hình API key" };

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL ?? "",
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
    );

    // Load bộ nhớ
    const { data: memories } = await supabase
      .from("chat_memory")
      .select("content, importance")
      .eq("session_id", data.sessionId)
      .order("importance", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20);

    const memoryBlock =
      memories && memories.length > 0
        ? `\n\n=== BỘ NHỚ VỀ NGƯỜI DÙNG NÀY ===\n${memories.map((m: any) => `• ${m.content}`).join("\n")}\n(Dùng thông tin này để cá nhân hóa câu trả lời)`
        : "\n\n(Đây là lần đầu gặp người dùng này — hãy chủ động tìm hiểu về họ)";

    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });

    const tools: any[] = [
      {
        name: "search_products",
        description: "Tìm kiếm sản phẩm trên nền tảng AnAn theo từ khoá",
        input_schema: {
          type: "object",
          properties: {
            keyword: { type: "string", description: "Từ khoá tìm kiếm sản phẩm" },
          },
          required: ["keyword"],
        },
      },
      {
        name: "remember_fact",
        description: "Lưu thông tin quan trọng về người dùng vào bộ nhớ vĩnh viễn. Dùng khi học được thông tin mới về nghề nghiệp, mục tiêu, sở thích, phản hồi.",
        input_schema: {
          type: "object",
          properties: {
            content: { type: "string", description: "Nội dung cần ghi nhớ, viết rõ ràng đầy đủ" },
            importance: {
              type: "number",
              description: "Độ quan trọng 1-10. Phản hồi tiêu cực=9, nghề nghiệp/mục tiêu=8, sở thích=6",
            },
          },
          required: ["content", "importance"],
        },
      },
    ];

    const messages: any[] = data.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Agentic loop
    for (let i = 0; i < 5; i++) {
      const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: SYSTEM_PROMPT + memoryBlock,
        tools,
        messages,
      });

      if (response.stop_reason === "end_turn") {
        const text = response.content
          .filter((b: any) => b.type === "text")
          .map((b: any) => b.text)
          .join("");
        return { ok: true as const, reply: text };
      }

      if (response.stop_reason === "tool_use") {
        messages.push({ role: "assistant", content: response.content });

        const toolResults: any[] = [];
        for (const block of response.content) {
          if (block.type !== "tool_use") continue;

          let output = "";

          if (block.name === "search_products") {
            const keyword = (block.input as any).keyword ?? "";
            const { data: rows } = await supabase
              .from("member_products")
              .select("title,price_vnd,product_key")
              .ilike("title", `%${keyword}%`)
              .eq("status", "active")
              .limit(5);
            output = (rows ?? [])
              .map((r: any) => `• ${r.title} — ${Number(r.price_vnd).toLocaleString("vi-VN")}đ | /san-pham?mp=${r.product_key}`)
              .join("\n") || "Không tìm thấy sản phẩm phù hợp.";
          }

          if (block.name === "remember_fact") {
            const { content, importance } = block.input as any;
            await supabase.from("chat_memory").insert({
              session_id: data.sessionId,
              content: String(content),
              importance: Math.min(10, Math.max(1, Number(importance) || 5)),
            });
            output = "Đã lưu vào bộ nhớ.";
          }

          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: output,
          });
        }
        messages.push({ role: "user", content: toolResults });
        continue;
      }

      const text = response.content
        .filter((b: any) => b.type === "text")
        .map((b: any) => b.text)
        .join("");
      return { ok: true as const, reply: text || "Xin lỗi, tôi không hiểu. Bạn có thể nói lại không?" };
    }

    return { ok: true as const, reply: "Xin lỗi, tôi gặp sự cố. Vui lòng thử lại." };
  });
