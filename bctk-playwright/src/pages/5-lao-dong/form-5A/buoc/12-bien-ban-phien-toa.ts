import { Buoc } from '../../../common/buoc';
import { DonNguon, TrangThai5A } from '../cau-hinh-5A';
import { O_BIEU_MAU, daCoBieuMau, gio, luuTaiBanKy, moBieuMau, moVuAn } from './chung';
import { ngayLamViec } from '../../../../utils/fake-data';

/**
 * BƯỚC 12 · Biên bản phiên tòa sơ thẩm (48-DS) (hướng dẫn bước 12)
 *
 *  1. Tab "Xét xử" → ô "Loại biểu mẫu" chọn "Biên bản phiên tòa sơ thẩm (48-DS)" → "Thêm mới quyết định"
 *  2. Vào hồi (giờ, phút) = 08:00 (các ô khác hệ thống tự điền)
 *  3. "Lưu" → "Tải bản biên bản đã ký" (PDF mẫu) → "Xác nhận đã ký" → "Đóng"
 */
export const buoc12: Buoc<DonNguon, TrangThai5A> = {
  so: 12,
  ten: 'Biên bản phiên tòa sơ thẩm (48-DS), tải bản đã ký',
  huongDan: '12',
  chay: async ({ vuAn, tt, moPhien, tkToa, can }) => {
    const m = await moVuAn(await moPhien(tkToa(vuAn.toaAn)), can('urlVuAn', 6));
    await m.moTab('xet-xu');
    if (await daCoBieuMau(m, /Biên bản phiên tòa sơ thẩm/)) return;

    const bm = await moBieuMau(m, O_BIEU_MAU.xetXu, '48', 'Thêm mới quyết định');
    await gio(m, bm, 'Vào hồi', '08:00');
    // "Ngày mở phiên tòa" tự lấy theo lịch xét xử; lịch lỡ rơi sang tháng khác (Đơn 02: 29/09 trong khi QĐ ngày 29/10)
    // → ô báo đỏ, "Lưu" không qua → điền lại ngày xét xử của bước 10
    const ngayMo = m.oTheoNhan('Ngày mở phiên tòa', bm);
    const ngayDung = tt.ngayXetXu ?? ngayLamViec();
    if ((await ngayMo.count()) && (await m.docGiaTri('Ngày mở phiên tòa', bm)) !== ngayDung) await m.ngay(bm, 'Ngày mở phiên tòa', ngayDung);
    await luuTaiBanKy(m, bm);
  },
};
