import { test } from '@playwright/test';
import { chayBuoc, tenBuoc } from '../../../pages/common/buoc';
import { LUONG_10H } from '../../../pages/10-hoa-giai/form-10H/create-case-10H.page';

// Form 10H — các bước nằm ở src/pages/10-hoa-giai/form-10H/buoc/.
// Trên UI mỗi bước là một nhóm, mỗi đơn trong data-form-10H.xlsx một test.
for (const buoc of LUONG_10H.cacBuoc) {
  test.describe(tenBuoc(buoc), () => {
    for (const vuAn of LUONG_10H.dsVuAn) test(vuAn.maVuAn, ({ browser }) => chayBuoc(LUONG_10H, buoc, vuAn, browser));
  });
}
