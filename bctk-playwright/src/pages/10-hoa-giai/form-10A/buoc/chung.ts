import { ManHinh } from '../../../base.page';
import { PhienDangNhap } from '../../../common/login.page';

/**
 * Thao tác màn hình DÙNG CHUNG cho nhiều bước của luồng 10A.
 * Thao tác riêng của bước nào nằm ngay trong file bước đó. Giao diện đổi → chỉ sửa trong thư mục buoc/.
 */

/**
 * "hòa giải" trên màn viết lúc "hòa" lúc "hoà" (dấu đặt khác nhau là KÝ TỰ khác nhau) → khớp cả hai.
 * vd. hoaGiai('Phân công Thẩm phán hòa giải') khớp cả "…hoà giải".
 */
export const hoaGiai = (chu: string) =>
  new RegExp(chu.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/h(?:òa|oà)/gi, 'h(?:òa|oà)'), 'i');

/** [Bước 02, 03, 04] Mở chi tiết đơn theo link (bước 01 để lại) và chờ trang vẽ xong */
export async function moChiTietDon(phien: PhienDangNhap, urlDon: string): Promise<ManHinh> {
  await phien.vao(urlDon);
  const m = new ManHinh(phien.page);
  await m.page.locator('[role=tab][id$="-tab-thong-tin-chung"]').waitFor({ timeout: 60_000 });
  await m.choTaiXong(1500);
  return m;
}
