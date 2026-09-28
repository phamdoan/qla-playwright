/**
 * Luồng "Đơn khởi kiện và yêu cầu" — dân sự sơ thẩm.
 *
 *   B1  Đăng nhập tài khoản nhận đơn (config: taiKhoan.canBoDanSu) + đọc dữ liệu Excel
 *       data/data-test-dan-su.xlsx, sheet "Sơ thẩm 2A"
 *   B2  Vào Danh sách đơn khởi kiện và yêu cầu (/quan-ly-don/don-khoi-kien-va-yeu-cau/danh-sach?tab=ALL)
 *   B3  "Thêm mới đơn"
 *   B4  Nhập thông tin bắt buộc (hình thức nhận, ngày làm đơn, ngày nhận, số tiếp nhận, người nhận,
 *       quan hệ pháp luật) → B5 "Tiếp theo"
 *   B6  Đương sự: thêm Người khởi kiện (cột "Nguyên đơn") và Người bị kiện (cột "Bị đơn")
 *   B7  Yêu cầu: nội dung yêu cầu, người yêu cầu/khởi kiện → Thêm mới → Tiếp theo
 *   B8  Tài liệu đính kèm → Tiếp theo
 *   B9  Xử lý đơn
 *
 *   (phần tiếp, tài liệu bổ sung)
 *   S2  Chi tiết đơn › tab "Phân công" › Phân công Thẩm phán giải quyết đơn → Lưu → Lấy số → Trình ký → Gửi
 *   S3  Đăng nhập Nguyễn Mậu Trường (<CCCD:chanhAnDanSu>) › Phê duyệt đề xuất › Ký số văn bản › Ký logic
 *   S4  Đăng xuất, đăng nhập tài khoản tiếp theo…
 *
 * Dữ liệu: đọc trực tiếp từ Excel (common/du-lieu-dan-su.ts). Ô người dạng "Nguyễn Sơn Tùng (16 tuổi)"
 * → năm sinh = năm hiện tại − tuổi.
 *
 * Mỗi vụ (một dòng Excel) là một nhóm test riêng, tên "<Mã vụ án ST | Dòng n> · <Nguyên đơn> - <Bị đơn> - <Loại vụ án>",
 * chạy tuần tự trong nhóm: vụ nào lỗi chỉ dừng vụ đó, các vụ khác vẫn chạy tiếp.
 * Mặc định chạy HẾT các vụ; bước đã xong bị bỏ qua theo sổ cái seed-output/dan-su-so-tham.<env>.ledger.json.
 * Trên UI bấm ▶ ở nhóm vụ muốn chạy. Lọc tuỳ chọn: QLA_DS_DONG=2,5 / QLA_DS_SO_DONG=3.
 * QLA_DS_ID_DON / QLA_DS_ID_YEU_CAU / QLA_DS_ID_VU_AN chỉ có tác dụng khi chạy đúng 1 vụ.
 *
 * Viết và chạy TỪNG BƯỚC: bước trước xanh mới làm bước sau.
 *
 * ⚠ Từ B3 trở đi là tạo dữ liệu thật → chỉ chạy khi QLA_TKM_CHO_PHEP_GHI=1.
 *   npm run staging -- --project=tai-khoan-moi don-khoi-kien-dan-su-26-09-2026 --reporter=list
 *   QLA_DS_DONG=2 npm run staging -- --project=tai-khoan-moi don-khoi-kien-dan-su-26-09-2026
 */
import fs from 'fs';
import path from 'path';
import { expect, test } from '@playwright/test';
import { choPhepGhiTKM } from '../account';
import { choHetSpin, chonNgay, chonSelect, go, hienTrong, nghi, nguyenNhanLoi, toastDaHien } from '../common/antd';
import { ddmmyyyy, soNgau } from '../common/du-lieu';
import { giaTri, taiKhoan } from '../common/cau-hinh-luong';
import { VuAnDanSu, chonVuChay, docVuAnDanSu } from '../common/du-lieu-dan-su';
import { daXongBuoc, docDong, ghiSoCai } from '../common/so-cai-dan-su';
import { moTrangVaiCauHinh } from '../common/luong-tkm';
import { PheDuyetPage } from '../pages/phe-duyet.page';

/** Khung .ant-select bao ngoài một ô input (để biết ô đã có giá trị chưa) */
const khungSelectCua = (o: import('@playwright/test').Locator) =>
  o.locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]');

const MOI_TRUONG = process.env.QLA_ENV || 'stg';
const DS_VU = docVuAnDanSu();
/** Các vụ sẽ chạy: mặc định HẾT các vụ trong sheet (xem chonVuChay) — bước đã xong bị bỏ qua theo sổ cái */
const DS_CHAY = chonVuChay(DS_VU);
/** Id truyền tay qua biến môi trường chỉ áp khi chạy đúng 1 vụ (không áp một id cho mọi vụ) */
const ghiDeId = (bien: string) => (DS_CHAY.length === 1 ? process.env[bien] || '' : '');
/** Tên nhóm test của một vụ: "<Mã vụ án ST | Dòng n> · <Nguyên đơn> - <Bị đơn> - <Loại vụ án>" */
const tenVu = (v: VuAnDanSu) =>
  `${v.maVuAn && v.maVuAn !== '.' ? v.maVuAn : `Dòng ${v.dong}`} · ${v.nguyenDon.nguyenVan} - ${v.biDon.nguyenVan} - ${v.loaiVuAn}`;

test('B1 · Đăng nhập tài khoản nhận đơn và đọc dữ liệu Excel', async ({ browser }, testInfo) => {
  // Ghi vào annotation của report, đồng thời in ra console để thấy ngay id/link khi chạy --reporter=list
  const ghi = (type: string, description: string) => {
    testInfo.annotations.push({ type, description });
    console.log(`    · ${type}: ${description}`);
  };

  // Dữ liệu Excel
  expect(DS_VU.length, 'Không đọc được vụ án nào từ sheet "Sơ thẩm 2A"').toBeGreaterThan(0);
  expect(DS_CHAY.length, 'Không chọn được vụ để chạy (xem QLA_DS_DONG / QLA_DS_SO_DONG)').toBeGreaterThan(0);
  ghi('số vụ đọc được', String(DS_VU.length));
  ghi('số vụ sẽ chạy', `${DS_CHAY.length}: ${DS_CHAY.map(tenVu).join(' | ')}`);
  await testInfo.attach('vu-dan-su.json', { body: JSON.stringify(DS_CHAY, null, 2), contentType: 'application/json' });

  // Đăng nhập
  const tk = taiKhoan('canBoDanSu');
  ghi('tài khoản', `${tk.cccd} trên ${MOI_TRUONG}`);
  const { page, context } = await moTrangVaiCauHinh(browser, testInfo, 'canBoDanSu');

  const hoSo = await page
    .request.get(`${new URL(page.url()).origin}/qla/api/v1/session/current_user`, { headers: { accept: 'application/json' } })
    .then(r => r.json())
    .catch(() => null);
  const d = hoSo?.data;
  if (d) ghi('người dùng', [d.username, d.fullName, d.tenChucVu || d.positionName, d.organizationName].filter(Boolean).join(' | '));

  await expect(page, 'Đăng nhập xong phải ở dashboard').toHaveURL(/\/qla\/dashboard/);
  await context.close();
});

test('B2–B3 · Mở Danh sách đơn khởi kiện và yêu cầu, bấm "Thêm mới đơn"', async ({ browser }, testInfo) => {
  test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
  const { page, context } = await moTrangVaiCauHinh(browser, testInfo, 'canBoDanSu');

  await page.goto('quan-ly-don/don-khoi-kien-va-yeu-cau/danh-sach?tab=ALL');
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
  await choHetSpin(page);

  const nut = page.getByRole('button', { name: /Thêm mới đơn$/ });
  await expect(nut, 'Không thấy nút "Thêm mới đơn" ở Danh sách đơn khởi kiện và yêu cầu').toBeVisible({ timeout: 60_000 });
  await nut.first().click();

  // Vào màn nhập liệu nhiều bước "Thêm mới đơn khởi kiện và yêu cầu"
  await expect(page.getByText(/Thêm mới đơn khởi kiện và yêu cầu/i).first(), 'Không mở được màn Thêm mới đơn').toBeVisible({ timeout: 60_000 });
  testInfo.annotations.push({ type: 'url', description: new URL(page.url()).pathname + new URL(page.url()).search });
  await context.close();
});

