import { test } from '@playwright/test';
import { chayBuoc, tenBuoc } from '../../../pages/common/buoc';
import { LUONG_10I } from '../../../pages/10-hoa-giai/form-10I/create-case-10I.page';

// Form 10I (không có file đầu vào) — các bước nằm ở src/pages/10-hoa-giai/form-10I/buoc/.
// Trên UI mỗi bước là một nhóm, mỗi ô đơn (Đơn 01, Đơn 02…) một test; số ô = "Số đơn tạo mỗi lần chạy" trong data-form-10I.xlsx.
for (const buoc of LUONG_10I.cacBuoc) {
  test.describe(tenBuoc(buoc), () => {
    for (const vuAn of LUONG_10I.dsVuAn) test(vuAn.maVuAn, ({ browser }) => chayBuoc(LUONG_10I, buoc, vuAn, browser));
  });
}
