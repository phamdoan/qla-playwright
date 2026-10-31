import { test } from '@playwright/test';
import { chayBuoc, tenBuoc } from '../../../pages/common/buoc';
import { LUONG_6B } from '../../../pages/6-hanh-chinh/form-6B/create-case-6B.page';

// Form 6B — đầu vào src/data/6-hanh-chinh/data-form-6B.xlsx (mỗi dòng một vụ sơ thẩm), các bước ở src/pages/6-hanh-chinh/form-6B/buoc/.
// Trên UI mỗi vụ án (theo Mã vụ án) là một nhóm, mỗi bước một test.
// Chạy lần lượt từng vụ: hết các bước của vụ này mới sang vụ tiếp theo (1 worker, chạy theo thứ tự khai báo)
for (const vuAn of LUONG_6B.dsVuAn) {
  test.describe(vuAn.maVuAn, () => {
    for (const buoc of LUONG_6B.cacBuoc) test(tenBuoc(buoc), ({ browser }) => chayBuoc(LUONG_6B, buoc, vuAn, browser));
  });
}