// Mỗi vụ một nhóm, chạy tuần tự trong nhóm: vụ nào lỗi chỉ dừng vụ đó, các vụ khác vẫn chạy
for (const VU of DS_CHAY) {
  test.describe(tenVu(VU), () => {
    test.describe.configure({ mode: 'serial' });

    test('B2–B9 · Tạo đơn: thông tin đơn → đương sự → yêu cầu → tài liệu → xử lý đơn', async ({ browser }, testInfo) => {
      test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
      // Vụ đã nhập đơn ở lần chạy trước thì bỏ qua để không tạo đơn trùng (QLA_DS_NHAP_LAI=1 để nhập lại)
      test.skip(
        daXongBuoc(VU, 'nhapDon') && process.env.QLA_DS_NHAP_LAI !== '1',
        `Vụ ${VU.maVuAn || VU.nguyenDon.hoTen} đã nhập đơn (id ${docDong(VU)?.idDon}) — đặt QLA_DS_NHAP_LAI=1 nếu muốn nhập lại`,
      );
      testInfo.setTimeout(8 * 60_000);
      // Ghi vào annotation của report, đồng thời in ra console để thấy ngay id/link khi chạy --reporter=list
      const ghi = (type: string, description: string) => {
        testInfo.annotations.push({ type, description });
        console.log(`    · ${type}: ${description}`);
      };
      const { page, context } = await moTrangVaiCauHinh(browser, testInfo, 'canBoDanSu');

      await test.step('B2–B3 · mở màn Thêm mới đơn', async () => {
        await page.goto('quan-ly-don/don-khoi-kien-va-yeu-cau/danh-sach?tab=ALL');
        await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
        await choHetSpin(page);
        await page.getByRole('button', { name: /Thêm mới đơn$/ }).first().click();
        await expect(page.getByText(/Thêm mới đơn khởi kiện và yêu cầu/i).first()).toBeVisible({ timeout: 60_000 });
        await choHetSpin(page);
        await nghi(page, 1200, 2000);
      });

      // B4: các ô bắt buộc ở bước 1 "Thông tin đơn"
      const homNay = ddmmyyyy(new Date());
      // "Số tiếp nhận" do hệ thống tự cấp và khoá (input disabled) → chỉ đọc lại để ghi vào báo cáo

      await chonSelect(page, page.locator('#hinhThucNhanDon'), giaTri('hinhThucNhanDon'), { goDeLoc: false });
      await chonNgay(page.locator('#ngayLamDon'), homNay);
      await chonNgay(page.locator('#ngayNhanDon'), homNay);
      const soTiepNhan = await page.locator('#soTiepNhan').inputValue().catch(() => '');
      ghi('số tiếp nhận (hệ thống cấp)', soTiepNhan || '(trống)');
      await chonSelect(page, page.locator('#canBoNhanDon'), giaTri('nguoiNhanDon'));

      // Loại đơn / Phân loại đơn: giữ giá trị hệ thống gợi ý, chỉ chọn khi đang trống
      for (const id of ['#loaiDon', '#phanLoai']) {
        const o = page.locator(id);
        const daChon = await khungSelectCua(o).locator('.ant-select-selection-item').count();
        if (!daChon) await chonSelect(page, o);
      }

      // Quan hệ pháp luật (Thống kê): danh mục chỉ nạp sau khi gõ từ khoá, và các mục trong
      // dropdown bị Playwright coi là ẩn (click thường lẫn click DOM đều không ăn) → chọn bằng
      // bàn phím. Đếm mục trong ĐÚNG dropdown của ô này (aria-controls) để không nhấn quá số mục.
      const oQhpl = page.locator('#qhplThongKe');
      const tuKhoa = VU.loaiVuAn.split(' ').slice(0, 2).join(' ') || 'Tranh chấp';
      const { qhplDaChon, soMuc } = await chonDanhMucThongKe(page, oQhpl, tuKhoa);
      ghi('quan hệ pháp luật', `${qhplDaChon} (từ khoá "${tuKhoa}", ${soMuc} mục)`);

      // "Quan hệ pháp luật chi tiết" bắt buộc: lấy đúng "Loại vụ án" của vụ trong file Excel
      await go(page.locator('#noiDungQuanHePhapLuat'), VU.loaiVuAn);

      // B5
      await page.getByRole('button', { name: /^Tiếp theo$/ }).first().click();
      await choHetSpin(page);
      await expect(
        page.getByText(/Đương sự/).first(),
        'Bấm Tiếp theo nhưng không sang được bước 2 "Đương sự"',
      ).toBeVisible({ timeout: 60_000 });
      await nghi(page, 1000, 1800);
      ghi('url sau B5', new URL(page.url()).pathname + new URL(page.url()).search);
      // ───────── B6 · Đương sự ─────────
      await expect(page.getByRole('button', { name: /Thêm người tham gia/ }).first()).toBeVisible({ timeout: 60_000 });

      await test.step(`B6.1–6.5 · Người khởi kiện: ${VU.nguyenDon.hoTen}`, () =>
        themNguoiThamGia(page, 'Người khởi kiện', VU.nguyenDon, 'Lưu & Thêm mới'));

      await test.step(`B6.6–6.10 · Người bị kiện: ${VU.biDon.hoTen}`, () =>
        themNguoiThamGia(page, 'Người bị kiện', VU.biDon, 'Lưu'));

      // Hai đương sự phải hiện trên danh sách của bước Đương sự
      for (const ten of [VU.nguyenDon.hoTen, VU.biDon.hoTen]) {
        await expect(page.getByText(ten, { exact: false }).first(), `Không thấy đương sự "${ten}" sau khi lưu`).toBeVisible({
          timeout: 30_000,
        });
      }
      ghi('đương sự', `${VU.nguyenDon.hoTen} (khởi kiện) · ${VU.biDon.hoTen} (bị kiện)`);

      // B6.11
      await page.getByRole('button', { name: /^Tiếp theo$/ }).first().click();
      await choHetSpin(page);
      await expect(page.getByRole('button', { name: /Thêm người tham gia/ }).first(), 'Bấm Tiếp theo nhưng vẫn ở bước Đương sự').toBeHidden({
        timeout: 60_000,
      });
      await nghi(page, 1000, 1800);
      ghi('url sau B6', new URL(page.url()).pathname + new URL(page.url()).search);

      // ───────── B7 · Yêu cầu ─────────
      // Quan hệ pháp luật (Thống kê) + Quan hệ pháp luật chi tiết được wizard tự điền theo bước 1,
      // nên chỉ còn Nội dung yêu cầu và Người yêu cầu/khởi kiện.
      const oNoiDung = page.locator('#yeuCau');
      await expect(oNoiDung, 'Không sang được bước "Yêu cầu"').toBeVisible({ timeout: 60_000 });
      await choHetSpin(page);

      const noiDungYeuCau = `Đề nghị Tòa án giải quyết ${VU.loaiVuAn.toLowerCase()} giữa ${VU.nguyenDon.hoTen} và ${VU.biDon.hoTen}.`;
      await go(oNoiDung, noiDungYeuCau);
      // TreeSelect quan hệ pháp luật: chỉ chọn khi bước 1 chưa điền sẵn
      const oQhplYc = page.locator('#maQuanHePhapLuat');
      if (!(await khungSelectCua(oQhplYc).locator('.ant-select-selection-item').count())) {
        await khungSelectCua(oQhplYc).click();
        const cay = page.locator('.ant-select-dropdown:visible .ant-select-tree-node-content-wrapper').first();
        await expect(cay, 'Cây quan hệ pháp luật ở bước Yêu cầu không nạp được').toBeVisible({ timeout: 30_000 });
        await cay.click();
        await nghi(page, 600, 1000);
      }
      await chonSelect(page, page.locator('#idNguoiYeuCau'), VU.nguyenDon.hoTen);

      // Nút có icon dấu cộng (aria-label="plus") nên tên trợ năng là "plus Thêm mới" → không neo đầu chuỗi
      await page.getByRole('button', { name: /Thêm mới$/ }).first().click();
      await choHetSpin(page);
      // Yêu cầu vừa nhập phải nằm trong "Danh sách yêu cầu khởi kiện / yêu cầu"
      await expect(
        page.getByText(noiDungYeuCau, { exact: false }).first(),
        'Bấm "Thêm mới" nhưng yêu cầu không vào danh sách',
      ).toBeVisible({ timeout: 30_000 });
      ghi('yêu cầu', noiDungYeuCau);
      await nghi(page, 800, 1400);

      await page.getByRole('button', { name: /^Tiếp theo$/ }).first().click();
      await choHetSpin(page);
      await expect(oNoiDung, 'Bấm Tiếp theo nhưng vẫn ở bước Yêu cầu').toBeHidden({ timeout: 60_000 });
      await nghi(page, 1000, 1800);
      ghi('url sau B7', new URL(page.url()).pathname + new URL(page.url()).search);

      // ───────── B8 · Tài liệu đính kèm ─────────
      // Dữ liệu Excel không kèm tài liệu → không đính kèm, đi tiếp (bước này không bắt buộc).
      await expect(
        page.getByRole('button', { name: /Thêm tài liệu mới$/ }).first(),
        'Không sang được bước "Tài liệu đính kèm"',
      ).toBeVisible({ timeout: 60_000 });
      await choHetSpin(page);
      await page.getByRole('button', { name: /^Tiếp theo$/ }).first().click();
      await choHetSpin(page);

      // ───────── B9 · Hoàn thành → Xử lý đơn ─────────
      const nutXuLy = page.getByRole('button', { name: /^Xử lý đơn$/ }).first();
      await expect(nutXuLy, 'Không sang được bước "Hoàn thành"').toBeVisible({ timeout: 60_000 });
      await nghi(page, 1000, 1800);
      await nutXuLy.click();
      // Xong thì hệ thống chuyển sang màn chi tiết đơn (…/chi-tiet?id=<idDon>&tab=thong-tin-chung)
      await page.waitForURL(/don-khoi-kien-va-yeu-cau\/chi-tiet\?/, { timeout: 120_000 });
      await choHetSpin(page);
      const idDon = new URL(page.url()).searchParams.get('id') || '';
      expect(idDon, 'Không lấy được id đơn sau khi Xử lý đơn').not.toBe('');
      ghi('id đơn', idDon);
      ghi('link chi tiết đơn', new URL(page.url()).toString());
      ghiSoCai(VU, { idDon, soTiepNhan, xongBuoc: 'nhapDon' });
      await context.close();
    });

    test('S2 · Phân công Thẩm phán giải quyết đơn → Lấy số → Trình ký', async ({ browser }, testInfo) => {
      test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
      const idDon = ghiDeId('QLA_DS_ID_DON') || docDong(VU)?.idDon || '';
      test.skip(!idDon, `Chưa có id đơn cho vụ ${VU.maVuAn || VU.nguyenDon.hoTen} — chạy bước B2–B9 trước`);
      testInfo.setTimeout(8 * 60_000);
      const ghi = (type: string, description: string) => {
        testInfo.annotations.push({ type, description });
        console.log(`    · ${type}: ${description}`);
      };
      const { page, context } = await moTrangVaiCauHinh(browser, testInfo, 'canBoDanSu');
      ghi('id đơn', idDon);

      // S2.1 · Chi tiết đơn › tab "Phân công"
      await page.goto(`quan-ly-don/don-khoi-kien-va-yeu-cau/chi-tiet?id=${idDon}&tab=phan-cong`);
      await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
      await choHetSpin(page);

      // S2.2 · Đã có "Quyết định phân công thẩm phán giải quyết đơn" từ lần chạy trước thì mở lại văn
      // bản đó (icon "Chi tiết") thay vì lập văn bản mới; chưa có thì bấm "Phân công".
      const dongVanBan = page
        .locator('.ant-table-row')
        .filter({ hasText: /Quyết định phân công thẩm phán giải quyết đơn/i })
        .first();
      if (await hienTrong(dongVanBan, 5_000)) {
        ghi('văn bản phân công', 'dùng lại văn bản đã lập ở lần chạy trước');
        await dongVanBan.locator('button:has(.anticon-eye)').first().click();
      } else {
        await page.getByRole('button', { name: /Phân công$/ }).first().click();
        await page.getByRole('menuitem', { name: /Phân công Thẩm phán giải quyết đơn/ }).first().click();
      }

      // S2.3 · biểu mẫu DS001 "Quyết định phân công Thẩm phán giải quyết đơn"
      const bm = page.locator('.ant-drawer-content:visible, .ant-modal-content:visible').last();
      const oVaiTro = bm.locator('#bieuMauDS001_noiDung_vaiTro');
      await expect(oVaiTro, 'Không mở được biểu mẫu phân công Thẩm phán (DS001)').toBeVisible({ timeout: 60_000 });
      await choHetSpin(page);
      await nghi(page, 1200, 2000);

      // Bảng trong biểu mẫu đã có người được phân công (mở lại văn bản cũ) thì giữ nguyên
      const bangPhanCong = bm.locator('.ant-table-row');
      if (!(await bangPhanCong.count())) {
        // Người ký / người phân công (bắt buộc)
        await chonSelect(page, bm.locator('#bieuMauDS001_noiDung_MA_NGUOI_KY'), giaTri('nguoiKyPhanCongDon'));
        // Vai trò → chọn xong thì danh sách "Tên người được phân công" mới nạp theo vai trò
        await chonSelect(page, oVaiTro, giaTri('vaiTroPhanCongDon'));
        await choHetSpin(page);
        // Người được phân công phải là chính Thẩm phán sẽ lập các văn bản sau (biểu mẫu 29-DS là
        // "Dành cho Thẩm phán được phân công"), và backend không cho phân công hai chủ tọa cho một đơn.
        const nguoiDuocPC = await chonSelect(page, bm.locator('#bieuMauDS001_noiDung_nguoiDuocPC'), giaTri('nguoiKyPhanCongDon'));
        ghi('thẩm phán được phân công', nguoiDuocPC);

        // Nút mũi tên xuống (chỉ có icon) bên phải ô "Tên người được phân công": đưa người vào bảng
        await bm.locator('button:has(.anticon-arrow-down)').first().click();
        await expect(
          bangPhanCong.first(),
          'Bấm thêm nhưng người được phân công không vào bảng',
        ).toBeVisible({ timeout: 30_000 });
        await nghi(page, 800, 1400);
      } else {
        ghi('thẩm phán được phân công', (await bangPhanCong.first().innerText()).replace(/\s+/g, ' ').trim());
      }

      // S2.4–S2.6 · Lưu → Lấy số → Trình ký. Các nút "Lấy số"/"Trình ký"/"Gửi" đều có icon nên tên trợ
      // năng là "number Lấy số" / "send Trình ký" / "send Gửi" → không neo đầu chuỗi.
      const nutLuu = bm.getByRole('button', { name: /^Lưu$/ }).first();
      if (await hienTrong(nutLuu, 5_000)) {
        await nutLuu.click();
        await toastDaHien(page, /thành công/i, 60_000, /thất bại|Vui lòng|Không thể|lỗi/i);
        await choHetSpin(page);
        await nghi(page, 1200, 2000);
      }

      const nutLaySo = bm.getByRole('button', { name: /Lấy số$/ }).first();
      if (await hienTrong(nutLaySo, 10_000)) {
        await nutLaySo.click();
        await toastDaHien(page, /Đã cấp số thành công|thành công/i, 60_000, /Không thể cấp số|thất bại/i);
        await choHetSpin(page);
        await nghi(page, 1200, 2000);
      } else {
        ghi('lấy số', 'văn bản đã được cấp số từ trước');
      }
      ghi('số quyết định', (await bm.locator('#bieuMauDS001_so').inputValue().catch(() => '')) || '(không đọc được)');

      // Văn bản đã trình ký ở lần chạy trước thì nút "Trình ký" không còn (đổi thành "Đã trình ký")
      const nutTrinhKy = bm.getByRole('button', { name: /Trình ký$/ }).first();
      if (!(await hienTrong(nutTrinhKy, 10_000))) {
        ghi('trình ký', 'văn bản đã được trình ký từ lần chạy trước — bỏ qua');
        ghiSoCai(VU, { xongBuoc: 'phanCong' });
        await context.close();
        return;
      }
      await nutTrinhKy.click();
      const hopTrinh = page.locator('.ant-modal').filter({ hasText: 'Nhập thông tin trình duyệt ký' }).last();
      await expect(hopTrinh, 'Không mở được popup trình duyệt ký').toBeVisible({ timeout: 60_000 });
      await nghi(page, 800, 1400);
      // Bắt phản hồi API trình ký để lấy id yêu cầu phê duyệt — bước Chánh án ký mở đúng yêu cầu này
      const choTrinhKy = page
        .waitForResponse(r => r.request().method() === 'POST' && r.url().includes('/phe-duyet-de-xuat/trinh-ky'), { timeout: 90_000 })
        .catch(() => null);
      await hopTrinh.getByRole('button', { name: /Gửi$/ }).first().click();
      await toastDaHien(page, /thành công/i, 90_000, /thất bại|Vui lòng|Không thể|lỗi/i);
      await expect(hopTrinh).toBeHidden({ timeout: 30_000 });

      const kqTrinh = await choTrinhKy;
      const idYeuCauPheDuyet = layIdYeuCauPheDuyet(kqTrinh ? await kqTrinh.json().catch(() => null) : null);
      if (idYeuCauPheDuyet) ghi('id yêu cầu phê duyệt', idYeuCauPheDuyet);
      ghiSoCai(VU, { idYeuCauPheDuyet, xongBuoc: 'phanCong' });
      ghi('link chi tiết đơn', new URL(page.url()).toString());
      await context.close();
    });

    test('S3 · Chánh án phê duyệt / ký logic quyết định phân công', async ({ browser }, testInfo) => {
      test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
      const idYeuCau = ghiDeId('QLA_DS_ID_YEU_CAU') || docDong(VU)?.idYeuCauPheDuyet || '';
      test.skip(!idYeuCau, `Chưa có id yêu cầu phê duyệt cho vụ ${VU.maVuAn || VU.nguyenDon.hoTen} — chạy bước S2 trước`);
      testInfo.setTimeout(8 * 60_000);
      const ghi = (type: string, description: string) => {
        testInfo.annotations.push({ type, description });
        console.log(`    · ${type}: ${description}`);
      };
      const { page, context } = await moTrangVaiCauHinh(browser, testInfo, 'chanhAnDanSu');
      ghi('id yêu cầu phê duyệt', idYeuCau);

      const pd = new PheDuyetPage(page);
      const conCho = await pd.moChiTietTheoId(idYeuCau);
      if (!conCho) {
        ghi('kết quả', 'yêu cầu đã được duyệt từ lần chạy trước — bỏ qua');
        ghiSoCai(VU, { xongBuoc: 'kyPhanCong' });
        await context.close();
        return;
      }

      // Màn ký văn bản (action=ky-so): nhập ý kiến rồi "Ký logic"
      await pd.ykienVaKyLogicVanBan(giaTri('yKienKyPhanCongDon'));
      ghiSoCai(VU, { xongBuoc: 'kyPhanCong' });
      ghi('kết quả', 'đã ký logic quyết định phân công Thẩm phán');
      await context.close();
    });


    test('S4 · Thẩm phán tự phân công xử lý đơn (Nguyễn Mậu Trường) → Lấy số → Ký logic', async ({ browser }, testInfo) => {
      test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
      const idDon = ghiDeId('QLA_DS_ID_DON') || docDong(VU)?.idDon || '';
      test.skip(!idDon, `Chưa có id đơn cho vụ ${VU.maVuAn || VU.nguyenDon.hoTen} — chạy bước B2–B9 trước`);
      testInfo.setTimeout(8 * 60_000);
      const ghi = (type: string, description: string) => {
        testInfo.annotations.push({ type, description });
        console.log(`    · ${type}: ${description}`);
      };
      const { page, context } = await moTrangVaiCauHinh(browser, testInfo, 'chanhAnDanSu');
      ghi('id đơn', idDon);

      // 4.4 · Chi tiết đơn (đang ở trạng thái "Chờ thụ lý") › tab "Phân công"
      await page.goto(`quan-ly-don/don-khoi-kien-va-yeu-cau/chi-tiet?id=${idDon}&tab=phan-cong`);
      await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
      await choHetSpin(page);
      ghi('trạng thái đơn', (await page.getByText(/Chờ thụ lý|Chờ xử lý/i).first().innerText().catch(() => '')) || '(không đọc được)');

      // Backend chặn "phân công hai chủ tọa cho một đơn khởi kiện" → đã phân công đúng người thì bỏ qua
      const daPhanCong = await page.locator('.ant-table-row').filter({ hasText: giaTri('nguoiKyPhanCongDon') }).count();
      if (daPhanCong) {
        ghi('kết quả', `đơn đã được phân công cho ${giaTri('nguoiKyPhanCongDon')} từ bước trước — không phân công lại`);
        await context.close();
        return;
      }

      // 4.5–4.6 · "Phân công" › "Phân công Thẩm phán giải quyết đơn"
      await page.getByRole('button', { name: /Phân công$/ }).first().click();
      await page.getByRole('menuitem', { name: /Phân công Thẩm phán giải quyết đơn/ }).first().click();

      const bm = page.locator('.ant-drawer-content:visible, .ant-modal-content:visible').last();
      const oVaiTro = bm.locator('#bieuMauDS001_noiDung_vaiTro');
      await expect(oVaiTro, 'Không mở được biểu mẫu phân công Thẩm phán (DS001)').toBeVisible({ timeout: 60_000 });
      await choHetSpin(page);
      await nghi(page, 1200, 2000);

      // 4.7–4.8 · Vai trò "Thẩm phán xử lý đơn", người được phân công là chính Nguyễn Mậu Trường
      const nguoiKy = giaTri('nguoiKyPhanCongDon');
      const oNguoiKy = bm.locator('#bieuMauDS001_noiDung_MA_NGUOI_KY');
      if (!(await khungSelectCua(oNguoiKy).locator('.ant-select-selection-item').count())) {
        await chonSelect(page, oNguoiKy, nguoiKy);
      }
      await chonSelect(page, oVaiTro, giaTri('vaiTroPhanCongDon'));
      await choHetSpin(page);
      const nguoiDuocPC = await chonSelect(page, bm.locator('#bieuMauDS001_noiDung_nguoiDuocPC'), nguoiKy);
      ghi('người được phân công', nguoiDuocPC);

      // 4.9 · nút mũi tên xuống đưa người vào bảng phân công
      await bm.locator('button:has(.anticon-arrow-down)').first().click();
      await expect(bm.locator('.ant-table-row').first(), 'Không đưa được người được phân công vào bảng').toBeVisible({
        timeout: 30_000,
      });
      await nghi(page, 800, 1400);

      // 4.10–4.13 · Lưu → Lấy số → Ký logic → Đóng (nút có icon nên không neo đầu chuỗi)
      const nutLuu = bm.getByRole('button', { name: /^Lưu$/ }).first();
      if (await hienTrong(nutLuu, 5_000)) {
        await nutLuu.click();
        await toastDaHien(page, /thành công/i, 60_000, /thất bại|Vui lòng|Không thể|lỗi/i);
        await choHetSpin(page);
        await nghi(page, 1200, 2000);
      }

      const nutLaySo = bm.getByRole('button', { name: /Lấy số$/ }).first();
      if (await hienTrong(nutLaySo, 10_000)) {
        await nutLaySo.click();
        await toastDaHien(page, /Đã cấp số thành công|thành công/i, 60_000, /Không thể cấp số|thất bại/i);
        await choHetSpin(page);
        await nghi(page, 1200, 2000);
      }
      ghi('số quyết định phân công', (await bm.locator('#bieuMauDS001_so').inputValue().catch(() => '')) || '(không đọc được)');

      await bm.getByRole('button', { name: /Ký logic$/ }).first().click();
      await xacNhanHopThoai(page);
      await toastDaHien(page, /Ký logic thành công|thành công/i, 120_000, /thất bại|Không thể|lỗi/i);
      await choHetSpin(page);
      await nghi(page, 1500, 2500);
      await bm.getByRole('button', { name: /^Đóng$/ }).first().click().catch(() => {});
      ghi('kết quả', 'đã ký logic quyết định phân công Thẩm phán xử lý đơn');
      await context.close();
    });
    test('S5 · Án phí: chế độ thủ tục → nghĩa vụ → Thông báo 29-DS → Ghi nhận nộp phí → Thụ lý vụ', async ({ browser }, testInfo) => {
      test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
      const idDon = ghiDeId('QLA_DS_ID_DON') || docDong(VU)?.idDon || '';
      test.skip(!idDon, `Chưa có id đơn cho vụ ${VU.maVuAn || VU.nguyenDon.hoTen} — chạy bước B2–B9 trước`);
      testInfo.setTimeout(15 * 60_000);
      const ghi = (type: string, description: string) => {
        testInfo.annotations.push({ type, description });
        console.log(`    · ${type}: ${description}`);
      };
      const { page, context } = await moTrangVaiCauHinh(browser, testInfo, 'chanhAnDanSu');
      ghi('id đơn', idDon);

      await page.goto(`quan-ly-don/don-khoi-kien-va-yeu-cau/chi-tiet?id=${idDon}&tab=ket-qua-xu-ly`);
      await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
      await choHetSpin(page);
      await nghi(page, 2000, 3000);

      // Ngày nhận đơn đọc ngay trên màn — dùng lại cho "Ngày thông báo" (5.6) và "Ngày thụ lý" (5.19)
      // Thanh tiêu đề đơn có dạng "62 • Ngày nhận: 25/09/2026 • Đơn khởi kiện • Đơn dân sự"
      const dongNgayNhan = await page.getByText(/Ngày nhận:\s*\d{2}\/\d{2}\/\d{4}/).first().innerText();
      const ngayNhanDon = (dongNgayNhan.match(/\d{2}\/\d{2}\/\d{4}/) || [])[0] || '';
      expect(ngayNhanDon, 'Không đọc được "Ngày nhận đơn" trên màn chi tiết đơn').toBeTruthy();
      ghi('ngày nhận đơn', ngayNhanDon);

      // 5.1 · Xác nhận chế độ thủ tục — phải làm trước khi xác định nghĩa vụ
      const daXacNhanCheDo = page.getByText(/Đã xác nhận Thủ tục/i).first();
      if (!(await hienTrong(daXacNhanCheDo, 5_000))) {
        await page.getByRole('button', { name: /Xác nhận chế độ thủ tục$/ }).first().click();
        await xacNhanHopThoai(page);
        await choHetSpin(page);
        await expect(daXacNhanCheDo, 'Xác nhận chế độ thủ tục không ăn').toBeVisible({ timeout: 60_000 });
        await nghi(page, 1200, 2000);
      }
      ghi('chế độ thủ tục', (await daXacNhanCheDo.innerText()).replace(/\s+/g, ' ').trim());

      // 5.2–5.3 · Xác định nghĩa vụ → "Xác nhận tất cả"
      const daXacDinhNghiaVu = page.getByText(/Các nguồn phát sinh hiện có đã được xác định/i).first();
      if (!(await hienTrong(daXacDinhNghiaVu, 5_000))) {
        await page.getByRole('button', { name: /Xác định nghĩa vụ$/ }).first().click();
        await choHetSpin(page);
        const hopNv = page.locator('.ant-drawer-content:visible, .ant-modal-content:visible').last();
        await expect(hopNv, 'Không mở được "Xác định nghĩa vụ tạm ứng án phí"').toBeVisible({ timeout: 60_000 });
        await nghi(page, 1500, 2500);
        await hopNv.getByRole('button', { name: /Xác nhận tất cả$/ }).first().click();
        await choHetSpin(page);
        await nghi(page, 1500, 2500);
        await hopNv.getByRole('button', { name: /^Đóng$/ }).first().click().catch(() => {});
        await choHetSpin(page);
        await expect(daXacDinhNghiaVu, 'Xác định nghĩa vụ tạm ứng không ăn').toBeVisible({ timeout: 60_000 });
      }
      ghi('nghĩa vụ tạm ứng', 'đã xác định cho toàn bộ nguồn phát sinh');

      // 5.4–5.12 · Thông báo nộp tiền tạm ứng án phí (29-DS) → Lưu → Lấy số → Ký logic → Đóng.
      // Khối "Chưa đủ điều kiện" cũng có nút "Thêm thông báo" nên phải tìm theo khối.
      const khoiTb = page.locator('.ant-collapse-item').filter({ hasText: 'Thông báo tạm ứng án phí và chi phí tố tụng' }).last();
      const dongTb = khoiTb.locator('.ant-table-row').filter({ hasText: /Thông báo nộp/ });
      if (!(await dongTb.count())) {
        const nutThem = khoiTb.locator('button').filter({ hasText: 'Thêm thông báo' }).last();
        await nutThem.scrollIntoViewIfNeeded();
        await nutThem.click();
        await page.locator('.ant-dropdown:visible .ant-dropdown-menu-item').filter({ hasText: /29-DS/ }).first().click();
        await choHetSpin(page);

        const bm = page.locator('.ant-drawer-content:visible, .ant-modal-content:visible').last();
        await expect(bm.locator('#bieuMau29DS_noiDung_MA_NGUOI_KY'), 'Không mở được biểu mẫu 29-DS').toBeVisible({ timeout: 60_000 });
        await nghi(page, 1500, 2500);
        await chonSelect(page, bm.locator('#bieuMau29DS_noiDung_MA_NGUOI_KY'), giaTri('nguoiKyThongBaoAnPhi'));
        await chonNgay(bm.locator('#bieuMau29DS_ngayQuyetDinh'), ngayNhanDon);
        ghi('số tiền tạm ứng', (await bm.locator('#bieuMau29DS_noiDung_anPhiDTO_soTienPhaiNop').inputValue().catch(() => '')) || '(không đọc được)');
        const oCqTha = bm.locator('#bieuMau29DS_noiDung_CO_QUAN_THI_HANH_AN_STR');
        await chonSelect(page, oCqTha, undefined, { goDeLoc: false });
        await nghi(page, 800, 1400);
        ghi('cơ quan thi hành án', await khungSelectCua(oCqTha).locator('.ant-select-selection-item').first().innerText());
        await go(bm.locator('#bieuMau29DS_noiDung_DIA_CHI_CO_QUAN_THA_STR'), 'HN');

        await bm.getByRole('button', { name: /^Lưu$/ }).first().click();
        await toastDaHien(page, /thành công/i, 60_000, /thất bại|Vui lòng|Không thể|lỗi/i);
        await choHetSpin(page);
        await nghi(page, 1500, 2500);
        await bamLaySoVaKyLogic(page, bm, ghi, '29-DS');
        await bm.getByRole('button', { name: /^Đóng$/ }).first().click().catch(() => {});
        await choHetSpin(page);
        await nghi(page, 1500, 2500);
      } else {
        ghi('29-DS', `đã có ${await dongTb.count()} thông báo tạm ứng — không lập thêm`);
        // Thông báo của lần chạy trước còn dang dở (chưa ký) → mở lại để Lấy số + Ký logic
        const dongChuaKy = dongTb.filter({ hasText: /Chưa có hiệu lực|Lưu mới/ }).first();
        if (await hienTrong(dongChuaKy, 5_000)) {
          await dongChuaKy.locator('button:has(.anticon-edit)').first().click();
          const bmCu = page.locator('.ant-drawer-content:visible, .ant-modal-content:visible').last();
          await expect(bmCu.locator('#bieuMau29DS_noiDung_MA_NGUOI_KY'), 'Không mở lại được biểu mẫu 29-DS').toBeVisible({
            timeout: 60_000,
          });
          await nghi(page, 1500, 2500);
          await bamLaySoVaKyLogic(page, bmCu, ghi, '29-DS');
          await bmCu.getByRole('button', { name: /^Đóng$/ }).first().click().catch(() => {});
          await choHetSpin(page);
          await nghi(page, 1500, 2500);
        }
      }
      if (await dongTb.count()) ghi('trạng thái 29-DS', (await dongTb.first().innerText()).replace(/\s+/g, ' ').trim());

      // 5.13–5.16 · Ghi nhận nộp phí: số biên lai 8 chữ số, đính kèm tệp chứng từ → "Xác minh biên lai".
      // Đã nộp đủ ở lần chạy trước thì "Thụ lý vụ" mở khoá sẵn và popup báo "Chưa có nghĩa vụ nào còn
      // phải nộp" (bấm Xác minh không có tác dụng) → bỏ qua.
      // Đơn đã thụ lý ở lần chạy trước: nút "Thụ lý vụ" biến mất, thay bằng nút mang mã vụ án "VA…"
      // (isDisabled() khi đó ném lỗi và bị hiểu nhầm là "còn khoá") → nhận biết bằng chính nút mã vụ án.
      const nutVuAn = page.getByRole('button', { name: /VA\d/ }).first();
      const daThuLy = await hienTrong(nutVuAn, 5_000);
      const nutThuLy = page.getByRole('button', { name: /Thụ lý vụ$/ }).first();
      const nutNopPhi = page.getByRole('button', { name: /Ghi nhận nộp phí$/ }).first();
      if (!daThuLy && (await nutThuLy.isDisabled().catch(() => true))) {
        ghi('Ghi nhận nộp phí', (await nutNopPhi.isDisabled().catch(() => true)) ? 'còn khoá' : 'đã mở khoá');
        await nutNopPhi.click();
        const hopPhi = page.locator('.ant-drawer-content:visible, .ant-modal-content:visible').last();
        await expect(hopPhi.locator('#soBienLai'), 'Không mở được "Ghi nhận nộp phí"').toBeVisible({ timeout: 60_000 });
        await nghi(page, 1500, 2500);

        const soBienLai = soNgau(8);
        await go(hopPhi.locator('#soBienLai'), soBienLai);
        ghi('số biên lai', soBienLai);
        // "Chọn tệp" mở hộp thoại hệ thống → nạp thẳng tệp vào input file của form
        await hopPhi.locator('input[type="file"]').first().setInputFiles(path.resolve(__dirname, '../data/bien-lai-tam-ung-an-phi.pdf'));
        await nghi(page, 1200, 2000);
        await hopPhi.getByRole('button', { name: /Xác minh biên lai$/ }).first().click();
        await toastDaHien(page, /thành công|Đã ghi nhận/i, 90_000, /thất bại|Vui lòng|Không thể|lỗi/i);
        await choHetSpin(page);
        await nghi(page, 1500, 2500);
        ghi('nộp phí', 'đã xác minh biên lai');
      } else {
        ghi('nộp phí', 'nghĩa vụ tạm ứng đã nộp đủ từ lần chạy trước');
      }

      // 5.17–5.23 · Thụ lý vụ (biểu mẫu 30-DS): số thông báo 7 chữ số, ngày thụ lý = ngày nhận đơn
      if (!daThuLy) {
        ghi('Thụ lý vụ', (await nutThuLy.isDisabled().catch(() => true)) ? 'còn khoá' : 'đã mở khoá');
        await nutThuLy.click();
        await choHetSpin(page);
        const bmThuLy = page.locator('.ant-drawer-content:visible, .ant-modal-content:visible').last();
        await expect(bmThuLy.locator('#bieuMau30DS_noiDung_ngayThuLy'), 'Không mở được biểu mẫu thụ lý 30-DS').toBeVisible({
          timeout: 60_000,
        });
        await nghi(page, 1500, 2500);

        const oNguoiKyThuLy = bmThuLy.locator('#bieuMau30DS_noiDung_MA_NGUOI_KY');
        if (!(await khungSelectCua(oNguoiKyThuLy).locator('.ant-select-selection-item').count())) {
          await chonSelect(page, oNguoiKyThuLy, giaTri('nguoiKyThongBaoAnPhi'));
        }
        const oSoThongBao = bmThuLy.locator('#bieuMau30DS_so');
        if (await oSoThongBao.isEditable().catch(() => false)) {
          const soThongBao = soNgau(7);
          await go(oSoThongBao, soThongBao);
          ghi('số thông báo thụ lý', soThongBao);
        }
        await chonNgay(bmThuLy.locator('#bieuMau30DS_noiDung_ngayThuLy'), ngayNhanDon);

        await bmThuLy.getByRole('button', { name: /^Lưu$/ }).first().click();
        await toastDaHien(page, /thành công/i, 90_000, /thất bại|Vui lòng|Không thể|lỗi/i);
        await choHetSpin(page);
        await nghi(page, 1500, 2500);
        ghi('số thụ lý', (await bmThuLy.locator('#bieuMau30DS_noiDung_soThuLy').inputValue().catch(() => '')) || '(không đọc được)');
        await bamLaySoVaKyLogic(page, bmThuLy, ghi, '30-DS');
        await bmThuLy.getByRole('button', { name: /^Đóng$/ }).first().click().catch(() => {});
        await choHetSpin(page);
        await nghi(page, 2000, 3000);
      } else {
        ghi('Thụ lý vụ', 'đơn đã thụ lý từ lần chạy trước — bỏ qua');
      }

      // 5.24 · Vụ án vừa sinh ra hiện ở cuối trang dưới dạng nút mang mã "VA…" → mở chi tiết vụ án
      await expect(nutVuAn, 'Thụ lý xong nhưng không thấy mã vụ án ở cuối trang').toBeVisible({ timeout: 60_000 });
      const maVuAn = (await nutVuAn.innerText()).trim();
      await nutVuAn.click();
      await page.waitForURL(/vu-an\/dan-su\/so-tham\/chi-tiet/, { timeout: 120_000 });
      await choHetSpin(page);
      const idVuAn = new URL(page.url()).searchParams.get('id') || '';
      ghi('vụ án', `${maVuAn} · id ${idVuAn}`);
      ghi('link chi tiết vụ án', page.url());
      ghiSoCai(VU, { idVuAn, maVuAnThuLy: maVuAn, xongBuoc: 'thuLy' });
      await context.close();
    });

    test('S6 · Vụ án: phân công Thẩm phán chủ tọa → Lấy số → Ký logic', async ({ browser }, testInfo) => {
      test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
      const idVuAn = ghiDeId('QLA_DS_ID_VU_AN') || docDong(VU)?.idVuAn || '';
      test.skip(!idVuAn, `Chưa có id vụ án cho vụ ${VU.maVuAn || VU.nguyenDon.hoTen} — chạy bước S5 (thụ lý) trước`);
      testInfo.setTimeout(10 * 60_000);
      const ghi = (type: string, description: string) => {
        testInfo.annotations.push({ type, description });
        console.log(`    · ${type}: ${description}`);
      };
      const { page, context } = await moTrangVaiCauHinh(browser, testInfo, 'chanhAnDanSu');
      ghi('id vụ án', idVuAn);

      // 6.1 · Chi tiết vụ án › tab "Phân công"
      await page.goto(`vu-an/dan-su/so-tham/chi-tiet?id=${idVuAn}&tab=phan-cong`);
      await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
      await choHetSpin(page);
      await nghi(page, 2000, 3000);

      // Vụ đã có quyết định phân công từ lần chạy trước thì không lập thêm: backend chặn hai chủ tọa
      // cho một vụ nên bấm Lưu sẽ không phản hồi.
      const dongQuyetDinh = page.locator('.ant-table-row').filter({ hasText: /phân công thẩm phán/i }).first();
      if (await hienTrong(dongQuyetDinh, 5_000)) {
        ghi('kết quả', `vụ đã có quyết định phân công: ${(await dongQuyetDinh.innerText()).replace(/\s+/g, ' ').trim()}`);
        ghiSoCai(VU, { xongBuoc: 'phanCongVuAn' });
        await context.close();
        return;
      }

      // 6.2–6.3 · "Phân công" › "Quyết định phân công thẩm phán giải quyết vụ án dân sự"
      await page.getByRole('button', { name: /Phân công$/ }).first().click();
      await page.getByRole('menuitem', { name: /phân công thẩm phán giải quyết vụ án dân sự/i }).first().click();
      await choHetSpin(page);

      // Id các ô mang tiền tố theo mã biểu mẫu → bắt theo hậu tố để không phụ thuộc mã
      const bm = page.locator('.ant-drawer-content:visible, .ant-modal-content:visible').last();
      const oVaiTro = bm.locator('[id$="_noiDung_vaiTro"]').first();
      await expect(oVaiTro, 'Không mở được biểu mẫu phân công Thẩm phán giải quyết vụ án').toBeVisible({ timeout: 60_000 });
      await nghi(page, 1500, 2500);

      // 6.4 · Vai trò "Thẩm phán chủ tọa", người được phân công "Nguyễn Mậu Trường"
      const nguoiKy = giaTri('nguoiKyPhanCongDon');
      const oNguoiKy = bm.locator('[id$="_noiDung_MA_NGUOI_KY"]').first();
      if ((await oNguoiKy.count()) && !(await khungSelectCua(oNguoiKy).locator('.ant-select-selection-item').count())) {
        await chonSelect(page, oNguoiKy, nguoiKy);
      }
      await chonSelect(page, oVaiTro, giaTri('vaiTroPhanCongVuAn'));
      await choHetSpin(page);
      const nguoiDuocPC = await chonSelect(page, bm.locator('[id$="_noiDung_nguoiDuocPC"]').first(), nguoiKy);
      ghi('người được phân công', nguoiDuocPC);

      // 6.5 · nút mũi tên xuống đưa người vào bảng phân công
      await bm.locator('button:has(.anticon-arrow-down)').first().click();
      await expect(bm.locator('.ant-table-row').first(), 'Không đưa được người được phân công vào bảng').toBeVisible({
        timeout: 30_000,
      });
      await nghi(page, 800, 1400);

      // 6.6–6.9 · Lưu → Lấy số → Ký logic → Đóng
      const nutLuu = bm.getByRole('button', { name: /^Lưu$/ }).first();
      if (await hienTrong(nutLuu, 5_000)) {
        await nutLuu.click();
        await toastDaHien(page, /thành công/i, 60_000, /thất bại|Vui lòng|Không thể|lỗi/i);
        await choHetSpin(page);
        await nghi(page, 1200, 2000);
      }
      await bamLaySoVaKyLogic(page, bm, ghi, 'quyết định phân công vụ án');
      ghi('số quyết định', (await bm.locator('[id$="_so"]').first().inputValue().catch(() => '')) || '(không đọc được)');
      await bm.getByRole('button', { name: /^Đóng$/ }).first().click().catch(() => {});
      await choHetSpin(page);
      ghiSoCai(VU, { xongBuoc: 'phanCongVuAn' });
      ghi('link chi tiết vụ án', page.url());
      await context.close();
    });

    test('S7 · Vụ án: Quyết định đưa vụ án ra xét xử sơ thẩm (47DS) → lịch xét xử → Lưu → Lấy số → Ký logic', async ({ browser }, testInfo) => {
      test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
      const idVuAn = ghiDeId('QLA_DS_ID_VU_AN') || docDong(VU)?.idVuAn || '';
      test.skip(!idVuAn, `Chưa có id vụ án cho vụ ${VU.maVuAn || VU.nguyenDon.hoTen} — chạy bước S5 (thụ lý) trước`);
      test.skip(daXongBuoc(VU, 'quyetDinhXetXu'), 'Vụ này đã ký Quyết định đưa vụ án ra xét xử ở lần chạy trước');
      testInfo.setTimeout(12 * 60_000);
      const ghi = (type: string, description: string) => {
        testInfo.annotations.push({ type, description });
        console.log(`    · ${type}: ${description}`);
      };
      const { page, context } = await moTrangVaiCauHinh(browser, testInfo, 'chanhAnDanSu');
      ghi('id vụ án', idVuAn);

      await page.goto(`vu-an/dan-su/so-tham/chi-tiet?id=${idVuAn}&tab=chuan-bi-xet-xu`);
      await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
      await choHetSpin(page);
      await nghi(page, 2000, 3000);

      // Ngày xét xử phải trùng ngày ở "Số thụ lý" (vd. "65500244/2026/TLST-DS ngày 25/09/2026")
      const ngayThuLy = await docNgayThuLy(page);
      ghi('ngày thụ lý', ngayThuLy);

      // Quyết định đã lập ở lần chạy trước (chưa ký) thì mở lại bằng icon "Chi tiết", không lập thêm
      const dongQd = page.locator('.ant-table-row').filter({ hasText: /đưa vụ án ra xét xử/i }).first();
      let bm: import('@playwright/test').Locator;
      if (await hienTrong(dongQd, 5_000)) {
        const noiDungQd = (await dongQd.innerText()).replace(/\s+/g, ' ').trim();
        // Đã ký (làm tay hoặc lần chạy trước) → dòng báo "Đã có hiệu lực", không mở lại
        if (/Đã có hiệu lực/i.test(noiDungQd)) {
          ghi('47DS', `đã ký từ trước — bỏ qua: ${noiDungQd}`);
          ghiSoCai(VU, { ngayXetXu: ngayThuLy, xongBuoc: 'quyetDinhXetXu' });
          await context.close();
          return;
        }
        ghi('47DS', `mở lại quyết định đã lập: ${noiDungQd}`);
        await dongQd.locator('button:has(.anticon-eye)').first().click();
        bm = page.locator('.ant-drawer-content:visible').last();
        await expect(bm.locator('#bieuMau47DS_noiDung_MA_NGUOI_KY'), 'Không mở lại được biểu mẫu 47DS').toBeVisible({ timeout: 60_000 });
        await nghi(page, 2000, 3000);
        // Đã ký (làm tay hoặc lần chạy trước): không còn Lưu / Lấy số / Ký logic → ghi nhận và dừng
        const conThaoTac = await hienTrong(bm.getByRole('button', { name: /^Lưu$|Lấy số$|Ký logic$/ }).first(), 5_000);
        if (!conThaoTac) {
          ghi('47DS', 'quyết định đã ký từ trước — bỏ qua');
          await bm.getByRole('button', { name: /^Đóng$/ }).first().click().catch(() => {});
          ghiSoCai(VU, { ngayXetXu: ngayThuLy, xongBuoc: 'quyetDinhXetXu' });
          await context.close();
          return;
        }
      } else {
        // 7.1 · Danh sách quyết định › ô "Chọn loại biểu mẫu" → mẫu 47DS. Placeholder của antd Select nằm ở
        // div .ant-select-selection-placeholder (biến mất khi mở dropdown) → chốt locator theo id của input
        const khungLoaiBieuMau = page
          .locator('.ant-select-selection-placeholder', { hasText: 'Chọn loại biểu mẫu' })
          .first()
          .locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]');
        await khungLoaiBieuMau.scrollIntoViewIfNeeded();
        const idOLoai = await khungLoaiBieuMau.locator('input').first().getAttribute('id');
        const oLoaiBieuMau = idOLoai ? page.locator(`#${idOLoai}`) : khungLoaiBieuMau.locator('input').first();
        await expect(oLoaiBieuMau, 'Không thấy ô "Chọn loại biểu mẫu" ở tab Chuẩn bị xét xử').toBeVisible({ timeout: 60_000 });
        ghi('loại biểu mẫu', await chonSelect(page, oLoaiBieuMau, '47DS'));

        // 7.2 · "Thêm biểu mẫu" → drawer 47DS
        await page.getByRole('button', { name: /Thêm biểu mẫu$/ }).first().click();
        await choHetSpin(page);
        bm = page.locator('.ant-drawer-content:visible').last();
        await expect(bm.locator('#bieuMau47DS_noiDung_MA_NGUOI_KY'), 'Không mở được biểu mẫu 47DS').toBeVisible({ timeout: 60_000 });
      }
      await nghi(page, 2000, 3000);

      // Người ký (bắt buộc) — hệ thống điền sẵn chủ tọa; trống thì chọn Nguyễn Mậu Trường
      const oNguoiKy = bm.locator('#bieuMau47DS_noiDung_MA_NGUOI_KY');
      if (!(await khungSelectCua(oNguoiKy).locator('.ant-select-selection-item').count())) {
        await chonSelect(page, oNguoiKy, giaTri('nguoiKyPhanCongDon'));
      }

      // 7.3 · Lịch xét xử (tối đa 1 lịch): chưa gắn lịch thì "Chọn lịch xét xử" → tạo lịch đúng ngày thụ lý
      const bangLich = bm.locator('.ant-table').filter({ hasText: /NGÀY MỞ PHIÊN TÒA|Ngày mở phiên tòa/i }).first();
      const dongLich = bangLich.locator('.ant-table-row').filter({ hasText: /\d{2}\/\d{2}\/\d{4}/ });
      if (!(await dongLich.count())) {
        await bm.getByRole('button', { name: /Chọn lịch xét xử$/ }).first().click();
        await choHetSpin(page);
        await taoLichXetXu(page, ngayThuLy, ghi);
      }
      await expect(dongLich.first(), 'Chưa gắn được lịch xét xử vào quyết định').toBeVisible({ timeout: 60_000 });
      ghi('lịch xét xử', (await dongLich.first().innerText()).replace(/\s+/g, ' ').trim());

      // 7.4 · Lưu → Lấy số → Ký logic → Đóng. Đã lưu từ lần trước thì nút Lưu vẫn còn (lưu lại không sao).
      const nutLuu = bm.getByRole('button', { name: /^Lưu$/ }).first();
      if (await hienTrong(nutLuu, 5_000)) {
        await nutLuu.click();
        await toastDaHien(page, /thành công/i, 90_000, /thất bại|Vui lòng|Không thể|lỗi|không được để trống/i);
        await choHetSpin(page);
        await nghi(page, 1500, 2500);
      }
      await bamLaySoVaKyLogic(page, bm, ghi, '47DS');
      await bm.getByRole('button', { name: /^Đóng$/ }).first().click().catch(() => {});
      ghiSoCai(VU, { ngayXetXu: ngayThuLy, xongBuoc: 'quyetDinhXetXu' });
      await context.close();
    });

    test('S8 · Xét xử: Biên bản phiên tòa sơ thẩm (48-DS) → Lưu → tải bản đã ký → Xác nhận đã ký', async ({ browser }, testInfo) => {
      test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
      const idVuAn = ghiDeId('QLA_DS_ID_VU_AN') || docDong(VU)?.idVuAn || '';
      test.skip(!idVuAn, `Chưa có id vụ án cho vụ ${VU.maVuAn || VU.nguyenDon.hoTen} — chạy bước S5 (thụ lý) trước`);
      test.skip(daXongBuoc(VU, 'bienBanPhienToa'), 'Vụ này đã hoàn thành Biên bản phiên tòa ở lần chạy trước');
      testInfo.setTimeout(10 * 60_000);
      const ghi = (type: string, description: string) => {
        testInfo.annotations.push({ type, description });
        console.log(`    · ${type}: ${description}`);
      };
      const { page, context } = await moTrangVaiCauHinh(browser, testInfo, 'chanhAnDanSu');
      await moTabXetXu(page, idVuAn);
      const ngayMoPhien = docDong(VU)?.ngayXetXu || (await docNgayThuLy(page));
      ghi('ngày mở phiên tòa', ngayMoPhien);

      const bm = await moBienBanXetXu(page, '48-DS', /Biên bản phiên tòa/i, ghi);
      if (!bm) {
        ghiSoCai(VU, { xongBuoc: 'bienBanPhienToa' });
        await context.close();
        return;
      }
      const ma = '#bieuMau48DS_noiDung_';
      // Hệ thống điền sẵn từ lịch xét xử; ô nào trống thì điền theo phiên tòa đã xếp lịch
      await dienNeuTrong(bm.locator(`${ma}NGAY_MO_PHIEN_TOA`), ngayMoPhien, 'ngay');
      await dienNeuTrong(bm.locator(`${ma}GIO_MO_PHIEN_TOA`), '07:00', 'gio');
      await dienNeuTrong(bm.locator(`${ma}DIA_DIEM_PHIEN_TOA`), 'Trụ sở Tòa án nhân dân khu vực 9 - Hà Nội', 'chu');

      await hoanThanhBienBan(page, bm, `Bien ban phien toa - ${VU.nguyenDon.hoTen}.pdf`, ghi);
      ghiSoCai(VU, { xongBuoc: 'bienBanPhienToa' });
      await context.close();
    });

    test('S9 · Xét xử: Biên bản nghị án (51-DS) → Lưu → tải bản đã ký → Xác nhận đã ký', async ({ browser }, testInfo) => {
      test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
      const idVuAn = ghiDeId('QLA_DS_ID_VU_AN') || docDong(VU)?.idVuAn || '';
      test.skip(!idVuAn, `Chưa có id vụ án cho vụ ${VU.maVuAn || VU.nguyenDon.hoTen} — chạy bước S5 (thụ lý) trước`);
      test.skip(daXongBuoc(VU, 'bienBanNghiAn'), 'Vụ này đã hoàn thành Biên bản nghị án ở lần chạy trước');
      testInfo.setTimeout(10 * 60_000);
      const ghi = (type: string, description: string) => {
        testInfo.annotations.push({ type, description });
        console.log(`    · ${type}: ${description}`);
      };
      const { page, context } = await moTrangVaiCauHinh(browser, testInfo, 'chanhAnDanSu');
      await moTabXetXu(page, idVuAn);
      const ngayMoPhien = docDong(VU)?.ngayXetXu || (await docNgayThuLy(page));

      const bm = await moBienBanXetXu(page, '51-DS', /Biên bản nghị án/i, ghi);
      if (!bm) {
        ghiSoCai(VU, { xongBuoc: 'bienBanNghiAn' });
        await context.close();
        return;
      }
      const ma = '#bieuMau51DS_noiDung_';
      // Nghị án ngay sau phiên tòa, cùng ngày mở phiên; ngày kết thúc thành "Ngày bản án" mặc định của 52DS
      await dienNeuTrong(bm.locator(`${ma}NGAY_BAT_DAU`), ngayMoPhien, 'ngay');
      await dienNeuTrong(bm.locator(`${ma}GIO_BAT_DAU`), '10:00', 'gio');
      await dienNeuTrong(bm.locator(`${ma}NGAY_KET_THUC`), ngayMoPhien, 'ngay');
      await dienNeuTrong(bm.locator(`${ma}GIO_KET_THUC`), '11:00', 'gio');
      await dienNeuTrong(bm.locator(`${ma}DIA_DIEM_NGHI_AN`), 'Phòng nghị án - Tòa án nhân dân khu vực 9 - Hà Nội', 'chu');
      const oCap = bm.locator(`${ma}CAP_XET_XU`);
      if (!(await khungSelectCua(oCap).locator('.ant-select-selection-item').count())) await chonSelect(page, oCap, 'Sơ thẩm');
      await dienNeuTrong(
        bm.locator(`${ma}CAN_CU_NGHI_AN`),
        `Căn cứ các tài liệu, chứng cứ có trong hồ sơ vụ án và kết quả tranh tụng tại phiên tòa về ${VU.loaiVuAn.toLowerCase()} giữa ${VU.nguyenDon.hoTen} và ${VU.biDon.hoTen}.`,
        'chu',
      );
      await dienNeuTrong(
        bm.locator(`${ma}Y_KIEN_THAO_LUAN`),
        'Hội đồng xét xử thảo luận và thống nhất chấp nhận một phần yêu cầu khởi kiện của nguyên đơn.',
        'chu',
      );

      await hoanThanhBienBan(page, bm, `Bien ban nghi an - ${VU.nguyenDon.hoTen}.pdf`, ghi);
      ghiSoCai(VU, { xongBuoc: 'bienBanNghiAn' });
      await context.close();
    });

    test('S10 · Xét xử: Tạo bản án dân sự sơ thẩm (52-DS) → Lấy số → Ký logic', async ({ browser }, testInfo) => {
      test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
      const idVuAn = ghiDeId('QLA_DS_ID_VU_AN') || docDong(VU)?.idVuAn || '';
      test.skip(!idVuAn, `Chưa có id vụ án cho vụ ${VU.maVuAn || VU.nguyenDon.hoTen} — chạy bước S5 (thụ lý) trước`);
      test.skip(daXongBuoc(VU, 'banAn'), `Vụ này đã có bản án ${docDong(VU)?.soBanAn || ''} ở lần chạy trước`);
      testInfo.setTimeout(10 * 60_000);
      const ghi = (type: string, description: string) => {
        testInfo.annotations.push({ type, description });
        console.log(`    · ${type}: ${description}`);
      };
      const { page, context } = await moTrangVaiCauHinh(browser, testInfo, 'chanhAnDanSu');
      await moTabXetXu(page, idVuAn);

      // Bản án đã ký (làm tay hoặc lần chạy trước): dòng bản án có số "…/DS-ST" → ghi nhận và dừng
      const dongBanAnDaKy = page.locator('.ant-table-row').filter({ hasText: /\d+\/\d{4}\/DS-ST/ }).first();
      if (await hienTrong(dongBanAnDaKy, 5_000)) {
        const noiDung = (await dongBanAnDaKy.innerText()).replace(/\s+/g, ' ').trim();
        const soBanAn = (noiDung.match(/\d+\/\d{4}\/DS-ST/) || [''])[0];
        const ngayBanAn = (noiDung.match(/\d{2}\/\d{2}\/\d{4}/) || [''])[0];
        ghi('bản án', `đã có từ trước: ${noiDung}`);
        ghiSoCai(VU, { soBanAn, ngayBanAn, xongBuoc: 'banAn' });
        await context.close();
        return;
      }

      // Bản án đã lưu ở lần trước (chưa ký) thì mở lại "Soạn bản án"; chưa có thì "Tạo bản án"
      const nutSoan = page.getByRole('button', { name: /Soạn bản án/ }).first();
      if (await hienTrong(nutSoan, 5_000)) {
        await nutSoan.click();
      } else {
        const nutTao = page.getByRole('button', { name: /Tạo bản án$/ }).first();
        await expect(nutTao, 'Không thấy nút "Tạo bản án" (cần 47DS đã ký, 48DS và 51DS đã xác nhận ký)').toBeEnabled({ timeout: 60_000 });
        await nutTao.click();
      }
      await choHetSpin(page);
      const bm = page.locator('.ant-drawer-content:visible').last();
      const ma = '#bieuMau52DS_noiDung_';
      await expect(bm.locator(`${ma}TOM_TAT_BAN_AN`), 'Không mở được màn soạn bản án 52-DS').toBeVisible({ timeout: 60_000 });
      await nghi(page, 2000, 3000);

      const oNguoiKy = bm.locator(`${ma}MA_NGUOI_KY`);
      if (!(await khungSelectCua(oNguoiKy).locator('.ant-select-selection-item').count())) {
        await chonSelect(page, oNguoiKy, giaTri('nguoiKyPhanCongDon'));
      }
      await dienNeuTrong(
        bm.locator(`${ma}TOM_TAT_BAN_AN`),
        `Chấp nhận một phần yêu cầu khởi kiện của ${VU.nguyenDon.hoTen} về việc ${VU.loaiVuAn.toLowerCase()} đối với ${VU.biDon.hoTen}.`,
        'chu',
      );
      const ngayBanAn = await bm.locator(`${ma}NGAY_BAN_AN`).inputValue();
      expect(ngayBanAn, 'Ngày bản án trống (lấy từ ngày kết thúc nghị án)').toBeTruthy();

      // "Thêm mới bản án" (lần sau là "Cập nhật bản án") → Lấy số → Ký logic
      const nutLuu = bm.getByRole('button', { name: /(Thêm mới|Cập nhật) bản án$/ }).first();
      if (await hienTrong(nutLuu, 5_000)) {
        await nutLuu.click();
        await toastDaHien(page, /thành công/i, 90_000, /thất bại|Vui lòng|Không thể|lỗi/i);
        await choHetSpin(page);
        await nghi(page, 1500, 2500);
      }
      await bamLaySoVaKyLogic(page, bm, ghi, 'bản án 52-DS');
      const soBanAn = (await bm.locator(`${ma}SO_QUYET_DINH`).inputValue().catch(() => '')).trim();
      expect(soBanAn, 'Ký xong nhưng chưa đọc được Số bản án').toBeTruthy();
      ghi('bản án', `số ${soBanAn} ngày ${ngayBanAn}`);
      await bm.getByRole('button', { name: /^Đóng$/ }).first().click().catch(() => {});
      ghiSoCai(VU, { soBanAn, ngayBanAn, xongBuoc: 'banAn' });
      await context.close();
    });
  });
}

