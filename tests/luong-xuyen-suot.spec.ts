import { test, expect } from '@playwright/test';
import { nguoiNgauNhien } from '../common/du-lieu';
import { docTrangThai, ghiTrangThai, moTrangVai, xoaTrangThai } from '../common/vai';
import { GdtPage } from '../pages/gdt.page';
import { HctpPage } from '../pages/hctp.page';
import { PheDuyetPage } from '../pages/phe-duyet.page';
import { ThemMoiDonPage, taoThongTinDon } from '../pages/them-moi-don.page';

/** Người duyệt / người ký văn bản HCTP theo kịch bản */
const NGUOI_DUYET_HCTP = 'Nguyễn Thị Thu Hường';
const NGUOI_KY_VP = 'Nguyễn Tường Linh';
const CAN_BO_HCTP = 'Lê Mỹ Linh';
const CHANH_AN = 'Nguyễn Văn Quảng';
const TTV = 'Bùi Thị Thanh Loan';
const LANH_DAO_VU = 'Nguyễn Thị Bình';

/**
 * Luồng xuyên suốt GĐT/TT theo "KỊCH BẢN DEMO CHI TIẾT GĐTTT" (luồng chính), chạy trên QLA_ENV (dev).
 * Mỗi bước là một test chạy tuần tự, mỗi vai một phiên đăng nhập riêng (như mở nhiều tab).
 * Dữ liệu giữa các bước lưu ở e2e/.run-state.json → chạy lại từ bước lỗi: npx playwright test luong -g "B2"
 *
 * Án Hình sự vì TTV (Bùi Thị Thanh Loan) và Lãnh đạo Vụ (Nguyễn Thị Bình) thuộc Vụ GĐKT về hình sự.
 */
test.describe.configure({ mode: 'serial' });

test('B1 – Cán bộ HCTP thêm mới đơn từ OCR, đủ điều kiện, thụ lý mới', async ({ browser }, testInfo) => {
  test.setTimeout(30 * 60_000); // OCR có thể mất tới 15 phút
  xoaTrangThai(); // luồng mới: không dùng lại dữ liệu của lần chạy trước
  const { page, context } = await moTrangVai(browser, testInfo, 'CANBO');
  const trang = new ThemMoiDonPage(page);
  const d = taoThongTinDon(nguoiNgauNhien(), 'HINH_SU');

  const ocrId = process.env.QLA_OCR_ID; // gỡ lỗi: dùng lại kết quả OCR cũ
  if (ocrId) await trang.moKetQuaOcr(ocrId);
  else {
    await trang.moTuDanhSachDon();
    await trang.taiLenFileDon();
    await trang.ocrVaLayThongTin();
  }
  await trang.datLoaiAn(d);
  await trang.datCapXetXu(d);
  const daDien = await trang.dienTruongThieu(d);
  await trang.datTuCachVaDonViNhan(d);
  testInfo.annotations.push({ type: 'trường tự điền', description: daDien.join(', ') || '(OCR đủ)' });

  const idDon = await trang.luu(d);
  const { maDon } = await trang.kiemTraSauLuu();
  const soThuLy = await page.locator('#thongTinChuyenDonVO_soThuLy').inputValue().catch(() => '');
  const giaTri = (id: string) => page.locator(`#${id}`).inputValue();
  const tt = ghiTrangThai({
    idDon,
    maDon,
    soThuLy,
    nguoiDungDon: await page.locator('[id$="dsNguoiDungDon_0_tenDoiTuongLienQuan"]').first().inputValue(),
    soBanAn: await giaTri('thongTinBanAn_soBanAnQd'),
    ngayBanAn: await giaTri('thongTinBanAn_ngayBanAnQd'),
  });
  testInfo.annotations.push({ type: 'trạng thái', description: JSON.stringify(tt) });
  expect(tt.maDon, 'Không đọc được mã đơn sau khi lưu').toBeTruthy();
  // Không có số thụ lý = đơn chưa thụ lý mới → các bước sau (phân công, tờ trình) sẽ không thấy đơn
  expect(tt.soThuLy, 'Đơn chưa được thụ lý (thiếu số thụ lý) → kiểm tra "Thụ lý đơn" trên form').toBeTruthy();
  await context.close();
});

