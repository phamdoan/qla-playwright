import { test } from '@playwright/test';
import { chayBuoc, tenBuoc } from '../../../pages/common/buoc';
import { LUONG_1B } from '../../../pages/1-hinh-su/form-1B/create-case-1B.page';
import { FILE_VU_AN_1B } from '../../../pages/1-hinh-su/form-1B/cau-hinh-1B';

// Form 1B — các bước nằm ở src/pages/1-hinh-su/form-1B/buoc/. Trên UI mỗi vụ án là một nhóm, mỗi bước một test.
if (!LUONG_1B.dsVuAn.length) {
  test('Không có vụ án mới trong data-form-1B.xlsx', () =>
    test.skip(true, `Thêm dòng (Mã vụ án | Tòa án sơ thẩm | Tòa án phúc thẩm | Link vụ án | Luồng) vào ${FILE_VU_AN_1B} rồi chạy lại — vụ đã chạy xong cả luồng sẽ không chạy lại`));
}
// Chạy lần lượt từng vụ: hết các bước của vụ này mới sang vụ tiếp theo (1 worker, chạy theo thứ tự khai báo)
for (const vuAn of LUONG_1B.dsVuAn) {
  test.describe(vuAn.maVuAn, () => {
    for (const buoc of LUONG_1B.cacBuoc) test(tenBuoc(buoc), ({ browser }) => chayBuoc(LUONG_1B, buoc, vuAn, browser));
  });
}