/**
 * Chọn một mục bất kỳ (mục đầu tiên) của ô "Quan hệ pháp luật (Thống kê)".
 * Ô này nạp danh mục sau khi gõ từ khoá; các mục nằm trong portal và bị coi là ẩn nên chỉ chọn
 * được bằng bàn phím: gõ từ khoá → Enter. Có kiểm tra danh sách đã nạp (theo aria-controls)
 * và thử lại tối đa 3 lần nếu chưa ăn.
 */
async function chonDanhMucThongKe(
  page: import('@playwright/test').Page,
  o: import('@playwright/test').Locator,
  tuKhoa: string,
): Promise<{ qhplDaChon: string; soMuc: number }> {
  const khung = khungSelectCua(o);
  const daChon = async () => (await khung.locator('.ant-select-selection-item').first().innerText().catch(() => '')).trim();

  for (let lan = 0; lan < 3; lan++) {
    await khung.click();
    await o.fill(tuKhoa);
    await nghi(page, 1500, 2500);

    const idList = (await o.getAttribute('aria-controls')) || '';
    const soMuc = await page.evaluate(id => {
      const list = id ? document.getElementById(id) : null;
      const hop = (list && list.closest('.ant-select-dropdown')) || document;
      return hop.querySelectorAll('.ant-select-item-option').length;
    }, idList);
    if (!soMuc) {
      await page.keyboard.press('Escape');
      continue;
    }

    // Lấy mục đầu tiên trong danh sách đã lọc (chọn bất kỳ, không random để khỏi chập chờn)
    await o.press('Enter');
    await nghi(page, 800, 1200);

    const ten = await daChon();
    if (ten) return { qhplDaChon: ten, soMuc };
  }
  throw new Error(`Không chọn được "Quan hệ pháp luật (Thống kê)" với từ khoá "${tuKhoa}"`);
}

