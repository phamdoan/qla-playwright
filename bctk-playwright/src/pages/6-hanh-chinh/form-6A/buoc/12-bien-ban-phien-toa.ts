import { Buoc } from '../../../common/buoc';
import { DonNguon, TrangThai6A } from '../cau-hinh-6A';
import { ngay } from '../../../../utils/fake-data';
import { BAN_KY_MAU, O_BIEU_MAU, daCoBieuMau, gio, luuTaiBanKy, moBieuMau, moVuAn } from './chung';

/**
 * BƯỚC 12 · Biên bản phiên tòa sơ thẩm (20-HC) (hướng dẫn B12)
 *
 *  1. Tab "Xét xử" → mục "Văn bản tố tụng khác" → ô "Loại biểu mẫu" chọn "Biên bản phiên tòa sơ thẩm (20-HC)" → "Thêm mới văn bản"
 *  2. Phần mở phiên tòa hệ thống tự điền theo lịch ở QĐ đưa vụ án ra xét xử
 *  3. Ý kiến của Viện kiểm sát · Vào hồi kết thúc phiên tòa (sau giờ mở phiên tòa) · Ngày kết thúc phiên tòa = hôm nay
 *     · Tệp đính kèm (PDF mẫu, bắt buộc)
 *  4. "Lưu" → "Tải bản biên bản đã ký" (PDF mẫu) → "Xác nhận đã ký" → "Đóng"
 */
export const buoc12: Buoc<DonNguon, TrangThai6A> = {
  so: 12,
  ten: 'Biên bản phiên tòa sơ thẩm (20-HC), tải bản đã ký',
  huongDan: 'B12',
  chay: async ({ vuAn, moPhien, tkToa, can }) => {
    const m = await moVuAn(await moPhien(tkToa(vuAn.toaAn)), can('urlVuAn', 7));
    await m.moTab('xet-xu');
    if (await daCoBieuMau(m, /Biên bản phiên tòa sơ thẩm/)) return;

    const bm = await moBieuMau(m, O_BIEU_MAU.xetXu, '20', 'Thêm mới văn bản');
    await m.nhap(bm, 'Ý kiến của Viện kiểm sát', 'Kiểm sát viên phát biểu: Thẩm phán, Hội đồng xét xử và người tham gia tố tụng đã chấp hành đúng quy định của Luật Tố tụng hành chính.');
    await gio(m, bm, /Vào hồi.*kết thúc phiên tòa/, `1${Math.floor(Math.random() * 6)}:30`);
    await m.ngay(bm, 'Ngày kết thúc phiên tòa', ngay(0));
    await m.oTheoNhan('Tệp đính kèm', bm).locator('input[type=file]').first().setInputFiles(BAN_KY_MAU);
    await m.page.waitForTimeout(1000);
    await luuTaiBanKy(m, bm);
  },
};
