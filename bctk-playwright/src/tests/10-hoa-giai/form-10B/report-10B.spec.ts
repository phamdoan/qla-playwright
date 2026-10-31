import { test } from '@playwright/test';
import { chayBuoc, tenBuoc } from '../../../pages/common/buoc';
import { LUONG_10B } from '../../../pages/10-hoa-giai/form-10B/create-case-10B.page';

// Form 10B — các bước nằm ở src/pages/10-hoa-giai/form-10B/buoc/.
// Trên UI mỗi đơn trong data-form-10B.xlsx là một nhóm, mỗi bước một test.
// Chạy lần lượt từng vụ: hết các bước của vụ này mới sang vụ tiếp theo (1 worker, chạy theo thứ tự khai báo)
for (const vuAn of LUONG_10B.dsVuAn) {
  test.describe(vuAn.maVuAn, () => {
    for (const buoc of LUONG_10B.cacBuoc) test(tenBuoc(buoc), ({ browser }) => chayBuoc(LUONG_10B, buoc, vuAn, browser));
  });
}
