import { test } from '@playwright/test';
import { chayBuoc, tenBuoc } from '../../../pages/common/buoc';
import { LUONG_1D1 } from '../../../pages/1-hinh-su/form-1D1/create-case-1D1.page';

// Form 1D1 (tái thẩm hình sự) — đầu vào src/data/1-hinh-su/data-form-1D1.xlsx, các bước ở src/pages/1-hinh-su/form-1D1/buoc/.
// Trên UI mỗi bước là một nhóm, mỗi bản án (BA <số> ngày <ngày>) một test.
for (const buoc of LUONG_1D1.cacBuoc) {
  test.describe(tenBuoc(buoc), () => {
    for (const vuAn of LUONG_1D1.dsVuAn) test(vuAn.maVuAn, ({ browser }) => chayBuoc(LUONG_1D1, buoc, vuAn, browser));
  });
}
