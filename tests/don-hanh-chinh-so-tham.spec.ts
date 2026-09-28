/**
 * Luồng "Đơn khởi kiện hành chính — sơ thẩm".
 *
 *   B1  Đăng nhập Nguyễn Mậu Trường (<CCCD:chanhAnDanSu>) + đọc data-test-hanh-chinh.xlsx,
 *       sheet "Hành chính sơ thẩm"
 *   B2  Danh sách đơn khởi kiện và yêu cầu (/quan-ly-don/don-khoi-kien-va-yeu-cau/danh-sach?tab=ALL)
 *   B3  "Thêm mới đơn"
 *   B4  Thông tin đơn: hình thức nhận, ngày làm/nhận đơn, người nhận, Loại đơn "Hành chính",
 *       quan hệ pháp luật (thống kê), tick "không tiến hành đối thoại" + lý do
 *   B5  "Tiếp theo"
 *   B6  Đương sự: Người khởi kiện (cá nhân) và Người bị kiện (Cơ quan nhà nước / Người có thẩm quyền)
 *   B7  Yêu cầu: quyết định bị kiện (số, ngày, cơ quan ban hành, "Hủy toàn bộ") + yêu cầu bồi thường
 *   B8  Tài liệu đính kèm → Tiếp theo
 *   B9  Xử lý đơn
 *   S2  Chi tiết đơn › Phân công Thẩm phán giải quyết đơn → Lấy số → Ký logic
 *   S3  Kết quả xử lý: chế độ thủ tục → nghĩa vụ → Thông báo tạm ứng (04-HC) → Xác minh biên lai
 *       → Thụ lý vụ
 *   S5  Mở vụ án vừa sinh ra (mã "VA…")
 *   S6  Vụ án › Phân công Thẩm phán chủ tọa (hành chính) → Lấy số → Ký logic
 *   S7  Chuẩn bị xét xử › Quyết định đưa vụ án ra xét xử → chọn lịch xét xử
 *
 * Viết và chạy TỪNG BƯỚC: bước trước xanh mới làm bước sau.
 * ⚠ Từ B3 trở đi là tạo dữ liệu thật → chỉ chạy khi QLA_TKM_CHO_PHEP_GHI=1.
 *   npm run dev -- --project=tai-khoan-moi --no-deps don-hanh-chinh --reporter=list
 */
import fs from 'fs';
import path from 'path';
import { expect, test } from '@playwright/test';
import { choPhepGhiTKM } from '../account';
import { choHetSpin, chonNgauNhien, chonNgay, chonSelect, go, hienTrong, nghi, nguyenNhanLoi, toastDaHien } from '../common/antd';
import { ddmmyyyy, soNgau } from '../common/du-lieu';
import { giaTri, taiKhoan } from '../common/cau-hinh-luong';
import { chonVuHanhChinh, docVuAnHanhChinh } from '../common/du-lieu-hanh-chinh';
import { moMenu } from '../common/menu';
import { moTrangVaiCauHinh } from '../common/luong-tkm';

const MOI_TRUONG = process.env.QLA_ENV || 'stg';
const DS_VU = docVuAnHanhChinh();
const VU = chonVuHanhChinh(DS_VU)[0];
/** Cả luồng hành chính do chính Nguyễn Mậu Trường (<CCCD:chanhAnDanSu>) thực hiện */
const VAI = 'chanhAnDanSu';
/**
 * Vị trí chọn trong danh mục, suy từ số dòng Excel: mỗi vụ chọn một mục khác nhau nên dữ liệu các
 * vụ không trùng nhau, mà chạy lại cùng một vụ vẫn ra đúng lựa chọn cũ.
 */
const CHI_SO = VU.dong;

