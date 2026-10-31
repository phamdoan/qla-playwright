import { Buoc } from '../../../common/buoc';
import { DonNguon, TrangThai6A } from '../cau-hinh-6A';
import { ngay } from '../../../../utils/fake-data';
import { O_BIEU_MAU, daCoBieuMau, gio, luuTaiBanKy, moBieuMau, moVuAn } from './chung';

/**
 * BƯỚC 13 · Biên bản nghị án (21-HC) (hướng dẫn B13) — chỉ có trong danh sách khi đã có biên bản phiên tòa 20-HC (bước 12)
 *
 *  1. Tab "Xét xử" → ô "Loại biểu mẫu" chọn "Biên bản nghị án (21-HC)" → "Thêm mới văn bản"
 *  2. Vào hồi bắt đầu 16:00 · Ngày bắt đầu = hôm nay · Căn cứ, Ý kiến thảo luận — ngẫu nhiên
 *     · Vào hồi kết thúc 16:45 (phải SAU giờ bắt đầu; sau cả giờ kết thúc phiên tòa ở bước 12) · Ngày kết thúc = hôm nay
 *     (Tòa án, Địa điểm nghị án hệ thống tự điền)
 *  3. "Lưu" → "Tải bản biên bản đã ký" (PDF mẫu) → "Xác nhận đã ký" → "Đóng"
 */
export const buoc13: Buoc<DonNguon, TrangThai6A> = {
  so: 13,
  ten: 'Biên bản nghị án (21-HC), tải bản đã ký',
  huongDan: 'B13',
  chay: async ({ vuAn, moPhien, tkToa, can }) => {
    const m = await moVuAn(await moPhien(tkToa(vuAn.toaAn)), can('urlVuAn', 7));
    await m.moTab('xet-xu');
    if (await daCoBieuMau(m, /Biên bản nghị án/)) return;

    const bm = await moBieuMau(m, O_BIEU_MAU.xetXu, '21', 'Thêm mới văn bản');
    await gio(m, bm, /Vào hồi.*bắt đầu nghị án/, '16:00');
    await m.ngay(bm, 'Ngày bắt đầu nghị án', ngay(0));
    await m.nhap(bm, 'Căn cứ nghị án', 'Căn cứ tài liệu, chứng cứ đã được xem xét tại phiên tòa, kết quả tranh tụng tại phiên tòa và quy định của Luật Tố tụng hành chính');
    await m.nhap(bm, 'Ý kiến thảo luận', 'Hội đồng xét xử thảo luận, biểu quyết thống nhất chấp nhận yêu cầu khởi kiện của người khởi kiện');
    await gio(m, bm, /Vào hồi.*kết thúc nghị án/, '16:45');
    await m.ngay(bm, 'Ngày kết thúc nghị án', ngay(0));
    await luuTaiBanKy(m, bm);
  },
};
