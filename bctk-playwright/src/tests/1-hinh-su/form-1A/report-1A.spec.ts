import { test } from '@playwright/test';
import { chayBuoc, tenBuoc } from '../../../pages/common/buoc';
import { LUONG_1A } from '../../../pages/1-hinh-su/form-1A/create-case-1A.page';

// Form 1A (không có file đầu vào) — các bước nằm ở src/pages/1-hinh-su/form-1A/buoc/.
// Trên UI mỗi ô vụ án (Vụ 01, Vụ 02…) là một nhóm, mỗi bước một test; số ô = BCTK_SO_DON_1A (.env.staging) hoặc "Số vụ tạo mỗi lần chạy" trong data-form-1A.xlsx.
// Chạy lần lượt từng vụ: hết các bước của vụ này mới sang vụ tiếp theo (1 worker, chạy theo thứ tự khai báo)
for (const vuAn of LUONG_1A.dsVuAn) {
  test.describe(vuAn.maVuAn, () => {
    for (const buoc of LUONG_1A.cacBuoc) test(tenBuoc(buoc), ({ browser }) => chayBuoc(LUONG_1A, buoc, vuAn, browser));
  });
}