test.describe('Đơn khởi kiện hành chính (sơ thẩm)', () => {
  test.describe.configure({ mode: 'serial' });

  test('B1 · Đăng nhập Nguyễn Mậu Trường và đọc dữ liệu Excel', async ({ browser }, testInfo) => {
    const ghi = (type: string, description: string) => {
      testInfo.annotations.push({ type, description });
      console.log(`    · ${type}: ${description}`);
    };

    expect(DS_VU.length, 'Không đọc được vụ án nào từ sheet "Hành chính sơ thẩm"').toBeGreaterThan(0);
    expect(VU, 'Không chọn được vụ để chạy (xem QLA_HC_DONG / QLA_HC_SO_DONG)').toBeTruthy();
    ghi('số vụ đọc được', String(DS_VU.length));
    ghi(
      'vụ sẽ chạy',
      `dòng ${VU.dong} · ${VU.maVuAn} · ${VU.loaiVuAn}` +
        ` · khởi kiện ${VU.nguoiKhoiKien.hoTen}${VU.nguoiKhoiKien.tuoi ? ` (${VU.nguoiKhoiKien.tuoi} tuổi → sinh ${VU.nguoiKhoiKien.namSinh})` : ' (không ghi tuổi)'}` +
        ` · bị kiện ${VU.nguoiBiKien}`,
    );
    ghi('tòa án / ngày thụ lý ST', `${VU.toaAn || '(trống)'} · ${VU.ngayThuLyST || '(trống)'}`);
    await testInfo.attach('vu-hanh-chinh.json', {
      body: JSON.stringify(chonVuHanhChinh(DS_VU), null, 2),
      contentType: 'application/json',
    });

    const tk = taiKhoan(VAI);
    ghi('tài khoản', `${tk.cccd} trên ${MOI_TRUONG}`);
    const { page, context } = await moTrangVaiCauHinh(browser, testInfo, VAI);

    const hoSo = await page.request
      .get(`${new URL(page.url()).origin}/qla/api/v1/session/current_user`, { headers: { accept: 'application/json' } })
      .then(r => r.json())
      .catch(() => null);
    const d = hoSo?.data;
    if (d) ghi('người dùng', [d.username, d.fullName, d.tenChucVu || d.positionName, d.organizationName].filter(Boolean).join(' | '));

    await expect(page, 'Đăng nhập xong phải ở dashboard').toHaveURL(/\/qla\/dashboard/);
    await context.close();
  });

  test('B2–B3 · Mở Danh sách đơn khởi kiện và yêu cầu, bấm "Thêm mới đơn"', async ({ browser }, testInfo) => {
    test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
    const { page, context } = await moTrangVaiCauHinh(browser, testInfo, VAI);

    await page.goto('quan-ly-don/don-khoi-kien-va-yeu-cau/danh-sach?tab=ALL');
    await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
    await choHetSpin(page);

    const nut = page.getByRole('button', { name: /Thêm mới đơn$/ });
    await expect(nut, 'Không thấy nút "Thêm mới đơn"').toBeVisible({ timeout: 60_000 });
    await nut.first().click();
    await expect(page.getByText(/Thêm mới đơn khởi kiện và yêu cầu/i).first(), 'Không mở được màn Thêm mới đơn').toBeVisible({
      timeout: 60_000,
    });
    await nghi(page, 1000, 1500);
    testInfo.annotations.push({ type: 'url', description: new URL(page.url()).pathname + new URL(page.url()).search });
    await context.close();
  });

  test('B4–B9 · Tạo đơn hành chính: thông tin đơn → đương sự → yêu cầu → xử lý đơn', async ({ browser }, testInfo) => {
    test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
    testInfo.setTimeout(8 * 60_000);
    const ghi = (type: string, description: string) => {
      testInfo.annotations.push({ type, description });
      console.log(`    · ${type}: ${description}`);
    };
    const { page, context } = await moTrangVaiCauHinh(browser, testInfo, VAI);

    await test.step('B2–B3 · mở màn Thêm mới đơn', async () => {
      await page.goto('quan-ly-don/don-khoi-kien-va-yeu-cau/danh-sach?tab=ALL');
      await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
      await choHetSpin(page);
      await page.getByRole('button', { name: /Thêm mới đơn$/ }).first().click();
      await expect(page.getByText(/Thêm mới đơn khởi kiện và yêu cầu/i).first()).toBeVisible({ timeout: 60_000 });
      await choHetSpin(page);
      await nghi(page, 1200, 2000);
    });

    // B4 · các ô bắt buộc ở bước 1 "Thông tin đơn"
    const homNay = ddmmyyyy(new Date());
    const ngayLamDon = ddmmyyyy(new Date(Date.now() - ((VU.dong % 28) + 1) * 86_400_000));
    await chonSelect(page, page.locator('#hinhThucNhanDon'), giaTri('hinhThucNhanDon'), { goDeLoc: false });
    // Ngày làm đơn lùi theo số dòng để các vụ không trùng ngày (ngày nhận đơn giữ là hôm nay)
    await chonNgay(page.locator('#ngayLamDon'), ngayLamDon);
    await chonNgay(page.locator('#ngayNhanDon'), homNay);
    // "Số tiếp nhận" do hệ thống tự cấp và khoá → chỉ đọc lại
    const soTiepNhan = await page.locator('#soTiepNhan').inputValue().catch(() => '');
    ghi('số tiếp nhận (hệ thống cấp)', soTiepNhan || '(trống)');
    await chonSelect(page, page.locator('#canBoNhanDon'), giaTri('nguoiNhanDon'));

    // b4.7 · Loại đơn "Hành chính" — chọn TRƯỚC quan hệ pháp luật vì danh mục thống kê đổi theo loại đơn
    const loaiDon = await chonSelect(page, page.locator('#loaiDon'), 'Hành chính');
    ghi('loại đơn', loaiDon);
    await choHetSpin(page);
    const oPhanLoai = page.locator('#phanLoai');
    if (!(await khungSelectCua(oPhanLoai).locator('.ant-select-selection-item').count())) await chonSelect(page, oPhanLoai);

    // b4.8 · Quan hệ pháp luật (Thống kê): danh mục chỉ nạp sau khi gõ từ khoá, mục trong dropdown bị
    // coi là ẩn nên chọn bằng bàn phím (gõ từ khoá → Enter, lấy mục đầu)
    const tuKhoa = VU.loaiVuAn.split(' ').slice(0, 2).join(' ') || 'Khiếu kiện';
    const { qhplDaChon, soMuc } = await chonDanhMucThongKe(page, page.locator('#qhplThongKe'), tuKhoa, CHI_SO);
    ghi('quan hệ pháp luật', `${qhplDaChon} (từ khoá "${tuKhoa}", ${soMuc} mục)`);
    await go(page.locator('#noiDungQuanHePhapLuat'), VU.loaiVuAn);

    // b4.9 · "Không tiến hành đối thoại tại Tòa án" + lý do (bắt buộc)
    const radioKhongDoiThoai = page.getByRole('radio', { name: /Không tiến hành (đối thoại|hoà giải|hòa giải) tại Tòa án/i }).first();
    await expect(radioKhongDoiThoai, 'Không thấy lựa chọn "Không tiến hành đối thoại tại Tòa án"').toBeVisible({ timeout: 30_000 });
    await radioKhongDoiThoai.check();
    await choHetSpin(page);
    await nghi(page, 800, 1400);
    const lyDo = await chonTheoChiSo(page, page.locator('#lyDoKhongHoaGiai'), CHI_SO);
    ghi('lý do không đối thoại', lyDo);
    // Chọn "trường hợp khác" thì hiện thêm ô "Lý do khác" bắt buộc
    const oLyDoKhac = page.locator('#lyDoKhac');
    if (await hienTrong(oLyDoKhac, 3_000)) await go(oLyDoKhac, VU.loaiVuAn);

    // B5
    await page.getByRole('button', { name: /^Tiếp theo$/ }).first().click();
    await choHetSpin(page);
    await expect(
      page.getByRole('button', { name: /Thêm người tham gia/ }).first(),
      'Bấm Tiếp theo nhưng không sang được bước "Đương sự"',
    ).toBeVisible({ timeout: 60_000 });
    ghi('url sau B5', new URL(page.url()).pathname + new URL(page.url()).search);

    // ───────── B6 · Đương sự ─────────
    // 6.1–6.5 · Người khởi kiện (cá nhân), lấy cột "Người khởi kiện" trong Excel
    await themNguoiKhoiKien(page, VU.nguoiKhoiKien);
    ghi('người khởi kiện', VU.nguoiKhoiKien.hoTen);

    // 6.6 · Người bị kiện là Cơ quan nhà nước / Người có thẩm quyền — dò cấu trúc form trước
    const form = page.locator('.ant-drawer-content').filter({ hasText: 'Thêm mới thành phần tham gia tố tụng' }).last();
    await expect(form, 'Sau "Lưu & Thêm mới" form phải còn mở để nhập người bị kiện').toBeVisible({ timeout: 30_000 });
    const radioCqnn = form.getByRole('radio', { name: /Cơ quan nhà nước/i }).first();
    await expect(radioCqnn, 'Không thấy lựa chọn "Cơ quan nhà nước / Người có thẩm quyền"').toBeVisible({ timeout: 30_000 });
    await radioCqnn.check();
    await choHetSpin(page);
    await nghi(page, 2000, 3000);
    // Thành phần tham gia: tick "Cơ quan nhà nước" và "Người có thẩm quyền"
    for (const id of ['#nhaNuoc_coCoQuan', '#nhaNuoc_coNguoiCoThamQuyen']) {
      const o = page.locator(id).first();
      if (!(await o.isChecked().catch(() => true))) await o.check({ force: true });
    }
    await choHetSpin(page);
    await nghi(page, 1200, 2000);

    // Tư cách của cơ quan nhà nước (và của người có thẩm quyền) là "Người bị kiện"
    await chonSelect(page, form.locator('#nhaNuoc_tuCachCoQuan'), 'Người bị kiện', { goDeLoc: false });
    const oTuCachNguoi = form.locator('#nhaNuoc_tuCachNguoiCoThamQuyen');
    if (await hienTrong(oTuCachNguoi, 5_000)) {
      await chonSelect(page, oTuCachNguoi, 'Người bị kiện', { goDeLoc: false }).catch(() =>
        chonSelect(page, oTuCachNguoi, undefined, { goDeLoc: false }),
      );
    }

    // Xác định cơ quan nhà nước: Cấp cơ quan rồi tên cơ quan (lấy cột "Người bị kiện" trong Excel)
    const capCoQuan = await chonTheoChiSo(page, form.locator('#nhaNuoc_xdCoQuan_capCoQuan'), CHI_SO);
    ghi('cấp cơ quan', capCoQuan);
    await choHetSpin(page);
    await nghi(page, 800, 1400);

    // Chọn "Cấp cơ quan" làm hiện thêm ô bắt buộc khác (Loại cơ quan…) → quét chọn hết
    await chonHetSelectBatBuocConTrong(page, form, ghi, CHI_SO);
    // Có cấp cơ quan không kèm select "Tên cơ quan" (ô text vẫn bắt buộc) → nhập theo cột Excel.
    // Dùng fill thay go vì FE có thể chuẩn hoá lại chuỗi sau khi nhập.
    const oTenCoQuan = form.locator('#nhaNuoc_tenCoQuanHienTai');
    if (!(await oTenCoQuan.inputValue().catch(() => ''))) {
      await oTenCoQuan.fill(VU.nguoiBiKien);
      await oTenCoQuan.blur();
      await nghi(page, 600, 1000);
    }
    ghi('tên cơ quan nhà nước', (await form.locator('#nhaNuoc_tenCoQuanHienTai').inputValue().catch(() => '')) || '(trống)');
    // Loại cơ quan nào hiện thêm ô chữ bắt buộc (vd "Tên cơ quan thuộc/dưới Bộ") thì điền nốt
    await dienHetTextBatBuocConTrong(page, form, VU.nguoiBiKien, ghi);

    // Người có thẩm quyền của cơ quan nhà nước: chức vụ
    const oChucVu = form.locator('#nguoiCoThamQuyen_chucVu');
    if (await hienTrong(oChucVu, 5_000)) {
      const chucVu = await chonSelect(page, oChucVu, undefined, { goDeLoc: false }).catch(async () => {
        await go(oChucVu, 'Chủ tịch');
        return 'Chủ tịch (nhập tay)';
      });
      ghi('chức vụ người có thẩm quyền', chucVu);
    }

    // 6.7 · Lưu
    await form.getByRole('button', { name: /^Lưu$/ }).last().click();
    await toastDaHien(page, /Đã lưu đương sự|thành công/i, 60_000, /Không thể lưu|Vui lòng|thất bại/i);
    await choHetSpin(page);
    await nghi(page, 1200, 2000);
    ghi('người bị kiện', VU.nguoiBiKien);

    // 6.8 · Tiếp theo
    await page.getByRole('button', { name: /^Tiếp theo$/ }).first().click();
    await choHetSpin(page);
    await expect(
      page.getByRole('button', { name: /Thêm người tham gia/ }).first(),
      'Bấm Tiếp theo nhưng vẫn ở bước Đương sự',
    ).toBeHidden({ timeout: 60_000 });
    await nghi(page, 1000, 1800);
    ghi('url sau B6', new URL(page.url()).pathname + new URL(page.url()).search);

    // ───────── B7 · Yêu cầu ─────────
    await choHetSpin(page);
    await expect(page.locator('#soQuyetDinh'), 'Không sang được bước "Yêu cầu"').toBeVisible({ timeout: 60_000 });
    await nghi(page, 1200, 2000);

    // 7.1 · Quyết định hành chính bị kiện. Ô "Số quyết định bị kiện" CHỈ nhận chữ số, và phải khác
    // nhau giữa các vụ → lấy theo số thứ tự dòng trong Excel.
    const soQuyetDinh = String(1000 + VU.dong);
    await go(page.locator('#soQuyetDinh'), soQuyetDinh);
    await chonNgay(page.locator('#ngayQuyetDinh'), homNay);
    const coQuanBanHanh = await chonSelect(page, page.locator('#idNguoiCoQuanBanHanh'), undefined, { goDeLoc: false });
    const loaiHuy = await chonSelect(page, page.locator('#loaiHuyQuyetDinh'), 'Hủy toàn bộ', { goDeLoc: false });
    // Mỗi khối (Quyết định / Hành vi / Bồi thường) có nút "Thêm mới" riêng → bấm đúng nút của khối
    const nutThemMoi = page.getByRole('button', { name: /Thêm mới$/ });
    await nutThemMoi.first().click();
    await choHetSpin(page);
    await expect(
      page.locator('.ant-table-row').filter({ hasText: soQuyetDinh }).first(),
      'Bấm "Thêm mới" nhưng quyết định bị kiện không vào bảng',
    ).toBeVisible({ timeout: 30_000 });
    ghi('quyết định bị kiện', `${soQuyetDinh} ngày ${homNay} · ban hành: ${coQuanBanHanh} · ${loaiHuy}`);
    await nghi(page, 800, 1400);

    // 7.2 · Yêu cầu bồi thường (khối riêng ở dưới, có nút "Thêm mới" của chính nó)
    const oYeuCauBT = page.locator('#yeuCauBoiThuong');
    await oYeuCauBT.scrollIntoViewIfNeeded();
    const noiDungBoiThuong = `Yêu cầu bồi thường thiệt hại cho ${VU.nguoiKhoiKien.hoTen} do ${VU.loaiVuAn.toLowerCase()} theo quyết định số ${soQuyetDinh}.`;
    await go(oYeuCauBT, noiDungBoiThuong);
    // InputNumber hiển thị có dấu phân cách nghìn (300.000) nên không dùng go() để đối chiếu nguyên văn
    const oSoTien = page.locator('#soTienBoiThuong');
    await oSoTien.click();
    await oSoTien.fill('300000');
    await oSoTien.blur();
    await expect(oSoTien, 'Nhập số tiền bồi thường không ăn').toHaveValue(/300[.,]?000/, { timeout: 10_000 });
    // Ô "Người bị kiện" của khối bồi thường là ô #idNguoiBiKien cuối cùng trên màn
    const oBiKien = page.locator('#idNguoiBiKien');
    const nguoiBiKien = await chonSelect(page, oBiKien.last(), undefined, { goDeLoc: false });
    ghi('yêu cầu bồi thường', `300.000 đ · người bị kiện: ${nguoiBiKien}`);
    await nutThemMoi.last().click();
    await choHetSpin(page);
    await nghi(page, 1000, 1800);

    // 7.3 · Tiếp theo (Yêu cầu) rồi Tiếp theo (Tài liệu đính kèm — không đính kèm gì)
    await page.getByRole('button', { name: /^Tiếp theo$/ }).first().click();
    await choHetSpin(page);
    await expect(page.locator('#soQuyetDinh'), 'Bấm Tiếp theo nhưng vẫn ở bước Yêu cầu').toBeHidden({ timeout: 60_000 });
    await nghi(page, 1000, 1800);

    await expect(
      page.getByRole('button', { name: /Thêm tài liệu mới$/ }).first(),
      'Không sang được bước "Tài liệu đính kèm"',
    ).toBeVisible({ timeout: 60_000 });
    await page.getByRole('button', { name: /^Tiếp theo$/ }).first().click();
    await choHetSpin(page);

    // ───────── B9 · Hoàn thành → Xử lý đơn ─────────
    const nutXuLy = page.getByRole('button', { name: /^Xử lý đơn$/ }).first();
    await expect(nutXuLy, 'Không sang được bước "Hoàn thành"').toBeVisible({ timeout: 60_000 });
    await nghi(page, 1000, 1800);
    await nutXuLy.click();
    await page.waitForURL(/don-khoi-kien-va-yeu-cau\/chi-tiet\?/, { timeout: 120_000 });
    await choHetSpin(page);
    const idDon = new URL(page.url()).searchParams.get('id') || '';
    expect(idDon, 'Không lấy được id đơn sau khi Xử lý đơn').not.toBe('');
    ghi('id đơn', idDon);
    ghi('link chi tiết đơn', new URL(page.url()).toString());
    ghiTrangThai({ idDon, soTiepNhan, xong: 'nhapDon' });
    await context.close();
  });

  test('S2 · Phân công Thẩm phán giải quyết đơn → Lấy số → Ký logic', async ({ browser }, testInfo) => {
    test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
    const idDon = process.env.QLA_HC_ID_DON || trangThai().idDon || '';
    test.skip(!idDon, `Chưa có id đơn cho vụ ${VU.maVuAn} — chạy bước B4–B9 trước`);
    testInfo.setTimeout(10 * 60_000);
    const ghi = (type: string, description: string) => {
      testInfo.annotations.push({ type, description });
      console.log(`    · ${type}: ${description}`);
    };
    const { page, context } = await moTrangVaiCauHinh(browser, testInfo, VAI);
    ghi('id đơn', idDon);

    await page.goto(`quan-ly-don/don-khoi-kien-va-yeu-cau/chi-tiet?id=${idDon}&tab=phan-cong`);
    await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
    await choHetSpin(page);
    await nghi(page, 1500, 2500);

    // Đã lập quyết định phân công ở lần chạy trước thì mở lại, không lập thêm
    const dongVanBan = page.locator('.ant-table-row').filter({ hasText: /phân công thẩm phán/i }).first();
    if (await hienTrong(dongVanBan, 5_000)) {
      ghi('văn bản phân công', 'dùng lại văn bản đã lập ở lần chạy trước');
      await dongVanBan.locator('button:has(.anticon-eye)').first().click();
    } else {
      await page.getByRole('button', { name: /Phân công$/ }).first().click();
      await page.getByRole('menuitem', { name: /Phân công Thẩm phán giải quyết đơn/ }).first().click();
    }
    await choHetSpin(page);

    const bm = page.locator('.ant-drawer-content:visible, .ant-modal-content:visible').last();
    const oVaiTro = bm.locator('#bieuMauDS001_noiDung_vaiTro');
    await expect(oVaiTro, 'Không mở được biểu mẫu phân công Thẩm phán (DS001)').toBeVisible({ timeout: 60_000 });
    await choHetSpin(page);
    await nghi(page, 1200, 2000);

    const nguoiKy = giaTri('nguoiKyPhanCongDon');
    const bangPhanCong = bm.locator('.ant-table-row');
    if (!(await bangPhanCong.count())) {
      const oNguoiKy = bm.locator('#bieuMauDS001_noiDung_MA_NGUOI_KY');
      if (!(await khungSelectCua(oNguoiKy).locator('.ant-select-selection-item').count())) {
        await chonSelect(page, oNguoiKy, nguoiKy);
      }
      await chonSelect(page, oVaiTro, giaTri('vaiTroPhanCongDon'));
      await choHetSpin(page);
      // Chọn chính Nguyễn Mậu Trường để các bước sau (thông báo án phí "dành cho Thẩm phán được
      // phân công") do cùng tài khoản này thực hiện
      const nguoiDuocPC = await chonSelect(page, bm.locator('#bieuMauDS001_noiDung_nguoiDuocPC'), nguoiKy);
      ghi('người được phân công', nguoiDuocPC);
      await bm.locator('button:has(.anticon-arrow-down)').first().click();
      await expect(bangPhanCong.first(), 'Không đưa được người được phân công vào bảng').toBeVisible({ timeout: 30_000 });
      await nghi(page, 800, 1400);
    } else {
      ghi('người được phân công', (await bangPhanCong.first().innerText()).replace(/\s+/g, ' ').trim());
    }

    // Lưu → Lấy số → Ký logic → Đóng (nút có icon nên tên trợ năng kèm tên icon)
    const nutLuu = bm.getByRole('button', { name: /^Lưu$/ }).first();
    if (await hienTrong(nutLuu, 5_000)) {
      await nutLuu.click();
      await toastDaHien(page, /thành công/i, 60_000, /thất bại|Vui lòng|Không thể|lỗi/i);
      await choHetSpin(page);
      await nghi(page, 1200, 2000);
    }
    await bamLaySoVaKyLogic(page, bm, ghi, 'quyết định phân công đơn');
    ghi('số quyết định', (await bm.locator('#bieuMauDS001_so').inputValue().catch(() => '')) || '(không đọc được)');
    await bm.getByRole('button', { name: /^Đóng$/ }).first().click().catch(() => {});
    await choHetSpin(page);
    ghiTrangThai({ xong: 'phanCong' });
    await context.close();
  });

  test('S3 · Kết quả xử lý: chế độ thủ tục → nghĩa vụ → Thông báo 04-HC → Xác minh biên lai → Thụ lý vụ', async ({
    browser,
  }, testInfo) => {
    test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
    const idDon = process.env.QLA_HC_ID_DON || trangThai().idDon || '';
    test.skip(!idDon, `Chưa có id đơn cho vụ dòng ${VU.dong} — chạy bước B4–B9 trước`);
    testInfo.setTimeout(15 * 60_000);
    const ghi = (type: string, description: string) => {
      testInfo.annotations.push({ type, description });
      console.log(`    · ${type}: ${description}`);
    };
    const { page, context } = await moTrangVaiCauHinh(browser, testInfo, VAI);
    ghi('id đơn', idDon);

    await page.goto(`quan-ly-don/don-khoi-kien-va-yeu-cau/chi-tiet?id=${idDon}&tab=ket-qua-xu-ly`);
    await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
    await choHetSpin(page);
    await nghi(page, 2000, 3000);

    // Ngày nhận đơn đọc trên thanh tiêu đề: "65500264 • Ngày nhận: 25/09/2026 • …"
    const dongNgayNhan = await page.getByText(/Ngày nhận:\s*\d{2}\/\d{2}\/\d{4}/).first().innerText();
    const ngayNhanDon = (dongNgayNhan.match(/\d{2}\/\d{2}\/\d{4}/) || [])[0] || '';
    expect(ngayNhanDon, 'Không đọc được "Ngày nhận đơn"').toBeTruthy();
    ghi('ngày nhận đơn', ngayNhanDon);

    // 4.1 · Xác nhận chế độ thủ tục (phải làm trước khi xác định nghĩa vụ)
    const daXacNhanCheDo = page.getByText(/Đã xác nhận Thủ tục/i).first();
    if (!(await hienTrong(daXacNhanCheDo, 5_000))) {
      await page.getByRole('button', { name: /Xác nhận chế độ thủ tục$/ }).first().click();
      await xacNhanHopThoai(page);
      await choHetSpin(page);
      await expect(daXacNhanCheDo, 'Xác nhận chế độ thủ tục không ăn').toBeVisible({ timeout: 60_000 });
      await nghi(page, 1200, 2000);
    }
    ghi('chế độ thủ tục', (await daXacNhanCheDo.innerText()).replace(/\s+/g, ' ').trim());

    // 4.2–4.3 · Xác định nghĩa vụ → "Xác nhận tất cả"
    // Đơn hành chính báo "Nghĩa vụ tạm ứng toàn hồ sơ đã được xác định", đơn dân sự báo "Các nguồn
    // phát sinh hiện có đã được xác định" → nhận cả hai
    const daXacDinhNghiaVu = page.getByText(/đã được xác định/i).first();
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

    // 4.3–4.7 · Thông báo nộp tiền tạm ứng án phí (04-HC) → Lưu → Lấy số → Ký logic → Đóng
    const khoiTb = page.locator('.ant-collapse-item').filter({ hasText: 'Thông báo tạm ứng án phí và chi phí tố tụng' }).last();
    const dongTb = khoiTb.locator('.ant-table-row').filter({ hasText: /Thông báo nộp/ });
    if (!(await dongTb.count())) {
      const nutThem = khoiTb.locator('button').filter({ hasText: 'Thêm thông báo' }).last();
      await nutThem.scrollIntoViewIfNeeded();
      await nutThem.click();
      await page.locator('.ant-dropdown:visible .ant-dropdown-menu-item').filter({ hasText: /04-HC/i }).first().click();
      await choHetSpin(page);

      const bm = page.locator('.ant-drawer-content:visible, .ant-modal-content:visible').last();
      const oNguoiKy = bm.locator('[id$="_noiDung_MA_NGUOI_KY"]').first();
      await expect(oNguoiKy, 'Không mở được biểu mẫu thông báo tạm ứng án phí (04-HC)').toBeVisible({ timeout: 60_000 });
      await nghi(page, 1500, 2500);
      if (!(await khungSelectCua(oNguoiKy).locator('.ant-select-selection-item').count())) {
        await chonSelect(page, oNguoiKy, giaTri('nguoiKyThongBaoAnPhi'));
      }
      const oNgayTb = bm.locator('[id$="_ngayQuyetDinh"]').first();
      if (await hienTrong(oNgayTb, 3_000)) await chonNgay(oNgayTb, ngayNhanDon);
      // Cơ quan thi hành án thu tiền + địa chỉ "HN"
      const oCqTha = bm.locator('[id$="_CO_QUAN_THI_HANH_AN_STR"]').first();
      if (await hienTrong(oCqTha, 5_000)) {
        await chonSelect(page, oCqTha, undefined, { goDeLoc: false });
        await nghi(page, 800, 1400);
        ghi('cơ quan thi hành án', await khungSelectCua(oCqTha).locator('.ant-select-selection-item').first().innerText());
      }
      const oDiaChiTha = bm.locator('[id$="_DIA_CHI_CO_QUAN_THA_STR"]').first();
      if (await hienTrong(oDiaChiTha, 3_000)) await go(oDiaChiTha, 'HN');

      await bm.getByRole('button', { name: /^Lưu$/ }).first().click();
      await toastDaHien(page, /thành công/i, 60_000, /thất bại|Vui lòng|Không thể|lỗi/i);
      await choHetSpin(page);
      await nghi(page, 1500, 2500);
      await bamLaySoVaKyLogic(page, bm, ghi, '04-HC');
      await bm.getByRole('button', { name: /^Đóng$/ }).first().click().catch(() => {});
      await choHetSpin(page);
      await nghi(page, 1500, 2500);
    } else {
      ghi('04-HC', `đã có ${await dongTb.count()} thông báo tạm ứng — không lập thêm`);
    }
    if (await dongTb.count()) ghi('trạng thái 04-HC', (await dongTb.first().innerText()).replace(/\s+/g, ' ').trim());

    // 4.8–4.9 · "Xác minh" ở cột Thao tác của khối "Thông tin nộp tạm ứng án phí và chi phí tố tụng"
    const nutThuLy = page.getByRole('button', { name: /Thụ lý vụ$/ }).first();
    const nutVuAn = page.getByRole('button', { name: /VA\d/ }).first();
    const daThuLy = await hienTrong(nutVuAn, 5_000);
    if (!daThuLy && (await nutThuLy.isDisabled().catch(() => true))) {
      const nutXacMinh = page.getByRole('button', { name: /Xác minh$/ }).first();
      await nutXacMinh.scrollIntoViewIfNeeded();
      await nutXacMinh.click();
      const hopPhi = page.locator('.ant-drawer-content:visible, .ant-modal-content:visible').last();
      await expect(hopPhi.locator('#soBienLai'), 'Không mở được popup "Xác minh biên lai"').toBeVisible({ timeout: 60_000 });
      await nghi(page, 1500, 2500);

      const soBienLai = soNgau(8);
      await go(hopPhi.locator('#soBienLai'), soBienLai);
      ghi('số biên lai', soBienLai);
      await hopPhi.locator('input[type="file"]').first().setInputFiles(path.resolve(__dirname, '../data/bien-lai-tam-ung-an-phi.pdf'));
      await nghi(page, 1200, 2000);
      await hopPhi.getByRole('button', { name: /Xác minh biên lai$/ }).first().click();
      await toastDaHien(page, /thành công|Đã ghi nhận/i, 90_000, /thất bại|Vui lòng|Không thể|lỗi/i);
      await choHetSpin(page);
      await nghi(page, 1500, 2500);
      ghi('nộp phí', 'đã xác minh biên lai');
    } else {
      ghi('nộp phí', 'nghĩa vụ tạm ứng đã nộp đủ / đơn đã thụ lý từ lần chạy trước');
    }

    // 4.10–4.13 · Thụ lý vụ: ngày thụ lý = ngày nhận đơn, số thụ lý 8 chữ số
    if (!daThuLy) {
      await nutThuLy.click();
      await choHetSpin(page);
      const bmThuLy = page.locator('.ant-drawer-content:visible, .ant-modal-content:visible').last();
      const oNgayThuLy = bmThuLy.locator('[id$="_noiDung_ngayThuLy"]').first();
      await expect(oNgayThuLy, 'Không mở được biểu mẫu thụ lý').toBeVisible({ timeout: 60_000 });
      await nghi(page, 1500, 2500);

      const oNguoiKyThuLy = bmThuLy.locator('[id$="_noiDung_MA_NGUOI_KY"]').first();
      if ((await oNguoiKyThuLy.count()) && !(await khungSelectCua(oNguoiKyThuLy).locator('.ant-select-selection-item').count())) {
        await chonSelect(page, oNguoiKyThuLy, giaTri('nguoiKyThongBaoAnPhi'));
      }
      const oSo = bmThuLy.locator('[id$="DS_so"], [id$="HC_so"], [id$="_so"]').first();
      if (await oSo.isEditable().catch(() => false)) {
        const soThuLyNhap = soNgau(8);
        await go(oSo, soThuLyNhap);
        ghi('số thụ lý nhập', soThuLyNhap);
      }
      await chonNgay(oNgayThuLy, ngayNhanDon);

      await bmThuLy.getByRole('button', { name: /^Lưu$/ }).first().click();
      await toastDaHien(page, /thành công/i, 90_000, /thất bại|Vui lòng|Không thể|lỗi/i);
      await choHetSpin(page);
      await nghi(page, 1500, 2500);
      await bamLaySoVaKyLogic(page, bmThuLy, ghi, 'quyết định thụ lý');
      await bmThuLy.getByRole('button', { name: /^Đóng$/ }).first().click().catch(() => {});
      await choHetSpin(page);
      await nghi(page, 2000, 3000);
    } else {
      ghi('thụ lý', 'đơn đã thụ lý từ lần chạy trước — bỏ qua');
    }

    // Step 5 · mở vụ án vừa sinh ra (nút mang mã "VA…" ở cuối trang)
    await expect(nutVuAn, 'Thụ lý xong nhưng không thấy mã vụ án ở cuối trang').toBeVisible({ timeout: 60_000 });
    const maVuAn = (await nutVuAn.innerText()).trim();
    await nutVuAn.click();
    await page.waitForURL(/vu-an\/.*\/chi-tiet/, { timeout: 120_000 });
    await choHetSpin(page);
    const idVuAn = new URL(page.url()).searchParams.get('id') || '';
    ghi('vụ án', `${maVuAn} · id ${idVuAn}`);
    ghi('link chi tiết vụ án', page.url());
    ghiTrangThai({ idVuAn, maVuAn, ngayThuLy: ngayNhanDon, xong: 'thuLy' });
    await context.close();
  });

  test('S6 · Vụ án hành chính: phân công Thẩm phán chủ tọa → Lấy số → Ký logic', async ({ browser }, testInfo) => {
    test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
    const idVuAn = process.env.QLA_HC_ID_VU_AN || trangThai().idVuAn || '';
    test.skip(!idVuAn, `Chưa có id vụ án cho vụ dòng ${VU.dong} — chạy bước S3 (thụ lý) trước`);
    testInfo.setTimeout(10 * 60_000);
    const ghi = (type: string, description: string) => {
      testInfo.annotations.push({ type, description });
      console.log(`    · ${type}: ${description}`);
    };
    const { page, context } = await moTrangVaiCauHinh(browser, testInfo, VAI);
    ghi('id vụ án', idVuAn);

    // 6.1 · Chi tiết vụ án › tab "Phân công"
    await page.goto(`vu-an/hanh-chinh/so-tham/chi-tiet?id=${idVuAn}&tab=phan-cong`);
    await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
    await choHetSpin(page);
    await nghi(page, 2000, 3000);

    // Vụ đã có quyết định phân công từ lần chạy trước thì không lập thêm (backend chặn hai chủ tọa).
    // Đã lập nhưng chưa ký (dừng giữa chừng sau Lưu) thì mở lại bằng icon mắt để Lấy số → Ký logic.
    const dongQuyetDinh = page.locator('.ant-table-row').filter({ hasText: /phân công thẩm phán/i }).first();
    if (await hienTrong(dongQuyetDinh, 5_000)) {
      const noiDung = (await dongQuyetDinh.innerText()).replace(/\s+/g, ' ').trim();
      if (!/Đã có hiệu lực|Đã ban hành|Hoàn thành/i.test(noiDung)) {
        ghi('kết quả', `quyết định phân công chưa ký — mở lại để ký: ${noiDung}`);
        await dongQuyetDinh.locator('button:has(.anticon-eye)').first().click();
        await choHetSpin(page);
        const bmCu = page.locator('.ant-drawer-content:visible, .ant-modal-content:visible').last();
        await expect(bmCu.getByRole('button', { name: /^Đóng$/ }).first(), 'Không mở lại được quyết định phân công').toBeVisible({
          timeout: 60_000,
        });
        await nghi(page, 1500, 2500);
        if (await hienTrong(bmCu.getByRole('button', { name: /Ký logic$/ }).first(), 5_000)) {
          await bamLaySoVaKyLogic(page, bmCu, ghi, 'quyết định phân công vụ án');
        }
        await bmCu.getByRole('button', { name: /^Đóng$/ }).first().click().catch(() => {});
      } else {
        ghi('kết quả', `vụ đã có quyết định phân công: ${noiDung}`);
      }
      ghiTrangThai({ xong: 'phanCongVuAn' });
      await context.close();
      return;
    }

    // 6.2–6.3 · "Phân công" › "Quyết định phân công thẩm phán giải quyết vụ án hành chính"
    await page.getByRole('button', { name: /Phân công$/ }).first().click();
    await page.getByRole('menuitem', { name: /phân công thẩm phán giải quyết vụ án hành chính/i }).first().click();
    await choHetSpin(page);

    // Id các ô mang tiền tố theo mã biểu mẫu → bắt theo hậu tố để không phụ thuộc mã
    const bm = page.locator('.ant-drawer-content:visible, .ant-modal-content:visible').last();
    const oVaiTro = bm.locator('[id$="_noiDung_vaiTro"]').first();
    await expect(oVaiTro, 'Không mở được biểu mẫu phân công Thẩm phán giải quyết vụ án hành chính').toBeVisible({
      timeout: 60_000,
    });
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
    ghiTrangThai({ xong: 'phanCongVuAn' });
    await context.close();
  });

  test('S7 · Vụ án hành chính: Quyết định đưa vụ án ra xét xử (16-HC) → lịch xét xử → Lưu → Lấy số → Ký logic', async ({
    browser,
  }, testInfo) => {
    test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
    const idVuAn = process.env.QLA_HC_ID_VU_AN || trangThai().idVuAn || '';
    test.skip(!idVuAn, `Chưa có id vụ án cho vụ dòng ${VU.dong} — chạy bước S3 (thụ lý) trước`);
    test.skip(!VU.daXetXu, `Dòng ${VU.dong}: Excel không ghi "Đã xét xử" → vụ không ra bản án`);
    // Khoá cũ "quyetDinhXetXu" do bản S7 trước ghi khi mới mở lịch (chưa Lưu/Ký) nên không dùng để bỏ qua
    test.skip(daXong('kyQuyetDinhXetXu'), 'Vụ này đã ký 16-HC ở lần chạy trước');
    testInfo.setTimeout(12 * 60_000);
    const ghi = (type: string, description: string) => {
      testInfo.annotations.push({ type, description });
      console.log(`    · ${type}: ${description}`);
    };
    const { page, context } = await moTrangVaiCauHinh(browser, testInfo, VAI);
    ghi('id vụ án', idVuAn);

    await page.goto(`vu-an/hanh-chinh/so-tham/chi-tiet?id=${idVuAn}&tab=chuan-bi-xet-xu`);
    await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
    await choHetSpin(page);
    await nghi(page, 2000, 3000);

    // Ngày xét xử trùng ngày thụ lý (ghi ở S3; thiếu thì đọc ô "Số thụ lý" trên màn)
    const ngayThuLy = trangThai().ngayThuLy || (await docNgayThuLy(page));
    ghi('ngày thụ lý', ngayThuLy);

    // Đã có 16-HC (lập tay hoặc lần chạy trước): đã ký thì ghi nhận và dừng, chưa ký thì mở lại để làm tiếp
    const dongQd = page.locator('.ant-table-row').filter({ hasText: /đưa vụ án ra xét xử/i }).first();
    let bm: import('@playwright/test').Locator;
    if (await hienTrong(dongQd, 5_000)) {
      const noiDungQd = (await dongQd.innerText()).replace(/\s+/g, ' ').trim();
      if (DA_KY.test(noiDungQd)) {
        ghi('16-HC', `đã ký từ trước — bỏ qua: ${noiDungQd}`);
        ghiTrangThai({ ngayXetXu: ngayThuLy, xong: 'kyQuyetDinhXetXu' });
        await context.close();
        return;
      }
      ghi('16-HC', `mở lại quyết định đã lập: ${noiDungQd}`);
      await dongQd.locator('button:has(.anticon-eye)').first().click();
      bm = page.locator('.ant-drawer-content:visible').last();
      await expect(bm.locator('#bieuMau16HC_noiDung_MA_NGUOI_KY'), 'Không mở lại được biểu mẫu 16-HC').toBeVisible({ timeout: 60_000 });
      await nghi(page, 2000, 3000);
      if (!(await hienTrong(bm.getByRole('button', { name: /^Lưu$|Lấy số$|Ký logic$/ }).first(), 5_000))) {
        ghi('16-HC', 'quyết định đã ký từ trước — bỏ qua');
        await bm.getByRole('button', { name: /^Đóng$/ }).first().click().catch(() => {});
        ghiTrangThai({ ngayXetXu: ngayThuLy, xong: 'kyQuyetDinhXetXu' });
        await context.close();
        return;
      }
    } else {
      // 7.1 · "Danh sách quyết định" › ô "Chọn loại biểu mẫu" → 16-HC → "Thêm biểu mẫu"
      const khungLoaiBieuMau = page
        .locator('.ant-select-selection-placeholder', { hasText: 'Chọn loại biểu mẫu' })
        .first()
        .locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]');
      await khungLoaiBieuMau.scrollIntoViewIfNeeded();
      const idOLoai = await khungLoaiBieuMau.locator('input').first().getAttribute('id');
      const oLoaiBieuMau = idOLoai ? page.locator(`#${idOLoai}`) : khungLoaiBieuMau.locator('input').first();
      await expect(oLoaiBieuMau, 'Không thấy ô "Chọn loại biểu mẫu" ở tab Chuẩn bị xét xử').toBeVisible({ timeout: 60_000 });
      // Nhãn trong ô đã bỏ phần mã "(16-HC)" (lamSachTenBieuMauChon) → tìm theo tên; 17-HC là "đưa vụ án ra giải quyết…"
      ghi('loại biểu mẫu', await chonSelect(page, oLoaiBieuMau, 'đưa vụ án ra xét xử sơ thẩm'));
      await page.getByRole('button', { name: /Thêm biểu mẫu$/ }).first().click();
      await choHetSpin(page);
      bm = page.locator('.ant-drawer-content:visible').last();
      await expect(bm.locator('#bieuMau16HC_noiDung_MA_NGUOI_KY'), 'Không mở được biểu mẫu 16-HC').toBeVisible({ timeout: 60_000 });
    }
    await nghi(page, 2000, 3000);

    const oNguoiKy = bm.locator('#bieuMau16HC_noiDung_MA_NGUOI_KY');
    if (!(await khungSelectCua(oNguoiKy).locator('.ant-select-selection-item').count())) {
      await chonSelect(page, oNguoiKy, giaTri('nguoiKyPhanCongDon'));
    }
    const oNgayQd = bm.locator('[id$="_ngayQuyetDinh"]').first();
    // Ô ngày quyết định bị khoá tới khi Lấy số (hệ thống tự điền) → chỉ điền khi ô cho nhập
    if ((await oNgayQd.count()) && (await oNgayQd.isEditable().catch(() => false))) await dienNeuTrong(oNgayQd, ngayThuLy, 'ngay');

    // 7.2 · Lịch xét xử (bắt buộc ≥ 1): hệ thống tự nạp lịch đã đặt của vụ; chưa có thì tạo đúng ngày thụ lý
    const bangLich = bm.locator('.ant-table').filter({ hasText: /NGÀY MỞ PHIÊN TÒA|Ngày mở phiên tòa/i }).first();
    const dongLich = bangLich.locator('.ant-table-row').filter({ hasText: /\d{2}\/\d{2}\/\d{4}/ });
    if (!(await hienTrong(dongLich.first(), 5_000))) {
      await bm.getByRole('button', { name: /Chọn lịch xét xử$/ }).first().click();
      await choHetSpin(page);
      await taoLichXetXu(page, ngayThuLy, ghi);
    }
    await expect(dongLich.first(), 'Chưa gắn được lịch xét xử vào quyết định').toBeVisible({ timeout: 60_000 });
    ghi('lịch xét xử', (await dongLich.first().innerText()).replace(/\s+/g, ' ').trim());

    // 7.3 · Lưu → Lấy số → Ký logic → Đóng
    const nutLuu = bm.getByRole('button', { name: /^Lưu$/ }).first();
    if (await hienTrong(nutLuu, 5_000)) {
      await nutLuu.click();
      await toastDaHien(page, /thành công/i, 90_000, /thất bại|Vui lòng|Không thể|lỗi|không được để trống/i);
      await choHetSpin(page);
      await nghi(page, 1500, 2500);
    }
    await bamLaySoVaKyLogic(page, bm, ghi, '16-HC');
    await bm.getByRole('button', { name: /^Đóng$/ }).first().click().catch(() => {});
    ghiTrangThai({ ngayXetXu: ngayThuLy, xong: 'kyQuyetDinhXetXu' });
    await context.close();
  });

  test('S8 · Xét xử: Biên bản phiên tòa sơ thẩm (20-HC) → Lưu → tải bản đã ký → Xác nhận đã ký', async ({
    browser,
  }, testInfo) => {
    test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
    const idVuAn = process.env.QLA_HC_ID_VU_AN || trangThai().idVuAn || '';
    test.skip(!idVuAn, `Chưa có id vụ án cho vụ dòng ${VU.dong} — chạy bước S3 (thụ lý) trước`);
    test.skip(!VU.daXetXu, `Dòng ${VU.dong}: Excel không ghi "Đã xét xử" → vụ không ra bản án`);
    test.skip(daXong('bienBanPhienToa'), 'Vụ này đã hoàn thành Biên bản phiên tòa ở lần chạy trước');
    testInfo.setTimeout(10 * 60_000);
    const ghi = (type: string, description: string) => {
      testInfo.annotations.push({ type, description });
      console.log(`    · ${type}: ${description}`);
    };
    const { page, context } = await moTrangVaiCauHinh(browser, testInfo, VAI);
    await moTabXetXu(page, idVuAn);
    const ngayMoPhien = trangThai().ngayXetXu || trangThai().ngayThuLy || (await docNgayThuLy(page));
    ghi('ngày mở phiên tòa', ngayMoPhien);

    const bm = await moBienBanXetXu(page, 'Biên bản phiên tòa', /Biên bản phiên tòa/i, ghi);
    if (bm) {
      const ma = '#bieuMau20HC_noiDung_';
      // Hệ thống điền sẵn từ 16-HC; ô nào trống thì điền theo phiên tòa đã xếp lịch
      await dienNeuTrong(bm.locator(`${ma}NGAY_MO_PHIEN_TOA`), ngayMoPhien, 'ngay');
      await dienNeuTrong(bm.locator(`${ma}GIO_MO_PHIEN_TOA`), '07:00', 'gio');
      await dienNeuTrong(bm.locator(`${ma}DIA_DIEM_PHIEN_TOA`), 'Trụ sở Tòa án nhân dân khu vực 9 - Hà Nội', 'chu');
      await hoanThanhBienBan(page, bm, `Bien ban phien toa - dong ${VU.dong}.pdf`, ghi);
    }
    ghiTrangThai({ xong: 'bienBanPhienToa' });
    await context.close();
  });

  test('S9 · Xét xử: Biên bản nghị án (21-HC) → Lưu → tải bản đã ký → Xác nhận đã ký', async ({ browser }, testInfo) => {
    test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
    const idVuAn = process.env.QLA_HC_ID_VU_AN || trangThai().idVuAn || '';
    test.skip(!idVuAn, `Chưa có id vụ án cho vụ dòng ${VU.dong} — chạy bước S3 (thụ lý) trước`);
    test.skip(!VU.daXetXu, `Dòng ${VU.dong}: Excel không ghi "Đã xét xử" → vụ không ra bản án`);
    test.skip(daXong('bienBanNghiAn'), 'Vụ này đã hoàn thành Biên bản nghị án ở lần chạy trước');
    testInfo.setTimeout(10 * 60_000);
    const ghi = (type: string, description: string) => {
      testInfo.annotations.push({ type, description });
      console.log(`    · ${type}: ${description}`);
    };
    const { page, context } = await moTrangVaiCauHinh(browser, testInfo, VAI);
    await moTabXetXu(page, idVuAn);
    const ngayMoPhien = trangThai().ngayXetXu || trangThai().ngayThuLy || (await docNgayThuLy(page));

    const bm = await moBienBanXetXu(page, 'Biên bản nghị án', /Biên bản nghị án/i, ghi);
    if (bm) {
      const ma = '#bieuMau21HC_noiDung_';
      // Nghị án ngay sau phiên tòa, cùng ngày mở phiên
      await dienNeuTrong(bm.locator(`${ma}NGAY_BAT_DAU`), ngayMoPhien, 'ngay');
      await dienNeuTrong(bm.locator(`${ma}GIO_BAT_DAU`), '10:00', 'gio');
      await dienNeuTrong(bm.locator(`${ma}NGAY_KET_THUC`), ngayMoPhien, 'ngay');
      await dienNeuTrong(bm.locator(`${ma}GIO_KET_THUC`), '11:00', 'gio');
      await dienNeuTrong(bm.locator(`${ma}DIA_DIEM_NGHI_AN`), 'Phòng nghị án - Tòa án nhân dân khu vực 9 - Hà Nội', 'chu');
      const oToa = bm.locator(`${ma}TOA_AN`);
      if ((await oToa.count()) && (await oToa.isEditable().catch(() => false))) {
        await dienNeuTrong(oToa, 'Tòa án nhân dân khu vực 9 - Hà Nội', 'chu');
      }
      const oCap = bm.locator(`${ma}CAP_XET_XU`);
      if ((await oCap.count()) && !(await khungSelectCua(oCap).locator('.ant-select-selection-item').count())) {
        await chonSelect(page, oCap, 'Sơ thẩm');
      }
      await dienNeuTrong(
        bm.locator(`${ma}CAN_CU_NGHI_AN`),
        `Căn cứ các tài liệu, chứng cứ có trong hồ sơ vụ án và kết quả tranh tụng tại phiên tòa về việc khiếu kiện của ${VU.nguoiKhoiKien.hoTen} đối với ${VU.nguoiBiKien}.`,
        'chu',
      );
      await dienNeuTrong(
        bm.locator(`${ma}Y_KIEN_THAO_LUAN`),
        'Hội đồng xét xử thảo luận và thống nhất chấp nhận yêu cầu khởi kiện của người khởi kiện.',
        'chu',
      );
      await hoanThanhBienBan(page, bm, `Bien ban nghi an - dong ${VU.dong}.pdf`, ghi);
    }
    ghiTrangThai({ xong: 'bienBanNghiAn' });
    await context.close();
  });

  test('S10 · Xét xử: Bản án hành chính sơ thẩm (22-HC) → Lấy số → Ký logic', async ({ browser }, testInfo) => {
    test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
    const idVuAn = process.env.QLA_HC_ID_VU_AN || trangThai().idVuAn || '';
    test.skip(!idVuAn, `Chưa có id vụ án cho vụ dòng ${VU.dong} — chạy bước S3 (thụ lý) trước`);
    test.skip(!VU.daXetXu, `Dòng ${VU.dong}: Excel không ghi "Đã xét xử" → vụ không ra bản án`);
    test.skip(daXong('banAn'), `Vụ này đã có bản án ${trangThai().soBanAn || ''} ở lần chạy trước`);
    testInfo.setTimeout(10 * 60_000);
    const ghi = (type: string, description: string) => {
      testInfo.annotations.push({ type, description });
      console.log(`    · ${type}: ${description}`);
    };
    const { page, context } = await moTrangVaiCauHinh(browser, testInfo, VAI);
    await moTabXetXu(page, idVuAn);
    const ngayXetXu = trangThai().ngayXetXu || trangThai().ngayThuLy || (await docNgayThuLy(page));

    // Bảng bản án (chỉ hiện khi loại kết quả = "Bản án"): còn nút soạn (bút) là chưa ký; không còn là đã ký
    const dongBanAn = page
      .locator('.ant-table-row')
      .filter({ hasText: /\/HC-ST|Chưa được cấp số/ })
      .first();
    const coDong = await hienTrong(dongBanAn, 5_000);
    const nutSoan = dongBanAn.locator('button:has(.anticon-edit)').first();
    if (coDong && !(await hienTrong(nutSoan, 3_000))) {
      const noiDung = (await dongBanAn.innerText()).replace(/\s+/g, ' ').trim();
      const soBanAn = (noiDung.match(/\d+\/\d{4}\/HC-ST/) || [''])[0];
      const ngayBanAn = (noiDung.match(/\d{2}\/\d{2}\/\d{4}/) || [''])[0];
      ghi('bản án', `đã có từ trước: ${noiDung}`);
      ghiTrangThai({ soBanAn, ngayBanAn, xong: 'banAn' });
      await context.close();
      return;
    }
    if (coDong) {
      ghi('bản án', 'đã lưu từ lần trước (chưa ký) — mở lại "Soạn bản án"');
      await nutSoan.click();
    } else {
      const nutTao = page.getByRole('button', { name: /Tạo bản án$/ }).first();
      await expect(nutTao, 'Không thấy nút "Tạo bản án" (cần 16-HC đã ký, 20-HC và 21-HC đã xác nhận ký)').toBeEnabled({
        timeout: 60_000,
      });
      await nutTao.click();
    }
    await choHetSpin(page);
    const bm = page.locator('.ant-drawer-content:visible').last();
    const ma = '#bieuMau22HC_noiDung_';
    await expect(bm.locator(`${ma}MA_NGUOI_KY`), 'Không mở được màn soạn bản án 22-HC').toBeVisible({ timeout: 60_000 });
    await nghi(page, 2000, 3000);

    const oNguoiKy = bm.locator(`${ma}MA_NGUOI_KY`);
    if (!(await khungSelectCua(oNguoiKy).locator('.ant-select-selection-item').count())) {
      await chonSelect(page, oNguoiKy, giaTri('nguoiKyPhanCongDon'));
    }
    await dienNeuTrong(bm.locator(`${ma}NGAY_BAN_AN`), ngayXetXu, 'ngay');
    const oQhpl = bm.locator(`${ma}QUAN_HE_PHAP_LUAT_THONG_KE`);
    if (!(await khungSelectCua(oQhpl).locator('.ant-select-selection-item').count())) {
      ghi('quan hệ pháp luật thống kê', await chonTheoChiSo(page, oQhpl, VU.dong));
    }
    await dienNeuTrong(bm.locator(`${ma}QUAN_HE_PHAP_LUAT_CHI_TIET`), VU.loaiVuAn || 'Khiếu kiện quyết định hành chính', 'chu');
    const oVks = bm.locator(`${ma}TEN_VIEN_KIEM_SAT_NHAN`);
    if (!(await khungSelectCua(oVks).locator('.ant-select-selection-item').count())) {
      // Danh mục cố định (VKS_OPTS của dansu-new) không có VKS khu vực 9 → lấy VKS cấp khu vực có sẵn
      ghi('viện kiểm sát nhận', await chonSelect(page, oVks, 'khu vực 1 - TP Hà Nội'));
    }
    const ngayBanAn = await bm.locator(`${ma}NGAY_BAN_AN`).inputValue();

    // "Thêm mới bản án" (lần sau là "Cập nhật bản án") → Lấy số → Ký logic. Nút nằm ở thanh thao tác của
    // FlyoutDrawer nên tìm trên cả trang.
    const nutLuu = page.getByRole('button', { name: /(Thêm mới|Cập nhật) bản án$/ }).last();
    if (await hienTrong(nutLuu, 5_000)) {
      await nutLuu.click();
      await toastDaHien(page, /thành công/i, 90_000, /thất bại|Vui lòng|Không thể|lỗi|bỏ trống/i);
      await choHetSpin(page);
      await nghi(page, 1500, 2500);
    }
    await bamLaySoVaKyLogic(page, page.locator('body'), ghi, 'bản án 22-HC');
    const soBanAn = (await bm.locator(`${ma}SO_QUYET_DINH`).inputValue().catch(() => '')).trim();
    ghi('bản án', `số ${soBanAn || '(không đọc được trên form)'} ngày ${ngayBanAn}`);
    await page.getByRole('button', { name: /^Đóng$/ }).last().click().catch(() => {});
    ghiTrangThai({ soBanAn, ngayBanAn, xong: 'banAn' });
    await context.close();
  });

  // ───────── Bước 10 của StepData_HC.txt: kháng cáo (điều kiện để có vụ phúc thẩm) ─────────

  test('S11 · Kết quả sơ thẩm: đơn kháng cáo (24-HC) → Giấy xác nhận (25-HC) → Lấy số → Ký logic', async ({
    browser,
  }, testInfo) => {
    test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
    const idVuAn = process.env.QLA_HC_ID_VU_AN || trangThai().idVuAn || '';
    test.skip(!idVuAn, `Chưa có id vụ án cho vụ dòng ${VU.dong} — chạy bước S3 (thụ lý) trước`);
    test.skip(!daXong('banAn'), `Vụ dòng ${VU.dong} chưa có bản án sơ thẩm → chưa kháng cáo được`);
    test.skip(daXong('khangCao'), 'Vụ này đã có đơn kháng cáo ở lần chạy trước');
    testInfo.setTimeout(10 * 60_000);
    const ghi = (type: string, description: string) => {
      testInfo.annotations.push({ type, description });
      console.log(`    · ${type}: ${description}`);
    };
    const { page, context } = await moTrangVaiCauHinh(browser, testInfo, VAI);
    await page.goto(`vu-an/hanh-chinh/so-tham/chi-tiet?id=${idVuAn}&tab=quan-ly-an`);
    await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
    await choHetSpin(page);
    await nghi(page, 2000, 3000);

    // Kháng cáo cùng ngày bản án: luôn trong hạn 15 ngày (Đ.206 Luật TTHC) nên không bị "quá hạn"
    const ngayKhangCao = trangThai().ngayBanAn || trangThai().ngayXetXu || ddmmyyyy(new Date());
    // Số tiếp nhận suy từ số dòng Excel → mỗi vụ một số, chạy lại cùng vụ vẫn ra số cũ
    const soTiepNhan = String(24000000 + VU.dong);

    const bangKhangCao = page.locator('.ant-table').filter({ hasText: /Người kháng cáo|Chưa có đơn kháng cáo nào/ }).first();
    const dongCu = bangKhangCao.locator('.ant-table-row').first();
    if (!(await hienTrong(dongCu, 5_000))) {
      await page.getByRole('button', { name: /^(plus )?Thêm mới$/ }).first().click();
      const dr = page.locator('.ant-drawer-content:visible').filter({ hasText: /đơn kháng cáo — Mẫu 24-HC/ }).last();
      await expect(dr, 'Không mở được màn "Thêm mới đơn kháng cáo — Mẫu 24-HC"').toBeVisible({ timeout: 60_000 });
      await nghi(page, 1500, 2500);

      await chonNgay(dr.locator('#ngayTiepNhan'), ngayKhangCao);
      await go(dr.locator('#soTiepNhan'), soTiepNhan);
      ghi('hình thức tiếp nhận', await chonTheoChiSo(page, dr.locator('#hinhThucTiepNhan'), VU.dong));
      await chonNgay(dr.locator('#ngayKhangCao'), ngayKhangCao);
      // Loại kháng cáo phải chọn TRƯỚC: ô "Bản án/quyết định bị kháng cáo" bị disabled và chỉ nạp
      // danh sách văn bản sau khi biết loại (FormKhangCaoHanhChinh: onChange reset idVanBan)
      await chonSelect(page, dr.locator('#loaiKhangCao'), 'Bản án');
      await nghi(page, 1200, 2000);
      const oVanBan = dr.locator('#idVanBan');
      await expect(oVanBan, 'Ô "Bản án/quyết định bị kháng cáo" vẫn bị khoá sau khi chọn loại kháng cáo').toBeEnabled({
        timeout: 30_000,
      });
      ghi('bản án bị kháng cáo', await chonTheoChiSo(page, oVanBan, 0));
      ghi('phạm vi kháng cáo', await chonTheoChiSo(page, dr.locator('#phamViKhangCao'), VU.dong));
      // "Loại người kháng cáo" là danh mục tư cách tố tụng đầy đủ, nhưng vụ chỉ có người ở vài tư cách
      // (vd. chọn "Người làm chứng" thì "Tên người kháng cáo" rỗng và không lưu được). Ưu tiên hai
      // đương sự luôn có của án hành chính, hết thì mới quét các tư cách còn lại.
      await chonLoaiNguoiKhangCaoCoNguoi(page, dr, ghi);
      const yeuCau = dr.locator('.ant-checkbox-input').first();
      if (await hienTrong(yeuCau, 3_000)) await yeuCau.check({ force: true }).catch(() => {});
      await go(
        dr.locator('#noiDung'),
        `Đề nghị Tòa án cấp phúc thẩm xem xét lại toàn bộ bản án hành chính sơ thẩm số ${
          trangThai().soBanAn || ''
        } ngày ${ngayKhangCao}.`,
      );

      await page.getByRole('button', { name: /^Lưu mới$/ }).last().click();
      await toastDaHien(page, /Thêm đơn kháng cáo thành công|thành công/i, 90_000, /thất bại|Vui lòng|lỗi|trống/i);
      await choHetSpin(page);
      await nghi(page, 1500, 2500);
      await page.getByRole('button', { name: /^Đóng$/ }).last().click().catch(() => {});
      await choHetSpin(page);
    } else {
      ghi('đơn kháng cáo', `đã có từ lần chạy trước: ${(await dongCu.innerText()).replace(/\s+/g, ' ').trim()}`);
    }

    await expect(bangKhangCao.locator('.ant-table-row').first(), 'Bảng "Danh sách kháng cáo" vẫn trống sau khi lưu đơn').toBeVisible({
      timeout: 60_000,
    });
    ghiTrangThai({ soTiepNhanKhangCao: soTiepNhan, ngayKhangCao, xong: 'khangCao' });

    // Giấy xác nhận đã nhận đơn kháng cáo (25-HC): nằm trong menu "…" của cột Thao tác
    if (!daXong('giayXacNhanKhangCao')) {
      await bangKhangCao.locator('.ant-table-row').first().locator('button:has(.anticon-more)').first().click();
      await page.getByRole('menuitem', { name: /Giấy xác nhận đã nhận đơn kháng cáo/ }).click();
      const bm = page.locator('.ant-drawer-content:visible, .ant-modal:visible').last();
      await expect(bm, 'Không mở được biểu mẫu 25-HC').toBeVisible({ timeout: 60_000 });
      await choHetSpin(page);
      await nghi(page, 2000, 3000);
      const nutLuu = page.getByRole('button', { name: /^(save )?Lưu$/ }).last();
      if (await hienTrong(nutLuu, 5_000)) {
        await nutLuu.click();
        await toastDaHien(page, /thành công/i, 90_000, /thất bại|Vui lòng|lỗi|trống/i);
        await choHetSpin(page);
        await nghi(page, 1500, 2500);
      }
      // Lượt chạy trước có thể đã ký 25-HC mà sổ cái chưa kịp ghi (lỗi ở bước sau) → biểu mẫu mở ra
      // không còn nút "Ký logic". Coi như đã xong thay vì chờ nút không bao giờ hiện.
      if (await hienTrong(page.getByRole('button', { name: /Ký logic$/ }).first(), 8_000)) {
        await bamLaySoVaKyLogic(page, page.locator('body'), ghi, 'giấy xác nhận 25-HC');
      } else {
        ghi('giấy xác nhận 25-HC', 'đã ký từ lượt chạy trước — không còn nút "Ký logic"');
      }
      await page.getByRole('button', { name: /^Đóng$/ }).last().click().catch(() => {});
      ghiTrangThai({ xong: 'giayXacNhanKhangCao' });
    }
    await context.close();
  });

  /**
   * StepData_HC.txt không ghi bước này, nhưng backend bắt buộc: hồ sơ chỉ hiện ở "Hồ sơ vụ án
   * chuyển đi" khi VU_CHUYEN còn CHUA_CHUYEN mà đơn kháng cáo đã có ID_VAN_BAN_THONG_BAO trỏ tới một
   * văn bản đã ký (VuChuyenRepository#dsHoSoSoThamChuyenDiHanhChinh). Cột đó chỉ được ghi bởi
   * BieuMau32HCServiceImpl#xuLySauKySo — tức phải lập và KÝ 32-HC "Thông báo về việc kháng cáo".
   */
  test('S11b · Kết quả sơ thẩm: Thông báo về việc kháng cáo (32-HC) → Lấy số → Ký logic', async ({
    browser,
  }, testInfo) => {
    test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
    const idVuAn = process.env.QLA_HC_ID_VU_AN || trangThai().idVuAn || '';
    test.skip(!idVuAn, `Chưa có id vụ án cho vụ dòng ${VU.dong} — chạy bước S3 (thụ lý) trước`);
    test.skip(!daXong('khangCao'), `Vụ dòng ${VU.dong} chưa có đơn kháng cáo → chưa lập được thông báo`);
    test.skip(daXong('thongBaoKhangCao'), 'Thông báo về việc kháng cáo đã lập và ký ở lần chạy trước');
    testInfo.setTimeout(10 * 60_000);
    const ghi = (type: string, description: string) => {
      testInfo.annotations.push({ type, description });
      console.log(`    · ${type}: ${description}`);
    };
    const { page, context } = await moTrangVaiCauHinh(browser, testInfo, VAI);
    await page.goto(`vu-an/hanh-chinh/so-tham/chi-tiet?id=${idVuAn}&tab=quan-ly-an`);
    await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
    await choHetSpin(page);
    await nghi(page, 2000, 3000);

    // Tab "Kết quả sơ thẩm" xếp các phần thành khối gập (không phải tab con). Nút "Thêm mới thông báo"
    // là mốc duy nhất trên trang → neo mọi thứ theo nó thay vì đoán cấu trúc div của khối.
    const nutThem = page.getByRole('button', { name: /Thêm mới thông báo$/ }).first();
    await expect(nutThem, 'Không thấy khối "Danh sách thông báo kháng cáo, kháng nghị"').toBeVisible({ timeout: 60_000 });

    const dongCu = page.locator('.ant-table-row:visible').filter({ hasText: /32-HC|về việc kháng cáo/i }).first();
    if (await hienTrong(dongCu, 5_000)) {
      ghi('thông báo 32-HC', `đã có từ lần chạy trước: ${(await dongCu.innerText()).replace(/\s+/g, ' ').trim()}`);
      ghiTrangThai({ xong: 'thongBaoKhangCao' });
      await context.close();
      return;
    }

    // Ô "loại thông báo" là antd Select đứng ngay trước nút; KHÔNG dùng getByPlaceholder vì antd vẽ
    // placeholder bằng <span class="ant-select-selection-placeholder">, không phải thuộc tính placeholder.
    const khungLoaiTB = nutThem.locator(
      'xpath=preceding::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]',
    );
    if (!(await khungLoaiTB.locator('.ant-select-selection-item').count())) {
      await chonSelect(page, khungLoaiTB.locator('input').first(), 'Thông báo về việc kháng cáo (32-HC)');
    }
    await expect(nutThem, 'Nút "Thêm mới thông báo" vẫn bị khoá sau khi chọn loại 32-HC').toBeEnabled({ timeout: 30_000 });
    await nutThem.click();
    const bm = page.locator('.ant-drawer-content:visible, .ant-modal:visible').last();
    await expect(bm, 'Không mở được biểu mẫu 32-HC').toBeVisible({ timeout: 60_000 });
    await choHetSpin(page);
    await nghi(page, 2000, 3000);

    const ngayThongBao = trangThai().ngayKhangCao || trangThai().ngayBanAn || ddmmyyyy(new Date());
    await dienNeuTrong(bm.locator('#ngayThongBao'), ngayThongBao, 'ngay');
    const oNguoiKy = bm.locator('#nguoiKy');
    if (!(await khungSelectCua(oNguoiKy).locator('.ant-select-selection-item').count())) {
      await chonSelect(page, oNguoiKy, giaTri('nguoiKyPhanCongDon'));
    }
    // "Đơn kháng cáo" là select nhiều giá trị → chọn hết đơn đang có của vụ
    const oDon = bm.locator('#idDonKhangCao');
    if (!(await khungSelectCua(oDon).locator('.ant-select-selection-item').count())) {
      ghi('đơn kháng cáo', await chonTheoChiSo(page, oDon, 0));
      await page.keyboard.press('Escape');
    }
    const oVks = bm.locator('#vienKiemSat');
    if (!(await khungSelectCua(oVks).locator('.ant-select-selection-item').count())) {
      ghi('viện kiểm sát cùng cấp', await chonTheoChiSo(page, oVks, VU.dong));
    }
    await dienNeuTrong(
      bm.locator('#vanDeGiaiQuyet'),
      'Xem xét lại toàn bộ bản án hành chính sơ thẩm theo nội dung đơn kháng cáo.',
      'chu',
    );

    const nutLuu = page.getByRole('button', { name: /^(save )?Lưu$/ }).last();
    if (await hienTrong(nutLuu, 5_000)) {
      await nutLuu.click();
      await toastDaHien(page, /thành công/i, 90_000, /thất bại|Vui lòng|lỗi|trống/i);
      await choHetSpin(page);
      await nghi(page, 1500, 2500);
    }
    await bamLaySoVaKyLogic(page, page.locator('body'), ghi, 'thông báo 32-HC');
    await page.getByRole('button', { name: /^Đóng$/ }).last().click().catch(() => {});
    ghiTrangThai({ xong: 'thongBaoKhangCao' });
    await context.close();
  });

  // ───────── Bước 11 của StepData_HC.txt: chuyển hồ sơ lên phúc thẩm ─────────

  test('S12 · Hồ sơ vụ án chuyển đi: chọn vụ → "Chuyển vụ án" → xác nhận', async ({ browser }, testInfo) => {
    test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
    const maVuAn = trangThai().maVuAn || '';
    test.skip(!maVuAn, `Chưa biết mã vụ án của vụ dòng ${VU.dong} — chạy bước S3 (thụ lý) trước`);
    test.skip(!daXong('thongBaoKhangCao'), `Vụ ${maVuAn} chưa ký Thông báo về việc kháng cáo (32-HC) → hồ sơ chưa vào danh sách chuyển đi`);
    test.skip(daXong('chuyenPhucTham'), `Vụ ${maVuAn} đã chuyển lên phúc thẩm ở lần chạy trước`);
    testInfo.setTimeout(10 * 60_000);
    const ghi = (type: string, description: string) => {
      testInfo.annotations.push({ type, description });
      console.log(`    · ${type}: ${description}`);
    };
    const { page, context } = await moTrangVaiCauHinh(browser, testInfo, VAI);
    // Màn này do API menu cấp (không có route tĩnh trong routes.ts) → phải đi bằng menu bên trái
    await moMenu(page, ['Hành chính', 'Quản lý sơ thẩm', 'Hồ sơ vụ án chuyển đi']);
    await choHetSpin(page);
    await nghi(page, 2000, 3000);

    // Bảng gộp mọi hồ sơ chuyển đi (hàng chục bản ghi, 10 dòng/trang) → lọc bằng tab "Chưa chuyển",
    // tab này chỉ còn hồ sơ đang chờ chuyển nên dòng cần tìm nằm ngay trang đầu.
    const tabChuaChuyen = page.getByRole('tab').filter({ hasText: /Chưa chuyển/ }).first();
    if (await hienTrong(tabChuaChuyen, 8_000)) {
      await tabChuaChuyen.click();
      await choHetSpin(page);
      await nghi(page, 1500, 2500);
    }
    const dong = page.locator('.ant-table-row:visible').filter({ hasText: maVuAn }).first();
    if (!(await hienTrong(dong, 10_000))) {
      // Bảng lọc theo "Loại chuyển"; mặc định có thể không phải "Chuyển phúc thẩm"
      const oLoai = page.locator('.ant-select-selector').filter({ hasText: /Chuyển/ }).first();
      if (await hienTrong(oLoai, 3_000)) {
        await oLoai.click();
        await page.getByTitle(/Chuyển phúc thẩm/).first().click();
        await choHetSpin(page);
        await nghi(page, 1500, 2500);
      }
    }
    await expect(
      dong,
      `Không thấy vụ ${maVuAn} ở "Hồ sơ vụ án chuyển đi" — kiểm tra lại đơn kháng cáo đã hợp lệ chưa`,
    ).toBeVisible({ timeout: 60_000 });

    // Đã chuyển từ lượt trước thì cột Thao tác không còn nút "Chuyển" (coTheChuyenVuAn = false)
    // antd ghép tên icon vào accessible name → nút là "check-circle Chuyển", không phải "Chuyển"
    const nutChuyenDong = dong.getByRole('button', { name: /^(\S+ )?Chuyển$/ });
    if (!(await hienTrong(nutChuyenDong, 5_000))) {
      ghi('chuyển phúc thẩm', `vụ ${maVuAn} đã chuyển: ${(await dong.innerText()).replace(/\s+/g, ' ').trim()}`);
      ghiTrangThai({ xong: 'chuyenPhucTham' });
      await context.close();
      return;
    }
    await nutChuyenDong.click();
    const xn = page.locator('.ant-modal:visible').filter({ hasText: /Chuyển vụ án/ }).last();
    await expect(xn, 'Không mở được hộp xác nhận "Chuyển vụ án"').toBeVisible({ timeout: 30_000 });
    await xn.getByRole('button', { name: /^(\S+ )?Chuyển$/ }).last().click();
    await toastDaHien(page, /Đã chuyển thành công|thành công/i, 90_000, /Không thể chuyển|thất bại|lỗi/i);
    await choHetSpin(page);
    await nghi(page, 2000, 3000);
    ghi('chuyển phúc thẩm', `đã chuyển vụ ${maVuAn}`);
    ghiTrangThai({ xong: 'chuyenPhucTham' });
    await context.close();
  });
});

