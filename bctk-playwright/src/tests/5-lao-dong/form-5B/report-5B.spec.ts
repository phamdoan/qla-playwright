import { test } from '@playwright/test';
import { chayBuoc, tenBuoc } from '../../../pages/common/buoc';
import { LUONG_5B } from '../../../pages/5-lao-dong/form-5B/create-case-5B.page';

// Form 5B — đầu vào src/data/5-lao-dong/data-form-5B.xlsx (mỗi dòng một vụ sơ thẩm), các bước ở src/pages/5-lao-dong/form-5B/buoc/.
// Trên UI mỗi vụ án (theo Mã vụ án) là một nhóm, mỗi bước một test.
// Chạy lần lượt từng vụ: hết các bước của vụ này mới sang vụ tiếp theo (1 worker, chạy theo thứ tự khai báo)
for (const vuAn of LUONG_5B.dsVuAn) {
  test.describe(vuAn.maVuAn, () => {
    for (const buoc of LUONG_5B.cacBuoc) test(tenBuoc(buoc), ({ browser }) => chayBuoc(LUONG_5B, buoc, vuAn, browser));
  });
}
