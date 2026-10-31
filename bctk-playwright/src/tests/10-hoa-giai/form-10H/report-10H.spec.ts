import { test } from '@playwright/test';
import { chayBuoc, tenBuoc } from '../../../pages/common/buoc';
import { LUONG_10H } from '../../../pages/10-hoa-giai/form-10H/create-case-10H.page';

// Form 10H — các bước nằm ở src/pages/10-hoa-giai/form-10H/buoc/.
// Trên UI mỗi đơn trong data-form-10H.xlsx là một nhóm, mỗi bước một test.
// Chạy lần lượt từng vụ: hết các bước của vụ này mới sang vụ tiếp theo (1 worker, chạy theo thứ tự khai báo)
for (const vuAn of LUONG_10H.dsVuAn) {
  test.describe(vuAn.maVuAn, () => {
    for (const buoc of LUONG_10H.cacBuoc) test(tenBuoc(buoc), ({ browser }) => chayBuoc(LUONG_10H, buoc, vuAn, browser));
  });
}
