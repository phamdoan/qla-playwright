import { test } from '@playwright/test';
import { chayBuoc, tenBuoc } from '../../../pages/common/buoc';
import { LUONG_10I } from '../../../pages/10-hoa-giai/form-10I/create-case-10I.page';

// Form 10I (không có file đầu vào) — các bước nằm ở src/pages/10-hoa-giai/form-10I/buoc/.
// Trên UI mỗi ô đơn (Đơn 01, Đơn 02…) là một nhóm, mỗi bước một test; số ô = "Số đơn tạo mỗi lần chạy" trong data-form-10I.xlsx.
// Chạy lần lượt từng vụ: hết các bước của vụ này mới sang vụ tiếp theo (1 worker, chạy theo thứ tự khai báo)
for (const vuAn of LUONG_10I.dsVuAn) {
  test.describe(vuAn.maVuAn, () => {
    for (const buoc of LUONG_10I.cacBuoc) test(tenBuoc(buoc), ({ browser }) => chayBuoc(LUONG_10I, buoc, vuAn, browser));
  });
}