/**
 * Phần phúc thẩm của StepData_HC.txt: từ đây dùng tài khoản Tòa án cấp trên
 * (<CCCD:chanhAnPhucThamHanhChinh> – Nguyễn Xuân Kỳ, TAND TP Hà Nội), khai ở config/luong-gdt.json.
 * Dùng chung sổ cái với nhánh sơ thẩm (khoá dong-N) nên biết vụ nào đã chuyển lên.
 */
const VAI_PT = 'chanhAnPhucThamHanhChinh';

test.describe('Vụ án hành chính (phúc thẩm)', () => {
  test.describe.configure({ mode: 'serial' });

  test('PT1 · Hồ sơ vụ án chuyển đến: tiếp nhận vụ án → sinh vụ phúc thẩm', async ({ browser }, testInfo) => {
    test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
    const maVuAn = trangThai().maVuAn || '';
    test.skip(!maVuAn, `Chưa biết mã vụ án của vụ dòng ${VU.dong}`);
    test.skip(!daXong('chuyenPhucTham'), `Vụ ${maVuAn} chưa được chuyển lên phúc thẩm (chạy S12 trước)`);
    test.skip(daXong('tiepNhanPhucTham'), `Vụ ${maVuAn} đã được tiếp nhận ở phúc thẩm từ lần chạy trước`);
    testInfo.setTimeout(10 * 60_000);
    const ghi = (type: string, description: string) => {
      testInfo.annotations.push({ type, description });
      console.log(`    · ${type}: ${description}`);
    };
    const { page, context } = await moTrangVaiCauHinh(browser, testInfo, VAI_PT);
    await moMenuHanhChinh(page, 'Hồ sơ vụ án chuyển đến');
    await choHetSpin(page);
    await nghi(page, 2000, 3000);

    // Danh sách gộp hồ sơ của mọi vụ (hàng chục bản ghi, 10 dòng/trang). Ô tìm nhanh KHÔNG khớp mã vụ
    // án sơ thẩm (thử VA26-003496 ra "Không có dữ liệu") nên lọc bằng tab "Chưa tiếp nhận" — tab này
    // chỉ còn các hồ sơ đang chờ nên dòng cần tìm nằm ngay trang đầu.
    const tabChuaNhan = page.getByRole('tab').filter({ hasText: /Chưa tiếp nhận/ }).first();
    if (await hienTrong(tabChuaNhan, 8_000)) {
      await tabChuaNhan.click();
      await choHetSpin(page);
      await nghi(page, 1500, 2500);
    }
    // Dòng mang cả mã vụ án sơ thẩm và "Bản án: <số>" → khớp theo mã, không có thì khớp theo số bản án
    const soBanAnGoc = (trangThai().soBanAn || '').split('/')[0];
    const dong = page
      .locator('.ant-table-row:visible')
      .filter({ hasText: maVuAn })
      .first()
      .or(
        page
          .locator('.ant-table-row:visible')
          .filter({ hasText: soBanAnGoc || maVuAn })
          .first(),
      );
    if (!(await hienTrong(dong, 20_000))) {
      // Đã tiếp nhận rồi thì cột "Thông tin vụ án" chuyển sang mã vụ PHÚC THẨM nên tìm theo mã sơ thẩm
      // không ra nữa. Sổ cái đã có id vụ phúc thẩm là bằng chứng đủ → coi như xong, không nhận lại.
      const idCu = trangThai().idVuAnPt;
      if (idCu) {
        ghi('tiếp nhận phúc thẩm', `đã tiếp nhận trước đó → vụ phúc thẩm ${trangThai().maVuAnPt || idCu}`);
        ghiTrangThai({ xong: 'tiepNhanPhucTham' });
        await context.close();
        return;
      }
      throw new Error(`Không thấy vụ ${maVuAn} ở "Hồ sơ vụ án chuyển đến" của Tòa án cấp trên và sổ cái cũng chưa có vụ phúc thẩm`);
    }
    // Dùng nút "Tiếp nhận" trên chính dòng: nó gọi moTiepNhan([record]) nên không phụ thuộc trạng thái
    // tick của bảng, và chỉ được render khi hồ sơ còn CHO_TIEP_NHAN → vừa là chốt chống làm lại.
    // (Nút "Tiếp nhận (n)" trên thanh công cụ bấm xong không mở popup nếu bảng vừa render lại.)
    const nutTiepNhan = dong.getByRole('button', { name: /^(\S+ )?Tiếp nhận$/ }).first();
    if (!(await hienTrong(nutTiepNhan, 5_000))) {
      ghi('tiếp nhận phúc thẩm', `vụ ${maVuAn} đã tiếp nhận: ${(await dong.innerText()).replace(/\s+/g, ' ').trim()}`);
      ghiTrangThai({ xong: 'tiepNhanPhucTham' });
      await context.close();
      return;
    }
    await nutTiepNhan.click();

    // Popup trên STG chỉ có một ô bắt buộc "Người ký thông báo thụ lý" (đúng như StepData_HC.txt).
    // Màn này là SoTham/HanhChinhNew/HoSoChuyenDen (menu Hành chính › Quản lý sơ thẩm › Hồ sơ vụ án
    // chuyển đến), KHÔNG phải PhucTham/HanhChinhNew/HoSoChuyenDen — hai nơi có component TiepNhanModal
    // trùng tên nhưng khác trường nhập, dễ đọc lẫn khi tra nguồn.
    const pop = page.locator('.ant-modal:visible').filter({ hasText: /Tiếp nhận vụ án chuyển đến/ }).last();
    await expect(pop, 'Không mở được popup "Tiếp nhận vụ án chuyển đến"').toBeVisible({ timeout: 30_000 });
    await nghi(page, 1200, 2000);
    const oNguoiKy = pop.getByRole('combobox').first();
    await expect(oNguoiKy, 'Không thấy ô "Người ký thông báo thụ lý"').toBeVisible({ timeout: 30_000 });
    ghi('người ký thông báo thụ lý', await chonSelect(page, oNguoiKy, taiKhoan(VAI_PT).ten));
    await pop.getByRole('button', { name: /^(\S+ )?Tiếp nhận$/ }).last().click();
    // Không chờ toast: màn đóng popup rồi nạp lại bảng nên toast tắt trước khi đọc được. Kiểm chứng
    // bằng trạng thái thật: popup đóng và dòng không còn nút "Tiếp nhận" (hết CHO_TIEP_NHAN).
    await expect(pop, 'Popup tiếp nhận không đóng — xem thông báo lỗi trên màn').toBeHidden({ timeout: 90_000 });
    await choHetSpin(page);
    await nghi(page, 2000, 3000);
    // Sau khi nhận, màn mở hộp "Kết quả tiếp nhận (n vụ)" liệt kê vụ sơ thẩm → vụ phúc thẩm mới sinh.
    // Hộp này che cả trang nên phải đóng trước khi bấm gì khác; tranh thủ đọc luôn mã vụ phúc thẩm.
    let maPtTuHop = '';
    const hopKetQua = page.locator('.ant-modal:visible').filter({ hasText: /Kết quả tiếp nhận/ }).last();
    if (await hienTrong(hopKetQua, 10_000)) {
      const chu = (await hopKetQua.innerText().catch(() => '')).replace(/s+/g, ' ');
      maPtTuHop = (chu.match(/VAdd-d+/g) || []).filter(m => m !== maVuAn)[0] || '';
      if (maPtTuHop) ghi('tiếp nhận phúc thẩm', `hộp kết quả: ${maVuAn} → ${maPtTuHop}`);
      await hopKetQua.getByRole('button', { name: /^(S+ )?(Đóng|OK|Xác nhận)$/ }).last().click().catch(() => {});
      await expect(hopKetQua, 'Hộp "Kết quả tiếp nhận" không đóng').toBeHidden({ timeout: 30_000 });
      await choHetSpin(page);
      await nghi(page, 1200, 2000);
    }
    // KHÔNG đi lại menu để kiểm chứng: menu là chỗ hay treo nhất, mà lúc này dữ liệu đã ghi xong —
    // fail ở đây chỉ làm mất id vụ phúc thẩm vào sổ cái. Chuyển tab ngay trên màn đang mở.
    const tabDaNhan = page.getByRole('tab').filter({ hasText: /Đã tiếp nhận/ }).first();
    await expect(tabDaNhan, `Không thấy tab "Đã tiếp nhận"`).toBeVisible({ timeout: 30_000 });
    await tabDaNhan.click();
    await choHetSpin(page);
    await nghi(page, 2000, 3000);
    // Sang tab "Đã tiếp nhận", cột "Thông tin vụ án" đổi sang mã vụ PHÚC THẨM → khớp theo số bản án
    const dongSau = page
      .locator('.ant-table-row:visible')
      .filter({ hasText: soBanAnGoc || maVuAn })
      .first();
    await expect(
      dongSau,
      `Không thấy vụ ${maVuAn} (bản án ${soBanAnGoc}) ở tab "Đã tiếp nhận" sau khi bấm Tiếp nhận${await nguyenNhanLoi(page)}`,
    ).toBeVisible({ timeout: 60_000 });
    // "Xem chi tiết" của dòng đã tiếp nhận điều hướng tới /vu-an/hanh-chinh/phuc-tham/chi-tiet?id=
    // với id là VỤ PHÚC THẨM vừa sinh (HoSoChuyenDen#handleViewDetail dùng record.idVuAn) → lấy id ở đó
    await dongSau.getByRole('button', { name: /Xem chi tiết$/ }).first().click();
    await page.waitForURL(/hanh-chinh\/phuc-tham\/chi-tiet\?id=/, { timeout: 60_000 });
    const idVuAnPt = new URL(page.url()).searchParams.get('id') || '';
    expect(idVuAnPt, 'Không đọc được id vụ án phúc thẩm từ URL chi tiết').toBeTruthy();
    await choHetSpin(page);
    const maVuAnPt = ((await page.getByText(/VA\d\d-\d+/).first().innerText().catch(() => '')).match(/VA\d\d-\d+/) || [''])[0];
    ghi('tiếp nhận phúc thẩm', `đã tiếp nhận vụ ${maVuAn} → vụ phúc thẩm ${maVuAnPt || idVuAnPt}`);
    ghiTrangThai({ idVuAnPt, maVuAnPt: maVuAnPt || maPtTuHop, xong: 'tiepNhanPhucTham' });
    await context.close();
  });

  test('PT2 · Vụ phúc thẩm: tab Thụ lý → "Thụ lý" → Lưu', async ({ browser }, testInfo) => {
    test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
    const idVuAnPt = process.env.QLA_HC_ID_VU_AN_PT || trangThai().idVuAnPt || '';
    test.skip(!idVuAnPt, `Chưa có id vụ phúc thẩm cho vụ dòng ${VU.dong} — chạy PT1 trước`);
    test.skip(daXong('thuLyPhucTham'), 'Vụ phúc thẩm này đã thụ lý ở lần chạy trước');
    testInfo.setTimeout(10 * 60_000);
    const ghi = (type: string, description: string) => {
      testInfo.annotations.push({ type, description });
      console.log(`    · ${type}: ${description}`);
    };
    const { page, context } = await moTrangVaiCauHinh(browser, testInfo, VAI_PT);
    await page.goto(`vu-an/hanh-chinh/phuc-tham/chi-tiet?id=${idVuAnPt}&tab=thu-ly`);
    await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
    await choHetSpin(page);
    await nghi(page, 2000, 3000);

    // Đã thụ lý thì nút đổi nhãn thành "Sửa thụ lý" (thu-ly/index.tsx: daThuLy) → không làm lại
    const nutSua = page.getByRole('button', { name: /Sửa thụ lý$/ }).first();
    if (await hienTrong(nutSua, 5_000)) {
      ghi('thụ lý phúc thẩm', 'đã thụ lý từ lần chạy trước');
      ghiTrangThai({ xong: 'thuLyPhucTham' });
      await context.close();
      return;
    }
    const nutThuLy = page.getByRole('button', { name: /^(\S+ )?Thụ lý$/ }).first();
    await expect(nutThuLy, 'Không thấy nút "Thụ lý" ở khối "Thông tin thụ lý phúc thẩm"').toBeVisible({ timeout: 60_000 });
    await nutThuLy.click();

    const dr = page.locator('.ant-drawer-content:visible, .ant-modal:visible').last();
    await expect(dr, 'Không mở được form thụ lý phúc thẩm').toBeVisible({ timeout: 60_000 });
    await choHetSpin(page);
    await nghi(page, 2000, 3000);

    // Phần lớn ô được kế thừa từ vụ sơ thẩm; chỉ điền những ô bắt buộc còn trống
    const ngayThuLyPt = trangThai().ngayKhangCao || trangThai().ngayBanAn || ddmmyyyy(new Date());
    await dienNeuTrong(dr.locator('#ngayThuLy'), ngayThuLyPt, 'ngay');
    if (!(await dr.locator('#soThuLy').inputValue().catch(() => ''))) {
      await go(dr.locator('#soThuLy'), String(26000000 + VU.dong));
    }
    for (const [id, nhan] of [
      ['#truongHopThuLy', 'trường hợp thụ lý'],
      ['#nguyenDonDaiDien', 'người khởi kiện đại diện'],
      ['#biDonDaiDien', 'người bị kiện đại diện'],
    ] as const) {
      const o = dr.locator(id);
      if (!(await hienTrong(o, 3_000))) continue;
      if (await khungSelectCua(o).locator('.ant-select-selection-item').count()) continue;
      ghi(nhan, await chonTheoChiSo(page, o, 0));
    }

    await dr.getByRole('button', { name: /^(\S+ )?Lưu$/ }).last().click();
    await choHetSpin(page);
    await nghi(page, 2000, 3000);
    // Kiểm chứng bằng trạng thái thật: nút đổi thành "Sửa thụ lý"
    await expect(
      page.getByRole('button', { name: /Sửa thụ lý$/ }).first(),
      `Vụ phúc thẩm chưa chuyển sang trạng thái đã thụ lý${await nguyenNhanLoi(page, dr)}`,
    ).toBeVisible({ timeout: 90_000 });
    ghi('thụ lý phúc thẩm', `đã thụ lý ngày ${ngayThuLyPt}`);
    ghiTrangThai({ xong: 'thuLyPhucTham' });
    await context.close();
  });

  test('PT3 · Vụ phúc thẩm: phân công Thẩm phán chủ tọa → Lấy số → Ký logic', async ({ browser }, testInfo) => {
    test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
    const idVuAnPt = process.env.QLA_HC_ID_VU_AN_PT || trangThai().idVuAnPt || '';
    test.skip(!idVuAnPt, `Chưa có id vụ phúc thẩm cho vụ dòng ${VU.dong} — chạy PT1 trước`);
    test.skip(!daXong('thuLyPhucTham'), 'Vụ phúc thẩm chưa thụ lý → chưa phân công được');
    test.skip(daXong('phanCongPhucTham'), 'Vụ phúc thẩm này đã có quyết định phân công ở lần chạy trước');
    testInfo.setTimeout(10 * 60_000);
    const ghi = (type: string, description: string) => {
      testInfo.annotations.push({ type, description });
      console.log(`    · ${type}: ${description}`);
    };
    const { page, context } = await moTrangVaiCauHinh(browser, testInfo, VAI_PT);
    await page.goto(`vu-an/hanh-chinh/phuc-tham/chi-tiet?id=${idVuAnPt}&tab=phan-cong`);
    await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
    await choHetSpin(page);
    await nghi(page, 2000, 3000);

    // Giống S6: đã có quyết định thì không lập thêm (backend chặn hai chủ tọa); lập rồi mà chưa ký thì
    // mở lại bằng icon mắt để Lấy số → Ký logic.
    const nguoiKy = taiKhoan(VAI_PT).ten;
    const dongQuyetDinh = page.locator('.ant-table-row').filter({ hasText: /phân công thẩm phán/i }).first();
    if (await hienTrong(dongQuyetDinh, 5_000)) {
      const noiDung = (await dongQuyetDinh.innerText()).replace(/\s+/g, ' ').trim();
      if (!DA_KY.test(noiDung)) {
        ghi('kết quả', `quyết định phân công chưa ký — mở lại để ký: ${noiDung}`);
        await dongQuyetDinh.locator('button:has(.anticon-eye)').first().click();
        await choHetSpin(page);
        const bmCu = page.locator('.ant-drawer-content:visible, .ant-modal-content:visible').last();
        await expect(bmCu.getByRole('button', { name: /^Đóng$/ }).first(), 'Không mở lại được quyết định phân công').toBeVisible({
          timeout: 60_000,
        });
        await nghi(page, 1500, 2500);
        if (await hienTrong(bmCu.getByRole('button', { name: /Ký logic$/ }).first(), 5_000)) {
          await bamLaySoVaKyLogic(page, bmCu, ghi, 'quyết định phân công phúc thẩm');
        }
        await bmCu.getByRole('button', { name: /^Đóng$/ }).first().click().catch(() => {});
      } else {
        ghi('kết quả', `vụ đã có quyết định phân công: ${noiDung}`);
      }
      ghiTrangThai({ xong: 'phanCongPhucTham' });
      await context.close();
      return;
    }

    // Phúc thẩm đặt tên nút là "Thêm phân công" (NutBieuMau, menu 186HC/187HC), không phải "Phân công"
    // như sơ thẩm; nút bị khoá khi vụ chưa thụ lý → PT2 phải xong trước.
    const nutThemPhanCong = page.getByRole('button', { name: /^Thêm phân công$/ }).first();
    await expect(nutThemPhanCong, 'Nút "Thêm phân công" bị khoá — vụ phúc thẩm chưa thụ lý?').toBeEnabled({
      timeout: 60_000,
    });
    await nutThemPhanCong.click();
    await page.getByRole('menuitem', { name: /phân công thẩm phán giải quyết vụ án hành chính/i }).first().click();
    await choHetSpin(page);

    const bm = page.locator('.ant-drawer-content:visible, .ant-modal-content:visible').last();
    const oVaiTro = bm.locator('[id$="_noiDung_vaiTro"]').first();
    await expect(oVaiTro, 'Không mở được biểu mẫu phân công Thẩm phán giải quyết vụ án hành chính').toBeVisible({
      timeout: 60_000,
    });
    await nghi(page, 1500, 2500);

    const oNguoiKy = bm.locator('[id$="_noiDung_MA_NGUOI_KY"]').first();
    if ((await oNguoiKy.count()) && !(await khungSelectCua(oNguoiKy).locator('.ant-select-selection-item').count())) {
      await chonSelect(page, oNguoiKy, nguoiKy);
    }
    await chonSelect(page, oVaiTro, giaTri('vaiTroPhanCongVuAn'));
    await choHetSpin(page);
    ghi('người được phân công', await chonSelect(page, bm.locator('[id$="_noiDung_nguoiDuocPC"]').first(), nguoiKy));

    await bm.locator('button:has(.anticon-arrow-down)').first().click();
    await expect(bm.locator('.ant-table-row').first(), 'Không đưa được người được phân công vào bảng').toBeVisible({
      timeout: 30_000,
    });
    await nghi(page, 800, 1400);

    const nutLuu = bm.getByRole('button', { name: /^Lưu$/ }).first();
    if (await hienTrong(nutLuu, 5_000)) {
      await nutLuu.click();
      await toastDaHien(page, /thành công/i, 60_000, /thất bại|Vui lòng|Không thể|lỗi/i);
      await choHetSpin(page);
      await nghi(page, 1200, 2000);
    }
    await bamLaySoVaKyLogic(page, bm, ghi, 'quyết định phân công phúc thẩm');
    ghi('số quyết định', (await bm.locator('[id$="_so"]').first().inputValue().catch(() => '')) || '(không đọc được)');
    await bm.getByRole('button', { name: /^Đóng$/ }).first().click().catch(() => {});
    await choHetSpin(page);
    ghiTrangThai({ xong: 'phanCongPhucTham' });
    await context.close();
  });

  /**
   * StepData_HC.txt phần phúc thẩm Step 4 ghi "Quyết định đưa vụ án ra xét xử sơ thẩm" — là lỗi sao chép
   * từ phần sơ thẩm; ở phúc thẩm biểu mẫu đúng là 36-HC "Quyết định đưa vụ án ra xét xử phúc thẩm"
   * (DANH_SACH_BIEU_MAU_HC_PT_CBXX của tab Chuẩn bị xét xử phúc thẩm).
   */
  test('PT4 · Vụ phúc thẩm: Quyết định đưa vụ án ra xét xử phúc thẩm (36-HC) → lịch xét xử → Lấy số → Ký logic', async ({
    browser,
  }, testInfo) => {
    test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
    const idVuAnPt = process.env.QLA_HC_ID_VU_AN_PT || trangThai().idVuAnPt || '';
    test.skip(!idVuAnPt, `Chưa có id vụ phúc thẩm cho vụ dòng ${VU.dong} — chạy PT1 trước`);
    test.skip(!daXong('phanCongPhucTham'), 'Vụ phúc thẩm chưa có quyết định phân công → chạy PT3 trước');
    test.skip(daXong('kyQuyetDinhXetXuPhucTham'), 'Vụ phúc thẩm này đã ký 36-HC ở lần chạy trước');
    testInfo.setTimeout(12 * 60_000);
    const ghi = (type: string, description: string) => {
      testInfo.annotations.push({ type, description });
      console.log(`    · ${type}: ${description}`);
    };
    const { page, context } = await moTrangVaiCauHinh(browser, testInfo, VAI_PT);
    await page.goto(`vu-an/hanh-chinh/phuc-tham/chi-tiet?id=${idVuAnPt}&tab=chuan-bi-xet-xu`);
    await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
    await choHetSpin(page);
    await nghi(page, 2000, 3000);

    const ngayXetXuPt = trangThai().ngayKhangCao || trangThai().ngayBanAn || ddmmyyyy(new Date());
    const nguoiKy = taiKhoan(VAI_PT).ten;

    const dongQd = page.locator('.ant-table-row').filter({ hasText: /đưa vụ án ra xét xử/i }).first();
    let bm: import('@playwright/test').Locator;
    if (await hienTrong(dongQd, 5_000)) {
      const noiDungQd = (await dongQd.innerText()).replace(/\s+/g, ' ').trim();
      if (DA_KY.test(noiDungQd)) {
        ghi('36-HC', `đã ký từ trước — bỏ qua: ${noiDungQd}`);
        ghiTrangThai({ ngayXetXuPt, xong: 'kyQuyetDinhXetXuPhucTham' });
        await context.close();
        return;
      }
      ghi('36-HC', `mở lại quyết định đã lập: ${noiDungQd}`);
      await dongQd.locator('button:has(.anticon-eye)').first().click();
      await choHetSpin(page);
      bm = page.locator('.ant-drawer-content:visible').last();
      await expect(bm.getByRole('button', { name: /^Đóng$/ }).first(), 'Không mở lại được biểu mẫu 36-HC').toBeVisible({
        timeout: 60_000,
      });
    } else {
      // Tab Chuẩn bị xét xử của phúc thẩm KHÔNG có ô "Chọn loại biểu mẫu" như sơ thẩm: khối "Danh sách
      // văn bản chuẩn bị xét xử" chia hai nhóm Quyết định / Thông báo, mỗi nhóm một nút dropdown.
      // Neo bằng regex có mốc đầu/cuối: đầu khối gập cũng là <button> và tên của nó CHỨA cụm
      // "Thêm mới quyết định" ("plus-square Quyết định plus Thêm mới quyết định down 0") nên bấm
      // nhầm vào đó chỉ gập/mở khối chứ không bung dropdown.
      const nutThemQd = page.getByRole('button', { name: /^(plus )?Thêm mới quyết định( down)?$/ }).first();
      await expect(nutThemQd, 'Không thấy nút "Thêm mới quyết định" ở tab Chuẩn bị xét xử phúc thẩm').toBeVisible({
        timeout: 60_000,
      });
      await nutThemQd.click();
      await nghi(page, 800, 1400);
      const mucMenu = page.getByRole('menuitem', { name: /đưa vụ án ra xét xử phúc thẩm/i }).first();
      await expect(mucMenu, 'Không thấy mục "Quyết định đưa vụ án ra xét xử phúc thẩm (36-HC)" trong menu').toBeVisible({
        timeout: 30_000,
      });
      ghi('loại biểu mẫu', (await mucMenu.innerText()).replace(/\s+/g, ' ').trim());
      await mucMenu.click();
      await choHetSpin(page);
      bm = page.locator('.ant-drawer-content:visible').last();
      await expect(bm.getByRole('button', { name: /^Đóng$/ }).first(), 'Không mở được biểu mẫu 36-HC').toBeVisible({
        timeout: 60_000,
      });
    }
    await nghi(page, 2000, 3000);

    // Id các ô mang tiền tố theo mã biểu mẫu (bieuMau36HC_noiDung_…) → bắt theo hậu tố
    const oNguoiKy = bm.locator('[id$="_noiDung_MA_NGUOI_KY"]').first();
    if ((await oNguoiKy.count()) && !(await khungSelectCua(oNguoiKy).locator('.ant-select-selection-item').count())) {
      await chonSelect(page, oNguoiKy, nguoiKy);
    }
    const oNgayQd = bm.locator('[id$="_ngayQuyetDinh"]').first();
    if ((await oNgayQd.count()) && (await oNgayQd.isEditable().catch(() => false))) {
      await dienNeuTrong(oNgayQd, ngayXetXuPt, 'ngay');
    }

    // Lịch xét xử bắt buộc ≥ 1 dòng, giống 16-HC của sơ thẩm
    const bangLich = bm.locator('.ant-table').filter({ hasText: /NGÀY MỞ PHIÊN TÒA|Ngày mở phiên tòa/i }).first();
    const dongLich = bangLich.locator('.ant-table-row').filter({ hasText: /\d{2}\/\d{2}\/\d{4}/ });
    if (!(await hienTrong(dongLich.first(), 5_000))) {
      await bm.getByRole('button', { name: /Chọn lịch xét xử$/ }).first().click();
      await choHetSpin(page);
      await taoLichXetXu(page, ngayXetXuPt, ghi);
    }
    await expect(dongLich.first(), 'Chưa gắn được lịch xét xử vào quyết định 36-HC').toBeVisible({ timeout: 60_000 });
    ghi('lịch xét xử', (await dongLich.first().innerText()).replace(/\s+/g, ' ').trim());

    const nutLuu = bm.getByRole('button', { name: /^Lưu$/ }).first();
    if (await hienTrong(nutLuu, 5_000)) {
      await nutLuu.click();
      await toastDaHien(page, /thành công/i, 90_000, /thất bại|Vui lòng|Không thể|lỗi|không được để trống/i);
      await choHetSpin(page);
      await nghi(page, 1500, 2500);
    }
    await bamLaySoVaKyLogic(page, bm, ghi, '36-HC');
    await bm.getByRole('button', { name: /^Đóng$/ }).first().click().catch(() => {});
    ghiTrangThai({ ngayXetXuPt, xong: 'kyQuyetDinhXetXuPhucTham' });
    await context.close();
  });

  test('PT5 · Vụ phúc thẩm: Biên bản phiên tòa và Biên bản nghị án → Lưu → tải bản đã ký → Xác nhận đã ký', async ({
    browser,
  }, testInfo) => {
    test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
    const idVuAnPt = process.env.QLA_HC_ID_VU_AN_PT || trangThai().idVuAnPt || '';
    test.skip(!idVuAnPt, `Chưa có id vụ phúc thẩm cho vụ dòng ${VU.dong} — chạy PT1 trước`);
    test.skip(!daXong('kyQuyetDinhXetXuPhucTham'), 'Chưa ký 36-HC → chạy PT4 trước');
    test.skip(daXong('bienBanPhucTham'), 'Hai biên bản của vụ phúc thẩm đã hoàn thành ở lần chạy trước');
    testInfo.setTimeout(15 * 60_000);
    const ghi = (type: string, description: string) => {
      testInfo.annotations.push({ type, description });
      console.log(`    · ${type}: ${description}`);
    };
    const { page, context } = await moTrangVaiCauHinh(browser, testInfo, VAI_PT);
    await moTabXetXu(page, idVuAnPt, 'phuc-tham');
    // Không lấy ngày từ ô "Số thụ lý": tab Xét xử không có chuỗi đó nên treo 30s. Ngày bản án sơ thẩm
    // luôn có trong sổ cái (đối soát từ DB), cùng lắm thì lấy hôm nay.
    const ngayMoPhien =
      trangThai().ngayXetXuPt || trangThai().ngayKhangCao || trangThai().ngayBanAn || ddmmyyyy(new Date());
    ghi('ngày mở phiên tòa', ngayMoPhien);
    const toaPt = 'Tòa án nhân dân thành phố Hà Nội';

    // StepData_HC.txt phần phúc thẩm Step 5 yêu cầu hai biên bản, nhưng tab Xét xử phúc thẩm chỉ render
    // khối "Quyết định của Hội đồng xét xử" (nơi lập biên bản) KHI loại kết quả là "Quyết định"
    // (XetXuTab.tsx: loaiKetQua === BAN_AN ? banAnSection : quyetDinhSection). Vụ này đi hướng Bản án nên
    // màn không có ô "Loại biểu mẫu" → ghi nhận không áp dụng thay vì cố bấm rồi treo.
    if (!(await hienTrong(page.locator('.ant-select-selection-placeholder', { hasText: /^Loại biểu mẫu$/ }).first(), 8_000))) {
      ghi(
        'biên bản phúc thẩm',
        'không áp dụng: tab Xét xử phúc thẩm theo hướng "Bản án" không có khối lập biên bản (chỉ hướng "Quyết định" mới có)',
      );
      ghiTrangThai({ xong: 'bienBanPhucTham' });
      await context.close();
      return;
    }

    // Dùng id theo HẬU TỐ: mã biểu mẫu biên bản của phúc thẩm khác sơ thẩm (20/21-HC) nên không
    // đoán tiền tố bieuMau<mã>HC_noiDung_
    const bbPhienToa = await moBienBanXetXu(page, 'Biên bản phiên tòa', /Biên bản phiên tòa/i, ghi);
    if (bbPhienToa) {
      await dienNeuTrong(bbPhienToa.locator('[id$="_noiDung_NGAY_MO_PHIEN_TOA"]').first(), ngayMoPhien, 'ngay');
      await dienNeuTrong(bbPhienToa.locator('[id$="_noiDung_GIO_MO_PHIEN_TOA"]').first(), '07:00', 'gio');
      await dienNeuTrong(bbPhienToa.locator('[id$="_noiDung_DIA_DIEM_PHIEN_TOA"]').first(), `Trụ sở ${toaPt}`, 'chu');
      await hoanThanhBienBan(page, bbPhienToa, `Bien ban phien toa phuc tham - dong ${VU.dong}.pdf`, ghi);
    }

    await moTabXetXu(page, idVuAnPt, 'phuc-tham');
    const bbNghiAn = await moBienBanXetXu(page, 'Biên bản nghị án', /Biên bản nghị án/i, ghi);
    if (bbNghiAn) {
      await dienNeuTrong(bbNghiAn.locator('[id$="_noiDung_NGAY_BAT_DAU"]').first(), ngayMoPhien, 'ngay');
      await dienNeuTrong(bbNghiAn.locator('[id$="_noiDung_GIO_BAT_DAU"]').first(), '10:00', 'gio');
      await dienNeuTrong(bbNghiAn.locator('[id$="_noiDung_NGAY_KET_THUC"]').first(), ngayMoPhien, 'ngay');
      await dienNeuTrong(bbNghiAn.locator('[id$="_noiDung_GIO_KET_THUC"]').first(), '11:00', 'gio');
      await dienNeuTrong(bbNghiAn.locator('[id$="_noiDung_DIA_DIEM_NGHI_AN"]').first(), `Phòng nghị án - ${toaPt}`, 'chu');
      const oToa = bbNghiAn.locator('[id$="_noiDung_TOA_AN"]').first();
      if ((await oToa.count()) && (await oToa.isEditable().catch(() => false))) await dienNeuTrong(oToa, toaPt, 'chu');
      const oCap = bbNghiAn.locator('[id$="_noiDung_CAP_XET_XU"]').first();
      if ((await oCap.count()) && !(await khungSelectCua(oCap).locator('.ant-select-selection-item').count())) {
        await chonSelect(page, oCap, 'Phúc thẩm');
      }
      await dienNeuTrong(
        bbNghiAn.locator('[id$="_noiDung_CAN_CU_NGHI_AN"]').first(),
        `Căn cứ hồ sơ vụ án, nội dung kháng cáo và kết quả tranh tụng tại phiên tòa phúc thẩm về việc khiếu kiện của ${VU.nguoiKhoiKien.hoTen} đối với ${VU.nguoiBiKien}.`,
        'chu',
      );
      await dienNeuTrong(
        bbNghiAn.locator('[id$="_noiDung_Y_KIEN_THAO_LUAN"]').first(),
        'Hội đồng xét xử phúc thẩm thảo luận và thống nhất giữ nguyên bản án hành chính sơ thẩm.',
        'chu',
      );
      await hoanThanhBienBan(page, bbNghiAn, `Bien ban nghi an phuc tham - dong ${VU.dong}.pdf`, ghi);
    }
    ghiTrangThai({ xong: 'bienBanPhucTham' });
    await context.close();
  });

  test('PT6 · Vụ phúc thẩm: Bản án hành chính phúc thẩm → Lấy số → Ký logic', async ({ browser }, testInfo) => {
    test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
    const idVuAnPt = process.env.QLA_HC_ID_VU_AN_PT || trangThai().idVuAnPt || '';
    test.skip(!idVuAnPt, `Chưa có id vụ phúc thẩm cho vụ dòng ${VU.dong} — chạy PT1 trước`);
    test.skip(!daXong('bienBanPhucTham'), 'Chưa xong hai biên bản phúc thẩm → chạy PT5 trước');
    test.skip(daXong('banAnPhucTham'), 'Vụ phúc thẩm này đã có bản án ở lần chạy trước');
    testInfo.setTimeout(12 * 60_000);
    const ghi = (type: string, description: string) => {
      testInfo.annotations.push({ type, description });
      console.log(`    · ${type}: ${description}`);
    };
    const { page, context } = await moTrangVaiCauHinh(browser, testInfo, VAI_PT);
    await moTabXetXu(page, idVuAnPt, 'phuc-tham');
    const ngayBanAnPt =
      trangThai().ngayXetXuPt || trangThai().ngayKhangCao || trangThai().ngayBanAn || ddmmyyyy(new Date());

    const dongBanAn = page.locator('.ant-table-row').filter({ hasText: /\/HC-PT|Chưa được cấp số/ }).first();
    const coDong = await hienTrong(dongBanAn, 5_000);
    const nutSoan = dongBanAn.locator('button:has(.anticon-edit)').first();
    if (coDong && !(await hienTrong(nutSoan, 3_000))) {
      const noiDung = (await dongBanAn.innerText()).replace(/\s+/g, ' ').trim();
      ghi('bản án phúc thẩm', `đã có từ trước: ${noiDung}`);
      ghiTrangThai({
        soBanAnPt: (noiDung.match(/\d+\/\d{4}\/HC-PT/) || [''])[0],
        ngayBanAnPt: (noiDung.match(/\d{2}\/\d{2}\/\d{4}/) || [''])[0],
        xong: 'banAnPhucTham',
      });
      await context.close();
      return;
    }
    if (coDong) {
      ghi('bản án phúc thẩm', 'đã lưu từ lần trước (chưa ký) — mở lại');
      await nutSoan.click();
    } else {
      const nutTao = page.getByRole('button', { name: /Tạo bản án$/ }).first();
      await expect(nutTao, 'Không thấy nút "Tạo bản án" (cần 36-HC đã ký và hai biên bản đã xác nhận ký)').toBeEnabled({
        timeout: 60_000,
      });
      await nutTao.click();
    }
    await choHetSpin(page);
    const bm = page.locator('.ant-drawer-content:visible').last();
    await expect(bm.getByRole('button', { name: /^Đóng$/ }).first(), 'Không mở được màn soạn bản án phúc thẩm').toBeVisible({
      timeout: 60_000,
    });
    await nghi(page, 2000, 3000);

    const oNguoiKy = bm.locator('[id$="_noiDung_MA_NGUOI_KY"]').first();
    if ((await oNguoiKy.count()) && !(await khungSelectCua(oNguoiKy).locator('.ant-select-selection-item').count())) {
      await chonSelect(page, oNguoiKy, taiKhoan(VAI_PT).ten);
    }
    await dienNeuTrong(bm.locator('[id$="_noiDung_NGAY_BAN_AN"]').first(), ngayBanAnPt, 'ngay');
    const oVks = bm.locator('[id$="_noiDung_TEN_VIEN_KIEM_SAT_NHAN"]').first();
    if ((await oVks.count()) && !(await khungSelectCua(oVks).locator('.ant-select-selection-item').count())) {
      ghi('viện kiểm sát nhận', await chonTheoChiSo(page, oVks, VU.dong));
    }
    await chonHetSelectBatBuocConTrong(page, bm, ghi);
    await dienHetTextBatBuocConTrong(page, bm, `Vụ án hành chính phúc thẩm dòng ${VU.dong}`, ghi);

    const nutLuu = page.getByRole('button', { name: /(Thêm mới|Cập nhật) bản án$/ }).last();
    if (await hienTrong(nutLuu, 5_000)) {
      await nutLuu.click();
      await toastDaHien(page, /thành công/i, 90_000, /thất bại|Vui lòng|Không thể|lỗi|bỏ trống/i);
      await choHetSpin(page);
      await nghi(page, 1500, 2500);
    }
    await bamLaySoVaKyLogic(page, page.locator('body'), ghi, 'bản án phúc thẩm');
    const soBanAnPt = (await bm.locator('[id$="_noiDung_SO_QUYET_DINH"]').first().inputValue().catch(() => '')).trim();
    ghi('bản án phúc thẩm', `số ${soBanAnPt || '(không đọc được trên form)'} ngày ${ngayBanAnPt}`);
    await page.getByRole('button', { name: /^Đóng$/ }).last().click().catch(() => {});
    ghiTrangThai({ soBanAnPt, ngayBanAnPt, xong: 'banAnPhucTham' });
    await context.close();
  });
});