/**
 * Bước "Đương sự": mở form "Thêm mới thành phần tham gia tố tụng" rồi điền một đương sự.
 *
 * Cấu trúc form lấy theo mã nguồn FE (qla-webapp/src/components/FormDuongSu):
 *  - "Tư cách tham gia tố tụng" KHÔNG phải antd Select mà là GroupedCheckboxDropdown: trigger là
 *    div[role="combobox"], danh sách là div[role="listbox"] render ngay dưới ô (không qua portal),
 *    mỗi mục là một ô có onClick → click thẳng vào nhãn.
 *  - Các panel "Thông tin chung" / "Thông tin địa chỉ" đã mở sẵn khi form mở → KHÔNG bấm tiêu đề
 *    panel (bấm vào sẽ thu gọn lại).
 *  - Bắt buộc: họ tên, giới tính, số định danh cá nhân (9 hoặc 12 chữ số) và địa chỉ (trừ khi tick
 *    "Không có thông tin" cho từng dòng địa chỉ).
 *  - Kết thúc bằng "Lưu & Thêm mới" (người đầu) hoặc "Lưu" (người cuối); toast "Đã lưu đương sự".
 */
async function themNguoiThamGia(
  page: import('@playwright/test').Page,
  tuCach: string,
  nguoi: import('../common/du-lieu-dan-su').NguoiDanSu,
  nutKetThuc: 'Lưu & Thêm mới' | 'Lưu',
) {
  // "Lưu & Thêm mới" giữ nguyên drawer và tự xoá trắng form → người thứ hai trở đi không bấm lại
  // nút "Thêm người tham gia" (nút nằm dưới lớp phủ của drawer, bấm sẽ bị chặn).
  const form = page.locator('.ant-drawer-content').filter({ hasText: 'Thêm mới thành phần tham gia tố tụng' }).last();
  if (!(await hienTrong(form, 3_000))) {
    await page.getByRole('button', { name: /Thêm người tham gia/ }).first().click();
    await expect(form, 'Không mở được form Thêm mới thành phần tham gia tố tụng').toBeVisible({ timeout: 30_000 });
  }
  await expect(form.locator('#conNguoi_hoTen'), 'Form đương sự chưa render xong').toBeVisible({ timeout: 30_000 });
  await nghi(page, 1200, 2000);

  await chonTuCachThamGia(page, form, tuCach);

  // Thông tin chung
  await go(form.locator('#conNguoi_hoTen'), nguoi.hoTen);
  await chonSelect(page, form.locator('#conNguoi_maGioiTinh'), undefined, { goDeLoc: false });
  // Ô ngày sinh là input chữ, nhận "dd/mm/yyyy hoặc yyyy" → Excel chỉ cho tuổi nên nhập năm sinh.
  // Nhiều dòng Excel không ghi tuổi (vd "Nguyễn Du") trong khi form bắt buộc ngày sinh → dùng tuổi
  // mặc định khai trong config (nghiepVu.tuoiMacDinhDuongSu) để giá trị vẫn là một năm sinh hợp lý.
  const namSinh = nguoi.namSinh ?? new Date().getFullYear() - Number(giaTri('tuoiMacDinhDuongSu'));
  await go(form.locator('#conNguoi_ngaySinh'), String(namSinh));
  await form.locator('#conNguoi_ngaySinh').blur();
  // b6.4 — "Số định danh cá nhân": tick ô "Chưa xác định" (dữ liệu Excel không có số định danh)
  // Ô tick nằm trong addonBefore của ô "Số định danh cá nhân" (div.cccd-addon-checkbox), không có nhãn chữ
  const khungChuaXacDinh = form.locator('.cccd-addon-checkbox').first();
  const oChuaXacDinh = khungChuaXacDinh.locator('input[type="checkbox"]').first();
  // Input thật của antd bị che nên click thẳng vào nó không đổi trạng thái → click vào khung bọc
  if (!(await oChuaXacDinh.isChecked())) await khungChuaXacDinh.click();
  await expect(oChuaXacDinh, 'Không tick được "Chưa xác định" của Số định danh cá nhân').toBeChecked({ timeout: 10_000 });
  await nghi(page, 500, 900);

  // Thông tin địa chỉ: Excel không có địa chỉ → tick "Không có thông tin" cho mọi dòng địa chỉ.
  // Panel đã mở sẵn, không bấm tiêu đề panel.
  const oKhongCo = form.locator('input[type="checkbox"][id^="khongCoDiaChiTheoLoai"]');
  await expect(oKhongCo.first(), 'Không thấy ô "Không có thông tin" của địa chỉ').toBeVisible({ timeout: 30_000 });
  const soO = await oKhongCo.count();
  for (let i = 0; i < soO; i++) await oKhongCo.nth(i).check({ force: true });
  await nghi(page, 600, 1000);

  await form.getByRole('button', { name: nutKetThuc === 'Lưu' ? /^Lưu$/ : /^Lưu & Thêm mới$/ }).last().click();
  await toastDaHien(page, /Đã lưu đương sự|thành công/i, 60_000, /Không thể lưu|Vui lòng|thất bại/i);
  await nghi(page, 1200, 2000);
}

