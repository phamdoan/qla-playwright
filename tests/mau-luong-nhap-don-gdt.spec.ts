/**
 * ███ TEST MẪU (template) — luồng GĐT/TT: nhập đơn theo bản án sơ thẩm → phân công thẩm phán
 * → Tờ trình phân công → ký/duyệt → Thông báo phân công → ký logic.
 *
 * Dựng lại từ đợt chạy thành công ngày 24-09-2026 trên STG (6/6 bản án, 46 test pass):
 * bản án 515/25/26/27/28/29 của "Tòa án nhân dân khu vực 9 - Hà Nội" → đơn 8721, 8722, 8725,
 * 8726, 8728, 8730. Dùng file này làm mẫu cho các luồng tương tự.
 *
 * ── PRE-CONDITION ────────────────────────────────────────────────────────────────────────────
 *  1. Môi trường cho phép ghi dữ liệu: QLA_TKM_CHO_PHEP_GHI=1 (đặt trong .env.staging / .env.dev).
 *  2. Có tài khoản 3 vai trong file env: QLA_TKM_USER (cán bộ), QLA_TKM_CVP_USER (Chánh văn phòng),
 *     QLA_TKM_PCA_USER (Phó Chánh án). Phiên đăng nhập do project `setup-tai-khoan-moi` tạo.
 *  3. Bản án dùng làm dữ liệu test PHẢI có trong hệ thống của môi trường đang chạy — test tự kiểm
 *     bằng API `don/tra-cuu-ban-an-cu` ở bước Arrange và dừng sớm nếu không có (tránh chạy 8 phút
 *     rồi mới hỏng).
 *
 * ── TEST DATA ────────────────────────────────────────────────────────────────────────────────
 *  Baseline lấy từ data/ban-an-24-09-2026.ts (dữ liệu đã chạy thành công). Chọn bản án khác bằng
 *  QLA_MAU_DONG=2..6. Phần dữ liệu người/ngày tháng do common/du-lieu.ts sinh ngẫu nhiên mỗi lần
 *  chạy nên đơn tạo ra là duy nhất; mã đơn và số thụ lý do hệ thống cấp.
 *
 * ── STEPS ────────────────────────────────────────────────────────────────────────────────────
 *  B1–B2 Cán bộ: Danh sách đơn → Thêm mới → tải tài liệu → "Quay lại" (không OCR) → nhập Số/Ngày/
 *        Tòa + Cấp xét xử → tra cứu → chọn người từ bản án cũ → [Gợi ý] nội dung → Đơn vị chuyển
 *        đến + Thụ lý mới → Thông tin khiếu nại → Lưu thông tin
 *  B3    Cán bộ: Phân công thẩm phán › tab "DS chưa phân công ngẫu nhiên" → Phân công ngẫu nhiên
 *  B4    Cán bộ: Danh sách đơn → Loại văn bản "Tờ trình phân công thẩm phán" → Lưu văn bản → Trình ký
 *  B6–B7a Chánh văn phòng: Công tác lãnh đạo → ý kiến → Cấp trình tiếp "Phó chánh án" → Ký logic
 *  B8–B9 Phó Chánh án: Phê duyệt đề xuất → Phê duyệt tờ trình
 *  B5    Cán bộ: Loại văn bản "Thông báo phân công TP" → Lưu văn bản → Trình ký
 *        (chỉ lập được SAU KHI tờ trình đã duyệt — backend existsToTrinhPhanCongDaButPhe)
 *  B7b   Chánh văn phòng: Ký logic Thông báo
 *
 * ── EXPECTED RESULT ──────────────────────────────────────────────────────────────────────────
 *  1. Đơn được tạo, có mã đơn và SỐ THỤ LÝ (thiếu số thụ lý thì các bước sau không thấy đơn).
 *  2. Mở lại đơn: Số bản án / Ngày bản án / Tòa án ra bản án đúng dữ liệu test; Loại án do hệ thống
 *     tự điền sau tra cứu; người đứng đơn lấy từ bản án cũ.
 *  3. Sau B3: đơn có Thẩm phán được phân công (đọc ở Danh sách đơn).
 *  4. Sau toàn luồng, kiểm tra QUA API: đơn có Tờ trình phân công ở trạng thái đã ban hành và
 *     Thông báo phân công TP ở trạng thái đã ký số.
 *
 * ── CHẠY ─────────────────────────────────────────────────────────────────────────────────────
 *   npm run staging -- --project=tai-khoan-moi mau-luong-nhap-don-gdt --reporter=list
 *   npm run ui:stg:ghi -- --file=mau-luong-nhap-don-gdt        (mở Playwright UI)
 *   QLA_MAU_DONG=3 npm run staging -- --project=tai-khoan-moi mau-luong-nhap-don-gdt
 *
 * ⚠ Test TẠO DỮ LIỆU THẬT (một đơn + hai văn bản) trên môi trường đang chọn, mỗi lần chạy một đơn mới.
 */
