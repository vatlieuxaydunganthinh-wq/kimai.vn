import landingThumb from "@/assets/landing-page-thumb.png";
import superPromptThumb from "@/assets/super-prompt-thumb.png";
import khoiNghiepThumb from "@/assets/khoi-nghiep-thumb.png";
import chatgptImage2Thumb from "@/assets/chatgpt-image2-thumb.png";
import troLyAiImage from "@/assets/tro-ly-ai-100.png";
import appAiImage from "@/assets/app-ai-50.png";
import comboTlapImage from "@/assets/combo-tlap.png";
import googleFlowImage from "@/assets/google-flow-thumb.png";
import appWfMyPhamImage from "@/assets/app-wf-my-pham.png";
import appAfTaoKolAiImage from "@/assets/app-af-tao-kol-ai.png";
import appFlThinhVuaImage from "@/assets/app-fl-thinh-vua.jpg";
import geminiProThumb from "@/assets/gemini-pro-thumb.png";
import sp28Thumb from "@/assets/sp28-video-dai-thumb.png";
import sp13Thumb from "@/assets/sp13-workflow-thumb.png";
import sp14Thumb from "@/assets/sp14-flow-video-thumb.png";
import sp15Thumb from "@/assets/sp15-anh-flow-thumb.png";
import sp16Thumb from "@/assets/sp16-setup-page-thumb.png";
import sp17Thumb from "@/assets/sp17-af3-poster-thumb.png";
import sp18Thumb from "@/assets/sp18-wf3-thumb.png";
import sp19Thumb from "@/assets/sp19-am-thuc-thumb.png";
import sp20Thumb from "@/assets/sp20-ky-yeu-thumb.png";
import sp21Thumb from "@/assets/sp21-review-dc-thumb.png";
import sp22Thumb from "@/assets/sp22-noi-that-thumb.png";
import sp23Thumb from "@/assets/sp23-am-thuc2-thumb.png";
import sp24Thumb from "@/assets/sp24-zoom21-thumb.png";
import sp25Thumb from "@/assets/sp25-zoom06-thumb.png";
import sp26Thumb from "@/assets/sp26-ai-studio-thumb.png";
import sp27Thumb from "@/assets/sp27-tro-ly-gpt-thumb.png";

export type AppProduct = {
  n: number;
  title: string;
  titleEn: string;
  desc: string;
  descEn: string;
  price?: string;
  priceVnd: string;
  codeFormat: string;
  codeExample: string;
  image: string;
  previewUrl?: string;
  productUrl?: string;
  thumbnailEnUrl?: string;
};

// Pre-generated Higgsfield EN thumbnails (same style as VI thumbnails, EN text)
export const enThumbnailUrls: Record<number, string> = {
  1: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260806_161825_5d3f6e56-d192-4429-87d2-4a24421febe0.png",
  2: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260806_170729_7ee74852-873b-475b-9cc0-2afe167aaf62.png",
  3: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260806_170936_0780fe43-a8c5-42fc-9fce-89991a442dea.png",
  4: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260806_171213_f76a4e62-8df7-4b8f-b8aa-29fc9d46af7c.png",
  5: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260806_171536_94938dc5-ba0d-43b0-a46c-39e509ba26ad.png",
  6: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260806_172022_1731a432-1932-4a17-a47b-564ccd3d052f.png",
  7: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260807_004225_cd2ca0db-c4f3-410c-b10e-84e791528a9f.png",
  8: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260807_004704_9c30e884-d16d-4009-86de-9de0244fb59e.png",
  9: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260807_005120_c8ba72f6-9ba0-4596-87be-b9913a23bab6.png",
  10: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260807_005600_3341e92e-3df3-4a6f-9ae9-4d4709b84d4f.png",
  11: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260807_010109_4c5e4cfc-45bc-4602-8702-8851c979b3b1.png",
  12: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260807_010520_30f8fbd5-4bcc-404e-8d73-3f60f7530cb3.png",
  13: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260807_010924_c5f06931-ff07-4379-b976-7e0739989a59.png",
  14: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260807_011339_8b111867-2e43-4463-9697-b712f6c382e4.png",
  15: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260807_011805_7052b8af-22b1-4b05-ae71-45bd08f58d11.png",
  16: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260807_012314_01311b8a-9bbd-4c2f-ba44-a2f3fbae96bc.png",
  17: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260807_012725_a9c8c838-c4bf-4bb0-93d2-00aeb848fcde.png",
  18: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260807_013215_8bc2bdc2-b2b6-44ab-9866-352b0362a71a.png",
  19: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260807_013623_fd329425-0817-4936-9f68-8a303a6c660c.png",
  20: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260807_014126_42679b79-dc33-48b4-b1de-97dcc3190077.png",
  21: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260807_015302_ae99e261-a375-405b-aa37-d484cd750650.png",
  22: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260807_015731_66e8c754-e26b-417f-b4c4-3c3a4d3f84b0.png",
  23: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260807_020204_38232492-bca5-40e3-8f85-03740ea83fdc.png",
  24: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260807_020725_5265b2e5-1572-481b-90d5-bba632832b84.png",
  25: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260807_021208_38a68c0f-f798-482d-a7cf-33565e970c43.png",
  26: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260802_081429_2d476a4f-6d02-4408-adb5-3fe7be58fe54.png",
  27: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260802_081436_bea1ab0e-1642-4c8b-ad85-b16cd5e415eb.png",
  28: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260802_081442_7dc263d0-7b37-448c-9968-a16bd355c8c2.png",
};

