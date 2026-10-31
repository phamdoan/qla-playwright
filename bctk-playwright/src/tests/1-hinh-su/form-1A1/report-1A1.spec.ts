import { test } from '@playwright/test';
import { chayBuoc, tenBuoc } from '../../../pages/common/buoc';
import { LUONG_1A1 } from '../../../pages/1-hinh-su/form-1A1/create-case-1A1.page';

// Form 1A1 (không có file đầu vào) — các bước nằm ở src/pages/1-hinh-su/form-1A1/buoc/.
// Trên UI mỗi bước là một nhóm, mỗi ô vụ án (Vụ 01, Vụ 02…) một test; số ô = "Số vụ tạo mỗi lần chạy" trong data-form-1A1.xlsx.
for (const buoc of LUONG_1A1.cacBuoc) {
  test.describe(tenBuoc(buoc), () => {
    for (const vuAn of LUONG_1A1.dsVuAn) test(vuAn.maVuAn, ({ browser }) => chayBuoc(LUONG_1A1, buoc, vuAn, browser));
  });
}