/** Gõ mã vụ án vào ô tìm nhanh của các màn hồ sơ chuyển đi/đến rồi chờ lưới nạp lại */
async function timTheoMaVuAn(page: import('@playwright/test').Page, maVuAn: string) {
  const o = page.getByPlaceholder(/Nhập mã vụ án, tên vụ án/i).first();
  if (!(await hienTrong(o, 8_000))) return;
  await go(o, maVuAn);
  await o.press('Enter');
  await choHetSpin(page);
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await nghi(page, 1500, 2500);
}

/**
 * Mở menu Hành chính › <nhánh cha> › <mục>.
 *
 * Hai nhánh "Quản lý sơ thẩm" và "Quản lý phúc thẩm" có mục TRÙNG TÊN (vd. "Hồ sơ vụ án chuyển đến"),
 * nên không để moMenu tự bấm mục lá: mục của nhánh đang đóng vẫn khớp locator rồi click treo 30s.
 * Mở nhánh cha trước, sau đó chỉ bấm mục lá ĐANG HIỆN (li.ant-menu-item, nhánh cha là submenu-title).
 * "Hồ sơ vụ án chuyển đến/đi" thực tế nằm dưới "Quản lý sơ thẩm" — đúng như StepData_HC.txt ghi.
 */
async function moMenuHanhChinh(page: import('@playwright/test').Page, muc: string) {
  const dsCha = ['Quản lý sơ thẩm', 'Quản lý phúc thẩm'];
  let loiCuoi: unknown;
  for (const cha of dsCha) {
    try {
      await moMenu(page, ['Hành chính', cha]);
      const mucCon = page
        .locator('.ant-layout-sider, aside')
        .first()
        .locator('li.ant-menu-item:visible')
        .filter({ hasText: muc })
        .first();
      if (!(await hienTrong(mucCon, 5_000))) continue;
      await mucCon.click();
      await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
      return;
    } catch (e) {
      loiCuoi = e;
    }
  }
  throw new Error(`Không mở được menu Hành chính › (${dsCha.join(' | ')}) › ${muc}: ${loiCuoi}`);
}