test('B1 – kiểm tra dữ liệu đầu vào cho bước sau', async () => {
  const tt = docTrangThai();
  expect(tt.idDon && tt.maDon && tt.soBanAn, `Thiếu dữ liệu B1: ${JSON.stringify(tt)}`).toBeTruthy();
});

test('B2a – Trưởng phòng HCTP phân công thẩm phán dự kiến (chỉ định)', async ({ browser }, testInfo) => {
  const tt = docTrangThai();
  const { page, context } = await moTrangVai(browser, testInfo, 'TRUONGPHONG');
  const { thamPhan } = await new HctpPage(page).phanCongThamPhanChiDinh(tt.soThuLy!, tt.maDon!);
  ghiTrangThai({ thamPhanDuKien: thamPhan });
  await context.close();
});

test('B2b – Cán bộ HCTP lập Tờ trình phân công Thẩm phán và trình ký', async ({ browser }, testInfo) => {
  const tt = docTrangThai();
  const { page, context } = await moTrangVai(browser, testInfo, 'CANBO');
  const khoaToTrinh = await new HctpPage(page).lapTamTrinhPhanCong(tt.maDon!, NGUOI_DUYET_HCTP, NGUOI_KY_VP);
  // Khoá theo id yêu cầu phê duyệt: trên dev có nhiều tờ trình cùng loại/cùng người tạo → dò theo tên + giờ dễ nhầm
  expect(khoaToTrinh, 'Không lấy được id yêu cầu phê duyệt của Tờ trình phân công').toBeTruthy();
  ghiTrangThai({ khoaToTrinh });
  await context.close();
});

test('B3a – Trưởng phòng HCTP phê duyệt Tờ trình phân công', async ({ browser }, testInfo) => {
  const tt = docTrangThai();
  const { page, context } = await moTrangVai(browser, testInfo, 'TRUONGPHONG');
  const pd = new PheDuyetPage(page);
  await pd.mo();
  // Mở đúng yêu cầu theo id; đã duyệt từ lần chạy trước thì bỏ qua
  if (await pd.moChiTietTheoId(tt.khoaToTrinh!)) {
    await pd.ykienVaPheDuyet('Đồng ý nội dung tờ trình, kính trình Lãnh đạo Văn phòng.');
  }
  await context.close();
});

test('B3b – Chánh Văn phòng cho ý kiến, trình Chánh án, ký logic', async ({ browser }, testInfo) => {
  const tt = docTrangThai();
  const { page, context } = await moTrangVai(browser, testInfo, 'CHANHVP');
  const pd = new PheDuyetPage(page);
  await pd.mo();
  if (!(await pd.moChiTietTheoId(tt.khoaToTrinh!))) return;
  await pd.ykienVaKyLogic('Đồng ý phân công, kính trình Chánh án phê duyệt.', 'Chánh án', CHANH_AN);
  await context.close();
});

test('B3c – Chánh án phê duyệt Tờ trình phân công (đơn chuyển sang GĐT)', async ({ browser }, testInfo) => {
  const tt = docTrangThai();
  const { page, context } = await moTrangVai(browser, testInfo, 'CHANHAN');
  const pd = new PheDuyetPage(page);
  await pd.mo();
  if (await pd.moChiTietTheoId(tt.khoaToTrinh!)) {
    await pd.ykienVaPheDuyet('Đồng ý phân công Thẩm phán theo tờ trình.');
  }
  await context.close();
});

test('B3d – Cán bộ HCTP tạo Thông báo phân công TP và trình ký', async ({ browser }, testInfo) => {
  const tt = docTrangThai();
  const { page, context } = await moTrangVai(browser, testInfo, 'CANBO');
  const kq = await new HctpPage(page).taoThongBaoPhanCong(tt.maDon!, NGUOI_DUYET_HCTP, NGUOI_KY_VP);
  if (kq.idYeuCau) ghiTrangThai({ khoaThongBao: kq.idYeuCau });
  await context.close();
});

