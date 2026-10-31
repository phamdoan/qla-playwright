import { test } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { TrangThai1A1, VuNguon, dsPhapNhan } from '../cau-hinh-1A1';
import { luuKetQua1A1, moVuAn, phanCongVaKy } from './chung';

/**
 * BƯỚC 07 · Phân công Hội thẩm nhân dân (hướng dẫn bước 7), lưu kết quả
 *
 *  1. Tab "Phân công" › "Phân công" › "Phân công Hội thẩm" → popup
 *  2. Vai trò "Hội thẩm nhân dân" · Tên người được phân công ngẫu nhiên → mũi tên thêm vào bảng
 *  3. "Dùng số" → "Lưu" → "Ký logic" → "Đóng"
 *  4. Ghi dòng của vụ vào output/1-hinh-su/output-ma-vu-an-form-1A1.xlsx (cột bản án để trống, bước 09 điền)
 */
export const buoc07: Buoc<VuNguon, TrangThai1A1> = {
  so: 7,
  ten: 'Phân công Hội thẩm nhân dân, dùng số, ký logic, lưu kết quả',
  huongDan: '7',
  chay: async ({ vuAn, moPhien, tkToa, can, tt }) => {
    const urlVuAn = can('urlVuAn', 2);
    const tk = tkToa(vuAn.toaAn);
    const m = await moVuAn(await moPhien(tk), urlVuAn);
    const { soQD, nguoi } = await phanCongVaKy(m, 'Phân công Hội thẩm', 'Hội thẩm nhân dân', /dự khuyết/);

    await luuKetQua1A1(tk, { ...tt, hoiTham: nguoi, soQDHoiTham: soQD });
    test.info().annotations.push({ type: 'Vụ án đã tạo', description: `${tt.maVuAnHeThong} · ${dsPhapNhan(tt).map(p => p.ten).join(' ; ')} · ${urlVuAn}` });
    return { hoiTham: nguoi, soQDHoiTham: soQD };
  },
};
