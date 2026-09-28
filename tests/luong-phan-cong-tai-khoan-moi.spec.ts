/**
 * "Luồng nhập data.txt" — Bước 3 → 9, chạy tiếp trên đơn do Bước 1–2 tạo ra
 * (tests/them-moi-don-tai-khoan-moi.spec.ts).
 *
 *   B3  Cán bộ: Quản lý đơn › Phân công thẩm phán › tab "DS chưa phân công ngẫu nhiên" → Phân công ngẫu nhiên
 *   B4  Cán bộ: Danh sách đơn → Loại văn bản "Tờ trình phân công thẩm phán" → Tạo văn bản → Trình ký
 *       (Người duyệt: Nguyễn Thị Thu Hường, Người ký: Nguyễn Tường Linh)
 *   B5  Cán bộ: tương tự với "Thông báo phân công thẩm phán" → Trình ký
 *   B6–B7 Chánh văn phòng (Nguyễn Tường Linh): Công tác lãnh đạo › Chờ duyệt
 *       – Tờ trình: Cấp trình tiếp "Phó chánh án", Người đề xuất trình "Nguyễn Hải Trâm" → Lưu và ký logic
 *       – Thông báo: Ký logic
 *   B8–B9 Phó Chánh án (Nguyễn Hải Trâm): Phê duyệt đề xuất › Chờ duyệt → Phê duyệt tờ trình
 *
 * THỨ TỰ THỰC TẾ khác tài liệu: Bước 5 (Thông báo phân công TP) chỉ lập được SAU KHI tờ trình đã
 * được duyệt ở cấp Chánh án/Phó Chánh án — backend lọc đơn theo existsToTrinhPhanCongDaButPhe
 * (DonServiceImpl, case THONG_BAO_PHAN_CONG_TP). Vì vậy trình tự chạy là:
 *   B3 → B4 → B6–B7a (CVP ký tờ trình) → B8–B9 (PCA phê duyệt) → B5 (lập Thông báo) → B7b (CVP ký Thông báo).
 *
 * Mỗi bước là một test riêng, chạy tuần tự (serial): bước trước hỏng thì dừng, không chạy tiếp
 * để khỏi tạo dữ liệu demo dở dang.
 *
 * Đơn để chạy: lấy từ .run-state-tkm.<env>.json (Bước 1–2 ghi lại), hoặc chỉ định sẵn:
 *   QLA_TKM_MA_DON=8654 QLA_TKM_SO_THU_LY=1212121436
 *
 * An toàn: chỉ chạy khi QLA_TKM_CHO_PHEP_GHI=1 (môi trường được phép ghi dữ liệu).
 */
import { expect, test } from '@playwright/test';
import { choPhepGhiTKM } from '../account';
import { docTrangThaiTKM, ghiTrangThaiTKM, moTrangVaiTKM } from '../common/luong-tkm';
import { HctpPage } from '../pages/hctp.page';
import { PheDuyetPage } from '../pages/phe-duyet.page';

/** Người duyệt / người ký theo Luồng nhập data.txt */
const NGUOI_DUYET = 'Nguyễn Thị Thu Hường';
const NGUOI_KY = 'Nguyễn Tường Linh';
const CAP_TRINH_TIEP = 'Phó chánh án';
const NGUOI_TRINH_TIEP = 'Nguyễn Hải Trâm';

const MOI_TRUONG = process.env.QLA_ENV || 'stg';

test.describe.configure({ mode: 'serial' });
test.beforeEach(() => {
  test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
  // Spec này để chạy tiếp Bước 3–9 trên MỘT đơn đã có; luồng đầy đủ 24 vụ nằm ở
  // tests/luong-day-du-tai-khoan-moi.spec.ts → không chỉ định đơn thì bỏ qua cho khỏi trùng
  const { maDon, soThuLy } = donDangChay();
  test.skip(!maDon || !soThuLy, 'Chưa chỉ định đơn: truyền QLA_TKM_MA_DON và QLA_TKM_SO_THU_LY (hoặc chạy luồng đầy đủ)');
});

/** Đơn đang chạy: ENV ghi đè trạng thái đã lưu */
const donDangChay = () => {
  const tt = docTrangThaiTKM();
  return {
    maDon: process.env.QLA_TKM_MA_DON || tt.maDon,
    soThuLy: process.env.QLA_TKM_SO_THU_LY || tt.soThuLy,
  };
};

