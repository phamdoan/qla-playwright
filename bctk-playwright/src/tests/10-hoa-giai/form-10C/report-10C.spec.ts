import { test } from '@playwright/test';
import { chayBuoc, tenBuoc } from '../../../pages/common/buoc';
import { LUONG_10C } from '../../../pages/10-hoa-giai/form-10C/create-case-10C.page';

// Form 10C (không có file đầu vào) — các bước nằm ở src/pages/10-hoa-giai/form-10C/buoc/.
// Trên UI mỗi ô đơn (Đơn 01, Đơn 02…) là một nhóm, mỗi bước một test; số ô = "Số đơn tạo mỗi lần chạy" trong data-form-10C.xlsx.
// Chạy lần lượt từng vụ: hết các bước của vụ này mới sang vụ tiếp theo (1 worker, chạy theo thứ tự khai báo)
for (const vuAn of LUONG_10C.dsVuAn) {
  test.describe(vuAn.maVuAn, () => {
    for (const buoc of LUONG_10C.cacBuoc) test(tenBuoc(buoc), ({ browser }) => chayBuoc(LUONG_10C, buoc, vuAn, browser));
  });
}