/**
 * Chọn "Tư cách tham gia tố tụng" trên GroupedCheckboxDropdown: bấm trigger để mở danh sách rồi bấm
 * đúng nhãn trong nhóm "Tư cách đương sự". Chọn xong ô hiện một thẻ mang chính nhãn đó.
 */
async function chonTuCachThamGia(
  page: import('@playwright/test').Page,
  form: import('@playwright/test').Locator,
  tuCach: string,
) {
  const o = form
    .locator('.ant-form-item')
    .filter({ has: page.locator('label', { hasText: 'Tư cách tham gia tố tụng' }) })
    .first()
    .locator('[role="combobox"]')
    .first();
  await expect(o, 'Không thấy ô "Tư cách tham gia tố tụng"').toBeVisible({ timeout: 30_000 });

  for (let lan = 0; lan < 3; lan++) {
    if ((await o.getAttribute('aria-expanded')) !== 'true') await o.click();
    const bang = form.locator('[role="listbox"]').first();
    await expect(bang, 'Bấm ô tư cách nhưng danh sách không mở').toBeVisible({ timeout: 10_000 });
    const muc = bang.getByText(tuCach, { exact: true }).first();
    if (await hienTrong(muc, 10_000)) {
      await muc.click();
      await nghi(page, 600, 1000);
      // Danh sách cho chọn nhiều nên vẫn mở sau khi chọn → đóng lại để không che các ô phía dưới
      if ((await o.getAttribute('aria-expanded')) === 'true') await o.click();
      await expect(o.getByText(tuCach, { exact: true }).first(), `Chọn tư cách "${tuCach}" không ăn`).toBeVisible({
        timeout: 10_000,
      });
      return;
    }
    await page.keyboard.press('Escape');
    await nghi(page, 500, 800);
  }
  throw new Error(`Không thấy tư cách "${tuCach}" trong danh sách`);
}


