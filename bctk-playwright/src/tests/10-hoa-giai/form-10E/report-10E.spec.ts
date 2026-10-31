import { test } from '@playwright/test';
import { chayBuoc, tenBuoc } from '../../../pages/common/buoc';
import { LUONG_10E } from '../../../pages/10-hoa-giai/form-10E/create-case-10E.page';

// Form 10E (không có file đầu vào) — các bước nằm ở src/pages/10-hoa-giai/form-10E/buoc/.
// Trên UI mỗi bước là một nhóm, mỗi ô đơn (Đơn 01, Đơn 02…) một test; số ô = "Số đơn tạo mỗi lần chạy" trong data-form-10E.xlsx.
for (const buoc of LUONG_10E.cacBuoc) {
  test.describe(tenBuoc(buoc), () => {
    for (const vuAn of LUONG_10E.dsVuAn) test(vuAn.maVuAn, ({ browser }) => chayBuoc(LUONG_10E, buoc, vuAn, browser));
  });
}
