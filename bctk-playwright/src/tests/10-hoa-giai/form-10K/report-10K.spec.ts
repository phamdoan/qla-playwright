import { test } from '@playwright/test';
import { chayBuoc, tenBuoc } from '../../../pages/common/buoc';
import { LUONG_10K } from '../../../pages/10-hoa-giai/form-10K/create-case-10K.page';

// Form 10K — các bước nằm ở src/pages/10-hoa-giai/form-10K/buoc/.
// Trên UI mỗi đơn trong data-form-10K.xlsx là một nhóm, mỗi bước một test.
// Chạy lần lượt từng vụ: hết các bước của vụ này mới sang vụ tiếp theo (1 worker, chạy theo thứ tự khai báo)
for (const vuAn of LUONG_10K.dsVuAn) {
  test.describe(vuAn.maVuAn, () => {
    for (const buoc of LUONG_10K.cacBuoc) test(tenBuoc(buoc), ({ browser }) => chayBuoc(LUONG_10K, buoc, vuAn, browser));
  });
}
