/**
 * Luồng "Thêm mới đơn theo bản án sơ thẩm có sẵn" — Luông nhập data.txt (Bước 1 & Bước 2),
 * chạy bằng TÀI KHOẢN RIÊNG khai ở QLA_TKM_* (không dùng chung session/biến với các test cũ).
 *
 *   Đăng nhập SSO (tests/tai-khoan-moi.setup.ts) → Quản lý đơn › Danh sách đơn → "Thêm mới"
 *   → tải tài liệu → popup "Xác nhận xử lý OCR" bấm "Quay lại" (nhập tay, không OCR)
 *   → Thông tin bản án: Số bản án / Ngày bản án / Tòa ra bản án (3 cột lấy từ Excel) + Cấp xét xử
 *   → bấm kính lúp tra cứu → hệ thống tự điền "Loại án"
 *   → Thông tin đơn: "Chọn người từ bản án cũ" → Tỉnh/Phường-Xã
 *   → Nội dung đơn: bấm "[Gợi ý]" → Xử lý đơn: Đơn vị chuyển đến theo loại án, "Thụ lý mới"
 *   → Thông tin khiếu nại → "Lưu thông tin" → mở lại đơn kiểm tra từng trường.
 *
 * Dữ liệu: e2e/data/BAN_AN_SO_THAM_TOA_AN_GDT.xlsx (3 cột nhập) đối chiếu
 *          e2e/data/22A_BAN_AN_ST_TOA_AN_DATA.xlsx (bản án gốc, bị cáo, loại án) — xem common/ban-an-so-tham.ts.
 *
 * Lỗi dữ liệu đã xác nhận (23/09/2026): dòng 25 của file đầu vào (bản án 516 ngày 27/03/2026) ứng với
 * VA26-002403 – Trần Hoàng Khánh trong file đối chiếu, nhưng hệ thống trả VA26-002464 – Hoàng Văn Thái.
 * Người dùng xác nhận dòng 25 không có dữ liệu ⇒ giữ nguyên là test case LỖI, không bỏ qua, không sửa dữ liệu.
 *
 * Spec này CHỈ ĐỌC: không tạo đơn. Luồng nhập đơn + 9 bước nằm ở tests/luong-day-du-tai-khoan-moi.spec.ts.
 * Trên STG biến này để trống ⇒ chỉ chạy phần đăng nhập/đối chiếu quyền, không tạo dữ liệu.
 */
import { expect, test } from '@playwright/test';
import { AUTH_FILE_TKM, choPhepGhiTKM, credentialsTKM } from '../account';
import { giaiDoanTheoCap, layToken, maToaTheoTen, nguoiVuAnCu, traCuuBanAnCu } from '../common/api-don';
import { chonDongChay, docBanAnSoTham } from '../common/ban-an-so-tham';
import { nguoiNgauNhien } from '../common/du-lieu';
import { LOAI_AN, LoaiAn, ThemMoiDonPage, taoThongTinDon } from '../pages/them-moi-don.page';

const { ds, lech } = docBanAnSoTham();
const DS_CHAY = chonDongChay(ds);
const MOI_TRUONG = process.env.QLA_ENV || 'stg';

test('dữ liệu test – 3 cột đầu vào khớp file đối chiếu', async () => {
  test.info().annotations.push({ type: 'số dòng đọc được', description: String(ds.length) });
  test.info().annotations.push({ type: 'dòng sẽ chạy trên giao diện', description: DS_CHAY.map(b => b.dong).join(', ') });
  await test.info().attach('du-lieu-ban-an.json', { body: JSON.stringify(ds, null, 2), contentType: 'application/json' });

  expect(ds.length, 'Không đọc được dòng dữ liệu nào từ file Excel đầu vào').toBeGreaterThan(0);
  // Lệch = chênh giữa file đầu vào và file đối chiếu; ghi rõ ra báo cáo thay vì tự suy đoán
  expect(lech, `Chênh lệch giữa 2 file Excel:\n${lech.join('\n')}`).toEqual([]);
});

