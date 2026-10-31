import { test } from '@playwright/test';
import { chayBuoc, tenBuoc } from '../../../pages/common/buoc';
import { LUONG_5C } from '../../../pages/5-lao-dong/form-5C/create-case-5C.page';

// Form 5C (giám đốc thẩm) — đầu vào src/data/5-lao-dong/data-form-5C.xlsx, các bước ở src/pages/5-lao-dong/form-5C/buoc/.
// Trên UI mỗi bản án (BA <số> ngày <ngày>) là một nhóm, mỗi bước một test.
// Chạy lần lượt từng vụ: hết các bước của vụ này mới sang vụ tiếp theo (1 worker, chạy theo thứ tự khai báo)
for (const vuAn of LUONG_5C.dsVuAn) {
  test.describe(vuAn.maVuAn, () => {
    for (const buoc of LUONG_5C.cacBuoc) test(tenBuoc(buoc), ({ browser }) => chayBuoc(LUONG_5C, buoc, vuAn, browser));
  });
}
