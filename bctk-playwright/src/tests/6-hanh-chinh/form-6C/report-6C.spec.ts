import { test } from '@playwright/test';
import { chayBuoc, tenBuoc } from '../../../pages/common/buoc';
import { LUONG_6C } from '../../../pages/6-hanh-chinh/form-6C/create-case-6C.page';

// Form 6C (giám đốc thẩm) — đầu vào src/data/6-hanh-chinh/data-form-6C.xlsx, các bước ở src/pages/6-hanh-chinh/form-6C/buoc/.
// Trên UI mỗi bước là một nhóm, mỗi bản án (BA <số> ngày <ngày>) một test.
for (const buoc of LUONG_6C.cacBuoc) {
  test.describe(tenBuoc(buoc), () => {
    for (const vuAn of LUONG_6C.dsVuAn) test(vuAn.maVuAn, ({ browser }) => chayBuoc(LUONG_6C, buoc, vuAn, browser));
  });
}
