import { test } from '@playwright/test';
import { chayBuoc, tenBuoc } from '../../../pages/common/buoc';
import { LUONG_2A } from '../../../pages/2-dan-su/form-2A/create-case-2A.page';

// Form 2A (không có file đầu vào) — các bước nằm ở src/pages/2-dan-su/form-2A/buoc/.
// Trên UI mỗi bước là một nhóm, mỗi ô đơn (Đơn 01, Đơn 02…) một test; số ô = "Số đơn tạo mỗi lần chạy" trong form-2A.xlsx.
for (const buoc of LUONG_2A.cacBuoc) {
  test.describe(tenBuoc(buoc), () => {
    for (const vuAn of LUONG_2A.dsVuAn) test(vuAn.maVuAn, ({ browser }) => chayBuoc(LUONG_2A, buoc, vuAn, browser));
  });
}
