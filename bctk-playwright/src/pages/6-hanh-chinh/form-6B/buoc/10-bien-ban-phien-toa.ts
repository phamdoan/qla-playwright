import { Buoc } from '../../../common/buoc';
import { TrangThai6B, VuAn6B } from '../cau-hinh-6B';
import { BAN_KY_MAU, daCoBieuMau, gio, luuTaiBanKy, moBieuMau, moVuAn, oBieuMauXetXu } from './chung';

/**
 * BƯỚC 10 · Tòa phúc thẩm · Biên bản phiên tòa phúc thẩm (45-HC) (hướng dẫn bước 10)
 *
 *  1. Tab "Xét xử" → mục "Văn bản tố tụng khác" → ô loại biểu mẫu chọn "Biên bản phiên tòa phúc thẩm (45-HC)" → "Thêm mới văn bản"
 *  2. Phần mở phiên tòa hệ thống tự điền theo lịch ở QĐ 36-HC
 *  3. Ý kiến của Viện kiểm sát · Vào hồi kết thúc phiên tòa 09:30 (trước giờ nghị án ở bước 11) · Tệp đính kèm (PDF mẫu, bắt buộc)
 *  4. "Lưu" → "Tải bản biên bản đã ký" (PDF mẫu) → "Xác nhận đã ký" → "Đóng"
 */
export const buoc10: Buoc<VuAn6B, TrangThai6B> = {
  so: 10,
  ten: 'Tòa phúc thẩm · Biên bản phiên tòa phúc thẩm (45-HC), tải bản đã ký',
  huongDan: '10',
  chay: async ({ vuAn, moPhien, tkToa, can }) => {
    const m = await moVuAn(await moPhien(tkToa(vuAn.toaPhucTham)), can('urlVuAnPT', 7));
    await m.moTab('xet-xu');
    if (await daCoBieuMau(m, /Biên bản phiên tòa phúc thẩm/)) return;

    const bm = await moBieuMau(m, oBieuMauXetXu, '45', 'Thêm mới văn bản');
    await m.nhap(bm, 'Ý kiến của Viện kiểm sát', 'Kiểm sát viên đề nghị Hội đồng xét xử không chấp nhận kháng cáo, giữ nguyên bản án sơ thẩm.');
    await gio(m, bm, /Vào hồi.*kết thúc phiên tòa/, '09:30');
    await m.oTheoNhan('Tệp đính kèm', bm).locator('input[type=file]').first().setInputFiles(BAN_KY_MAU);
    await m.page.waitForTimeout(1000);
    await luuTaiBanKy(m, bm);
  },
};
