import { test } from '@playwright/test';
import { chayBuoc, tenBuoc } from '../../../pages/common/buoc';
import { LUONG_10A } from '../../../pages/10-hoa-giai/form-10A/create-case-10A.page';

// Form 10A (không có file đầu vào) — các bước nằm ở src/pages/10-hoa-giai/form-10A/buoc/.
// Trên UI mỗi bước là một nhóm, mỗi ô đơn (Đơn 01, Đơn 02…) một test; số ô = "Số đơn tạo mỗi lần chạy" trong data-form-10A.xlsx.
for (const buoc of LUONG_10A.cacBuoc) {
  test.describe(tenBuoc(buoc), () => {
    for (const vuAn of LUONG_10A.dsVuAn) test(vuAn.maVuAn, ({ browser }) => chayBuoc(LUONG_10A, buoc, vuAn, browser));
  });
}
