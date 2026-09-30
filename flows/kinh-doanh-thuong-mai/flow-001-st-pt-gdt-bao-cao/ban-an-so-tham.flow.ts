/**
 * FLOW-001 · nghiệp vụ bước 12 — Bản án sơ thẩm, tab "Kết quả sơ thẩm".
 *
 * VIẾT THEO MÀN HÌNH THẬT (cây trợ năng Playwright chụp 30/09/2026), không theo code FE:
 *
 *   textbox  "Ngày bản án" [disabled]      ← hệ thống tự đặt, KHÔNG nhập
 *   textbox  "Số bản án"   [disabled]      ← hệ thống tự cấp, KHÔNG nhập
 *   combobox "* Người ký"                  ← BẮT BUỘC; danh sách là thẩm phán đã phân công
 *                                            (đo: "Điều Văn Hằng", "Lê Tiến")
 *   textbox  "Nhập nội dung vụ án"
 *   textbox  "Nhập nhận định của tòa án"
 *   button   "Thêm mới bản án"             ← tạo bản án
 *   button   "Xem bản án" [disabled]       ← chỉ mở khi đã có bản án
 *
 * ⚠ Hai bẫy đã đo được:
 *   · Nút "Lưu" cạnh ô "Ngày hiệu lực bản án" là LƯU HIỆU LỰC. Bấm khi chưa có bản án thì báo
 *     "Cần lưu bản án trước khi cập nhật ngày hiệu lực".
 *   · Bỏ trống Người ký thì báo "Người ký không được bỏ trống | Không thể lưu bản án".
 *
 * StepData Step6 mô tả 48-DS → 51-DS → "Tạo bản án (52-DS)" ở tab "Xét xử"; màn KDTM thật không có
 * tab đó và cũng không có các biểu mẫu đó — theo màn hình thật.
 */
import { Page, expect, test } from '@playwright/test';
import { choHetSpin, chonComboboxTheoTen, go, hienTrong, nguyenNhanLoi } from '../../../common/antd';
import type { INPUT } from '../../../data/kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/case-001/input';

type DuLieuVao = typeof INPUT;
type GhiChu = (nhan: string, mo: string) => void;

export async function banAnSoTham(page: Page, input: DuLieuVao, ghi: GhiChu) {
  await choHetSpin(page);

  const oNgay = page.getByRole('textbox', { name: 'Ngày bản án' });
  const oSo = page.getByRole('textbox', { name: 'Số bản án' });
  await expect(oNgay, 'Tab Kết quả sơ thẩm không có ô "Ngày bản án"').toBeVisible({ timeout: 60_000 });

  // Lượt trước đã tạo bản án thì hai ô đã có giá trị — đọc lại, không tạo chồng
  const soCu = (await oSo.inputValue().catch(() => '')).trim();
  if (soCu) {
    const ngayCu = (await oNgay.inputValue().catch(() => '')).trim();
    ghi('bản án sơ thẩm', `đã có ở lượt trước: số ${soCu} · ngày ${ngayCu}`);
    return { soBanAnSoTham: soCu, ngayBanAnSoTham: ngayCu, toaRaBanAnSoTham: input.toaRaBanAnSoTham };
  }

  await test.step('Người ký (bắt buộc) + nội dung + nhận định', async () => {
    // Tên trợ năng CÓ dấu sao vì là ô bắt buộc — đúng như màn hình phơi ra
    const nguoiKy = await chonComboboxTheoTen(page, '* Người ký');
    ghi('người ký bản án', nguoiKy);

    const oNoiDung = page.getByPlaceholder('Nhập nội dung vụ án').first();
    if (await hienTrong(oNoiDung, 5_000)) await go(oNoiDung, input.noiDungBanAnSoTham);
    const oNhanDinh = page.getByPlaceholder('Nhập nhận định của tòa án').first();
    if (await hienTrong(oNhanDinh, 5_000)) await go(oNhanDinh, input.nhanDinhBanAnSoTham);
  });

  // Khối "Quyết định": bảng căn cứ pháp lý khởi tạo rỗng ("Chưa có căn cứ pháp lý"). Chọn Điều rồi
  // bấm nút mũi tên xuống để đưa vào bảng — Bộ luật áp dụng đã điền sẵn "Bộ luật Dân sự 2015".
  await test.step('Thêm căn cứ pháp lý', async () => {
    const bang = page.locator('.ant-table-row').filter({ hasText: /Bộ luật/ });
    if (await bang.count()) {
      ghi('căn cứ pháp lý', `đã có ${await bang.count()} dòng`);
      return;
    }
    const dieu = await chonComboboxTheoTen(page, /Chọn điều|^Điều$/).catch(() => '');
    if (!dieu) {
      ghi('căn cứ pháp lý', 'không chọn được "Điều" — thử tạo bản án không kèm căn cứ');
      return;
    }
    ghi('căn cứ pháp lý · điều', dieu);
    const nutThemCanCu = page.locator('button:has(.anticon-arrow-down)').last();
    if (await hienTrong(nutThemCanCu, 5_000)) {
      await nutThemCanCu.click({ force: true });
      await choHetSpin(page);
    }
  });

  await test.step('Thêm mới bản án', async () => {
    const nut = page.getByRole('button', { name: /Thêm mới bản án/ }).first();
    await expect(nut, 'Không thấy nút "Thêm mới bản án"').toBeVisible({ timeout: 30_000 });
    await nut.scrollIntoViewIfNeeded();
    await nut.click();
    await choHetSpin(page);
  });

  // BẰNG CHỨNG ĐỌC TỪ HỆ THỐNG. Không có nhánh dự phòng về số tự gieo: nhánh `|| soGieo` cũ làm
  // bước báo XANH GIẢ khi bản án chưa thực sự được tạo (đo 30/09/2026 — "số 450" là số gieo).
  const coSo = await expect
    .poll(async () => (await oSo.inputValue().catch(() => '')).trim(), { timeout: 45_000 })
    .not.toBe('')
    .then(() => true)
    .catch(() => false);
  if (!coSo) {
    throw new Error(
      `Bấm "Thêm mới bản án" nhưng ô "Số bản án" vẫn trống — chưa tạo được bản án. ` +
        `Màn hình đang báo: ${await nguyenNhanLoi(page)}`,
    );
  }

  const soBanAnSoTham = (await oSo.inputValue()).trim();
  const ngayBanAnSoTham = (await oNgay.inputValue().catch(() => '')).trim();
  const toaRaBanAnSoTham = input.toaRaBanAnSoTham;
  ghi('bản án sơ thẩm', `số ${soBanAnSoTham} · ngày ${ngayBanAnSoTham} · ${toaRaBanAnSoTham}`);
  if (!ngayBanAnSoTham) ghi('cảnh báo', `có số bản án nhưng ngày trống. Màn báo: ${await nguyenNhanLoi(page)}`);

  expect(ngayBanAnSoTham, 'Có số bản án nhưng không đọc được ngày bản án').not.toBe('');
  return { soBanAnSoTham, ngayBanAnSoTham, toaRaBanAnSoTham };
}
