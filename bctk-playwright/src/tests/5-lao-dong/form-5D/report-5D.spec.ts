import { test } from '@playwright/test';
import { chayBuoc, tenBuoc } from '../../../pages/common/buoc';
import { LUONG_5D } from '../../../pages/5-lao-dong/form-5D/create-case-5D.page';

// Form 5D (tái thẩm lao động) — đầu vào src/data/5-lao-dong/data-form-5D.xlsx, các bước ở src/pages/5-lao-dong/form-5D/buoc/.
// Trên UI mỗi bản án (BA <số> ngày <ngày>) là một nhóm, mỗi bước một test.
// Chạy lần lượt từng vụ: hết các bước của vụ này mới sang vụ tiếp theo (1 worker, chạy theo thứ tự khai báo)
for (const vuAn of LUONG_5D.dsVuAn) {
  test.describe(vuAn.maVuAn, () => {
    for (const buoc of LUONG_5D.cacBuoc) test(tenBuoc(buoc), ({ browser }) => chayBuoc(LUONG_5D, buoc, vuAn, browser));
  });
}