/** Id yêu cầu phê duyệt trong phản hồi POST /phe-duyet-de-xuat/trinh-ky (dạng object hoặc mảng) */
function layIdYeuCauPheDuyet(kq: any): string | undefined {
  const d = kq?.data;
  const item = Array.isArray(d) ? d[0] : d;
  return item?.id || item?.idYeuCauPheDuyet || item?.dsIdVanBanDaTrinh?.[0];
}

/** Bấm nút đồng ý của hộp xác nhận đang mở (nếu có) */
async function xacNhanHopThoai(page: import('@playwright/test').Page) {
  const hop = page.locator('.ant-modal-confirm, .ant-modal').filter({ has: page.getByRole('button', { name: /^(Đồng ý|Xác nhận|Xóa|OK)$/ }) }).last();
  if (await hienTrong(hop, 5_000)) {
    await hop.getByRole('button', { name: /^(Đồng ý|Xác nhận|Xóa|OK)$/ }).last().click();
  }
}


/** Trong biểu mẫu đang mở: "Lấy số" rồi "Ký logic" (nút có icon nên tên trợ năng kèm tên icon) */
async function bamLaySoVaKyLogic(
  page: import('@playwright/test').Page,
  bm: import('@playwright/test').Locator,
  ghi: (type: string, description: string) => void,
  ten: string,
) {
  const nutLaySo = bm.getByRole('button', { name: /Lấy số$/ }).first();
  if (await hienTrong(nutLaySo, 10_000)) {
    await nutLaySo.click();
    await toastDaHien(page, /Đã cấp số thành công|thành công/i, 60_000, /Không thể cấp số|thất bại/i);
    await choHetSpin(page);
    await nghi(page, 1200, 2000);
    ghi(`lấy số ${ten}`, 'đã cấp số');
  } else {
    ghi(`lấy số ${ten}`, 'không thấy nút "Lấy số"');
  }
  await bm.getByRole('button', { name: /Ký logic$/ }).first().click();
  await xacNhanHopThoai(page);
  await toastDaHien(page, /Ký logic thành công|thành công/i, 120_000, /thất bại|Không thể|lỗi/i);
  await choHetSpin(page);
  await nghi(page, 1500, 2500);
  ghi(`ký ${ten}`, 'đã ký logic');
}

