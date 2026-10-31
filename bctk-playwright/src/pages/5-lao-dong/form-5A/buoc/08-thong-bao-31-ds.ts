import { Buoc } from '../../../common/buoc';
import { DonNguon, TrangThai5A } from '../cau-hinh-5A';
import { ngay } from '../../../../utils/fake-data';
import { O_BIEU_MAU, chonNeuTrong, daCoBieuMau, dungSo, gio, luuKyBieuMau, moBieuMau, moVuAn } from './chung';

/**
 * BƯỚC 08 · Thông báo về phiên họp kiểm tra việc giao nộp, tiếp cận, công khai chứng cứ và hòa giải (31-DS) (hướng dẫn bước 8)
 *
 *  1. Tab "Chuẩn bị xét xử" → ô chọn biểu mẫu gõ "31" → "Thêm biểu mẫu"
 *  2. Ngày thông báo = hôm nay · "Dùng số" · Người ký ban hành = chủ tài khoản (trống thì chọn)
 *  3. Giờ mở phiên họp ngẫu nhiên · Ngày mở phiên họp = hôm nay · Phòng số / địa điểm
 *  4. "Lưu" → "Ký logic" → "Đóng"
 */
export const buoc08: Buoc<DonNguon, TrangThai5A> = {
  so: 8,
  ten: 'Thông báo phiên họp kiểm tra giao nộp, tiếp cận, công khai chứng cứ và hòa giải (31-DS)',
  huongDan: '8',
  chay: async ({ vuAn, tt, moPhien, tkToa, can }) => {
    const tk = tkToa(vuAn.toaAn);
    const m = await moVuAn(await moPhien(tk), can('urlVuAn', 6));
    await m.moTab('chuan-bi-xet-xu');
    if (await daCoBieuMau(m, /31-DS/)) return { soTB31: tt.soTB31 };

    const bm = await moBieuMau(m, O_BIEU_MAU.chuanBi, '31', 'Thêm biểu mẫu');
    await m.ngay(bm, 'Ngày thông báo', ngay(0));
    const soTB31 = await dungSo(m, bm, 'Số thông báo');
    if (tk.ten) await chonNeuTrong(m, bm, 'Người ký ban hành', tk.ten);
    await gio(m, bm, 'Giờ mở phiên họp', `0${8 + Math.floor(Math.random() * 2)}:30`);
    await m.ngay(bm, 'Ngày mở phiên họp', ngay(0));
    await m.nhap(bm, 'Phòng số / địa điểm', `Phòng họp số ${1 + Math.floor(Math.random() * 5)}`);
    await luuKyBieuMau(m, bm);
    return { soTB31 };
  },
};
