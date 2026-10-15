/**
 * FLOW-001 · nghiệp vụ bước 02 — Chi tiết đơn · tab Phân công: Thẩm phán xử lý đơn.
 *
 * Nguồn nghiệp vụ : StepData KDTM · Xử lý "Chi tiết đơn" mục 1–2
 * Nguồn cài đặt   : `don-hanh-chinh-so-tham.spec.ts` · S2 (đã chạy được, nay ở backup) — cùng biểu
 *                   mẫu DS001 nên dùng lại nguyên các id ô.
 *
 * Vì sao vẫn là DS001 cho KDTM: `QuanLyDon/DonKhoiKienYeuCau/ChiTiet/phanCongDon.ts ·
 * layMaBieuMauPhanCongThamPhan` trả `[DS001, DS003]` cho mọi loại đơn trừ hành chính và phá sản/phục
 * hồi, khi phân loại là "Đơn khởi kiện".
 *
 * VÀO : `idDon` (khung đã mở sẵn tab Phân công theo route của bước)
 * RA  : `soQuyetDinhPhanCongDon`
 */
import { Page, expect, test } from '@playwright/test';
import { choHetSpin, chonSelect, chonSelectTheoThuTu, hienTrong, nghi } from '../../../common/antd';
import { bieuMauDangMo, dongBieuMau, laySoVaKyLogic, luuBieuMau, soCuaBieuMau } from '../../../common/bieu-mau';
import { khungSelectCua } from '../../../common/don-khoi-kien';
import type { INPUT } from '../../../data/kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/case-001/input';

type DuLieuVao = typeof INPUT;
type GhiChu = (nhan: string, mo: string) => void;

export async function phanCongThamPhanXuLyDon(page: Page, input: DuLieuVao, ghi: GhiChu) {
  await choHetSpin(page);
  await nghi(page, 1500, 2500);

  // Lượt trước đã lập quyết định thì mở lại, không lập thêm (chạy lại không sinh văn bản trùng)
  await test.step('Mở biểu mẫu phân công Thẩm phán xử lý đơn (DS001)', async () => {
    const dongVanBan = page.locator('.ant-table-row').filter({ hasText: /phân công thẩm phán/i }).first();
    if (await hienTrong(dongVanBan, 5_000)) {
      ghi('văn bản phân công', 'dùng lại văn bản đã lập ở lượt trước');
      await dongVanBan.locator('button:has(.anticon-eye)').first().click();
    } else {
      await page.getByRole('button', { name: /Phân công$/ }).first().click();
      await page.getByRole('menuitem', { name: /Phân công Thẩm phán giải quyết đơn/ }).first().click();
    }
    await choHetSpin(page);
  });

  const bm = bieuMauDangMo(page);
  const oVaiTro = bm.locator('#bieuMauDS001_noiDung_vaiTro');
  await expect(oVaiTro, 'Không mở được biểu mẫu phân công Thẩm phán (DS001)').toBeVisible({ timeout: 60_000 });
  await choHetSpin(page);
  await nghi(page, 1200, 2000);

  await test.step('Người ký → Vai trò → Người được phân công', async () => {
    const bangPhanCong = bm.locator('.ant-table-row');
    if (await bangPhanCong.count()) {
      ghi('người được phân công', (await bangPhanCong.first().innerText()).replace(/\s+/g, ' ').trim());
      return;
    }

    const oNguoiKy = bm.locator('#bieuMauDS001_noiDung_MA_NGUOI_KY');
    if (!(await khungSelectCua(oNguoiKy).locator('.ant-select-selection-item').count())) {
      // StepData ghi "Dương Văn Hải"; danh mục là cán bộ của đơn vị đăng nhập nên có thể không có
      try {
        await chonSelect(page, oNguoiKy, input.nguoiKyPhanCong);
      } catch {
        const ten = await chonSelect(page, oNguoiKy);
        ghi('người ký', `danh mục không có "${input.nguoiKyPhanCong}" → chọn ${ten}`);
      }
    }

    await chonSelect(page, oVaiTro, input.vaiTroPhanCongDon);
    await choHetSpin(page);

    // Người được phân công: danh mục là Thẩm phán của đơn vị, khai đích danh thì chọn đúng tên;
    // không có thì lấy mục ĐẦU THEO THỨ TỰ CHỮ CÁI (không phải "mục đầu danh sách" — thứ tự máy chủ
    // trả về không ổn định, hai lượt chạy sẽ ra hai thẩm phán khác nhau).
    const oNguoiDuocPC = bm.locator('#bieuMauDS001_noiDung_nguoiDuocPC');
    let nguoiDuocPC = '';
    try {
      nguoiDuocPC = input.thamPhanXuLyDon
        ? await chonSelect(page, oNguoiDuocPC, input.thamPhanXuLyDon)
        : await chonSelectTheoThuTu(page, oNguoiDuocPC);
    } catch {
      nguoiDuocPC = await chonSelectTheoThuTu(page, oNguoiDuocPC);
      ghi('người được phân công', `danh mục không có "${input.thamPhanXuLyDon}" → lấy mục đầu theo thứ tự chữ cái`);
    }
    ghi('người được phân công', nguoiDuocPC);

    await bm.locator('button:has(.anticon-arrow-down)').first().click();
    await expect(bangPhanCong.first(), 'Không đưa được người được phân công vào bảng').toBeVisible({ timeout: 30_000 });
    await nghi(page, 800, 1400);
  });

  await luuBieuMau(page, bm, 'quyết định phân công đơn');
  await laySoVaKyLogic(page, bm, ghi, 'quyết định phân công đơn');

  const soQuyetDinhPhanCongDon = await soCuaBieuMau(bm, 'bieuMauDS001');
  expect(soQuyetDinhPhanCongDon, 'Không đọc được số quyết định phân công sau khi Lấy số').not.toBe('');
  await dongBieuMau(page, bm);

  return { soQuyetDinhPhanCongDon };
}
