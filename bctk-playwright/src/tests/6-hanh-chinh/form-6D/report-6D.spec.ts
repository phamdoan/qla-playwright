import { test } from '@playwright/test';
import { chayBuoc, tenBuoc } from '../../../pages/common/buoc';
import { LUONG_6D } from '../../../pages/6-hanh-chinh/form-6D/create-case-6D.page';

// Form 6D (tái thẩm hành chính) — đầu vào src/data/6-hanh-chinh/data-form-6D.xlsx, các bước ở src/pages/6-hanh-chinh/form-6D/buoc/.
// Trên UI mỗi bản án (BA <số> ngày <ngày>) là một nhóm, mỗi bước một test.
// Chạy lần lượt từng vụ: hết các bước của vụ này mới sang vụ tiếp theo (1 worker, chạy theo thứ tự khai báo)
for (const vuAn of LUONG_6D.dsVuAn) {
  test.describe(vuAn.maVuAn, () => {
    for (const buoc of LUONG_6D.cacBuoc) test(tenBuoc(buoc), ({ browser }) => chayBuoc(LUONG_6D, buoc, vuAn, browser));
  });
}