import { expect, test } from '@playwright/test';
import { choPhepGhiTKM } from '../account';
import { giaiDoanTheoCap, layToken, maToaTheoTen, traCuuBanAnCu, vanBanCuaDon } from '../common/api-don';
import { nhapDonTuBanAn } from '../common/buoc-nhap-don';
import { moTrangVaiTKM } from '../common/luong-tkm';
import { DS_BAN_AN_24_09_2026 } from '../data/ban-an-24-09-2026';
import { HctpPage } from '../pages/hctp.page';
import { PheDuyetPage } from '../pages/phe-duyet.page';

/** Người duyệt / người ký theo "Luồng nhập data.txt" */
const NGUOI_DUYET = 'Nguyễn Thị Thu Hường';
const NGUOI_KY = 'Nguyễn Tường Linh';
const CAP_TRINH_TIEP = 'Phó chánh án';
const NGUOI_TRINH_TIEP = 'Nguyễn Hải Trâm';

const MOI_TRUONG = process.env.QLA_ENV || 'stg';
/** Bản án dùng làm dữ liệu test (baseline từ đợt đã chạy thành công) */
const BAN_AN = DS_BAN_AN_24_09_2026[Math.max(1, Number(process.env.QLA_MAU_DONG || 1)) - 1] ?? DS_BAN_AN_24_09_2026[0];

