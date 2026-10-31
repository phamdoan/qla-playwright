import { test } from '@playwright/test';
import { chayBuoc, tenBuoc } from '../../../pages/common/buoc';
import { LUONG_1D1 } from '../../../pages/1-hinh-su/form-1D1/create-case-1D1.page';

// Form 1D1 (tái thẩm hình sự) — đầu vào src/data/1-hinh-su/data-form-1D1.xlsx, các bước ở src/pages/1-hinh-su/form-1D1/buoc/.
// Trên UI mỗi bản án (BA <số> ngày <ngày>) là một nhóm, mỗi bước một test.
// Chạy lần lượt từng vụ: hết các bước của vụ này mới sang vụ tiếp theo (1 worker, chạy theo thứ tự khai báo)
for (const vuAn of LUONG_1D1.dsVuAn) {
  test.describe(vuAn.maVuAn, () => {
    for (const buoc of LUONG_1D1.cacBuoc) test(tenBuoc(buoc), ({ browser }) => chayBuoc(LUONG_1D1, buoc, vuAn, browser));
  });
}