export const skillEnThumbnailUrls: Record<string, string> = {
  MP1THVA: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260802_090421_3bb41dd2-7f01-4bca-a3e9-34374b433440.png",
  MP2THVA: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260802_090424_50adad91-4025-40c9-8593-9b642d189a97.png",
  MP3THVA: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260802_090426_dc2b5537-8411-445a-9d85-111634e5f28b.png",
  MP4THVA: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260802_090429_50119cf3-a9e8-4b12-ab22-fa793c711599.png",
  MP5THVA: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260802_090431_24b9ff58-c100-4b59-82d2-9dcb75adb55b.png",
  MP6THVA: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260802_090442_76f1dc72-540d-4556-a7d7-f4ba10b540f0.png",
  MP7THVA: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260802_090444_81ae542a-fdfc-4a98-b695-a555fed2452a.png",
  MP8THVA: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260802_090445_43271a2c-3ed0-4ec0-95bd-28b8c225c7f7.png",
  MP9THVA: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260802_090447_caad7195-ac56-40a4-9f63-7be7095fa052.png",
  MP10THVA: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260802_090449_366844f8-4adf-4302-9dea-a48964311a5a.png",
  MP11THVA: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260802_090457_479ab282-56ec-46ca-9c2a-689c89af020b.png",
  MP12THVA: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260802_090458_cf34195e-47ea-4bfd-b90b-3cdd2e1319c5.png",
  MP13THVA: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260802_090501_1ee2ff40-670d-4f24-9a13-d5fecdf0b89c.png",
  MP14THVA: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260802_090503_2eba1dc0-731c-4b73-b7fe-5f04cf944cfd.png",
  MP15THVA: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260802_090504_e9a0769c-4603-4289-86f6-338bdb792670.png",
  MP871B04: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260802_095232_44133547-9c63-4865-81b1-1466b21f2153.png",
};

export const skillEnTitles: Record<string, string> = {
  MP1THVA: "AUTO CONTENT PIPELINE — AI-Powered Full Automation",
  MP2THVA: "AI AUTO WRITE & POST CONTENT — 365 Days Nonstop",
  MP3THVA: "AI AGENT — 24/7 Auto Business Task Manager",
  MP4THVA: "AI STABLECOIN WAVE HUNTER — Auto Passive Income",
  MP5THVA: "AI AFFILIATE VIDEO MACHINE — Produce Videos on Autopilot",
  MP6THVA: "YOUTUBE FACELESS VIDEO MACHINE — AI Content Creator",
  MP7THVA: "AI AFFILIATE SALES SCRIPT WRITER",
  MP8THVA: "AI VOICE AGENT SCRIPT WRITER — Auto Sales Scripts",
  MP9THVA: "AI CONTENT WRITER — Undetectable, Rank on Google",
  MP10THVA: "AI PRODUCT PHOTO CREATOR — Studio-Quality 8K Images",
  MP11THVA: "AI EMAIL MARKETING WRITER — 3x Open Rate Booster",
  MP12THVA: "AI LANDING PAGE BUILDER — Create Sales Pages Fast",
  MP13THVA: "AI FACEBOOK ADS OPTIMIZER — Boost ROAS 3.2x Auto",
  MP14THVA: "AI CUSTOMER SUPPORT CHATBOT — 24/7 Instant Reply",
  MP15THVA: "AI PRODUCT DESCRIPTION WRITER — Boost Conversions 40%",
  MP871B04: "AI AUTO PAGE POSTING — Full Setup Workflow Guide",
};

