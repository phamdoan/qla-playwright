import { Locator } from '@playwright/test';
import { ManHinh } from '../../../base.page';

/**
 * Thao tác màn hình DÙNG CHUNG cho nhiều bước của luồng 6B.
 * Màn chi tiết vụ án hành chính (sơ thẩm và phúc thẩm) giống luồng 6A → dùng lại các hàm của 6A.
 */
export {
  BAN_KY_MAU,
  chonNeuTrong,
  chonNguoiKy,
  daCoBieuMau,
  dungSo,
  gio,
  luuKyBieuMau,
  luuTaiBanKy,
  moBieuMau,
  moVuAn,
  popup,
} from '../../form-6A/buoc/chung';
/** Bản 5A nhận thêm tên người cần chọn (Thẩm phán chủ tọa = chủ tài khoản) */
export { themNguoiPhanCong } from '../../../5-lao-dong/form-5A/buoc/chung';
export { moDanhSach, ngauNhien } from '../../../5-lao-dong/form-5B/buoc/chung';

/**
 * Ô "Loại biểu mẫu" của tab "Xét xử" (mục "Văn bản tố tụng khác") — ô select đứng ngay trước nút "Thêm mới văn bản".
 * Ô giữ lựa chọn lần trước nên không tìm theo chữ gợi ý được.
 */
export const oBieuMauXetXu = (m: ManHinh): Locator =>
  m.page
    .locator('main')
    .locator('xpath=//button[contains(.,"Thêm mới văn bản")]/preceding-sibling::*[1]')
    .locator('xpath=descendant-or-self::div[contains(concat(" ",@class," ")," ant-select ")]')
    .first();

/** Mã định danh ở "Thông tin chung của vụ án" (VD: D01-2026-00001639) — giữ nguyên khi vụ lên phúc thẩm */
export async function docMaDinhDanh(m: ManHinh): Promise<string> {
  const chu = await m.page.locator('main').innerText();
  return (chu.match(/Mã định danh\s*:?\s*([A-Z]\d{2}-\d{4}-\d+)/) ?? ['', ''])[1];
}