test('tài khoản – đăng nhập được và có quyền vào màn Thêm mới đơn', async ({ page }) => {
  const cred = credentialsTKM();
  test.skip(!cred, 'Chưa khai QLA_TKM_USER cho môi trường này');

  // Thông tin tài khoản của phiên hiện tại: dùng để đối chiếu quyền giữa DEV và STG
  const choUser = page.waitForResponse(r => /session\/current_user/.test(r.url()), { timeout: 60_000 }).catch(() => null);
  await page.goto('dashboard');
  const res = await choUser;
  const hoSo = res ? await res.json().catch(() => null) : null;
  if (hoSo) {
    const d = hoSo.data || hoSo;
    test.info().annotations.push({
      type: `tài khoản ${MOI_TRUONG}`,
      description: [d.username, d.fullName, d.tenChucVu || d.positionName, d.positionCode, d.organizationCode, d.tenDonVi]
        .filter(Boolean)
        .join(' | '),
    });
    await test.info().attach(`current-user.${MOI_TRUONG}.json`, { body: JSON.stringify(d, null, 2), contentType: 'application/json' });
  }

  await page.goto('quan-ly-don/danh-sach-don');
  const themMoi = page.getByRole('button', { name: /Thêm mới$/ });
  await expect(themMoi, 'Tài khoản không thấy nút "Thêm mới" ở Danh sách đơn (thiếu quyền tạo đơn?)').toBeVisible({ timeout: 60_000 });
});

/**
 * Kiểm chứng dữ liệu bản án bằng API GET — KHÔNG mở form, KHÔNG tải file, KHÔNG lưu ⇒ không sinh dữ liệu rác.
 * Mỗi dòng Excel là một test case riêng: dòng nào lệch dữ liệu thì chỉ dòng đó đỏ.
 * Môi trường chưa có bộ bản án (DEV) thì bỏ qua kèm lý do, trừ khi đặt QLA_TKM_BAT_BUOC_CO_DU_LIEU=1 (STG).
 */
test.describe('tra cứu bản án theo Excel (chỉ đọc)', () => {
  const BAT_BUOC_CO_DU_LIEU = process.env.QLA_TKM_BAT_BUOC_CO_DU_LIEU === '1';
  let token = '';
  const maToa = new Map<string, string | undefined>();

  test.beforeAll(async ({ browser }) => {
    if (!credentialsTKM()) return;
    const ctx = await browser.newContext({ storageState: AUTH_FILE_TKM, ignoreHTTPSErrors: true });
    const page = await ctx.newPage();
    token = await layToken(page);
    await ctx.close();
  });

  for (const b of ds) {
    test(`dòng ${b.dong} – bản án số ${b.soBanAn} ngày ${b.ngayBanAn}`, async ({ request }) => {
      test.skip(!credentialsTKM(), 'Chưa khai QLA_TKM_USER cho môi trường này');
      const ghi = (type: string, description: string) => test.info().annotations.push({ type, description });

      if (b.toaAnTrongFile !== b.toaAn) ghi('tên tòa quy đổi', `"${b.toaAnTrongFile}" (file) → "${b.toaAn}" (danh mục)`);
      if (!maToa.has(b.toaAn)) maToa.set(b.toaAn, await maToaTheoTen(request, token, b.toaAn));
      const ma = maToa.get(b.toaAn);
      if (!ma) {
        // Tên tòa trong file không có trong danh mục đơn vị → trên UI cũng không chọn được tòa này
        const loi = `Danh mục đơn vị không có tòa "${b.toaAn}"`;
        ghi('GAP dữ liệu', loi);
        if (BAT_BUOC_CO_DU_LIEU) throw new Error(loi);
        test.skip(true, loi);
        return;
      }

      const banAn = await traCuuBanAnCu(request, token, {
        soBanAn: b.soBanAn,
        ngayBanAn: b.ngayBanAn,
        maDonVi: ma,
        giaiDoan: giaiDoanTheoCap(b.capXetXu),
      });
      if (!banAn) {
        const loi = `Không tra cứu được bản án số ${b.soBanAn} ngày ${b.ngayBanAn} của ${b.toaAn} trên ${MOI_TRUONG}`;
        ghi('GAP dữ liệu', loi);
        // Môi trường chưa nạp bộ bản án (DEV) → bỏ qua; nơi buộc phải có (STG) → báo lỗi
        if (BAT_BUOC_CO_DU_LIEU) throw new Error(loi);
        test.skip(true, loi);
        return;
      }

      const nguoi = banAn.idVuAn ? await nguoiVuAnCu(request, token, banAn.idVuAn, banAn.idBanAn) : [];
      ghi('hệ thống trả về', `${banAn.maVuAn} | ${banAn.tenVuAn} | ${banAn.tenDonViRaBanAn}`);
      ghi('người trong vụ án', nguoi.join(' / ') || '(trống)');

      expect.soft(banAn.tenDonViRaBanAn, 'Tòa ra bản án').toBe(b.toaAn);
      if (b.maVuAn) expect.soft(banAn.maVuAn, 'Mã vụ án theo file đối chiếu').toBe(b.maVuAn);
      if (b.biCao) expect.soft(nguoi.join(' | '), `Vụ án phải có bị cáo "${b.biCao}"`).toContain(b.biCao);
    });
  }
});
