import { test } from '@playwright/test';
import { chayBuoc, tenBuoc } from '../../../pages/common/buoc';
import { LUONG_2A } from '../../../pages/2-dan-su/form-2A/create-case-2A.page';

// Form 2A (không có file đầu vào) — các bước nằm ở src/pages/2-dan-su/form-2A/buoc/.
// Trên UI mỗi ô đơn (Đơn 01, Đơn 02…) là một nhóm, mỗi bước một test; số ô = "Số đơn tạo mỗi lần chạy" trong data-form-2A.xlsx.
// Chạy lần lượt từng vụ: hết các bước của vụ này mới sang vụ tiếp theo (1 worker, chạy theo thứ tự khai báo)
for (const vuAn of LUONG_2A.dsVuAn) {
  test.describe(vuAn.maVuAn, () => {
    for (const buoc of LUONG_2A.cacBuoc) test(tenBuoc(buoc), ({ browser }) => chayBuoc(LUONG_2A, buoc, vuAn, browser));
  });
}