/**
 * Chọn "Loại người kháng cáo" sao cho "Tên người kháng cáo" có người chọn được.
 * Danh mục tư cách tố tụng liệt kê đủ loại, còn vụ án chỉ có người ở vài tư cách, nên chọn theo chỉ số
 * dễ trúng tư cách rỗng. Thử "Người khởi kiện" và "Người bị kiện" trước (án hành chính luôn có hai
 * đương sự này), sau đó mới quét lần lượt các mục còn lại trong danh mục.
 */
async function chonLoaiNguoiKhangCaoCoNguoi(
  page: import('@playwright/test').Page,
  dr: import('@playwright/test').Locator,
  ghi: (type: string, description: string) => void,
) {
  const oLoai = dr.locator('#loaiNguoiKhangCao');
  const oNguoi = dr.locator('#idNguoiKhangCao');

  const thuMotLoai = async (chon?: string | RegExp, chiSo?: number) => {
    const tenLoai = chon !== undefined ? await chonSelect(page, oLoai, chon) : await chonTheoChiSo(page, oLoai, chiSo!);
    await nghi(page, 1200, 2000);
    if (!(await oNguoi.isEnabled().catch(() => false))) return null;
    try {
      const tenNguoi = await chonTheoChiSo(page, oNguoi, 0);
      return { tenLoai, tenNguoi };
    } catch {
      ghi('loại người kháng cáo', `"${tenLoai}" không có người nào trong vụ — thử tư cách khác`);
      return null;
    }
  };

  for (const ten of ['Người khởi kiện', 'Người bị kiện']) {
    const kq = await thuMotLoai(ten).catch(() => null);
    if (kq) {
      ghi('loại người kháng cáo', kq.tenLoai);
      ghi('người kháng cáo', kq.tenNguoi);
      return;
    }
  }
  const soMuc = await soMucSelect(page, oLoai);
  for (let i = 0; i < soMuc; i++) {
    const kq = await thuMotLoai(undefined, i).catch(() => null);
    if (kq) {
      ghi('loại người kháng cáo', kq.tenLoai);
      ghi('người kháng cáo', kq.tenNguoi);
      return;
    }
  }
  throw new Error('Không có tư cách tham gia tố tụng nào của vụ có người để làm người kháng cáo');
}

