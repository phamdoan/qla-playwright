import { test } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { ManHinh } from '../../../base.page';
import { TrangThai1B, VuAnNguon } from '../cau-hinh-1B';
import { kyLogic } from './chung';

/**
 * BƯỚC 08 · Người ký · Ký logic quyết định phân công (hướng dẫn 5.2)
 *
 *  1. Đăng nhập tài khoản người ký phân công (theo tên đọc ở bước 07)
 *  2. Lãnh đạo › Công tác lãnh đạo › Phê duyệt đề xuất → dòng vụ án "Phân công Thẩm phán" đang "Chờ ký"
 *  3. "Ký logic"
 */
export const buoc08: Buoc<VuAnNguon, TrangThai1B> = {
  so: 8,
  ten: 'Người ký · Ký logic quyết định phân công',
  huongDan: '5.2',
  chay: async ({ moPhien, tkNguoi, can }) => {
    const nguoiKy = can('nguoiKyPhanCong', 7);
    const m = new ManHinh((await moPhien(tkNguoi(nguoiKy))).page);
    if (!(await kyLogic(m, can('tenVuAn', 1), 'Phân công Thẩm phán'))) {
      test.info().annotations.push({ type: 'Bỏ qua', description: `${nguoiKy}: không còn "Phân công Thẩm phán" chờ ký` });
    }
  },
};
