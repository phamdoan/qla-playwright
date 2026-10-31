import { test } from '@playwright/test';
import { chayBuoc, tenBuoc } from '../../../pages/common/buoc';
import { LUONG_2C } from '../../../pages/2-dan-su/form-2C/create-case-2C.page';

// Form 2C (giám đốc thẩm) — đầu vào src/data/2-dan-su/data-form-2C.xlsx, các bước ở src/pages/2-dan-su/form-2C/buoc/.
// Trên UI mỗi bước là một nhóm, mỗi bản án (BA <số> ngày <ngày>) một test.
for (const buoc of LUONG_2C.cacBuoc) {
  test.describe(tenBuoc(buoc), () => {
    for (const vuAn of LUONG_2C.dsVuAn) test(vuAn.maVuAn, ({ browser }) => chayBuoc(LUONG_2C, buoc, vuAn, browser));
  });
}
