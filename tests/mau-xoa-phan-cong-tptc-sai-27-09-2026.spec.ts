/**
 * BẢO TRÌ — XOÁ 21 BẢN GHI PHÂN CÔNG THẨM PHÁN TANDTC SAI (27/09/2026).
 *
 * Vì sao sai: tài liệu "Playwright nhập data GDT-TT (1).docx" Bước 16 quy định phân công theo hình thức
 * NGẪU NHIÊN (hệ thống tự chọn thẩm phán). Code trước đây lại dùng "phân công chỉ định" và tự gán một
 * thẩm phán lấy từ vụ mẫu trên STG — luồng GĐT/TT không hề có việc nhập tên thẩm phán. Đã sửa
 * GdtPage#phanCongThamPhanTANDTC sang phân công ngẫu nhiên và bỏ khoá cấu hình thamPhanTANDTC.
 *
 * Spec này chỉ xử lý các bản ghi CHƯA DUYỆT (PHAN_CONG.TRANG_THAI = 1) và chưa có tờ trình chờ duyệt,
 * nên xoá thẳng bằng nút "Xóa" trên tab "Quản lý kết quả phân công". KHÔNG đụng DB.
 * Các bản ghi ĐÃ DUYỆT + tờ trình đã ký thì để nguyên, chạy tiếp tiến trình (quyết định nghiệp vụ 27/09).
 *
 * Chạy:
 *   QLA_HO_SO_ENV=staging QLA_TKM_CHO_PHEP_GHI=1 \
 *     npx playwright test --project=tai-khoan-moi --no-deps tests/mau-xoa-phan-cong-tptc-sai-27-09-2026.spec.ts
 */
import { expect, test } from '@playwright/test';
import { choPhepGhiTKM } from '../account';
import { chonSelect, choHetSpin, go, hienTrong, nghi } from '../common/antd';
import { moTrangVaiCauHinh } from '../common/luong-tkm';
import { moMenu } from '../common/menu';

const HINH_THUC = 'Hồ sơ kháng nghị GĐT-TT';

/** 21 vụ có PHAN_CONG TA.TP.001 trạng thái "mới lập" gán sai thẩm phán (đối chiếu DB 27/09/2026) */
const CAN_XOA = [
  { soBanAn: '245', ngayBanAn: '08/01/2025', vu: 'VA26-004355' },
  { soBanAn: '57', ngayBanAn: '07/07/2025', vu: 'VA26-004506' },
  { soBanAn: '46', ngayBanAn: '20/01/2025', vu: 'VA26-004507' },
  { soBanAn: '377', ngayBanAn: '01/09/2024', vu: 'VA26-004261' },
  { soBanAn: '28', ngayBanAn: '11/11/2024', vu: 'VA26-004509' },
  { soBanAn: '29', ngayBanAn: '18/11/2024', vu: 'VA26-004260' },
  { soBanAn: '47', ngayBanAn: '27/01/2025', vu: 'VA26-004510' },
  { soBanAn: '30', ngayBanAn: '25/11/2024', vu: 'VA26-003764' },
  { soBanAn: '515', ngayBanAn: '07/10/2024', vu: 'VA26-004505' },
  { soBanAn: '31', ngayBanAn: '02/12/2024', vu: 'VA26-004511' },
  { soBanAn: '53', ngayBanAn: '23/06/2025', vu: 'VA26-004512' },
  { soBanAn: '32', ngayBanAn: '09/12/2024', vu: 'VA26-004513' },
  { soBanAn: '26', ngayBanAn: '28/10/2024', vu: 'VA26-004263' },
  { soBanAn: '33', ngayBanAn: '16/12/2024', vu: 'VA26-004514' },
  { soBanAn: '5161', ngayBanAn: '30/09/2024', vu: 'VA26-004515' },
  { soBanAn: '55', ngayBanAn: '30/06/2025', vu: 'VA26-004516' },
  { soBanAn: '511', ngayBanAn: '16/10/2024', vu: 'VA26-004517' },
  { soBanAn: '34', ngayBanAn: '23/12/2024', vu: 'VA26-004518' },
  { soBanAn: '35', ngayBanAn: '30/12/2024', vu: 'VA26-004519' },
  { soBanAn: '45', ngayBanAn: '13/01/2025', vu: 'VA26-004520' },
  { soBanAn: '61', ngayBanAn: '21/07/2025', vu: 'VA26-004521' },
];

