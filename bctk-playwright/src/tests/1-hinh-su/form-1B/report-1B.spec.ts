import { test } from '@playwright/test';
import { chayBuoc, tenBuoc } from '../../../pages/common/buoc';
import { LUONG_1B } from '../../../pages/1-hinh-su/form-1B/create-case-1B.page';
import { cauHinh1B } from '../../../pages/1-hinh-su/form-1B/cau-hinh-1B';

// Form 1B — các bước nằm ở src/pages/1-hinh-su/form-1B/buoc/. Trên UI mỗi bước là một nhóm, mỗi vụ án một test.
if (!LUONG_1B.dsVuAn.length) {
  test(`Không có vụ án mới trong ${cauHinh1B.fileVuAn}`, () =>
    test.skip(true, `Thêm dòng (Mã vụ án | Tòa án | Luồng) vào src/data/1-hinh-su/${cauHinh1B.fileVuAn} rồi chạy lại — mã đã có trong ${cauHinh1B.fileVuAnDaChay} sẽ không chạy lại`));
}
for (const buoc of LUONG_1B.cacBuoc) {
  test.describe(tenBuoc(buoc), () => {
    for (const vuAn of LUONG_1B.dsVuAn) test(vuAn.maVuAn, ({ browser }) => chayBuoc(LUONG_1B, buoc, vuAn, browser));
  });
}
