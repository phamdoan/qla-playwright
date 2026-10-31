import { test } from '@playwright/test';
import { chayBuoc, tenBuoc } from '../../../pages/common/buoc';
import { LUONG_10C } from '../../../pages/10-hoa-giai/form-10C/create-case-10C.page';

// Form 10C (không có file đầu vào) — các bước nằm ở src/pages/10-hoa-giai/form-10C/buoc/.
// Trên UI mỗi bước là một nhóm, mỗi ô đơn (Đơn 01, Đơn 02…) một test; số ô = "Số đơn tạo mỗi lần chạy" trong data-form-10C.xlsx.
for (const buoc of LUONG_10C.cacBuoc) {
  test.describe(tenBuoc(buoc), () => {
    for (const vuAn of LUONG_10C.dsVuAn) test(vuAn.maVuAn, ({ browser }) => chayBuoc(LUONG_10C, buoc, vuAn, browser));
  });
}
