import { test } from '@playwright/test';
import { chayBuoc, tenBuoc } from '../../../pages/common/buoc';
import { LUONG_6B } from '../../../pages/6-hanh-chinh/form-6B/create-case-6B.page';

// Form 6B — đầu vào src/data/6-hanh-chinh/data-form-6B.xlsx (mỗi dòng một vụ sơ thẩm), các bước ở src/pages/6-hanh-chinh/form-6B/buoc/.
// Trên UI mỗi bước là một nhóm, mỗi vụ án (theo Mã vụ án) một test.
for (const buoc of LUONG_6B.cacBuoc) {
  test.describe(tenBuoc(buoc), () => {
    for (const vuAn of LUONG_6B.dsVuAn) test(vuAn.maVuAn, ({ browser }) => chayBuoc(LUONG_6B, buoc, vuAn, browser));
  });
}
