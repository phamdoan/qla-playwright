import { test } from '@playwright/test';
import { chayBuoc, tenBuoc } from '../../../pages/common/buoc';
import { LUONG_1A1 } from '../../../pages/1-hinh-su/form-1A1/create-case-1A1.page';

// Form 1A1 (không có file đầu vào) — các bước nằm ở src/pages/1-hinh-su/form-1A1/buoc/.
// Trên UI mỗi ô vụ án (Vụ 01, Vụ 02…) là một nhóm, mỗi bước một test; số ô = "Số vụ tạo mỗi lần chạy" trong data-form-1A1.xlsx.
// Chạy lần lượt từng vụ: hết các bước của vụ này mới sang vụ tiếp theo (1 worker, chạy theo thứ tự khai báo)
for (const vuAn of LUONG_1A1.dsVuAn) {
  test.describe(vuAn.maVuAn, () => {
    for (const buoc of LUONG_1A1.cacBuoc) test(tenBuoc(buoc), ({ browser }) => chayBuoc(LUONG_1A1, buoc, vuAn, browser));
  });
}
