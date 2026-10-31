import { test } from '@playwright/test';
import { chayBuoc, tenBuoc } from '../../../pages/common/buoc';
import { LUONG_10G } from '../../../pages/10-hoa-giai/form-10G/create-case-10G.page';

// Form 10G (không có file đầu vào) — các bước nằm ở src/pages/10-hoa-giai/form-10G/buoc/.
// Trên UI mỗi bước là một nhóm, mỗi ô đơn (Đơn 01, Đơn 02…) một test; số ô = "Số đơn tạo mỗi lần chạy" trong data-form-10G.xlsx.
for (const buoc of LUONG_10G.cacBuoc) {
  test.describe(tenBuoc(buoc), () => {
    for (const vuAn of LUONG_10G.dsVuAn) test(vuAn.maVuAn, ({ browser }) => chayBuoc(LUONG_10G, buoc, vuAn, browser));
  });
}
