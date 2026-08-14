/**
 * Logo thương hiệu AnAn — dấu hiệu hình trái tim tạo bởi chiếc lá.
 *
 * Vẽ bằng SVG nội tuyến thay vì dùng file ảnh, vì:
 *   - sắc nét ở mọi kích thước (logo hiển thị ở 32px trên header, ảnh raster
 *     ở cỡ này sẽ bị rỗ)
 *   - không thêm request mạng, không có khoảnh khắc logo chưa kịp tải
 *   - nét kế thừa `currentColor` nên tự đổi màu theo ngữ cảnh: trắng trên
 *     nền xanh của header, xanh thương hiệu khi đặt trên nền sáng
 *
 * ĐỔI SANG FILE LOGO GỐC:
 * Nếu muốn dùng đúng file vector của bộ nhận diện, lưu nó vào
 * `public/anan-logo.svg` rồi thay phần <svg> bên dưới bằng:
 *     <img src="/anan-logo.svg" alt="AnAn" className={className} />
 * Phần chữ "AnAn" nằm riêng ở component AnAnWordmark, không đụng tới.
 */

export function AnAnMark({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="AnAn"
    >
      {/* Viền trái tim */}
      <path
        d="M50 88C22 68 6 50 6 32 6 16 24 8 38 16c6 3 10 8 12 13 2-5 6-10 12-13 14-8 32 0 32 16 0 18-16 36-44 56Z"
        strokeWidth="7"
      />
      {/* Gân chính của lá, chạy từ chóp dưới lên */}
      <path d="M50 86V33" strokeWidth="5" />
      {/* Gân phụ toả đều hai bên */}
      <g strokeWidth="4">
        <path d="M50 74 27 56M50 60 25 42M50 46 30 30" />
        <path d="M50 74l23-18M50 60l25-18M50 46l20-16" />
      </g>
    </svg>
  );
}

/**
 * Phần chữ. Chữ "An" thứ hai dùng màu nhấn để giữ nhịp hai tông vốn có của
 * header. Truyền accentClassName="text-primary" khi đặt trên nền sáng.
 */
export function AnAnWordmark({
  className = "",
  accentClassName = "text-yellow-300",
}: {
  className?: string;
  accentClassName?: string;
}) {
  return (
    <span className={className}>
      An<span className={accentClassName}>An</span>
    </span>
  );
}
