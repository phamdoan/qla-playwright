import { test } from '@playwright/test';
import { chayBuoc, tenBuoc } from '../../../pages/common/buoc';
import { LUONG_10B } from '../../../pages/10-hoa-giai/form-10B/create-case-10B.page';

// Form 10B — các bước nằm ở src/pages/10-hoa-giai/form-10B/buoc/.
// Trên UI mỗi bước là một nhóm, mỗi đơn trong data-form-10B.xlsx một test.
for (const buoc of LUONG_10B.cacBuoc) {
  test.describe(tenBuoc(buoc), () => {
    for (const vuAn of LUONG_10B.dsVuAn) test(vuAn.maVuAn, ({ browser }) => chayBuoc(LUONG_10B, buoc, vuAn, browser));
  });
}
