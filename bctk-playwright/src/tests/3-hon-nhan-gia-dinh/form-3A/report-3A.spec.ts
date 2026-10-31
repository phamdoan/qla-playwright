import { test } from '@playwright/test';
import { chayBuoc, tenBuoc } from '../../../pages/common/buoc';
import { LUONG_3A } from '../../../pages/3-hon-nhan-gia-dinh/form-3A/create-case-3A.page';

// Form 3A (không có file đầu vào) — các bước nằm ở src/pages/3-hon-nhan-gia-dinh/form-3A/buoc/.
// Trên UI mỗi ô đơn (Đơn 01, Đơn 02…) là một nhóm, mỗi bước một test; số ô = "Số đơn tạo mỗi lần chạy" trong data-form-3A.xlsx.
// Chạy lần lượt từng vụ: hết các bước của vụ này mới sang vụ tiếp theo (1 worker, chạy theo thứ tự khai báo)
for (const vuAn of LUONG_3A.dsVuAn) {
  test.describe(vuAn.maVuAn, () => {
    for (const buoc of LUONG_3A.cacBuoc) test(tenBuoc(buoc), ({ browser }) => chayBuoc(LUONG_3A, buoc, vuAn, browser));
  });
}