export const apps: AppProduct[] = [
  {
    n: 1,
    title: "HƯỚNG DẪN TẠO LANDING PAGE (WEB), TRANG BÁN HÀNG, TRANG CHUYỂN ĐỔI",
    titleEn: "Landing Page Builder Guide — Sales & Conversion Pages A-Z",
    desc: "Hướng dẫn chi tiết từ A–Z cách dùng AI để dựng landing page, trang bán hàng và trang chuyển đổi chuyên nghiệp.",
    descEn: "Step-by-step A-Z guide to using AI to build professional landing pages, sales pages, and conversion-optimized pages.",
    price: "6$", priceVnd: "79000", codeFormat: "LOVA<SĐT>", codeExample: "LOVA0367337799", image: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260806_160854_e60cb66d-fedd-47df-ac5f-5526ba580bf9.png",
    previewUrl: "https://www.facebook.com/reel/1001995869073404",
    productUrl: "https://docs.google.com/document/d/1cCcGRNUi_kypjHUI0uum3l6Moa3cXodTU3HpUvsEOXE/edit?usp=sharing",
  },
  {
    n: 2,
    title: "2$ = QUY TRÌNH TẠO POSTER + FREE CHAT GPT PLUS + KHO POSTER MẪU VỚI TẤT CẢ CÁC NGÀNH NGHỀ",
    titleEn: "$2 Poster Creation Workflow + Free ChatGPT Plus + Multi-Industry Template Vault",
    desc: "Trọn bộ giải pháp: quy trình tạo poster chuyên nghiệp từ A–Z, trải nghiệm ChatGPT Plus miễn phí, và kho poster mẫu đa ngành nghề – chỉnh sửa & dùng ngay.",
    descEn: "All-in-one solution: professional poster creation workflow A-Z, free ChatGPT Plus trial, and a multi-industry poster template library — edit and use instantly.",
    price: "6$", priceVnd: "55000", codeFormat: "GPT<SĐT>", codeExample: "GPT0367337799", image: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260806_162406_1c4687cb-bd67-4583-9727-8de0a8ed0eb5.png",
    productUrl: "https://docs.google.com/document/d/1m4kU9qiPkYhGoTqOhSfnN2llnwjGbWGbgG5rL1Cwb_Y/edit?usp=sharing",
  },
  {
    n: 3,
    title: "GIỚI THIỆU VỀ THỊNH VUA APP VÀ CỘNG ĐỒNG KHỞI NGHIỆP CÙNG AI",
    titleEn: "Intro to Thinh Vua App & AI Entrepreneurship Community",
    desc: "Khám phá Thịnh Vua App và cộng đồng khởi nghiệp cùng AI – kết nối, chia sẻ kinh nghiệm, ứng dụng AI vào thực tế và cùng nhau phát triển.",
    descEn: "Explore Thinh Vua App and the AI startup community — connect, share experience, apply AI in real life, and grow together.",
    price: "6$", priceVnd: "379000", codeFormat: "KN<SĐT>", codeExample: "KN0367337799", image: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260806_170850_07161231-90a6-4a6d-82a9-9eb1251a660a.png",
    previewUrl: "https://www.notion.so/TH-NH-VUA-APP-2bb9a30c0fba80cfb660ed69ab475dcb?source=copy_link",
  },
  {
    n: 4,
    title: "FULL QUY TRÌNH KIẾM 100TR MỖI THÁNG VỚI CHAT GPT IMAGE 2",
    titleEn: "Full Workflow: Earn $4,000/Month with ChatGPT Image 2",
    desc: "Trọn bộ quy trình thực chiến giúp bạn khai thác Chat GPT Image 2 để tạo nội dung, sản phẩm và kiếm tới 100 triệu mỗi tháng.",
    descEn: "Complete battle-tested workflow to leverage ChatGPT Image 2 for content creation, product building, and earning up to $4,000/month.",
    price: "15$", priceVnd: "79000", codeFormat: "GPT2<SĐT>", codeExample: "GPT20367337799", image: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260806_171051_7dd97185-21ac-44f7-a291-6434e1b42495.png",
    previewUrl: "https://www.facebook.com/reel/1455372752581227",
    productUrl: "https://docs.google.com/document/d/15FeVL2hK1fzVrX2pQB5LzYFsYqGV6iSLlqqO3SF20hE/edit?usp=sharing",
  },
  {
    n: 5,
    title: "QUÀ TẶNG 100+ TRỢ LÝ CHO ĐỦ CÁC NGÀNH NGHỀ",
    titleEn: "Gift Pack: 100+ AI Assistants for All Industries",
    desc: "Bộ sưu tập hơn 100 trợ lý AI được thiết kế chuyên biệt cho đa dạng ngành nghề – sẵn sàng dùng ngay.",
    descEn: "A curated collection of 100+ AI assistants purpose-built for diverse industries — ready to use immediately.",
    price: "6$", priceVnd: "55000", codeFormat: "TLA<SĐT>", codeExample: "TLA0367337799", image: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260806_171438_088583a4-8add-40f9-9976-4a94b84da137.png",
    productUrl: "https://docs.google.com/spreadsheets/d/1C-svW32rngDD5CZrfxmbg1JIUuIyCteD/edit?usp=sharing&ouid=115789862033738051198&rtpof=true&sd=true",
  },
  {
    n: 6,
    title: "QUÀ TẶNG 50+ APP PHỤC VỤ ĐỦ CÁC NGÀNH NGHỀ",
    titleEn: "Gift Pack: 50+ AI Apps for All Industries",
    desc: "Tổng hợp 50+ ứng dụng AI hữu ích phục vụ đa ngành nghề, giúp tối ưu công việc và tăng năng suất.",
    descEn: "A curated list of 50+ useful AI apps serving all industries, helping you optimize work and boost productivity.",
    price: "6$", priceVnd: "55000", codeFormat: "APP<SĐT>", codeExample: "APP0367337799", image: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260806_171854_758a5a9b-4473-487f-9509-ef9482c431b2.png",
    productUrl: "https://docs.google.com/spreadsheets/d/11TBW3yM-WQp_ITYyRKW1VOExcFtpILy_VQ6iiF5A2og/edit?usp=sharing",
  },
  {
    n: 7,
    title: "COMBO 100+ TRỢ LÝ AI + 50+ APP CHO ĐỦ CÁC NGÀNH NGHỀ",
    titleEn: "Combo: 100+ AI Assistants + 50+ Apps for All Industries",
    desc: "Trọn bộ combo: hơn 100 trợ lý AI và 50+ ứng dụng AI phục vụ đủ ngành nghề – tiết kiệm hơn khi mua chung.",
    descEn: "Complete combo: 100+ AI assistants and 50+ AI apps for all industries — save more when bundled together.",
    price: "9$", priceVnd: "86000", codeFormat: "TLAP<SĐT>", codeExample: "TLAP0367337799", image: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260807_004139_25d9a5ae-cd60-43f7-81f5-6fa9964c7eca.png",
  },
  {
    n: 8,
    title: "FULL TÀI LIỆU HƯỚNG DẪN BUILD APP TRÊN GOOGLE FLOW TỪ A-Z",
    titleEn: "Complete Guide: Build Apps on Google Flow A-Z (No Code Required)",
    desc: "Trọn bộ tài liệu hướng dẫn build app trên Google Flow từ A-Z: không cần code, AI powered, tự tạo app AI chỉ trong 30 phút.",
    descEn: "Complete documentation to build apps on Google Flow A-Z: no coding needed, AI-powered, create your own AI app in just 30 minutes.",
    price: "30$", priceVnd: "79000", codeFormat: "FLOW<SĐT>", codeExample: "FLOW0367337799", image: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260807_004620_fcefa630-e430-4d34-91eb-870db8eea355.png",
    previewUrl: "https://youtu.be/VIAI7LLzP8A?si=zZfPAc0p9h3G-QOR",
    productUrl: "https://docs.google.com/document/d/1LfwQTqo6p5wkaT8J4XiOfFdyeaQ9E5VPY7kOjzYusaA/edit?usp=sharing",
  },
  {
    n: 9,
    title: "APP WF-NGÀNH MỸ PHẨM",
    titleEn: "AI Cosmetics Workflow App — Batch Image & Video Creator",
    desc: "Tạo ảnh/video hàng loạt chỉ bằng một cú click chuột. Ảnh/video sắc nét, cao cấp – chuẩn ngành mỹ phẩm.",
    descEn: "Generate batches of high-quality cosmetics images and videos with a single click — professional-grade output.",
    price: "9$", priceVnd: "79000", codeFormat: "WMP<SĐT>", codeExample: "WMP0367337799", image: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260807_005032_d7b42ef3-c4c1-4c32-9f1b-9f5492597759.png",
    productUrl: "https://labs.google/fx/tools/flow/shared/tool/60a83d02-0695-44a2-96a2-25652a513ffa",
  },
  {
    n: 10,
    title: "APP AF-TẠO KOL AI",
    titleEn: "AI KOL Creator App — Build Your AI Brand Ambassador",
    desc: "Bao gồm cả APP và full quy trình hướng dẫn tạo KOL phù hợp với sản phẩm dịch vụ của bạn.",
    descEn: "Includes the APP and full workflow guide to create an AI KOL tailored to your products and services.",
    price: "9$", priceVnd: "79000", codeFormat: "FKOL<SĐT>", codeExample: "FKOL0367337799", image: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260807_005516_e2130bf8-d4e0-4ffe-9f4e-3f803278495f.png",
    previewUrl: "https://youtu.be/e91nmzVhRaI?si=qUgZqdWno7hKWWTh",
    productUrl: "https://docs.google.com/document/d/19xhW8z8_ilhvUDQOoSRCrXOt2REjvVrNfXX4uEGiCg8/edit?usp=sharing",
  },
  {
    n: 11,
    title: "APP FL-THỊNH VUA APP",
    titleEn: "High-Quality AI Image & Video Flow App",
    desc: "Tạo ảnh/video CHẤT LƯỢNG CAO.",
    descEn: "Create HIGH-QUALITY AI-generated images and videos effortlessly.",
    price: "6$", priceVnd: "55555", codeFormat: "FTVA<SĐT>", codeExample: "FTVA0367337799", image: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260807_010017_3548b53b-f09d-49e5-ae2e-99438123b5a8.png",
    previewUrl: "https://www.facebook.com/reel/966193426016186",
    productUrl: "https://labs.google/fx/tools/flow/shared/tool/6d4dfaad-189a-474c-a7d3-d026143c5ff8",
  },
  {
    n: 12,
    title: "TÀI KHOẢN GEMINI PRO GIÁ RẺ",
    titleEn: "Affordable Gemini Pro Account — Full Google AI Access",
    desc: "Tài khoản Gemini Pro chính chủ giá rẻ – trải nghiệm AI mạnh mẽ từ Google với đầy đủ tính năng Pro. Chi phí kích hoạt 199k - Tiết kiệm 2 triệu VND so với thị trường.",
    descEn: "Genuine Gemini Pro account at an affordable price — experience Google's powerful AI with full Pro features. Save $80+ compared to market rate.",
    price: "10$", priceVnd: "300000", codeFormat: "GEM<SĐT>", codeExample: "GEM0367337799", image: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260807_010435_c2ceed45-f4c4-4273-9be7-fe9dddbc56cb.png",
    productUrl: "https://gemini4thchinhchu.lovable.app",
  },
  {
    n: 13,
    title: "APP WORKFLOW CAO CẤP NHẤT - MỸ PHẨM 4",
    titleEn: "Premium Cosmetics Workflow App v4 — Pro Image & Video Creator",
    desc: "Tặng mọi người app workflow cao cấp nhất ngành mỹ phẩm – tạo ảnh/video chuyên nghiệp chỉ bằng một click.",
    descEn: "The most premium cosmetics AI workflow app — create professional images and videos with a single click.",
    priceVnd: "79000", codeFormat: "WF1<SĐT>", codeExample: "WF10367337799", image: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260807_010842_773dcf5a-59b0-4d0d-825e-839ebd8ac09b.png",
    productUrl: "https://labs.google/fx/tools/flow/shared/tool/60a83d02-0695-44a2-96a2-25652a513ffa",
    previewUrl: "https://youtu.be/ED1FwMpxnck?si=HVF2igsFawY2G-9L",
  },
  {
    n: 14,
    title: "APP FLOW TẠO VIDEO DÀI TỪ NỘI DUNG",
    titleEn: "Long-Form Video Generator App — Auto-Create from Content",
    desc: "App Flow giúp tạo video dài từ nội dung có sẵn – tự động hoá quy trình sản xuất video.",
    descEn: "AI Flow app that generates long-form videos from existing content — fully automated video production pipeline.",
    priceVnd: "79000", codeFormat: "FVID<SĐT>", codeExample: "FVID0367337799", image: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260807_011254_df997e04-b602-4743-b721-8f8b9e410ec2.png",
    productUrl: "https://docs.google.com/document/d/17Y5Q9_oTjGLBgJA45_vgRngWc5cAsDDGXqa4mh0-z_c/edit?usp=sharing",
  },
  {
    n: 15,
    title: "ANH FLOW TẠO ẢNH/VIDEO THỊNH VUA APP 3",
    titleEn: "AI Image & Video Flow Creator — Thinh Vua App v3",
    desc: "Anh Flow tạo ảnh/video Thịnh Vua App phiên bản 3 – nâng cấp chất lượng, dễ sử dụng.",
    descEn: "AI Flow image and video creator, Thinh Vua App version 3 — upgraded quality, easier to use.",
    priceVnd: "55000", codeFormat: "AF3V<SĐT>", codeExample: "AF3V0367337799", image: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260807_011723_abf91b89-6984-4e24-9634-c8eede465965.png",
    productUrl: "https://docs.google.com/document/d/1LfwQTqo6p5wkaT8J4XiOfFdyeaQ9E5VPY7kOjzYusaA/edit?usp=sharing",
    previewUrl: "https://youtu.be/ED1FwMpxnck?si=HVF2igsFawY2G-9L",
  },
  {
    n: 16,
    title: "HƯỚNG DẪN SETUP PAGE BÁN HÀNG TỰ ĐỘNG",
    titleEn: "Automated Sales Page Setup Guide",
    desc: "Hướng dẫn chi tiết cách setup page bán hàng tự động – tối ưu quy trình kinh doanh online.",
    descEn: "Detailed guide to setting up an automated sales page — optimize your online business workflow.",
    priceVnd: "33000", codeFormat: "PAGE<SĐT>", codeExample: "PAGE0367337799", image: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260807_012227_39a306a1-1326-41ae-a107-2e1bbecb1446.png",
    productUrl: "https://youtu.be/e20vbM63NKA?si=2kuDcS56k5AFGiMu",
  },
  {
    n: 17,
    title: "APP FLOW TẠO ẢNH/POSTER/VIDEO AF3 - THỊNH VUA APP",
    titleEn: "AI Image / Poster / Video Creator App AF3",
    desc: "App Flow tạo ảnh, poster, video AF3 – công cụ sáng tạo nội dung đa năng.",
    descEn: "AF3 AI Flow app for creating images, posters, and videos — a versatile content creation tool.",
    priceVnd: "55000", codeFormat: "AFP3<SĐT>", codeExample: "AFP30367337799", image: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260807_012635_b1c82145-c7e1-4139-8af6-ade7235d5101.png",
    productUrl: "https://labs.google/fx/tools/flow/shared/tool/eb31799a-9372-4c96-91d6-07d524cf1198",
    previewUrl: "https://www.facebook.com/reel/966193426016186",
  },
  {
    n: 18,
    title: "APP WORKFLOW WF3 - THỊNH VUA APP",
    titleEn: "AI Workflow App WF3 — Image, Poster & Video Creator",
    desc: "App workflow tạo ảnh/poster/video WF3 – phiên bản nâng cấp với nhiều tính năng mới.",
    descEn: "WF3 AI workflow app for images, posters, and videos — upgraded version with powerful new features.",
    priceVnd: "79000", codeFormat: "AWF3<SĐT>", codeExample: "AWF30367337799", image: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260807_013133_ef5ea6d4-26a1-4c1c-a9c5-a4cf5065a108.png",
    productUrl: "https://labs.google/fx/tools/flow/shared/tool/6d4dfaad-189a-474c-a7d3-d026143c5ff8",
    previewUrl: "https://www.facebook.com/reel/1462935648917863",
  },
  {
    n: 19,
    title: "APP REVIEW ẨM THỰC",
    titleEn: "AI Food & Restaurant Review Content Creator",
    desc: "App review ẩm thực – tạo nội dung review nhà hàng, quán ăn chuyên nghiệp bằng AI.",
    descEn: "AI-powered food and restaurant review app — create professional review content for restaurants and eateries.",
    priceVnd: "55000", codeFormat: "AMTH<SĐT>", codeExample: "AMTH0367337799", image: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260807_013537_4369f5a4-09b2-4596-9523-7d15458173f4.png",
    productUrl: "https://labs.google/fx/tools/flow/shared/tool/34951af0-a207-456d-80be-eb87b80fb2ad",
    previewUrl: "https://www.facebook.com/share/v/1H9PNfjRAu/",
  },
  {
    n: 20,
    title: "APP TẠO ẢNH/POSTER/VIDEO KỶ YẾU",
    titleEn: "AI Yearbook & Graduation Photo / Video Creator",
    desc: "App tạo ảnh, poster, video kỷ yếu – lưu giữ kỷ niệm đẹp với AI.",
    descEn: "AI app for creating yearbook and graduation photos, posters, and videos — preserve beautiful memories with AI.",
    priceVnd: "46000", codeFormat: "KYEU<SĐT>", codeExample: "KYEU0367337799", image: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260807_014042_da900b9c-4bf5-45ed-b110-36e9cb18c3f9.png",
    productUrl: "https://labs.google/fx/tools/flow/shared/tool/65139d18-2478-44a8-b552-7f3446422d07",
    previewUrl: "https://www.facebook.com/reel/2070201747187232",
  },
  {
    n: 21,
    title: "APP REVIEW ĐỊA CHỈ/CƠ SỞ/BẢNG HIỆU KINH DOANH",
    titleEn: "AI Business Location & Signage Review Creator",
    desc: "App review địa chỉ, cơ sở, bảng hiệu kinh doanh – quảng bá doanh nghiệp bằng AI.",
    descEn: "AI app to create review content for business locations, premises, and signage — promote your business with AI.",
    priceVnd: "79000", codeFormat: "RVDC<SĐT>", codeExample: "RVDC0367337799", image: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260807_015213_2347ccdf-0eb3-4b84-a531-dd77f0d742a1.png",
    productUrl: "https://labs.google/fx/tools/flow/shared/tool/378d8584-3af5-428a-a369-0a9933aca1e6",
    previewUrl: "https://www.facebook.com/share/v/18w8fbcVL6/",
  },
  {
    n: 22,
    title: "APP NỘI THẤT",
    titleEn: "AI Interior Design Creator App",
    desc: "App nội thất – tạo ảnh thiết kế nội thất chuyên nghiệp bằng AI, phù hợp cho kiến trúc sư và nhà thiết kế.",
    descEn: "AI interior design app — create professional interior design images, perfect for architects and designers.",
    priceVnd: "79000", codeFormat: "NOTH<SĐT>", codeExample: "NOTH0367337799", image: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260807_015641_6a9f1af3-34e9-4dcd-8033-29595b38da1e.png",
    productUrl: "https://labs.google/fx/tools/flow/shared/tool/b422bca7-ff9f-4dd4-b6de-48b265268bf7",
    previewUrl: "https://www.facebook.com/reel/1396956285788119",
  },
  {
    n: 23,
    title: "APP REVIEW ẨM THỰC V2",
    titleEn: "AI Food & Restaurant Review Creator v2",
    desc: "App review ẩm thực phiên bản 2 – nâng cấp chất lượng nội dung review ẩm thực.",
    descEn: "Food and restaurant review creator v2 — upgraded AI-quality content for food review creation.",
    priceVnd: "79000", codeFormat: "AMT2<SĐT>", codeExample: "AMT20367337799", image: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260807_020116_652ae3cc-ac5e-4402-ab19-464ef0cd6475.png",
    productUrl: "https://labs.google/fx/tools/flow/shared/tool/34951af0-a207-456d-80be-eb87b80fb2ad",
    previewUrl: "https://www.facebook.com/reel/2540698446360158",
  },
  {
    n: 24,
    title: "ZOOM ĐỊNH HƯỚNG 21/6/2026 CHO NGƯỜI MỚI",
    titleEn: "Beginner Orientation Zoom Session — June 21, 2026",
    desc: "Video Zoom định hướng ngày 21/6/2026 – hướng dẫn chi tiết cho người mới bắt đầu.",
    descEn: "Zoom orientation session recording from June 21, 2026 — detailed guide for complete beginners.",
    priceVnd: "22000", codeFormat: "ZM21<SĐT>", codeExample: "ZM210367337799", image: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260807_020638_3cebe1c5-50b5-4eb7-b0e4-3855123b3254.png",
    productUrl: "https://drive.google.com/file/d/1oOtGeGstKVQ34h3g9UTWrnUuziv3AgKS/view?usp=sharing",
  },
  {
    n: 25,
    title: "ZOOM 6/6/2026 - HƯỚNG DẪN CÔNG CỤ ĐƠN GIẢN CHO NGƯỜI MỚI",
    titleEn: "Simple AI Tools Zoom Session for Beginners — June 6, 2026",
    desc: "Video Zoom ngày 6/6/2026 – hướng dẫn các công cụ đơn giản cho người mới bắt đầu.",
    descEn: "Zoom session recording from June 6, 2026 — simple AI tools walkthrough for complete beginners.",
    priceVnd: "22000", codeFormat: "ZM06<SĐT>", codeExample: "ZM060367337799", image: "https://d8j0ntlcm91z4.cloudfront.net/user_34DrzROVtzmncohERRhpheIFTqb/hf_20260807_021118_3c436446-fd5c-4845-ac64-9d804b150d79.png",
    productUrl: "https://drive.google.com/file/d/1XBN_1Dj56dcMPw9pudnf0hv4KnxtvLWY/view?usp=sharing",
  },
  {
    n: 26,
    title: "QUY TRÌNH TẠO MỌI LOẠI APP TRÊN GOOGLE AI STUDIO",
    titleEn: "Complete Workflow: Build Any App on Google AI Studio",
    desc: "Quy trình tạo mọi loại app trên Google AI Studio – từ ý tưởng đến sản phẩm hoàn chỉnh.",
    descEn: "End-to-end workflow to build any type of app on Google AI Studio — from idea to finished product.",
    priceVnd: "88000", codeFormat: "GAIS<SĐT>", codeExample: "GAIS0367337799", image: sp26Thumb,
    productUrl: "https://youtu.be/kIWODyBMh2E?si=LBX0UIuHVzjamsUj",
  },
  {
    n: 27,
    title: "QUY TRÌNH TỰ TẠO MỌI TRỢ LÝ CHAT GPT",
    titleEn: "Complete Workflow: Create Any Custom ChatGPT Assistant",
    desc: "Quy trình tự tạo mọi trợ lý Chat GPT – tuỳ biến AI theo nhu cầu cá nhân và doanh nghiệp.",
    descEn: "Full workflow to build any custom ChatGPT assistant — personalize AI for individual or business needs.",
    priceVnd: "86868", codeFormat: "TRGP<SĐT>", codeExample: "TRGP0367337799", image: sp27Thumb,
    productUrl: "https://youtu.be/QQNvpYbQ_M8?si=DUrWdFeH363aMnHN",
  },
  {
    n: 28,
    title: "APP TẠO VIDEO DÀI TỪ NỘI DUNG (TEXT)",
    titleEn: "Long Video Creator from Text Content — AI Automated",
    desc: "Chỉ cần nhập nội dung + thời lượng là ra video dài. Tự động tạo video chuyên nghiệp từ văn bản.",
    descEn: "Just enter your content and desired duration — get a professional long-form video automatically generated from text.",
    priceVnd: "79000", codeFormat: "VDAI<SĐT>", codeExample: "VDAI0367337799", image: sp28Thumb,
    productUrl: "https://docs.google.com/document/d/17Y5Q9_oTjGLBgJA45_vgRngWc5cAsDDGXqa4mh0-z_c/edit?usp=sharing",
    previewUrl: "https://youtu.be/Uf7sSr7jQGU",
  },
];
