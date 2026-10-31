import { ManHinh } from '../../../base.page';
import { PhienDangNhap } from '../../../common/login.page';

/**
 * Thao tác màn hình DÙNG CHUNG cho nhiều bước của luồng 5B.
 * Màn chi tiết vụ án dân sự/lao động (sơ thẩm và phúc thẩm) giống luồng 5A → dùng lại các hàm của 5A.
 */
export {
  BAN_KY_MAU,
  chonNeuTrong,
  chonNguoiKy,
  daCoBieuMau,
  dungSo,
  moBieuMau,
  O_BIEU_MAU,
  gio,
  luuKyBieuMau,
  luuTaiBanKy,
  moVuAn,
  popup,
  themNguoiPhanCong,
} from '../../form-5A/buoc/chung';

/** Mở trang danh sách theo menu rồi chờ bảng tải xong */
export async function moDanhSach(phien: PhienDangNhap, ...duong: string[]): Promise<ManHinh> {
  const m = new ManHinh(phien.page);
  // Trang chủ hiện xong đôi khi tự nhảy sang 404 → chờ thấy sidebar, không thấy thì vào lại
  await phien.vaoCho('dashboard', m.page.locator('.sb-book a.nav-item').first());
  await m.moMenu(...duong);
  await m.choBang(m.page.locator('main'));
  return m;
}

export const ngauNhien = <T>(ds: T[]) => ds[Math.floor(Math.random() * ds.length)];
