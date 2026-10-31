import { test } from '@playwright/test';
import { chayBuoc, tenBuoc } from '../../../pages/common/buoc';
import { LUONG_5A } from '../../../pages/5-lao-dong/form-5A/create-case-5A.page';

// Form 5A (không có file đầu vào) — các bước nằm ở src/pages/5-lao-dong/form-5A/buoc/.
// Trên UI mỗi bước là một nhóm, mỗi ô (Đơn 01, Đơn 02…) một test; số ô = "Số vụ tạo mỗi lần chạy" trong data-form-5A.xlsx.
for (const buoc of LUONG_5A.cacBuoc) {
  test.describe(tenBuoc(buoc), () => {
    for (const vuAn of LUONG_5A.dsVuAn) test(vuAn.maVuAn, ({ browser }) => chayBuoc(LUONG_5A, buoc, vuAn, browser));
  });
}