test.describe('Xoá phân công Thẩm phán TANDTC sai 27/09/2026', () => {
  test.describe.configure({ mode: 'serial' });

  for (const x of CAN_XOA) {
    test(`Xoá phân công bản án ${x.soBanAn} – ${x.ngayBanAn} (vụ ${x.vu})`, async ({ browser }, testInfo) => {
      test.skip(!choPhepGhiTKM(), 'Chưa bật QLA_TKM_CHO_PHEP_GHI=1');
      testInfo.setTimeout(5 * 60_000);
      const ghi = (t: string, m: string) => testInfo.annotations.push({ type: t, description: m });
      const { page, context } = await moTrangVaiCauHinh(browser, testInfo, 'vuTruong');

      await moMenu(page, ['Quản lý án GĐT/TT', 'Phân công thẩm phán']);
      await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
      await choHetSpin(page);

      await page.getByRole('tab', { name: /^Quản lý kết quả phân công/ }).first().click();
      await choHetSpin(page);
      await nghi(page, 1200, 2000);
      const oHinhThuc = page.getByLabel('Hình thức phân công', { exact: true }).first();
      if (await hienTrong(oHinhThuc, 5_000)) await chonSelect(page, oHinhThuc, HINH_THUC, { goDeLoc: false });
      await go(page.getByLabel('Số BA/QĐ', { exact: true }).first(), x.soBanAn);
      await page.getByRole('button', { name: /Tìm kiếm$/ }).first().click();
      await choHetSpin(page);
      await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
      await nghi(page, 1500, 2500);

      // Khớp số bản án ĐỨNG RIÊNG + đúng ngày — đây chính là chỗ đã làm hỏng cả buổi khi khớp chuỗi con
      const soRieng = new RegExp(`(^|[^0-9])${x.soBanAn}([^0-9]|$)`);
      const dong = page
        .locator('.ant-table-row:visible')
        .filter({ hasText: soRieng })
        .filter({ hasText: x.ngayBanAn })
        .first();

      if (!(await hienTrong(dong, 15_000))) {
        const ds = await page.locator('.ant-table-row:visible').allInnerTexts();
        ghi('bỏ qua', `Không còn dòng phân công của bản án ${x.soBanAn} – ${x.ngayBanAn} (lưới ${ds.length} dòng)`);
        await context.close();
        return;
      }
      ghi('dòng phân công', (await dong.innerText()).replace(/\s+/g, ' ').slice(0, 200));

      await dong.locator('.ant-checkbox-input').first().check();
      await nghi(page, 600, 1000);
      const nutXoa = page.getByRole('button', { name: /^(delete )?Xóa( \(\d+\))?$/ }).first();
      await expect(nutXoa, 'Không thấy nút "Xóa" sau khi tick dòng').toBeEnabled({ timeout: 30_000 });
      await nutXoa.click();
      const xn = page
        .locator('.ant-modal-confirm:visible, .ant-modal:visible')
        .filter({ has: page.getByRole('button', { name: /^(Đồng ý|Xác nhận|Xóa|OK)$/ }) })
        .last();
      if (await hienTrong(xn, 8_000)) await xn.getByRole('button', { name: /^(Đồng ý|Xác nhận|Xóa|OK)$/ }).last().click();
      await choHetSpin(page);
      await nghi(page, 2000, 3000);

      // Kiểm chứng bằng màn, không tin toast: dòng phải biến mất khỏi tab kết quả phân công
      await expect(
        page.locator('.ant-table-row:visible').filter({ hasText: soRieng }).filter({ hasText: x.ngayBanAn }),
        `Bản ghi phân công của bản án ${x.soBanAn} – ${x.ngayBanAn} vẫn còn sau khi bấm Xóa`,
      ).toHaveCount(0, { timeout: 30_000 });
      ghi('kết quả', 'đã xoá khỏi tab Quản lý kết quả phân công');
      await context.close();
    });
  }
});