/** Số mục chọn được của một ô Select (mở dropdown rồi đếm, đóng lại) */
async function soMucSelect(page: import('@playwright/test').Page, o: import('@playwright/test').Locator) {
  const khung = khungSelectCua(o);
  if ((await o.getAttribute('aria-expanded')) !== 'true') await khung.click();
  await nghi(page, 600, 1000);
  const idList = (await o.getAttribute('aria-controls')) || '';
  const so = await page.evaluate(id => {
    const list = id ? document.getElementById(id) : null;
    const hop = (list && list.closest('.ant-select-dropdown')) || document;
    return hop.querySelectorAll('.ant-select-item-option:not(.ant-select-item-option-disabled)').length;
  }, idList);
  await page.keyboard.press('Escape');
  await nghi(page, 300, 600);
  return so;
}

/** Trạng thái văn bản đã ký/ban hành xong (tag trên bảng danh sách quyết định) */
const DA_KY = /Đã có hiệu lực|Đã ban hành|Hoàn thành|Đã đóng dấu/i;

const daXong = (buoc: string) => !!trangThai().daXong?.includes(buoc);

/** Ngày trong ô "Số thụ lý" của chi tiết vụ án (vd. "65500266/2026/TLST-HC ngày 25/09/2026") */
async function docNgayThuLy(page: import('@playwright/test').Page): Promise<string> {
  const dong = await page.getByText(/TLST[^ ]* ngày \d{2}\/\d{2}\/\d{4}/).first().innerText();
  const ngay = (dong.match(/ngày (\d{2}\/\d{2}\/\d{4})/) || [])[1] || '';
  expect(ngay, 'Không đọc được ngày thụ lý từ ô "Số thụ lý"').toBeTruthy();
  return ngay;
}

