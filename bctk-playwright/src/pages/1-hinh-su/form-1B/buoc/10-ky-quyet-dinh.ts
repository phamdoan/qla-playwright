import { test } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { ManHinh } from '../../../base.page';
import { TrangThai1B, VuAnNguon } from '../cau-hinh-1B';
import { kyLogic } from './chung';

/**
 * BƯỚC 10 · Chủ tọa · Ký logic quyết định đưa vụ án ra xét xử (hướng dẫn 5.4)
 *
 *  1. Đăng nhập tài khoản người ký quyết định (chủ tọa, đọc ở bước 09)
 *  2. Lãnh đạo › Công tác lãnh đạo › Phê duyệt đề xuất → dòng vụ án "Quyết định đưa vụ án ra xét xử" "Chờ ký"
 *  3. "Ký logic"
 */
export const buoc10: Buoc<VuAnNguon, TrangThai1B> = {
  so: 10,
  ten: 'Chủ tọa · Ký logic quyết định đưa vụ án ra xét xử',
  huongDan: '5.4',
  chay: async ({ moPhien, tkNguoi, can }) => {
    const nguoiKy = can('nguoiKyQuyetDinh', 9);
    const m = new ManHinh((await moPhien(tkNguoi(nguoiKy))).page);
    if (!(await kyLogic(m, can('tenVuAn', 1), 'Quyết định đưa vụ án ra xét xử'))) {
      test.info().annotations.push({ type: 'Bỏ qua', description: `${nguoiKy}: không còn quyết định chờ ký` });
    }
  },
};
