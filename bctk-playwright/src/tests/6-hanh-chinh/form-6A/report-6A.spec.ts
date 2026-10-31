import { test } from '@playwright/test';
import { chayBuoc, tenBuoc } from '../../../pages/common/buoc';
import { LUONG_6A } from '../../../pages/6-hanh-chinh/form-6A/create-case-6A.page';

// Form 6A (không có file đầu vào) — các bước nằm ở src/pages/6-hanh-chinh/form-6A/buoc/.
// Trên UI mỗi ô đơn (Đơn 01, Đơn 02…) là một nhóm, mỗi bước một test; số ô = "Số đơn tạo mỗi lần chạy" trong data-form-6A.xlsx.
// Chạy lần lượt từng vụ: hết các bước của vụ này mới sang vụ tiếp theo (1 worker, chạy theo thứ tự khai báo)
for (const vuAn of LUONG_6A.dsVuAn) {
  test.describe(vuAn.maVuAn, () => {
    for (const buoc of LUONG_6A.cacBuoc) test(tenBuoc(buoc), ({ browser }) => chayBuoc(LUONG_6A, buoc, vuAn, browser));
  });
}