test('B3 – Cán bộ phân công thẩm phán (ngẫu nhiên)', async ({ browser }, testInfo) => {
  const { maDon, soThuLy } = donDangChay();
  expect(soThuLy, 'Thiếu số thụ lý của đơn: chạy Bước 1–2 trước hoặc truyền QLA_TKM_SO_THU_LY').toBeTruthy();

  const { page, context } = await moTrangVaiTKM(browser, testInfo, 'CANBO');
  await new HctpPage(page).phanCongThamPhanNgauNhien(soThuLy!);
  ghiTrangThaiTKM({ maDon, soThuLy, daPhanCong: '1' });
  testInfo.annotations.push({ type: 'đơn', description: `mã ${maDon} – số thụ lý ${soThuLy}` });
  await context.close();
});

test('B4 – Cán bộ tạo Tờ trình phân công thẩm phán và trình ký', async ({ browser }, testInfo) => {
  const { maDon } = donDangChay();
  expect(maDon, 'Thiếu mã đơn: chạy Bước 1–2 trước hoặc truyền QLA_TKM_MA_DON').toBeTruthy();

  const { page, context } = await moTrangVaiTKM(browser, testInfo, 'CANBO');
  const khoaToTrinh = await new HctpPage(page).lapTamTrinhPhanCong(maDon!, NGUOI_DUYET, NGUOI_KY);
  // Khoá theo id yêu cầu phê duyệt: trên môi trường dùng chung có nhiều tờ trình cùng loại, dò theo
  // tên/giờ dễ mở nhầm bản ghi của người khác
  expect(khoaToTrinh, 'Không lấy được id yêu cầu phê duyệt của Tờ trình phân công').toBeTruthy();
  ghiTrangThaiTKM({ khoaToTrinh });
  testInfo.annotations.push({ type: 'khoá tờ trình', description: String(khoaToTrinh) });
  await context.close();
});

test('B6–B7a – Chánh văn phòng cho ý kiến Tờ trình, trình Phó Chánh án, ký logic', async ({ browser }, testInfo) => {
  const { khoaToTrinh } = docTrangThaiTKM();
  expect(khoaToTrinh, 'Thiếu khoá tờ trình: chạy B4 trước').toBeTruthy();

  const { page, context } = await moTrangVaiTKM(browser, testInfo, 'CVP');
  const pd = new PheDuyetPage(page);
  await pd.mo();
  // false = yêu cầu đã duyệt xong từ lần chạy trước
  if (await pd.moChiTietTheoId(khoaToTrinh!)) {
    await pd.ykienVaKyLogic('Đồng ý phân công Thẩm phán, kính trình Phó Chánh án phê duyệt.', CAP_TRINH_TIEP, NGUOI_TRINH_TIEP);
  }
  await context.close();
});

test('B8–B9 – Phó Chánh án phê duyệt Tờ trình phân công', async ({ browser }, testInfo) => {
  const { khoaToTrinh } = docTrangThaiTKM();
  const { page, context } = await moTrangVaiTKM(browser, testInfo, 'PCA');
  const pd = new PheDuyetPage(page);
  await pd.mo();
  if (await pd.moChiTietTheoId(khoaToTrinh!)) {
    await pd.ykienVaPheDuyet('Đồng ý phân công Thẩm phán theo tờ trình.');
  }
  ghiTrangThaiTKM({ toTrinhDaDuyet: '1' });
  await context.close();
});

test('B5 – Cán bộ tạo Thông báo phân công thẩm phán và trình ký', async ({ browser }, testInfo) => {
  const { maDon } = donDangChay();
  const { page, context } = await moTrangVaiTKM(browser, testInfo, 'CANBO');
  // Luồng nhập data.txt: Thông báo cũng lập ngay từ Danh sách đơn như Tờ trình (không chờ tờ trình ban hành)
  const khoaThongBao = await new HctpPage(page).lapVanBanTuDanhSachDon(
    maDon!,
    /Thông báo phân công TP/i,
    'Thông báo phân công',
    NGUOI_DUYET,
    NGUOI_KY,
  );
  expect(khoaThongBao, 'Không lấy được id yêu cầu phê duyệt của Thông báo phân công').toBeTruthy();
  ghiTrangThaiTKM({ khoaThongBao });
  testInfo.annotations.push({ type: 'khoá thông báo', description: String(khoaThongBao) });
  await context.close();
});

test('B7b – Chánh văn phòng ký logic Thông báo phân công', async ({ browser }, testInfo) => {
  const { khoaThongBao } = docTrangThaiTKM();
  expect(khoaThongBao, 'Thiếu khoá thông báo: chạy bước tạo Thông báo trước').toBeTruthy();

  const { page, context } = await moTrangVaiTKM(browser, testInfo, 'CVP');
  const pd = new PheDuyetPage(page);
  await pd.mo();
  if (await pd.moChiTietTheoId(khoaThongBao!)) {
    await pd.ykienVaKyLogicVanBan('Đồng ý ban hành thông báo phân công Thẩm phán.');
  }
  await context.close();
});