/**
 * Trong popup "Chọn lịch xét xử cho vụ án" (react-big-calendar): về đúng tháng, bấm nền ô ngày → popup
 * "Thêm lịch xét xử" → tích "Cả ngày", chọn phòng xét xử → "Tạo mới". Lịch vừa tạo tự gắn vào 16-HC
 * và popup chọn lịch tự đóng. Cùng cách làm với 47-DS của luồng dân sự.
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

  // Vụ đã có lịch từ lần chạy dở trước (tạo xong nhưng chưa gắn vào 16-HC) → chọn lại, không tạo thêm
  if (await chonLichCuaVu(page, popupLich, ghi)) return;

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
      // Ngày đã có nhiều lịch thì nhãn lịch phủ kín nền ô → bấm số ngày (drill-down thành chọn ô)
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
  // Khác 47-DS: picker của 16-HC không bật tuChonLichVuaTao → lịch vừa tạo chỉ hiện trên lịch, phải bấm
  // "Chọn" trên đúng lịch của vụ (chọn nhầm lịch vụ khác thì hệ thống cảnh báo và giữ popup)
  if (!(await popupLich.waitFor({ state: 'hidden', timeout: 5_000 }).then(() => true, () => false))) {
    if (!(await chonLichCuaVu(page, popupLich, ghi))) throw new Error('Không chọn được lịch xét xử vừa tạo trong popup');
  }
  await expect(popupLich, 'Tạo lịch xong nhưng chưa gắn được lịch vào 16-HC').toBeHidden({ timeout: 60_000 });
  await choHetSpin(page);
  ghi('lịch xét xử', `đã tạo và gắn lịch ngày ${ngay}, cả ngày`);
}

/**
 * Popup "Chọn lịch xét xử cho vụ án" đang mở: thử lần lượt nút "Chọn" của các lịch hiển thị (mới nhất
 * trước) tới khi popup đóng. Lịch không thuộc vụ thì FE báo "Chỉ được chọn lịch thuộc vụ án đang xử lý"
 * và giữ popup (LichXetXuPickerModal.doSelect) nên thử tiếp lịch khác là an toàn.
 */
async function chonLichCuaVu(
  page: import('@playwright/test').Page,
  popupLich: import('@playwright/test').Locator,
  ghi: (type: string, description: string) => void,
): Promise<boolean> {
  // Nút "Chọn" nằm trong Tooltip của từng lịch (LichXetXuCalendar) → rê chuột lên lịch rồi bấm trong tooltip.
  // Bấm thẳng vào lịch là mở form sửa lịch (onEventClick), không phải chọn.
  const dsLich = popupLich.locator('.rbc-event');
  const soLich = await dsLich.count();
  for (let i = soLich - 1; i >= 0; i--) {
    const lich = dsLich.nth(i);
    if (!(await lich.isVisible().catch(() => false))) continue;
    await lich.hover();
    const nut = page.locator('.ant-tooltip:visible').getByRole('button', { name: /Chọn/ }).last();
    if (!(await hienTrong(nut, 5_000))) continue;
    await nut.click().catch(() => {});
    await nghi(page, 1200, 2000);
    if (await popupLich.waitFor({ state: 'hidden', timeout: 3_000 }).then(() => true, () => false)) {
      ghi('lịch xét xử', `đã chọn lịch của vụ (${i + 1}/${soLich}): ${(await lich.innerText().catch(() => '')).trim()}`);
      return true;
    }
  }
  return false;
}

/**
 * Mở tab "Xét xử" của vụ án hành chính và chốt loại kết quả = "Bản án".
 * Khác dân sự: khối "Quyết định của Hội đồng xét xử" (20/21-HC) chỉ hiện khi đã chọn loại kết quả, và
 * khi vụ đã có văn bản HĐXX mà chưa có bản án thì tab tự chọn "Quyết định" — lúc đó nút "Tạo bản án"
 * không hiện, phải "Đổi loại kết quả" → thẻ "Bản án" (XetXuTab.tsx của HanhChinhNew).
 */
/**
 * Mở tab Xét xử và chọn loại kết quả "Bản án". Tab Xét xử của phúc thẩm dùng lại đúng component của
 * sơ thẩm (XetXuTab phúc thẩm import từ #hanhchinh-new/.../xet-xu), chỉ khác đường dẫn giai đoạn.
 */
async function moTabXetXu(page: import('@playwright/test').Page, idVuAn: string, giaiDoan: 'so-tham' | 'phuc-tham' = 'so-tham') {
  await page.goto(`vu-an/hanh-chinh/${giaiDoan}/chi-tiet?id=${idVuAn}&tab=xet-xu`);
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
  await choHetSpin(page);
  await nghi(page, 2000, 3000);
  const dauKhoi = page.locator('.ant-collapse-header').filter({ hasText: /Kết quả xét xử/ }).first();
  if ((await dauKhoi.count()) && (await dauKhoi.getAttribute('aria-expanded')) === 'false') {
    await dauKhoi.click();
    await choHetSpin(page);
    await nghi(page, 800, 1400);
  }
  // Sơ thẩm vẽ thẻ chọn bằng .kqxx-pick-card; phúc thẩm (ChonLoaiKetQua riêng) vẽ bằng <button>
  // tên "file Bản án Tòa xét xử xong nội dung vụ án và ban hành một bản án phúc thẩm." → nhận cả hai.
  const khoiKetQua = page.locator('.ant-collapse-item').filter({ hasText: /Kết quả xét xử/ }).last();
  const theBanAn = page
    .locator('.kqxx-pick-card')
    .filter({ hasText: /^\s*Bản án/ })
    .first()
    .or(khoiKetQua.getByRole('button', { name: /^(\S+ )?Bản án\b/ }).first());
  const thanhDaChon = page.getByText(/Loại kết quả:/).first();
  if (await hienTrong(thanhDaChon, 5_000)) {
    if (/Loại kết quả:\s*Bản án/.test((await thanhDaChon.innerText()).replace(/\s+/g, ' '))) return;
    const nutDoi = page.getByRole('button', { name: /Đổi loại kết quả/ }).first();
    if (!(await nutDoi.isEnabled())) return; // bản án đã ký → khoá đổi loại, giữ nguyên
    await nutDoi.click();
    await nghi(page, 800, 1400);
  }
  await expect(theBanAn, 'Không thấy thẻ loại kết quả "Bản án" ở tab Xét xử').toBeVisible({ timeout: 30_000 });
  await theBanAn.click();
  await choHetSpin(page);
  await nghi(page, 1200, 2000);
}

