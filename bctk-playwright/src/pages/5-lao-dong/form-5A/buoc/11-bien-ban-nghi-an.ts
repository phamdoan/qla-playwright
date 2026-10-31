import { Buoc } from '../../../common/buoc';
import { DonNguon, TrangThai5A } from '../cau-hinh-5A';
import { ngay } from '../../../../utils/fake-data';
import { O_BIEU_MAU, daCoBieuMau, gio, luuTaiBanKy, moBieuMau, moVuAn } from './chung';

/**
 * BƯỚC 11 · Biên bản nghị án (51-DS) (hướng dẫn bước 11)
 *
 *  1. Tab "Xét xử" → ô "Loại biểu mẫu" chọn "Biên bản nghị án (51-DS)" → "Thêm mới quyết định"
 *  2. Vào hồi bắt đầu 08:00 · Ngày bắt đầu nghị án = hôm nay · Địa điểm, Căn cứ, Ý kiến thảo luận — ngẫu nhiên
 *     · Vào hồi kết thúc 09:30 (phải SAU giờ bắt đầu, không thì "Hệ thống vừa gặp lỗi") · Ngày kết thúc = hôm nay
 *  3. "Lưu" → "Tải bản biên bản đã ký" (PDF mẫu) → "Xác nhận đã ký" → "Đóng"
 */
export const buoc11: Buoc<DonNguon, TrangThai5A> = {
  so: 11,
  ten: 'Biên bản nghị án (51-DS), tải bản đã ký',
  huongDan: '11',
  chay: async ({ vuAn, moPhien, tkToa, can }) => {
    const m = await moVuAn(await moPhien(tkToa(vuAn.toaAn)), can('urlVuAn', 6));
    await m.moTab('xet-xu');
    if (await daCoBieuMau(m, /Biên bản nghị án/)) return;

    const bm = await moBieuMau(m, O_BIEU_MAU.xetXu, '51', 'Thêm mới quyết định');
    await gio(m, bm, /Vào hồi.*bắt đầu/, '08:00');
    await m.ngay(bm, 'Ngày bắt đầu nghị án', ngay(0));
    await m.nhap(bm, 'Địa điểm nghị án', 'Phòng nghị án');
    await m.nhap(bm, 'Căn cứ nghị án', 'Căn cứ tài liệu, chứng cứ đã được kiểm tra tại phiên tòa và kết quả tranh tụng');
    await m.nhap(bm, 'Ý kiến thảo luận', 'Hội đồng xét xử thống nhất chấp nhận yêu cầu khởi kiện của người khởi kiện');
    await gio(m, bm, /Vào hồi.*kết thúc/, '09:30');
    await m.ngay(bm, 'Ngày kết thúc nghị án', ngay(0));
    await luuTaiBanKy(m, bm);
  },
};