/** Ngày trong ô "Số thụ lý" của chi tiết vụ án (vd. "65500244/2026/TLST-DS ngày 25/09/2026") */
async function docNgayThuLy(page: import('@playwright/test').Page): Promise<string> {
  const dong = await page.getByText(/TLST-DS ngày \d{2}\/\d{2}\/\d{4}/).first().innerText();
  const ngay = (dong.match(/ngày (\d{2}\/\d{2}\/\d{4})/) || [])[1] || '';
  expect(ngay, 'Không đọc được ngày thụ lý từ ô "Số thụ lý"').toBeTruthy();
  return ngay;
}

/**
 * Trong popup "Chọn lịch xét xử cho vụ án" (react-big-calendar): về đúng tháng, bấm nền ô ngày → popup
 * "Thêm lịch xét xử" → tích "Cả ngày", chọn phòng xét xử → "Tạo mới". Lịch vừa tạo tự gắn vào 47DS
 * và popup chọn lịch tự đóng (tuChonLichVuaTao).
 */
async function taoLichXetXu(
  page: import('@playwright/test').Page,
  ngay: string,
  ghi: (type: string, description: string) => void,
) {
  const popupLich = page.locator('.ant-modal').filter({ hasText: /Chọn lịch xét xử cho vụ án/i }).last();
  await expect(popupLich, 'Không mở được popup "Chọn lịch xét xử cho vụ án"').toBeVisible({ timeout: 60_000 });
  await nghi(page, 2000, 3000);

  const [d, m, y] = ngay.split('/').map(Number);
  const tieuDe = popupLich.getByText(/Tháng \d+ Năm \d{4}/).first();
  for (let i = 0; i < 36; i++) {
    const t = (await tieuDe.innerText()).match(/Tháng (\d+) Năm (\d{4})/);
    if (!t) throw new Error('Không đọc được tháng đang hiển thị trên lịch xét xử');
    const lech = (y - Number(t[2])) * 12 + (m - Number(t[1]));
    if (lech === 0) break;
    await popupLich.locator(lech < 0 ? 'button:has(.anticon-left)' : 'button:has(.anticon-right)').first().click();
    await nghi(page, 500, 900);
  }

  // Ô nền ngày (.rbc-row-bg > *) không mang số ngày → dóng theo vị trí cột của ô số trong cùng hàng
  let daBam = false;
  const hangs = popupLich.locator('.rbc-month-row');
  for (let r = 0; r < (await hangs.count()) && !daBam; r++) {
    const hang = hangs.nth(r);
    const oSo = hang.locator('.rbc-date-cell');
    for (let c = 0; c < (await oSo.count()); c++) {
      const o = oSo.nth(c);
      if (Number((await o.innerText()).trim()) !== d) continue;
      if ((await o.getAttribute('class'))?.includes('rbc-off-range')) continue;
      const cot = await o.evaluate(e => [...(e.parentElement?.children || [])].indexOf(e));
      // Ngày đã có nhiều lịch (các vụ khác cùng ngày) thì nhãn "Lịch xét xử" phủ kín nền ô → bấm số ngày:
      // picker này chuyển drill-down thành chọn ô (onDrillDown → onSlotSelect khi showSelectButton)
      const bamNen = await hang
        .locator('.rbc-row-bg > *')
        .nth(cot)
        .click({ timeout: 5_000 })
        .then(() => true, () => false);
      if (!bamNen) await o.locator('.rbc-button-link, button').first().click();
      daBam = true;
      break;
    }
  }
  expect(daBam, `Không thấy ngày ${ngay} trên lịch xét xử`).toBe(true);
  await choHetSpin(page);
  await nghi(page, 1500, 2500);

  // Popup "Thêm lịch xét xử" có z-index riêng nên không nằm cuối DOM → neo theo tiêu đề
  const popupThem = page
    .locator('.ant-modal')
    .filter({ has: page.locator('.ant-modal-title', { hasText: /Thêm lịch xét xử/i }) })
    .last();
  const oCaNgay = popupThem.locator('#caNgay');
  await expect(oCaNgay, 'Không mở được popup "Thêm lịch xét xử"').toBeVisible({ timeout: 60_000 });
  if (!(await oCaNgay.isChecked())) await oCaNgay.check({ force: true });
  await expect(oCaNgay, 'Không tích được "Cả ngày"').toBeChecked({ timeout: 10_000 });
  await nghi(page, 600, 1000);
  for (const id of ['#hinhThucXetXu', '#idPhongXetXu']) {
    const o = popupThem.locator(id);
    if (!(await o.count()) || (await khungSelectCua(o).locator('.ant-select-selection-item').count())) continue;
    ghi(`lịch xét xử · ${id.slice(1)}`, await chonSelect(page, o, undefined, { goDeLoc: false }));
    await choHetSpin(page);
  }
  const nguoiNhan = await khungSelectCua(popupThem.locator('#nguoiNhanThongBao')).locator('.ant-select-selection-item').count();
  expect(nguoiNhan, 'Lịch xét xử chưa có "Người nhận thông báo" (vụ án chưa phân công Thẩm phán)').toBeGreaterThan(0);

  await popupThem.getByRole('button', { name: /^Tạo mới$/ }).first().click();
  await choHetSpin(page);
  await nghi(page, 1500, 2500);
  // Trùng phòng / trùng thành viên HĐXX với vụ khác → hệ thống hỏi xác nhận, chưa trả lời thì không lưu
  const hopTrung = page.locator('.ant-modal-confirm').filter({ hasText: /đang trùng/i }).last();
  if (await hienTrong(hopTrung, 3_000)) {
    ghi('lịch xét xử · trùng', (await hopTrung.locator('.ant-modal-confirm-title').innerText().catch(() => '')).trim());
    await hopTrung.getByRole('button', { name: /^Đồng ý$/ }).last().click();
    await choHetSpin(page);
  }
  const daDong = await oCaNgay.waitFor({ state: 'hidden', timeout: 60_000 }).then(() => true, () => false);
  if (!daDong) throw new Error(`Không tạo được lịch xét xử ngày ${ngay} — ${await nguyenNhanLoi(page, popupThem)}`);
  await expect(popupLich, 'Tạo lịch xong nhưng popup chọn lịch không tự đóng (lịch chưa gắn vào 47DS)').toBeHidden({ timeout: 60_000 });
  await choHetSpin(page);
  ghi('lịch xét xử', `đã tạo và gắn lịch ngày ${ngay}, cả ngày`);
}