/**
 * Tab Xét xử › "Quyết định của Hội đồng xét xử": mở biên bản đã có (icon mắt) hoặc lập mới qua ô
 * "Loại biểu mẫu" → "Thêm mới quyết định". Biên bản đã "Hoàn thành" thì trả về null (không làm lại).
 */
async function moBienBanXetXu(
  page: import('@playwright/test').Page,
  tenLoai: string,
  ten: RegExp,
  ghi: (type: string, description: string) => void,
) {
  const dong = page.locator('.ant-table-row').filter({ hasText: ten }).first();
  if (await hienTrong(dong, 5_000)) {
    const noiDung = (await dong.innerText()).replace(/\s+/g, ' ').trim();
    if (DA_KY.test(noiDung)) {
      ghi(tenLoai, `đã hoàn thành từ trước — bỏ qua: ${noiDung}`);
      return null;
    }
    ghi(tenLoai, `mở lại: ${noiDung}`);
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
    ghi('loại biểu mẫu', await chonSelect(page, o, tenLoai));
    await page.getByRole('button', { name: /Thêm mới quyết định$/ }).first().click();
  }
  await choHetSpin(page);
  const bm = page.locator('.ant-drawer-content:visible').last();
  await expect(bm.getByRole('button', { name: /^Đóng$/ }).first(), `Không mở được biểu mẫu ${tenLoai}`).toBeVisible({
    timeout: 60_000,
  });
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
 * Biên bản (20/21-HC) không ký trên hệ thống: Lưu → tải bản đã ký (pdf) → "Xác nhận đã ký".
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
  await bm.getByRole('button', { name: /^Lưu$/ }).first().click();
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

/** Khung .ant-select bao ngoài một ô input (để biết ô đã có giá trị chưa) */
function khungSelectCua(o: import('@playwright/test').Locator) {
  return o.locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]');
}

/**
 * Chọn một mục bất kỳ (mục đầu tiên) của ô "Quan hệ pháp luật (Thống kê)".
 * Ô này nạp danh mục sau khi gõ từ khoá; các mục nằm trong portal và bị coi là ẩn nên chỉ chọn
 * được bằng bàn phím: gõ từ khoá → Enter. Đếm mục theo dropdown gắn với chính ô (aria-controls).
 */
async function chonDanhMucThongKe(
  page: import('@playwright/test').Page,
  o: import('@playwright/test').Locator,
  tuKhoa: string,
  chiSo = 0,
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
    // Nhấn xuống theo vị trí để mỗi vụ lấy một mục khác nhau trong cùng danh mục đã lọc
    for (let k = 0; k < chiSo % soMuc; k++) await o.press('ArrowDown');
    await o.press('Enter');
    await nghi(page, 800, 1200);
    const ten = await daChon();
    if (ten) return { qhplDaChon: ten, soMuc };
  }
  throw new Error(`Không chọn được "Quan hệ pháp luật (Thống kê)" với từ khoá "${tuKhoa}"`);
}

/**
 * b6.1–6.5 · Thêm "Người khởi kiện" là cá nhân rồi bấm "Lưu & Thêm mới" (form giữ nguyên để nhập
 * tiếp người bị kiện). Cấu trúc form theo qla-webapp/src/components/FormDuongSu:
 *  - "Tư cách tham gia tố tụng" là GroupedCheckboxDropdown (div[role=combobox] + div[role=listbox] inline)
 *  - Panel "Thông tin chung" / "Thông tin địa chỉ" mở sẵn, không bấm tiêu đề panel
 *  - Số định danh cá nhân: tick ô trong addonBefore (.cccd-addon-checkbox)
 */
async function themNguoiKhoiKien(
  page: import('@playwright/test').Page,
  nguoi: import('../common/du-lieu-hanh-chinh').NguoiHanhChinh,
) {
  await page.getByRole('button', { name: /Thêm người tham gia/ }).first().click();
  const form = page.locator('.ant-drawer-content').filter({ hasText: 'Thêm mới thành phần tham gia tố tụng' }).last();
  await expect(form, 'Không mở được form Thêm mới thành phần tham gia tố tụng').toBeVisible({ timeout: 30_000 });
  await expect(form.locator('#conNguoi_hoTen'), 'Form đương sự chưa render xong').toBeVisible({ timeout: 30_000 });
  await nghi(page, 1200, 2000);

  // Người khởi kiện là doanh nghiệp/tổ chức: đổi "Phân loại người tham gia tố tụng" sang
  // "Doanh nghiệp / Tổ chức", chỉ cần tên pháp nhân (theo cột Excel) và địa chỉ trụ sở chính.
  if (nguoi.laToChuc) {
    await form.getByRole('radio', { name: /Doanh nghiệp \/ Tổ chức/i }).first().check();
    await choHetSpin(page);
    await nghi(page, 1500, 2500);
    await chonTuCachThamGia(page, form, 'Người khởi kiện');
    const oTenPN = form.locator('#phapNhan_tenPhapNhan');
    await oTenPN.fill(nguoi.hoTen);
    await oTenPN.blur();
    await expect(oTenPN, 'Không nhập được tên pháp nhân').not.toHaveValue('', { timeout: 10_000 });
    await go(form.locator('#phapNhan_diaChiTSChinh_soNha'), 'HN');
    await nghi(page, 600, 1000);
    await form.getByRole('button', { name: /^Lưu & Thêm mới$/ }).last().click();
    await toastDaHien(page, /Đã lưu đương sự|thành công/i, 60_000, /Không thể lưu|Vui lòng|thất bại/i);
    await nghi(page, 1200, 2000);
    return;
  }

  await chonTuCachThamGia(page, form, 'Người khởi kiện');

  // Tên có ký tự đặc biệt (vd "Y H'Bích") bị FE chuẩn hoá lại → nhập bằng fill, chỉ kiểm tra khác rỗng
  const oHoTen = form.locator('#conNguoi_hoTen');
  await oHoTen.fill(nguoi.hoTen);
  await oHoTen.blur();
  await expect(oHoTen, 'Không nhập được họ tên người khởi kiện').not.toHaveValue('', { timeout: 10_000 });
  await chonSelect(page, form.locator('#conNguoi_maGioiTinh'), undefined, { goDeLoc: false });
  // Excel hành chính không ghi tuổi ở hầu hết dòng, trong khi ô Ngày sinh bắt buộc → dùng tuổi mặc định
  const namSinh = nguoi.namSinh ?? new Date().getFullYear() - Number(giaTri('tuoiMacDinhDuongSu'));
  await go(form.locator('#conNguoi_ngaySinh'), String(namSinh));
  await form.locator('#conNguoi_ngaySinh').blur();

  // "Số định danh cá nhân": tick "Chưa xác định" (ô nằm trong addonBefore, input thật bị che)
  const khungChuaXacDinh = form.locator('.cccd-addon-checkbox').first();
  const oChuaXacDinh = khungChuaXacDinh.locator('input[type="checkbox"]').first();
  if (!(await oChuaXacDinh.isChecked())) await khungChuaXacDinh.click();
  await expect(oChuaXacDinh, 'Không tick được "Chưa xác định" của Số định danh cá nhân').toBeChecked({ timeout: 10_000 });

  // Thông tin địa chỉ: tick "Không có thông tin" cho mọi dòng địa chỉ
  const oKhongCo = form.locator('input[type="checkbox"][id^="khongCoDiaChiTheoLoai"]');
  await expect(oKhongCo.first(), 'Không thấy ô "Không có thông tin" của địa chỉ').toBeVisible({ timeout: 30_000 });
  const soO = await oKhongCo.count();
  for (let i = 0; i < soO; i++) await oKhongCo.nth(i).check({ force: true });
  await nghi(page, 600, 1000);

  await form.getByRole('button', { name: /^Lưu & Thêm mới$/ }).last().click();
  await toastDaHien(page, /Đã lưu đương sự|thành công/i, 60_000, /Không thể lưu|Vui lòng|thất bại/i);
  await nghi(page, 1200, 2000);
}

/**
 * Chọn "Tư cách tham gia tố tụng" trên GroupedCheckboxDropdown: bấm trigger để mở danh sách rồi bấm
 * đúng nhãn. Chọn xong ô hiện một thẻ mang chính nhãn đó.
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

/**
 * Chọn hết các ô select BẮT BUỘC còn trống trong form (mục đầu tiên của danh mục).
 * Form "Cơ quan nhà nước" hiện thêm ô theo lựa chọn trước đó (chọn "Cấp cơ quan" mới hiện "Loại cơ
 * quan"…), nên quét nhiều vòng cho tới khi không còn ô bắt buộc nào trống.
 */
async function chonHetSelectBatBuocConTrong(
  page: import('@playwright/test').Page,
  form: import('@playwright/test').Locator,
  ghi: (type: string, description: string) => void,
  chiSoMuc: number,
) {
  for (let vong = 0; vong < 6; vong++) {
    const canChon = await form.evaluate(el => {
      const out: { id: string; nhan: string }[] = [];
      el.querySelectorAll('.ant-form-item').forEach(fi => {
        const nhan = fi.querySelector('label.ant-form-item-required');
        if (!nhan) return;
        const sel = fi.querySelector('.ant-select:not(.ant-select-disabled)');
        if (!sel || !sel.querySelector('.ant-select-selection-placeholder')) return;
        const input = sel.querySelector('input[id]') as HTMLInputElement | null;
        if (input?.id) out.push({ id: input.id, nhan: (nhan.textContent || '').replace(/\s+/g, ' ').trim() });
      });
      return out;
    });
    if (!canChon.length) return;
    for (const { id, nhan } of canChon) {
      const daChon = await chonTheoChiSo(page, form.locator(`#${id}`), chiSoMuc).catch(() => '');
      if (daChon) ghi(`chọn "${nhan}"`, daChon);
      await choHetSpin(page);
      await nghi(page, 600, 1000);
    }
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
    // Toast lỗi của cấp số không theo mẫu nào cố định (vd. "Cấu hình cấp số không tồn tại") nên khi
    // chờ hết giờ phải đọc lại mọi thông báo trên màn, không để lỗi trơ ra là "waitForFunction timeout"
    try {
      await toastDaHien(page, /Đã cấp số thành công|thành công/i, 60_000, /Không thể cấp số|thất bại/i);
    } catch {
      throw new Error(`Lấy số ${ten} không thành công${await nguyenNhanLoi(page, bm)}`);
    }
    await choHetSpin(page);
    await nghi(page, 1200, 2000);
    ghi(`lấy số ${ten}`, 'đã cấp số');
  } else {
    ghi(`lấy số ${ten}`, 'không thấy nút "Lấy số"');
  }
  await bm.getByRole('button', { name: /Ký logic$/ }).first().click();
  await xacNhanHopThoai(page);
  try {
    await toastDaHien(page, /Ký logic thành công|thành công/i, 120_000, /thất bại|Không thể|lỗi/i);
  } catch {
    throw new Error(`Ký logic ${ten} không thành công${await nguyenNhanLoi(page, bm)}`);
  }
  await choHetSpin(page);
  await nghi(page, 1500, 2500);
  ghi(`ký ${ten}`, 'đã ký logic');
}

/** Bấm nút đồng ý của hộp xác nhận đang mở (nếu có) */
async function xacNhanHopThoai(page: import('@playwright/test').Page) {
  const hop = page
    .locator('.ant-modal-confirm, .ant-modal')
    .filter({ has: page.getByRole('button', { name: /^(Đồng ý|Xác nhận|Xóa|OK)$/ }) })
    .last();
  if (await hienTrong(hop, 5_000)) {
    await hop.getByRole('button', { name: /^(Đồng ý|Xác nhận|Xóa|OK)$/ }).last().click();
  }
}

/** Trạng thái từng bước của vụ hành chính, để chạy lại không tạo trùng */
interface TrangThaiHC {
  idDon?: string;
  soTiepNhan?: string;
  idVuAn?: string;
  maVuAn?: string;
  /** Ngày thụ lý đã dùng khi lập quyết định thụ lý (DD/MM/YYYY) */
  ngayThuLy?: string;
  /** Ngày mở phiên tòa gắn với 16-HC (DD/MM/YYYY) — cũng là ngày biên bản, ngày bản án */
  ngayXetXu?: string;
  soBanAn?: string;
  ngayBanAn?: string;
  /** Kháng cáo (S11) — điều kiện để vụ chuyển lên phúc thẩm */
  soTiepNhanKhangCao?: string;
  /** Vụ án phúc thẩm sinh ra khi Tòa cấp trên tiếp nhận hồ sơ (PT1) */
  idVuAnPt?: string;
  maVuAnPt?: string;
  /** Ngày mở phiên tòa gắn với 36-HC của vụ phúc thẩm */
  ngayXetXuPt?: string;
  soBanAnPt?: string;
  ngayBanAnPt?: string;
  ngayKhangCao?: string;
  daXong?: string[];
}
/**
 * Khoá nhận dạng vụ trong sổ cái: các vụ chưa nhập đều ghi "Nhập mã ST" ở cột Mã vụ án nên KHÔNG
 * dùng mã làm khoá (sẽ trùng nhau) — dùng số thứ tự dòng trong sheet.
 */
const KHOA_VU = `dong-${VU.dong}`;
const FILE_TT_HC = path.resolve(__dirname, `../seed-output/hanh-chinh-so-tham.${MOI_TRUONG}.json`);
const docTatCaHC = (): Record<string, TrangThaiHC> => (fs.existsSync(FILE_TT_HC) ? JSON.parse(fs.readFileSync(FILE_TT_HC, 'utf8')) : {});
function trangThai(): TrangThaiHC {
  return docTatCaHC()[KHOA_VU] || {};
}
function ghiTrangThai(them: TrangThaiHC & { xong?: string }) {
  const tatCa = docTatCaHC();
  const cu = tatCa[KHOA_VU] || {};
  const { xong, ...duLieu } = them;
  tatCa[KHOA_VU] = { ...cu, ...duLieu, daXong: [...new Set([...(cu.daXong || []), ...(xong ? [xong] : [])])] };
  fs.mkdirSync(path.dirname(FILE_TT_HC), { recursive: true });
  fs.writeFileSync(FILE_TT_HC, JSON.stringify(tatCa, null, 2));
}

/**
 * Chọn mục thứ (chiSo % số mục) của một ô select — mỗi vụ một mục khác nhau nên dữ liệu giữa các vụ
 * không trùng, mà chạy lại cùng vụ vẫn ra đúng mục cũ. Chọn bằng bàn phím vì mục trong dropdown của
 * antd nằm ở portal và hay bị coi là ẩn.
 */
async function chonTheoChiSo(
  page: import('@playwright/test').Page,
  o: import('@playwright/test').Locator,
  chiSo: number,
): Promise<string> {
  const khung = khungSelectCua(o);
  const daChon = async () => (await khung.locator('.ant-select-selection-item').first().innerText().catch(() => '')).trim();

  for (let lan = 0; lan < 3; lan++) {
    await khung.scrollIntoViewIfNeeded();
    if ((await o.getAttribute('aria-expanded')) !== 'true') await khung.click();
    await nghi(page, 800, 1400);

    const idList = (await o.getAttribute('aria-controls')) || '';
    const soMuc = await page.evaluate(id => {
      const list = id ? document.getElementById(id) : null;
      const hop = (list && list.closest('.ant-select-dropdown')) || document;
      return hop.querySelectorAll('.ant-select-item-option:not(.ant-select-item-option-disabled)').length;
    }, idList);
    if (!soMuc) {
      await page.keyboard.press('Escape');
      await nghi(page, 500, 800);
      continue;
    }
    for (let k = 0; k < chiSo % soMuc; k++) await o.press('ArrowDown');
    await o.press('Enter');
    await nghi(page, 600, 1000);
    const ten = await daChon();
    if (ten) return ten;
  }
  throw new Error('Không chọn được mục nào trong danh mục');
}

/**
 * Điền các ô CHỮ bắt buộc còn trống trong form (bỏ qua ô ngày và ô chọn).
 * Khối "Cơ quan nhà nước" hiện thêm ô text tuỳ loại cơ quan — ví dụ chọn "Cơ quan thuộc/dưới bộ"
 * thì bắt buộc nhập "Tên cơ quan thuộc/dưới Bộ" — nên quét để không bỏ sót.
 */
async function dienHetTextBatBuocConTrong(
  page: import('@playwright/test').Page,
  form: import('@playwright/test').Locator,
  giaTri: string,
  ghi: (type: string, description: string) => void,
) {
  for (let vong = 0; vong < 4; vong++) {
    const canDien = await form.evaluate(el => {
      const out: { id: string; nhan: string }[] = [];
      el.querySelectorAll('.ant-form-item').forEach(fi => {
        const nhan = fi.querySelector('label.ant-form-item-required');
        if (!nhan) return;
        if (fi.querySelector('.ant-select, .ant-picker, .ant-checkbox, .ant-radio')) return;
        const input = fi.querySelector('input[id]:not([type="checkbox"]):not([type="radio"])') as HTMLInputElement | null;
        if (input?.id && !input.value && !input.disabled && !input.readOnly) {
          out.push({ id: input.id, nhan: (nhan.textContent || '').replace(/\s+/g, ' ').trim() });
        }
      });
      return out;
    });
    if (!canDien.length) return;
    for (const { id, nhan } of canDien) {
      const o = form.locator(`#${id}`);
      await o.fill(giaTri).catch(() => {});
      await o.blur().catch(() => {});
      ghi(`nhập "${nhan}"`, giaTri);
      await nghi(page, 500, 900);
    }
  }
}
