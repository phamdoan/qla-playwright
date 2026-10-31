import { Buoc } from '../../../common/buoc';
import { DonNguon, TrangThai5A } from '../cau-hinh-5A';
import { O_BIEU_MAU, daCoBieuMau, gio, luuTaiBanKy, moBieuMau, moVuAn } from './chung';

/**
 * BƯỚC 09 · Biên bản về kiểm tra việc giao nộp, tiếp cận, công khai chứng cứ (35-DS) (hướng dẫn bước 9)
 * (chỉ chọn được khi đã có thông báo 31-DS — phiên họp lần 1)
 *
 *  1. Tab "Chuẩn bị xét xử" → ô chọn biểu mẫu gõ "35" → "Thêm biểu mẫu"
 *  2. Chọn phiên họp = phiên họp lần 1 (31-DS bước 08) · Bắt đầu lúc 08:00 · Kết thúc lúc 09:30
 *  3. Tài liệu, chứng cứ được công khai · Ý kiến của đương sự — ngẫu nhiên
 *  4. "Lưu" → "Tải bản biên bản đã ký" (PDF mẫu) → "Xác nhận đã ký" → "Đóng"
 */
export const buoc09: Buoc<DonNguon, TrangThai5A> = {
  so: 9,
  ten: 'Biên bản kiểm tra việc giao nộp, tiếp cận, công khai chứng cứ (35-DS), tải bản đã ký',
  huongDan: '9',
  chay: async ({ vuAn, moPhien, tkToa, can }) => {
    const m = await moVuAn(await moPhien(tkToa(vuAn.toaAn)), can('urlVuAn', 6));
    await m.moTab('chuan-bi-xet-xu');
    if (await daCoBieuMau(m, /35-DS/)) return;

    const bm = await moBieuMau(m, O_BIEU_MAU.chuanBi, '35', 'Thêm biểu mẫu');
    await m.chon(bm, 'Chọn phiên họp', /Phiên họp lần 1/);
    await gio(m, bm, 'Bắt đầu lúc', '08:00');
    await gio(m, bm, 'Kết thúc lúc', '09:30');
    await m.nhap(bm, 'Tài liệu, chứng cứ', 'Đơn khởi kiện, hợp đồng lao động, bảng lương và các tài liệu do đương sự giao nộp');
    await m.nhap(bm, 'Ý kiến của đương sự', 'Các đương sự không có ý kiến bổ sung về tài liệu, chứng cứ');
    await luuTaiBanKy(m, bm);
  },
};
