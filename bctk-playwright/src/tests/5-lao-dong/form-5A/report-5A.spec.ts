import { test } from '@playwright/test';
import { chayBuoc, tenBuoc } from '../../../pages/common/buoc';
import { LUONG_5A } from '../../../pages/5-lao-dong/form-5A/create-case-5A.page';

// Form 5A (không có file đầu vào) — các bước nằm ở src/pages/5-lao-dong/form-5A/buoc/.
// Trên UI mỗi ô (Đơn 01, Đơn 02…) là một nhóm, mỗi bước một test; số ô = "Số vụ tạo mỗi lần chạy" trong data-form-5A.xlsx.
// Chạy lần lượt từng vụ: hết các bước của vụ này mới sang vụ tiếp theo (1 worker, chạy theo thứ tự khai báo)
for (const vuAn of LUONG_5A.dsVuAn) {
  test.describe(vuAn.maVuAn, () => {
    for (const buoc of LUONG_5A.cacBuoc) test(tenBuoc(buoc), ({ browser }) => chayBuoc(LUONG_5A, buoc, vuAn, browser));
  });
}
