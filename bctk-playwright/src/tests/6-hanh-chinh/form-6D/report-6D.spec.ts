import { test } from '@playwright/test';
import { chayBuoc, tenBuoc } from '../../../pages/common/buoc';
import { LUONG_6D } from '../../../pages/6-hanh-chinh/form-6D/create-case-6D.page';

// Form 6D (tái thẩm hành chính) — đầu vào src/data/6-hanh-chinh/data-form-6D.xlsx, các bước ở src/pages/6-hanh-chinh/form-6D/buoc/.
// Trên UI mỗi bước là một nhóm, mỗi bản án (BA <số> ngày <ngày>) một test.
for (const buoc of LUONG_6D.cacBuoc) {
  test.describe(tenBuoc(buoc), () => {
    for (const vuAn of LUONG_6D.dsVuAn) test(vuAn.maVuAn, ({ browser }) => chayBuoc(LUONG_6D, buoc, vuAn, browser));
  });
}