test('B3e – Trưởng phòng HCTP phê duyệt Thông báo phân công', async ({ browser }, testInfo) => {
  const tt = docTrangThai();
  const { page, context } = await moTrangVai(browser, testInfo, 'TRUONGPHONG');
  const pd = new PheDuyetPage(page);
  await pd.mo();
  if (await pd.moChiTietTheoId(tt.khoaThongBao!)) {
    await pd.ykienVaPheDuyet('Đồng ý ban hành thông báo phân công.');
  }
  await context.close();
});

test('B3f – Chánh Văn phòng ký logic Thông báo phân công', async ({ browser }, testInfo) => {
  const tt = docTrangThai();
  const { page, context } = await moTrangVai(browser, testInfo, 'CHANHVP');
  const pd = new PheDuyetPage(page);
  await pd.mo();
  if (!(await pd.moChiTietTheoId(tt.khoaThongBao!))) return;
  await pd.ykienVaKyLogicVanBan('Đồng ý ban hành.');
  await context.close();
});

test('B4a – Vụ GĐKT: đơn đã có vụ án; cập nhật thông tin vụ án (thời hiệu, tra cứu bản án)', async ({ browser }, testInfo) => {
  const tt = docTrangThai();
  const { page, context } = await moTrangVai(browser, testInfo, 'LANHDAOVU');
  const gdt = new GdtPage(page);
  await gdt.kiemTraDaCoVuAn(tt.soBanAn!, tt.maDon!);
  const idVuAn = await gdt.moVuAn(tt.soBanAn!);
  ghiTrangThai({ idVuAn });
  await gdt.capNhatThongTinVuAn(
    nguoiNgauNhien(),
    'Hà Nội',
    `Khiếu nại Bản án hình sự phúc thẩm số ${tt.soBanAn} ngày ${tt.ngayBanAn}, đề nghị xem xét theo thủ tục giám đốc thẩm.`,
  );
  await context.close();
});

test('B4b – Lãnh đạo Vụ phân công Thẩm tra viên (chỉ định)', async ({ browser }, testInfo) => {
  const tt = docTrangThai();
  const { page, context } = await moTrangVai(browser, testInfo, 'LANHDAOVU');
  await new GdtPage(page).phanCongTTV(tt.soBanAn!, TTV, LANH_DAO_VU);
  await context.close();
});

test('B5a – Thẩm tra viên lập Tờ trình thẩm tra vụ việc', async ({ browser }, testInfo) => {
  const tt = docTrangThai();
  const { page, context } = await moTrangVai(browser, testInfo, 'TTV');
  await new GdtPage(page).lapToTrinhThamTra(tt.idVuAn!, tt.maDon!, {
    tomTat: `Bị cáo bị xét xử phúc thẩm theo Bản án số ${tt.soBanAn} ngày ${tt.ngayBanAn}; người đứng đơn đề nghị xem xét theo thủ tục giám đốc thẩm.`,
    dienBien: 'Vụ án đã được xét xử sơ thẩm và phúc thẩm; bản án phúc thẩm đã có hiệu lực pháp luật. Đơn đề nghị được thụ lý và phân công theo quy định.',
    yKien: 'Kháng nghị',
  });
  await context.close();
});

test('B5b – Thẩm tra viên: tiểu hồ sơ, ký logic, trình Lãnh đạo Vụ xin ý kiến', async ({ browser }, testInfo) => {
  const tt = docTrangThai();
  const { page, context } = await moTrangVai(browser, testInfo, 'TTV');
  const khoaThamTra = await new GdtPage(page).trinhToTrinhThamTra(tt.idVuAn!, 'Vụ trưởng');
  expect(khoaThamTra, 'Không lấy được id yêu cầu phê duyệt của Tờ trình thẩm tra').toBeTruthy();
  ghiTrangThai({ khoaThamTra });
  await context.close();
});

test('B5c – Lãnh đạo Vụ cho ý kiến và ký logic Tờ trình thẩm tra', async ({ browser }, testInfo) => {
  const tt = docTrangThai();
  const { page, context } = await moTrangVai(browser, testInfo, 'LANHDAOVU');
  const pd = new PheDuyetPage(page);
  await pd.mo();
  if (!(await pd.moChiTietTheoId(tt.khoaThamTra!))) return;
  await pd.ykienVaKyLogic('Đồng ý với đề xuất kháng nghị của Thẩm tra viên.');
  await context.close();
});