test.describe('Luồng GĐT/TT: nhập đơn theo bản án sơ thẩm → phân công → tờ trình → thông báo', () => {
  test.beforeEach(() => {
    // PRE-CONDITION 1: môi trường cho phép ghi dữ liệu
    test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
  });

  test(`Đơn theo bản án ${BAN_AN.soBanAn} ngày ${BAN_AN.ngayBanAn} đi trọn luồng đến Thông báo đã ký`, async ({ browser, request }, testInfo) => {
    testInfo.setTimeout(20 * 60_000); // trọn luồng ~8–10 phút, để dư cho môi trường chậm
    const ghi = (type: string, description: string) => testInfo.annotations.push({ type, description });
    ghi('dữ liệu test', `bản án ${BAN_AN.soBanAn} – ${BAN_AN.ngayBanAn} – ${BAN_AN.toaAn} (${BAN_AN.capXetXu})`);

    // ───────── 1. ARRANGE ─────────
    const { page: trangCanBo, context: ctxCanBo } = await moTrangVaiTKM(browser, testInfo, 'CANBO');
    const token = await layToken(trangCanBo);

    // PRE-CONDITION 3: bản án phải có sẵn trong hệ thống, nếu không thì dừng ngay
    const maToa = await maToaTheoTen(request, token, BAN_AN.toaAn);
    expect(maToa, `Danh mục đơn vị không có tòa "${BAN_AN.toaAn}"`).toBeTruthy();
    const banAnHeThong = await traCuuBanAnCu(request, token, {
      soBanAn: BAN_AN.soBanAn,
      ngayBanAn: BAN_AN.ngayBanAn,
      maDonVi: maToa!,
      giaiDoan: giaiDoanTheoCap(BAN_AN.capXetXu),
    });
    expect(
      banAnHeThong,
      `Môi trường ${MOI_TRUONG} chưa có bản án ${BAN_AN.soBanAn} ngày ${BAN_AN.ngayBanAn} → không chạy được luồng này`,
    ).toBeTruthy();
    ghi('bản án trong hệ thống', `${banAnHeThong!.maVuAn} | ${banAnHeThong!.tenVuAn}`);

    // ───────── 2. ACT ─────────
    // B1–B2: nhập đơn (đã gồm kiểm tra từng trường sau khi lưu)
    const donMoi = await test.step('B1–B2 · Cán bộ nhập đơn theo bản án', () => nhapDonTuBanAn(trangCanBo, BAN_AN, testInfo));

    // B3: phân công thẩm phán (hàm tự chặn nếu bộ lọc còn đơn khác — nút này phân công mọi đơn trên màn)
    await test.step('B3 · Phân công thẩm phán (ngẫu nhiên)', () =>
      new HctpPage(trangCanBo).phanCongThamPhanNgauNhien(donMoi.soThuLy));

    // B4: tờ trình phân công → trình ký
    const khoaToTrinh = await test.step('B4 · Lập Tờ trình phân công và trình ký', () =>
      new HctpPage(trangCanBo).lapTamTrinhPhanCong(donMoi.maDon, NGUOI_DUYET, NGUOI_KY));
    expect(khoaToTrinh, 'Không lấy được id yêu cầu phê duyệt của Tờ trình').toBeTruthy();
    await ctxCanBo.close();

    // B6–B7a: Chánh văn phòng cho ý kiến, trình Phó Chánh án, ký logic
    await test.step('B6–B7a · Chánh văn phòng ký logic Tờ trình', async () => {
      const { page, context } = await moTrangVaiTKM(browser, testInfo, 'CVP');
      const pd = new PheDuyetPage(page);
      await pd.mo();
      if (await pd.moChiTietTheoId(khoaToTrinh!)) {
        await pd.ykienVaKyLogic('Đồng ý phân công Thẩm phán, kính trình Phó Chánh án phê duyệt.', CAP_TRINH_TIEP, NGUOI_TRINH_TIEP);
      }
      await context.close();
    });

    // B8–B9: Phó Chánh án phê duyệt (điều kiện để lập được Thông báo)
    await test.step('B8–B9 · Phó Chánh án phê duyệt Tờ trình', async () => {
      const { page, context } = await moTrangVaiTKM(browser, testInfo, 'PCA');
      const pd = new PheDuyetPage(page);
      await pd.mo();
      if (await pd.moChiTietTheoId(khoaToTrinh!)) {
        await pd.ykienVaPheDuyet('Đồng ý phân công Thẩm phán theo tờ trình.');
      }
      await context.close();
    });

    // B5: thông báo phân công TP → trình ký
    const khoaThongBao = await test.step('B5 · Lập Thông báo phân công TP và trình ký', async () => {
      const { page, context } = await moTrangVaiTKM(browser, testInfo, 'CANBO');
      const khoa = await new HctpPage(page).lapVanBanTuDanhSachDon(
        donMoi.maDon,
        /Thông báo phân công TP/i,
        'Thông báo phân công',
        NGUOI_DUYET,
        NGUOI_KY,
      );
      await context.close();
      return khoa;
    });
    expect(khoaThongBao, 'Không lấy được id yêu cầu phê duyệt của Thông báo').toBeTruthy();

    // B7b: Chánh văn phòng ký logic Thông báo
    await test.step('B7b · Chánh văn phòng ký logic Thông báo', async () => {
      const { page, context } = await moTrangVaiTKM(browser, testInfo, 'CVP');
      const pd = new PheDuyetPage(page);
      await pd.mo();
      if (await pd.moChiTietTheoId(khoaThongBao!)) {
        await pd.ykienVaKyLogicVanBan('Đồng ý ban hành thông báo phân công Thẩm phán.');
      }
      await context.close();
    });

    // ───────── 3. ASSERT (kết quả cuối, không chỉ thao tác thành công) ─────────
    ghi('đơn đã tạo', `mã ${donMoi.maDon} – số thụ lý ${donMoi.soThuLy} – ${donMoi.nguoiDungDon}`);

    // (1) Đơn đã thụ lý (nhapDonTuBanAn đã so từng trường sau khi lưu)
    expect(donMoi.maDon, 'Đơn phải có mã đơn').toBeTruthy();
    expect(donMoi.soThuLy, 'Đơn phải được thụ lý mới (có số thụ lý)').toBeTruthy();

    // (2) Đơn hiển thị đúng bản án + đã có thẩm phán trên Danh sách đơn
    const { page: trangKt, context: ctxKt } = await moTrangVaiTKM(browser, testInfo, 'CANBO');
    await trangKt.goto('quan-ly-don/danh-sach-don');
    const oTim = trangKt.getByPlaceholder('Nhập bất kỳ thông tin nào (người gửi, nội dung...)');
    await expect(oTim).toBeVisible({ timeout: 60_000 });
    await oTim.fill(donMoi.maDon);
    await trangKt.getByRole('button', { name: /Tìm kiếm$/ }).click();
    const dong = trangKt.locator('.ant-table-row').filter({ hasText: `Mã đơn: ${donMoi.maDon}` }).first();
    await expect(dong, `Không tìm thấy đơn ${donMoi.maDon} trong Danh sách đơn`).toBeVisible({ timeout: 60_000 });
    const noiDungDong = (await dong.innerText()).replace(/\s+/g, ' ');
    ghi('dòng đơn', noiDungDong.slice(0, 300));
    expect(noiDungDong, 'Dòng đơn phải mang đúng Số BA/QĐ của dữ liệu test').toContain(`${BAN_AN.soBanAn} - ${BAN_AN.ngayBanAn}`);
    expect(noiDungDong, 'Dòng đơn phải hiện Thẩm phán đã phân công').toMatch(/Thẩm phán:/);
    expect(noiDungDong, 'Đơn phải chuyển đến Vụ Giám đốc kiểm tra tương ứng loại án').toMatch(/Vụ Giám đốc kiểm tra/);
    const idDon = await dong.getAttribute('data-row-key');
    await ctxKt.close();

    // (3) Kiểm chứng qua API: hai văn bản của đơn ở đúng trạng thái cuối
    const vanBan = await vanBanCuaDon(request, token, { idDon: idDon || undefined, maDon: donMoi.maDon });
    await testInfo.attach('van-ban-cua-don.json', { body: JSON.stringify(vanBan, null, 2), contentType: 'application/json' });
    const trangThai = (ten: RegExp) =>
      vanBan.find(v => ten.test(v.tenVanBan || ''))?.trangThaiHienThi || vanBan.find(v => ten.test(v.tenVanBan || ''))?.trangThai;
    ghi('văn bản của đơn', vanBan.map(v => `${v.tenVanBan}: ${v.trangThaiHienThi || v.trangThai}`).join(' | ') || '(trống)');

    expect(trangThai(/Tờ trình phân công/i), 'Tờ trình phân công phải ở trạng thái đã ban hành').toBe('DA_BAN_HANH');
    expect(trangThai(/Thông báo phân công/i), 'Thông báo phân công phải ở trạng thái đã ký số').toBe('DA_KY_SO');
  });
});