/** Mở tab "Xét xử" của vụ án, mở khối "Kết quả xét xử" nếu đang thu gọn */
async function moTabXetXu(page: import('@playwright/test').Page, idVuAn: string) {
  await page.goto(`vu-an/dan-su/so-tham/chi-tiet?id=${idVuAn}&tab=xet-xu`);
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
  await choHetSpin(page);
  await nghi(page, 2000, 3000);
  const dauKhoi = page.locator('.ant-collapse-header').filter({ hasText: /Kết quả xét xử/ }).first();
  if ((await dauKhoi.count()) && (await dauKhoi.getAttribute('aria-expanded')) === 'false') {
    await dauKhoi.click();
    await choHetSpin(page);
    await nghi(page, 800, 1400);
  }
}

/**
 * Tab Xét xử › "Danh sách quyết định" của HĐXX: mở biên bản đã có (icon mắt) hoặc lập mới qua ô "Loại biểu mẫu"
 * → "Thêm mới quyết định". Trả về drawer biểu mẫu.
 */
async function moBienBanXetXu(
  page: import('@playwright/test').Page,
  maHienThi: string,
  ten: RegExp,
  ghi: (type: string, description: string) => void,
) {
  const dong = page.locator('.ant-table-row').filter({ hasText: ten }).first();
  if (await hienTrong(dong, 5_000)) {
    const noiDung = (await dong.innerText()).replace(/\s+/g, ' ').trim();
    // Đã xác nhận đã ký (làm tay hoặc lần chạy trước) → dòng báo "Hoàn thành", không mở lại
    if (/Hoàn thành/i.test(noiDung)) {
      ghi(maHienThi, `đã hoàn thành từ trước — bỏ qua: ${noiDung}`);
      return null;
    }
    ghi(maHienThi, `mở lại: ${noiDung}`);
    await dong.locator('button:has(.anticon-eye)').first().click();
  } else {
    const khung = page
      .locator('.ant-select-selection-placeholder', { hasText: /^Loại biểu mẫu$/ })
      .first()
      .locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]');
    await khung.scrollIntoViewIfNeeded();
    const idO = await khung.locator('input').first().getAttribute('id');
    const o = idO ? page.locator(`#${idO}`) : khung.locator('input').first();
    await expect(o, 'Không thấy ô "Loại biểu mẫu" ở tab Xét xử').toBeVisible({ timeout: 60_000 });
    ghi('loại biểu mẫu', await chonSelect(page, o, maHienThi));
    await page.getByRole('button', { name: /Thêm mới quyết định$/ }).first().click();
  }
  await choHetSpin(page);
  const bm = page.locator('.ant-drawer-content:visible').last();
  await expect(bm.getByRole('button', { name: /^Đóng$/ }).first(), `Không mở được biểu mẫu ${maHienThi}`).toBeVisible({ timeout: 60_000 });
  await nghi(page, 2000, 3000);
  return bm;
}

/** Điền ô nếu đang trống (giữ giá trị hệ thống đã điền sẵn) */
async function dienNeuTrong(o: import('@playwright/test').Locator, giaTriMoi: string, kieu: 'chu' | 'ngay' | 'gio') {
  await expect(o, `Không thấy ô #${await o.getAttribute('id').catch(() => '?')}`).toBeVisible({ timeout: 30_000 });
  if ((await o.inputValue().catch(() => '')).trim()) return;
  if (kieu === 'ngay') return chonNgay(o, giaTriMoi);
  await go(o, giaTriMoi);
  if (kieu === 'gio') await o.press('Enter');
}

/**
 * Biên bản (48/51-DS) không ký trên hệ thống: Lưu → tải bản đã ký (pdf) → "Xác nhận đã ký".
 * Đã xác nhận từ trước thì footer có "Gỡ bản ký & làm lại" → không làm gì.
 */
async function hoanThanhBienBan(
  page: import('@playwright/test').Page,
  bm: import('@playwright/test').Locator,
  tenTep: string,
  ghi: (type: string, description: string) => void,
) {
  if (await hienTrong(bm.getByRole('button', { name: /Gỡ bản ký/ }).first(), 3_000)) {
    ghi('biên bản', 'đã xác nhận đã ký từ lần chạy trước');
    await bm.getByRole('button', { name: /^Đóng$/ }).first().click().catch(() => {});
    return;
  }
  const nutLuu = bm.getByRole('button', { name: /^Lưu$/ }).first();
  await nutLuu.click();
  await toastDaHien(page, /thành công/i, 90_000, /thất bại|Vui lòng|Không thể|lỗi/i);
  await choHetSpin(page);
  await nghi(page, 1500, 2500);

  const oTep = bm.locator('input[type="file"]').first();
  await expect(oTep, 'Lưu xong nhưng không thấy ô tải bản biên bản đã ký').toBeAttached({ timeout: 60_000 });
  await oTep.setInputFiles({
    name: tenTep,
    mimeType: 'application/pdf',
    buffer: fs.readFileSync(path.resolve(__dirname, '../data/BanAn_A.pdf')),
  });
  await choHetSpin(page);
  await nghi(page, 2000, 3000);

  const nutXacNhan = bm.getByRole('button', { name: /Xác nhận đã ký$/ }).first();
  await expect(nutXacNhan, 'Tải tệp xong nhưng nút "Xác nhận đã ký" chưa mở').toBeEnabled({ timeout: 60_000 });
  await nutXacNhan.click();
  await xacNhanHopThoai(page);
  await toastDaHien(page, /Đã xác nhận|thành công/i, 90_000, /thất bại|Vui lòng|Không thể|lỗi/i);
  await choHetSpin(page);
  await nghi(page, 1500, 2500);
  ghi('biên bản', `đã tải "${tenTep}" và xác nhận đã ký`);
  await bm.getByRole('button', { name: /^Đóng$/ }).first().click().catch(() => {});
}
