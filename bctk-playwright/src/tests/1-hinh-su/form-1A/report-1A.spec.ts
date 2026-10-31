import { test } from '@playwright/test';
import { chayBuoc, tenBuoc } from '../../../pages/common/buoc';
import { LUONG_1A } from '../../../pages/1-hinh-su/form-1A/create-case-1A.page';

// Form 1A (không có file đầu vào) — các bước nằm ở src/pages/1-hinh-su/form-1A/buoc/.
// Trên UI mỗi bước là một nhóm, mỗi ô vụ án (Vụ 01, Vụ 02…) một test; số ô = BCTK_SO_DON_1A (.env.staging) hoặc "Số vụ tạo mỗi lần chạy" trong data-form-1A.xlsx.
for (const buoc of LUONG_1A.cacBuoc) {
  test.describe(tenBuoc(buoc), () => {
    for (const vuAn of LUONG_1A.dsVuAn) test(vuAn.maVuAn, ({ browser }) => chayBuoc(LUONG_1A, buoc, vuAn, browser));
  });
}
