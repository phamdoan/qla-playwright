import { test } from '@playwright/test';
import { chayBuoc, tenBuoc } from '../../../pages/common/buoc';
import { LUONG_6A } from '../../../pages/6-hanh-chinh/form-6A/create-case-6A.page';

// Form 6A (không có file đầu vào) — các bước nằm ở src/pages/6-hanh-chinh/form-6A/buoc/.
// Trên UI mỗi bước là một nhóm, mỗi ô đơn (Đơn 01, Đơn 02…) một test; số ô = "Số đơn tạo mỗi lần chạy" trong data-form-6A.xlsx.
for (const buoc of LUONG_6A.cacBuoc) {
  test.describe(tenBuoc(buoc), () => {
    for (const vuAn of LUONG_6A.dsVuAn) test(vuAn.maVuAn, ({ browser }) => chayBuoc(LUONG_6A, buoc, vuAn, browser));
  });
}
