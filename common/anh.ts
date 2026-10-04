/**
 * CHỤP ẢNH TIẾN TRÌNH — để dựng video từ ảnh.
 *
 * Ba mức, bật bằng cờ của `tools/chay-ui.js`:
 *   · `--anh`            : ảnh MỐC — biểu mẫu lúc đã điền (trước khi Lưu) + màn sau khi bước xong.
 *   · `--anh-tat-ca`     : thêm ảnh THEO NHỊP trong suốt bước (mặc định 1 giây/ảnh) → đủ dựng video.
 *   · `--anh-nhip=<ms>`  : đổi nhịp (vd. 500 cho mượt hơn, 2000 cho nhẹ đĩa).
 *
 * Vì sao không quay video của Playwright: ảnh rời cho phép tự dựng, tự chọn tốc độ, và xem từng khung
 * mà không cần giải mã; còn khung hình trong trace thì bị thu nhỏ sẵn (~800px) nên phóng lên là vỡ.
 *
 * Định dạng: JPEG chất lượng 70 (~120–180 KB mỗi ảnh ở 1920×1080). Một bước 3 phút ở nhịp 1 giây là
 * ~180 ảnh ≈ 25 MB, cả luồng 45 bước ≈ 600–900 MB — cân nhắc nhịp trước khi chạy cả luồng.
 */
import { Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/** Bật chụp ảnh (cờ --anh hoặc --anh-tat-ca) */
export const coChupAnh = () => process.env.QLA_ANH === '1';
/** Có chụp theo nhịp suốt bước không (cờ --anh-tat-ca) */
export const coChupLienTuc = () => process.env.QLA_ANH_TAT_CA === '1';

const sach = (s: string) =>
  s
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);

/**
 * Bắt đầu chụp theo nhịp cho tới khi gọi hàm trả về.
 *
 * Nuốt mọi lỗi: trang đang điều hướng hoặc đã đóng thì bỏ qua khung đó, KHÔNG được làm hỏng bước.
 */
export function batDauChupLienTuc(page: Page, tienTo: string): () => Promise<void> {
  if (!coChupAnh() || !coChupLienTuc() || !tienTo) return async () => {};
  const nhip = Math.max(300, Number(process.env.QLA_ANH_NHIP || '1000'));
  const thuMuc = `${tienTo}-tien-trinh`;
  fs.mkdirSync(path.dirname(thuMuc), { recursive: true });
  let so = 0;
  let dangChup = false;
  const hen = setInterval(async () => {
    if (dangChup || page.isClosed()) return;
    dangChup = true;
    so++;
    await page
      .screenshot({ path: `${thuMuc}/${String(so).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 70 })
      .catch(() => undefined);
    dangChup = false;
  }, nhip);
  return async () => {
    clearInterval(hen);
    // chờ khung đang chụp dở ghi xong
    for (let i = 0; i < 10 && dangChup; i++) await new Promise(r => setTimeout(r, 100));
  };
}

/** Số thứ tự ảnh mốc trong một bước — nhiều biểu mẫu trong cùng bước không đè ảnh nhau */
let soAnhMoc = 0;
let tienToTruoc = '';

/**
 * Ảnh MỐC: gọi ở những khoảnh khắc đáng giữ (biểu mẫu đã điền, ngay trước khi Lưu).
 * Không có tiền tố thì bỏ qua — nghĩa là đang chạy spec dò/mở tay, không phải luồng.
 */
export async function chupAnhMoc(page: Page, nhan = ''): Promise<void> {
  if (!coChupAnh()) return;
  const tienTo = process.env.QLA_ANH_TIEN_TO;
  if (!tienTo) return;
  if (tienTo !== tienToTruoc) {
    tienToTruoc = tienTo;
    soAnhMoc = 0;
  }
  soAnhMoc++;
  const ten = sach(nhan);
  await page
    .screenshot({ path: `${tienTo}-nhap-${String(soAnhMoc).padStart(2, '0')}${ten ? ' ' + ten : ''}.png` })
    .catch(() => undefined);
}
