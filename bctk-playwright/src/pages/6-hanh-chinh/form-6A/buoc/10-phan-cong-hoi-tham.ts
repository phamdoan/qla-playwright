import { expect } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { DonNguon, TrangThai6A } from '../cau-hinh-6A';
import { moVuAn, phanCongVuAn } from './chung';

/**
 * BƯỚC 10 · Phân công 02 Hội thẩm nhân dân, kiểm tra người tiến hành tố tụng (hướng dẫn B10, ý 3–4.11)
 *
 *  1. Tab "Phân công" → "Phân công" › "Quyết định phân công Hội thẩm nhân dân"
 *     → 2 lần: Vai trò "Hội thẩm nhân dân" · người ngẫu nhiên → mũi tên → "Dùng số" → "Lưu" → "Ký logic" → "Đóng"
 *  2. Mục "Danh sách người tiến hành tố tụng" phải có: Thẩm phán chủ tọa, Thư ký, 02 Hội thẩm nhân dân
 *  (Kết quả ghi ra Excel ở bước cuối — bước 14)
 */
export const buoc10: Buoc<DonNguon, TrangThai6A> = {
  so: 10,
  ten: 'Phân công 02 Hội thẩm nhân dân, kiểm tra danh sách người tiến hành tố tụng',
  huongDan: 'B10',
  chay: async ({ vuAn, tt, moPhien, tkToa, can }) => {
    const tk = tkToa(vuAn.toaAn);
    const m = await moVuAn(await moPhien(tk), can('urlVuAn', 7));
    const { nguoi, soQD } = await phanCongVuAn(m, 'Quyết định phân công Hội thẩm nhân dân', 'Hội thẩm nhân dân', 2, tk.ten);
    const soQDHoiTham = soQD || tt.soQDHoiTham || '';

    // HD 4.11: đủ Thẩm phán chủ tọa, Thư ký, 02 Hội thẩm nhân dân
    await m.moTab('thong-tin-chung');
    await m.moTab('phan-cong');
    const ds = (await m.moMuc('Danh sách người tiến hành tố tụng')).locator('tbody tr');
    await expect(ds.filter({ hasText: 'Thẩm phán chủ tọa' }), 'Thiếu Thẩm phán chủ tọa').toHaveCount(1, { timeout: 15_000 });
    await expect(ds.filter({ hasText: /Thư ký(?! dự khuyết)/ }), 'Thiếu Thư ký').toHaveCount(1);
    await expect(ds.filter({ hasText: /Hội thẩm nhân dân(?! dự khuyết)/ }), 'Chưa đủ 02 Hội thẩm nhân dân').toHaveCount(2);

    return { hoiTham: nguoi.join(' ; '), soQDHoiTham };
  },
};
