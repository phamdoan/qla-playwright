import { test } from '@playwright/test';
import { chayBuoc, tenBuoc } from '../../../pages/common/buoc';
import { LUONG_3A } from '../../../pages/3-hon-nhan-gia-dinh/form-3A/create-case-3A.page';

// Form 3A (không có file đầu vào) — các bước nằm ở src/pages/3-hon-nhan-gia-dinh/form-3A/buoc/.
// Trên UI mỗi bước là một nhóm, mỗi ô đơn (Đơn 01, Đơn 02…) một test; số ô = "Số đơn tạo mỗi lần chạy" trong data-form-3A.xlsx.
for (const buoc of LUONG_3A.cacBuoc) {
  test.describe(tenBuoc(buoc), () => {
    for (const vuAn of LUONG_3A.dsVuAn) test(vuAn.maVuAn, ({ browser }) => chayBuoc(LUONG_3A, buoc, vuAn, browser));
  });
}
