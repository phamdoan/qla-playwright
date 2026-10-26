import { ManHinh } from '../../../base.page';
import { PhienDangNhap } from '../../../common/login.page';

/**
 * Thao tác màn hình DÙNG CHUNG cho nhiều bước của luồng 2A.
 * Thao tác riêng của bước nào nằm ngay trong file bước đó. Giao diện đổi → chỉ sửa trong thư mục buoc/.
 */

/** [Bước 02–07] Mở chi tiết đơn theo link (bước 01 để lại) và chờ trang vẽ xong */
export async function moChiTietDon(phien: PhienDangNhap, urlDon: string): Promise<ManHinh> {
  await phien.vao(urlDon);
  const m = new ManHinh(phien.page);
  await m.page.locator('[role=tab][id$="-tab-thong-tin-chung"]').waitFor({ timeout: 60_000 });
  await m.choTaiXong(1500);
  return m;
}
