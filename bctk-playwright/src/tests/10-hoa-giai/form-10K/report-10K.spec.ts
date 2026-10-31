import { test } from '@playwright/test';
import { chayBuoc, tenBuoc } from '../../../pages/common/buoc';
import { LUONG_10K } from '../../../pages/10-hoa-giai/form-10K/create-case-10K.page';

// Form 10K — các bước nằm ở src/pages/10-hoa-giai/form-10K/buoc/.
// Trên UI mỗi bước là một nhóm, mỗi đơn trong data-form-10K.xlsx một test.
for (const buoc of LUONG_10K.cacBuoc) {
  test.describe(tenBuoc(buoc), () => {
    for (const vuAn of LUONG_10K.dsVuAn) test(vuAn.maVuAn, ({ browser }) => chayBuoc(LUONG_10K, buoc, vuAn, browser));
  });
}
