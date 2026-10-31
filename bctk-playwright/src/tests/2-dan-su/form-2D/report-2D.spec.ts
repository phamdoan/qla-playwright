import { test } from '@playwright/test';
import { chayBuoc, tenBuoc } from '../../../pages/common/buoc';
import { LUONG_2D } from '../../../pages/2-dan-su/form-2D/create-case-2D.page';

// Form 2D (tái thẩm) — đầu vào src/data/2-dan-su/data-form-2D.xlsx, các bước ở src/pages/2-dan-su/form-2D/buoc/.
// Trên UI mỗi bước là một nhóm, mỗi bản án (BA <số> ngày <ngày>) một test.
for (const buoc of LUONG_2D.cacBuoc) {
  test.describe(tenBuoc(buoc), () => {
    for (const vuAn of LUONG_2D.dsVuAn) test(vuAn.maVuAn, ({ browser }) => chayBuoc(LUONG_2D, buoc, vuAn, browser));
  });
}
