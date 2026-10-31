import { Buoc } from '../../../common/buoc';
import { TrangThai5B, VuAn5B } from '../cau-hinh-5B';
import { ngay } from '../../../../utils/fake-data';
import { O_BIEU_MAU, daCoBieuMau, gio, luuTaiBanKy, moBieuMau, moVuAn } from './chung';
import { moKetQuaQuyetDinh } from './08-bien-ban-nghi-an';

/**
 * BƯỚC 09 · Tòa phúc thẩm · Biên bản phiên tòa phúc thẩm (73-DS) (hướng dẫn bước 9)
 *
 *  1. Tab "Xét xử" › "Kết quả xét xử" (loại "Quyết định") → ô chọn biểu mẫu "Biên bản phiên tòa phúc thẩm (73-DS)" → "Thêm mới quyết định"
 *  2. Báo cáo của Thư ký · Nội dung tranh tụng · Phát biểu của Kiểm sát viên · Kết thúc phiên tòa — ngẫu nhiên
 *     · Phiên tòa kết thúc vào hồi = hôm nay 11:30 (các ô khác hệ thống điền sẵn)
 *  3. "Lưu" → "Tải bản biên bản đã ký" (PDF mẫu) → "Xác nhận đã ký" → "Đóng"
 */
export const buoc09: Buoc<VuAn5B, TrangThai5B> = {
  so: 9,
  ten: 'Tòa phúc thẩm · Biên bản phiên tòa phúc thẩm (73-DS), tải bản đã ký',
  huongDan: '9',
  chay: async ({ vuAn, moPhien, tkToa, can }) => {
    const m = await moVuAn(await moPhien(tkToa(vuAn.toaPhucTham)), can('urlVuAnPT', 4));
    await moKetQuaQuyetDinh(m);
    if (await daCoBieuMau(m, /Biên bản phiên tòa phúc thẩm/)) return;

    const bm = await moBieuMau(m, O_BIEU_MAU.xetXu, '73', 'Thêm mới quyết định');
    await m.nhap(bm, 'Báo cáo của Thư ký', 'Thư ký báo cáo sự có mặt, vắng mặt của những người tham gia phiên tòa');
    await m.nhap(bm, 'Nội dung tranh tụng', 'Các đương sự trình bày ý kiến về nội dung kháng nghị và tranh luận tại phiên tòa');
    await m.nhap(bm, 'Phát biểu của Kiểm sát viên', 'Kiểm sát viên đề nghị Hội đồng xét xử chấp nhận kháng nghị, sửa bản án sơ thẩm');
    await m.nhap(bm, 'Kết thúc phiên tòa', 'Hội đồng xét xử tuyên án');
    await gio(m, bm, 'Phiên tòa kết thúc vào hồi', `${ngay(0)} 11:30`);
    await luuTaiBanKy(m, bm);
  },
};
