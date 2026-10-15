/**
 * E2E — TẠO ĐƠN ĐỀ NGHỊ GIÁM ĐỐC THẨM, bản án 824 · 02/10/2026 · Tòa Phúc thẩm TANDTC tại Hà Nội (D01.100, Phúc thẩm).
 *
 * CHỈ chạy trên môi trường ĐÀO TẠO (https://e-qlta-daotao.toaan.gov.vn), tài khoản Lê Mỹ Linh
 * (kịch bản đào tạo HCTP, Luồng 2). Không thuộc khung FLOW/CASE/STEP: đây là một kịch bản đơn lẻ
 * có báo cáo riêng ở `reports/e2e-gdt-1410/` (report.md, test-results.json, screenshots/, traces/).
 *
 *   npm run daotao:1410:ui                     chỉ đọc: chạy tới STEP 09, KHÔNG bấm "Lưu thông tin"
 *   npm run daotao:1410:ghi:ui                 cho phép lưu (STEP 10–11)
 *   … -- --bo-qua-ocr                          môi trường không có màn OCR → BLOCKED và đi tiếp
 *
 * Nguyên tắc chống trùng: kiểm tra trùng TRƯỚC khi tạo (khớp đủ số + ngày + tòa trên dữ liệu trả về),
 * có đơn thì SKIPPED_EXISTING, nhiều đơn thì FAIL; không bấm Lưu lần hai khi chưa biết kết quả lần
 * trước; kiểm lại Danh sách đơn sau khi lưu. Không dùng API/SQL để xoá dữ liệu.
 */
import fs from 'fs';
import path from 'path';
import { expect, test, type Page } from '@playwright/test';
import { ORIGIN } from '../../../playwright.config';
import { choPhepGhiTKM, credentialsTKM } from '../../../account';
import { loginSSO } from '../../../common/login';
import { choHetSpin, chonSelect, go, hienTrong, toast, toastGanDay } from '../../../common/antd';
import { ThemMoiDonPage, taoThongTinDon, tenToaDangChon, type ThongTinDon } from '../../../pages/them-moi-don.page';

// ── Dữ liệu cố định — mặc định là bản án 824; đổi bản án bằng QLA_1410_SO/NGAY (dd/mm/yyyy)/TOA (tên tòa)/CAP ──
const SO = process.env.QLA_1410_SO || '824';
const NGAY = process.env.QLA_1410_NGAY || '02/10/2026';
/** Mặc định: mã đơn vị D01.100 */
const TOA = process.env.QLA_1410_TOA || 'Tòa Phúc thẩm Tòa án nhân dân tối cao tại Hà Nội';
/** Hình thức đơn — đổi bằng QLA_1410_HINH_THUC (vd "Thông báo phát hiện vi phạm pháp luật") */
const HINH_THUC_DON = process.env.QLA_1410_HINH_THUC || 'Đơn đề nghị GĐT/TT';
const THU_TUC = 'Giám đốc thẩm';
const CAP = process.env.QLA_1410_CAP || 'Phúc thẩm';

const GOC = path.resolve(__dirname, '../../..');
/** Mỗi bản án một thư mục báo cáo, không ghi đè lẫn nhau */
const THU_MUC = path.join(
  GOC,
  process.env.QLA_1410_SO ? `reports/e2e-gdt-1410/${SO.replace(/[^\w-]+/g, '_')}-${NGAY.replace(/\//g, '')}` : 'reports/e2e-gdt-1410',
);
const THU_MUC_ANH = path.join(THU_MUC, 'screenshots');
const THU_MUC_TRACE = path.join(THU_MUC, 'traces');
/** PDF giả lập (không dữ liệu cá nhân thật) — sinh bằng `node tools/tao-pdf-don-gdt-1410.js` */
const TEP_DON = path.join(
  GOC,
  process.env.QLA_1410_TEP ||
    (process.env.QLA_1410_SO ? `fixtures/don-gdt-${SO.replace(/[^\w-]+/g, '_')}-${NGAY.replace(/\//g, '')}.pdf` : 'fixtures/don-gdt-1410-gia-lap.pdf'),
);

type TrangThai = 'PASS' | 'FAIL' | 'BLOCKED' | 'SKIPPED_EXISTING' | 'NOT_RUN';
interface KetQuaBuoc {
  ma: string;
  ten: string;
  trangThai: TrangThai;
  chiTiet: string[];
  bangChung: string[];
}

const BUOC: [string, string][] = [
  ['01', 'Truy cập hệ thống'],
  ['02', 'Tìm kiếm và chống trùng'],
  ['03', 'Thêm mới'],
  ['04', 'Upload tài liệu'],
  ['05', 'Xử lý OCR (Quay lại → Chi tiết đơn)'],
  ['06', 'Nhập thông tin BA/QĐ'],
  ['07', 'Tra cứu bản án'],
  ['08', 'Nhập toàn bộ dữ liệu'],
  ['09', 'Validation trước khi lưu'],
  ['10', 'Lưu đơn'],
  ['11', 'Xác minh sau lưu / không trùng'],
];

/** Dừng quy trình với một trạng thái cụ thể (FAIL / BLOCKED / SKIPPED_EXISTING) */
class Dung extends Error {
  constructor(
    readonly trangThai: Exclude<TrangThai, 'PASS' | 'NOT_RUN'>,
    message: string,
  ) {
    super(message);
  }
}

/** Người làm đơn GIẢ LẬP — khớp nội dung PDF giả lập; không CCCD, không số điện thoại */
const NGUOI_LAM_DON = {
  hoTen: 'Trần Văn Khải',
  gioiTinh: 'Nam' as const,
  ngaySinh: '05/06/1975',
  cccd: '',
  sdt: '',
  diaChi: 'Số 18, ngõ 72, phố Thái Hà',
};

test.use({ storageState: { cookies: [], origins: [] } });

test(`e2e-gdt-1410 · tạo đơn đề nghị GĐT theo bản án ${SO} — ${NGAY} — ${TOA}`, async ({ page }) => {
  test.setTimeout(30 * 60_000);
  test.skip(
    new URL(ORIGIN).host !== 'e-qlta-daotao.toaan.gov.vn',
    `Kịch bản chỉ chạy trên môi trường đào tạo, đang ở ${ORIGIN}. Chạy bằng: npm run daotao:1410:ui`,
  );

  for (const d of [THU_MUC_ANH, THU_MUC_TRACE]) fs.mkdirSync(d, { recursive: true });
  const batDau = new Date();
  const ketQua: KetQuaBuoc[] = BUOC.map(([ma, ten]) => ({ ma, ten, trangThai: 'NOT_RUN', chiTiet: [], bangChung: [] }));
  const kq = (ma: string) => ketQua.find(b => b.ma === ma)!;
  const loiPhatHien: string[] = [];
  const truongDaNhap: { truong: string; giaTri: string; nguon: string }[] = [];
  const kiemTraTrung: { truocKhiTao?: unknown; sauKhiLuu?: unknown } = {};
  let maDon = '';
  let idDon = '';

  const chup = async (ten: string) => {
    const tep = path.join(THU_MUC_ANH, `${ten}.png`);
    await page.screenshot({ path: tep, fullPage: true }).catch(() => undefined);
    return path.relative(THU_MUC, tep).replace(/\\/g, '/');
  };

  /** Chạy một bước: PASS khi xong; lỗi thường → FAIL; `Dung` → trạng thái của nó. Lỗi nào cũng dừng. */
  const buoc = async (ma: string, than: (b: KetQuaBuoc) => Promise<void>) => {
    const b = kq(ma);
    await test.step(`STEP ${ma} – ${b.ten}`, async () => {
      try {
        await than(b);
        b.trangThai = 'PASS';
      } catch (e) {
        const loi = e instanceof Error ? e.message : String(e);
        b.trangThai = e instanceof Dung ? e.trangThai : 'FAIL';
        b.chiTiet.push(loi);
        if (b.trangThai === 'FAIL') loiPhatHien.push(`STEP ${ma}: ${loi}`);
        b.bangChung.push(await chup(`${ma}-loi`));
        throw e;
      }
    });
  };

  // Trace: Playwright UI tự quản lý trace của nó → start ở đây sẽ báo lỗi, khi đó ghi chú lại
  let traceTuGhi = false;
  let ghiChuTrace = '';
  try {
    await page.context().tracing.start({ screenshots: true, snapshots: true, sources: true });
    traceTuGhi = true;
  } catch (e) {
    ghiChuTrace = `Trace do Playwright (UI mode / cấu hình trace) quản lý: ${(e as Error).message.split('\n')[0]}`;
  }

  const trang = new ThemMoiDonPage(page);
  let ketThucBang: Dung | undefined;

  try {
    // ── STEP 01 ──
    await buoc('01', async b => {
      // QLA_1410_CCCD (+ QLA_1410_PASS, mặc định Ta@<CCCD>): tài khoản theo bảng đào tạo; .env.daotao ghi đè QLA_TKM_USER nên cần biến riêng
      const cccd = process.env.QLA_1410_CCCD;
      const tk = cccd ? { user: cccd, pass: process.env.QLA_1410_PASS || `Ta@${cccd}` } : credentialsTKM();
      if (!tk) throw new Dung('BLOCKED', 'Thiếu QLA_TKM_USER trong .env.daotao');
      await loginSSO(page, tk.user, { pass: tk.pass });
      b.chiTiet.push(`Đăng nhập SSO: ${tk.user}`);
      await moDanhSachDon(page);
      b.chiTiet.push(`Màn Danh sách đơn: ${page.url()}`);
      b.bangChung.push(await chup('01-danh-sach-don'));
    });

    // ── STEP 02 ──
    await buoc('02', async b => {
      const t = await timDonKhop(page);
      kiemTraTrung.truocKhiTao = t;
      b.chiTiet.push(`Lọc máy chủ theo Số BA/QĐ="${SO}" (khớp chuỗi con): ${t.tong} bản ghi`);
      b.chiTiet.push(`Đối chiếu đủ 3 trường (số = ${SO}, ngày = ${NGAY}, tòa = ${TOA}): ${t.khop.length} bản ghi khớp`);
      b.chiTiet.push('Giới hạn: chỉ thấy đơn trong phạm vi quyền xem của tài khoản đang chạy.');
      b.bangChung.push(await chup('02-kiem-tra-trung'));
      if (t.khop.length > 1) throw new Dung('FAIL', `Có ${t.khop.length} đơn trùng: ${t.khop.map(k => k.maDon).join(', ')}`);
      if (t.khop.length === 1) {
        maDon = t.khop[0].maDon;
        throw new Dung('SKIPPED_EXISTING', `Đã có đơn mã ${maDon} cho bản án này → không tạo đơn mới`);
      }
    });

    // ── STEP 03 ──
    await buoc('03', async b => {
      await moDanhSachDon(page);
      await page.getByRole('button', { name: /Thêm mới$/ }).click();
      await expect(page).toHaveURL(/\/qla\/quan-ly-don\/them-moi$/, { timeout: 60_000 });
      const popup = modalTheoTieuDe(page, 'Tải lên tài liệu');
      await expect(popup, 'Không thấy popup "Tải lên tài liệu"').toBeVisible({ timeout: 60_000 });
      b.chiTiet.push(`URL: ${page.url()} · popup "Tải lên tài liệu" hiển thị`);
      b.bangChung.push(await chup('03-popup-tai-len'));
    });

    // ── STEP 04 ──
    let coManOcr = false;
    await buoc('04', async b => {
      if (!fs.existsSync(TEP_DON)) {
        throw new Dung('BLOCKED', `Thiếu ${path.relative(GOC, TEP_DON)} — chạy: node tools/tao-pdf-don-gdt-1410.js`);
      }
      const popup = modalTheoTieuDe(page, 'Tải lên tài liệu');
      await popup.locator('input[type=file]').setInputFiles(TEP_DON);
      await expect(popup.locator('#tenTaiLieu')).not.toHaveValue('');
      b.chiTiet.push(`Tệp: ${path.basename(TEP_DON)} (PDF giả lập, không dữ liệu cá nhân thật)`);
      await popup.getByRole('button', { name: 'Tải lên' }).click();

      const ocr = modalTheoTieuDe(page, 'Xác nhận xử lý OCR');
      const form = page.getByText('Thêm mới Đơn đề nghị GĐT/TT');
      await expect(ocr.or(form).first(), 'Sau "Tải lên" không thấy màn OCR, cũng không thấy form').toBeVisible({
        timeout: 60_000,
      });
      coManOcr = await ocr.isVisible().catch(() => false);
      b.bangChung.push(await chup('04-sau-tai-len'));
      if (coManOcr) {
        b.chiTiet.push('Màn "Xác nhận xử lý OCR" hiển thị');
        return;
      }
      const lyDo =
        'Không xuất hiện màn "Xác nhận xử lý OCR": sau "Tải lên" màn vào thẳng form nhập. ' +
        'Bản build FE của môi trường tắt OCR (VITE_OCR_UPLOAD_DISABLED=true → useOcrDonStepper.ts:178).';
      if (process.env.QLA_1410_BO_QUA_OCR !== '1') throw new Dung('FAIL', lyDo);
      // Chạy với --bo-qua-ocr: ghi nhận lỗi môi trường, không coi là PASS, đi tiếp trên form đã mở
      loiPhatHien.push(`STEP 04: ${lyDo}`);
      b.chiTiet.push(lyDo, 'Chạy với --bo-qua-ocr → ghi BLOCKED và đi tiếp trên form đã mở');
    });
    if (!coManOcr) kq('04').trangThai = 'BLOCKED';

    // ── STEP 05 ──
    await buoc('05', async b => {
      // boQuaOcr: có popup OCR → bấm "Quay lại"; không có → phải CHỨNG MINH tệp đã đính kèm (trình xem PDF)
      b.chiTiet.push(await trang.boQuaOcr());
      await expect(page.getByText('Thêm mới Đơn đề nghị GĐT/TT')).toBeVisible({ timeout: 60_000 });
      await expect(page.getByRole('button', { name: 'Lưu thông tin' })).toBeVisible({ timeout: 60_000 });
      await choHetSpin(page);
      b.chiTiet.push('Form "Thêm mới Đơn đề nghị GĐT/TT" (màn Chi tiết đơn) đã hiển thị đủ, có nút "Lưu thông tin"');
      b.bangChung.push(await chup('05-chi-tiet-don'));
    });
    if (!coManOcr) {
      kq('05').trangThai = 'BLOCKED';
      kq('05').chiTiet.push('Không có màn OCR nên không có nút "Quay lại" để kiểm — chỉ xác minh được form đã mở');
    }

    // ── STEP 06 ──
    await buoc('06', async b => {
      const ghi = (truong: string, giaTri: string) => {
        truongDaNhap.push({ truong, giaTri, nguon: 'dữ liệu cố định' });
        b.chiTiet.push(`${truong} = ${giaTri}`);
      };
      await chonTheoNhanChinhXac(page, oTheoNhan(page, 'Hình thức đơn'), HINH_THUC_DON);
      ghi('Hình thức đơn', HINH_THUC_DON);
      await chonTheoNhanChinhXac(page, page.locator('#thongTinBanAn_thuTucGiaiQuyet'), THU_TUC);
      ghi('Thủ tục giải quyết', THU_TUC);
      // Cấp xét xử TRƯỚC tòa án: danh sách tòa lọc theo cấp
      await chonTheoNhanChinhXac(page, page.locator('#thongTinBanAn_capXetXu'), CAP);
      ghi('Cấp xét xử', CAP);
      await go(page.locator('#thongTinBanAn_soBanAnQd'), SO);
      ghi('Số BA/QĐ', SO);
      const oNgay = page.locator('#thongTinBanAn_ngayBanAnQd');
      await go(oNgay, NGAY);
      await oNgay.press('Enter');
      ghi('Ngày BA/QĐ', NGAY);
      try {
        await trang.chonToaRaBanAn(TOA);
      } catch (e) {
        throw new Dung('FAIL', `Không chọn được Tòa ra BA/QĐ "${TOA}" khi Cấp xét xử = ${CAP}: ${(e as Error).message}`);
      }
      ghi('Tòa ra BA/QĐ', TOA);
      await kiemCacGiaTriCoDinh(page, b);
      b.bangChung.push(await chup('06-thong-tin-ba-qd'));
    });

    // ── STEP 07 ──
    let banAnTimThay: Record<string, unknown> | undefined;
    await buoc('07', async b => {
      // Đúng nút kính lúp của khối bản án: cùng khối với ô "Cấp xét xử"
      const nut = page
        .locator('div')
        .filter({ has: page.locator('#thongTinBanAn_capXetXu') })
        .filter({ has: page.locator('button .anticon-search') })
        .last()
        .locator('button:has(.anticon.anticon-search)');
      await expect(nut, 'Không thấy nút tra cứu bản án').toHaveCount(1);
      const choKq = page.waitForResponse(r => r.url().includes('/don/tra-cuu-ban-an-cu/'), { timeout: 60_000 });
      await nut.click();
      const res = await choKq.catch(() => null);
      if (!res) throw new Dung('FAIL', 'Bấm tra cứu nhưng không có phản hồi API tra-cuu-ban-an-cu trong 60 giây');
      b.chiTiet.push(`API tra cứu: HTTP ${res.status()}`);
      if (!res.ok()) throw new Dung('FAIL', `API tra cứu bản án lỗi HTTP ${res.status()}`);

      const khongThay = toast(page, 'Không tìm thấy bản án trong hệ thống');
      if (await hienTrong(khongThay, 5_000)) {
        b.chiTiet.push('Toast: "Không tìm thấy bản án trong hệ thống"');
        b.bangChung.push(await chup('07-khong-tim-thay-ban-an'));
        throw new Dung('FAIL', 'Không tìm thấy bản án trong hệ thống — dừng, không nhập tiếp, không Lưu, không đổi số BA/QĐ');
      }
      const toastKhac = (await toastGanDay(page, 15_000)).filter(t => /lỗi|thất bại|không/i.test(t));
      if (toastKhac.length) throw new Dung('FAIL', `Có thông báo lỗi khi tra cứu: ${toastKhac.join(' | ')}`);

      // Bằng chứng tìm thấy: API trả bản án khớp số + ngày, có idVuAn (đúng điều kiện FE dùng)
      const ds = timBanAn(await res.json().catch(() => null));
      b.chiTiet.push(`API trả ${ds.length} bản án`);
      banAnTimThay = ds.find(x => String(x.soBanAn) === SO && khopNgay(x.ngayBanAn) && x.idVuAn);
      if (!banAnTimThay) {
        throw new Dung('FAIL', 'Không có toast lỗi nhưng API không trả bản án khớp số/ngày (không có bằng chứng tìm thấy)');
      }
      b.chiTiet.push(`Bản án tìm thấy: ${tomTat(banAnTimThay)}`);
      const loaiAn = await trang.loaiAnHienTai();
      b.chiTiet.push(`Loại án hệ thống tự điền: ${loaiAn || '(trống)'}`);
      // Tra cứu có thể điền lại tab bản án → các giá trị cố định phải còn nguyên
      await kiemCacGiaTriCoDinh(page, b);
      b.bangChung.push(await chup('07-tra-cuu-thanh-cong'));
    });

    // ── STEP 08 ──
    let d!: ThongTinDon;
    await buoc('08', async b => {
      const loaiAn = (await trang.loaiAnHienTai()) || 'Dân sự';
      const ma = /Hình sự/i.test(loaiAn) ? 'HINH_SU' : /Kinh doanh/i.test(loaiAn) ? 'KDTM' : 'DAN_SU';
      // Vụ GĐKT phụ trách theo loại án: HS → D01.106, DS → D01.107, KDTM/PS/LĐ/HNGĐ → D01.108, HC → D01.109
      const donViChuyenDen = /Hình sự/i.test(loaiAn)
        ? 'hình sự'
        : /Hành chính/i.test(loaiAn)
          ? 'hành chính'
          : /Kinh doanh|Phá sản|Lao động|Hôn nhân|gia đình/i.test(loaiAn)
            ? 'kinh doanh, thương mại'
            : 'dân sự';
      d = {
        ...taoThongTinDon(NGUOI_LAM_DON, ma),
        donViChuyenDen,
        capXetXu: CAP,
        soBanAn: SO,
        ngayBanAn: NGAY,
        toaAn: TOA,
        thuTucGiaiQuyet: THU_TUC,
        loaiAn,
        ngayToaNhan: NGAY,
        ngayGhiTrenDon: NGAY,
        ngayDauBuuDien: NGAY,
        tinh: 'Hà Nội',
        phuongXa: 'Phường Đống Đa',
        // Bản án 824 là án Hình sự (đo trên màn 14/10/2026) → không gán quan hệ pháp luật dân sự;
        // ô "Quan hệ pháp luật" chỉ điền khi trống và đang hiện, giá trị rỗng thì để nguyên.
        quanHePhapLuat: /Dân sự|Kinh doanh/i.test(loaiAn) ? 'Tranh chấp hợp đồng vay tài sản' : '',
        ghiChu: `Đơn nộp trực tiếp tại Phòng Tiếp công dân và Xử lý đơn tư pháp, kèm bản sao bản án ${CAP.toLowerCase()}.`,
        noiDung: tenToa =>
          `Đề nghị Chánh án Tòa án nhân dân tối cao xem xét kháng nghị theo thủ tục giám đốc thẩm đối với ` +
          `Bản án ${CAP.toLowerCase()} số ${SO} ngày ${NGAY} của ${tenToa}, vì bản án có vi phạm nghiêm trọng thủ tục ` +
          'tố tụng và sai lầm trong việc áp dụng pháp luật, đánh giá chứng cứ không khách quan, ảnh hưởng đến quyền lợi hợp pháp của người làm đơn.',
      };
      const ghi = (truong: string, giaTri: string, nguon = 'giả lập') => {
        truongDaNhap.push({ truong, giaTri, nguon });
        b.chiTiet.push(`${truong} = ${giaTri} (${nguon})`);
      };

      ghi('Hình thức nhận', await trang.datHinhThucNhan('Trực tiếp'));

      // Người đứng đơn: ưu tiên người có trong bản án vừa tra cứu (không tự đặt thông tin trái bản án)
      const nguoiTuBanAn = await trang.dsNguoiTuBanAnCu();
      // CV kiến nghị GĐT/TT không có khối "Người đứng đơn" (cơ quan kiến nghị nằm ở Thông tin CV)
      const coNguoiDungDon = await page.locator('[id$="dsNguoiDungDon_0_tenDoiTuongLienQuan"]').first().isVisible().catch(() => false);
      if (!coNguoiDungDon) {
        b.chiTiet.push('Hình thức không có khối Người đứng đơn → bỏ qua chọn người từ bản án');
      } else if (nguoiTuBanAn.length) {
        ghi('Người đứng đơn', await trang.chonNguoiTuBanAnCu(process.env.QLA_1410_NGUOI), 'người trong bản án đã tra cứu');
      } else {
        b.chiTiet.push('Bản án tra cứu không có danh sách người → người đứng đơn giả lập');
      }

      // Địa chỉ liên lạc trước: Phường/Xã chỉ mở sau khi Tỉnh tải xong
      const oTinh = page.locator('#thongTinChiTietDon_diaChiLienLac_maTinh');
      if ((await oTinh.isVisible().catch(() => false)) && !(await nhanSelect(oTinh))) {
        await trang.datDiaChiLienLac(d);
        ghi('Địa chỉ liên lạc', `${d.phuongXa}, ${d.tinh}`);
      }

      const daDien = await trang.dienTruongThieu(d);
      for (const t of daDien) ghi(t, await docTruong(page, t), 'giả lập (ô đang trống)');

      // Không có CCCD (dữ liệu giả lập) → tick "Không có thông tin CCCD" nếu ô CCCD còn trống
      const oCccd = page.locator('[id$="dsNguoiDungDon_0_soCccd"]').first();
      if ((await oCccd.isVisible().catch(() => false)) && !(await oCccd.inputValue())) {
        const tick = page.getByRole('checkbox', { name: 'Không có thông tin CCCD' }).first();
        if ((await tick.count()) && !(await tick.isChecked())) {
          await tick.check({ force: true });
          ghi('Không có thông tin CCCD', 'đã tick');
        }
      }

      ghi('Thời hiệu giải quyết', await trang.chonThoiHieuGiaiQuyetNeuTrong());
      ghi('Thụ lý đơn', await trang.chonThuLyMoi(), 'Thụ lý mới');
      // Hình thức công văn (CV chuyển đơn / CV kiến nghị): phải có ≥1 công văn — do tòa ra bản án gửi lên
      if (/^(Công văn|CV)/i.test(HINH_THUC_DON)) {
        const h = new Date();
        const homNay = `${String(h.getDate()).padStart(2, '0')}/${String(h.getMonth() + 1).padStart(2, '0')}/${h.getFullYear()}`;
        const tinhCv = TOA.includes(' - ') ? TOA.split(' - ').pop()! : TOA.replace(/^Tòa án nhân dân (tỉnh|thành phố) /, '');
        // CV kiến nghị GĐT/TT: cơ quan kiến nghị là Viện kiểm sát cùng địa bàn (ô Đơn vị gửi nhập tự do)
        const laKienNghi = /kiến nghị/i.test(HINH_THUC_DON);
        ghi(
          'Công văn',
          await trang.themCongVan({
            so: `${100 + (Number(SO.replace(/\D/g, '').slice(-3)) || 0)}/${h.getFullYear()}/${laKienNghi ? 'KN-VKS' : 'TA-CV'}`,
            ngay: homNay,
            donViTen: laKienNghi ? `Viện kiểm sát nhân dân ${/^thành phố|^Hà Nội$|^Hồ Chí Minh$|^Hải Phòng$|^Đà Nẵng$|^Cần Thơ$|^Huế$/.test(tinhCv) ? 'thành phố' : 'tỉnh'} ${tinhCv}` : undefined,
            // Danh mục đơn vị gửi chỉ có tòa cấp tỉnh trở lên → tòa khu vực thì lấy TAND tỉnh/thành phố cùng địa bàn
            donViGui: /khu vực/i.test(TOA) ? new RegExp(`^Tòa án nhân dân (tỉnh|thành phố) ${TOA.split(' - ').pop()}$`) : TOA,
            tinh: tinhCv,
            trichYeu: `V/v ${laKienNghi ? 'kiến nghị' : 'chuyển đơn đề nghị'} xem xét theo thủ tục giám đốc thẩm đối với Bản án ${CAP.toLowerCase()} số ${SO} ngày ${NGAY}`,
          }),
        );
      }
      // Nhóm án tử hình + đơn xin ân giảm
      if (process.env.QLA_1410_TU_HINH === '1') ghi('Án tử hình', await trang.tickAnTuHinhXinAnGiam());
      // Thủ tục giải quyết đặt lại SAU tra cứu (màn có thể tự điền lại)
      ghi('Thủ tục giải quyết', await trang.datThuTucGiaiQuyet(THU_TUC), 'dữ liệu cố định');
      b.bangChung.push(await chup('08-nhap-du-lieu'));
    });

    // ── STEP 09 ──
    await buoc('09', async b => {
      await kiemCacGiaTriCoDinh(page, b);
      if (!banAnTimThay) throw new Dung('BLOCKED', 'Chưa có bằng chứng tra cứu bản án thành công');
      b.chiTiet.push('Bản án đã tra cứu thành công ✔');

      const thieu = await truongBatBuocTrong(page);
      const loiForm = await page.locator('.ant-form-item-has-error:visible .ant-form-item-explain-error').allInnerTexts();
      b.chiTiet.push(`Trường bắt buộc còn trống: ${thieu.length ? thieu.join(', ') : 'không có'}`);
      b.chiTiet.push(`Thông báo validation: ${loiForm.length ? loiForm.join(' | ') : 'không có'}`);
      b.bangChung.push(await chup('09-truoc-khi-luu'));
      if (thieu.length || loiForm.length) {
        throw new Dung('BLOCKED', `Chưa đủ điều kiện lưu — thiếu: ${thieu.join(', ') || '-'}; lỗi: ${loiForm.join(' | ') || '-'}`);
      }

      // Kiểm trùng lần cuối ngay trước khi lưu (tab khác của trình duyệt, không rời form)
      const t = await timDonKhopOTabMoi(page);
      b.chiTiet.push(`Kiểm trùng lại trước khi lưu: ${t.khop.length} đơn khớp`);
      if (t.khop.length) throw new Dung('SKIPPED_EXISTING', `Vừa có đơn khớp (mã ${t.khop.map(k => k.maDon).join(', ')}) → không lưu`);

      if (!choPhepGhiTKM()) {
        throw new Dung('BLOCKED', 'Chạy CHỈ ĐỌC (không có --ghi) → dừng trước "Lưu thông tin". Lưu thật: npm run daotao:1410:ghi:ui');
      }
    });

    // ── STEP 10 ──
    let luuKhongRo = '';
    await buoc('10', async b => {
      try {
        // luu(): bấm "Lưu thông tin"; chỉ bấm lại khi có lỗi validation VÀ màn chưa chuyển sang /them-moi/<id>
        idDon = await trang.luu(d);
      } catch (e) {
        luuKhongRo = (e as Error).message;
        b.chiTiet.push(`Không xác định được kết quả lưu: ${luuKhongRo}`);
        b.chiTiet.push('KHÔNG bấm Lưu lần nữa — chuyển sang STEP 11 kiểm tra Danh sách đơn');
        b.bangChung.push(await chup('10-khong-ro-ket-qua'));
        throw new Dung('FAIL', `Lưu không xác nhận được: ${luuKhongRo}`);
      }
      b.chiTiet.push(`Toast "Lưu thông tin thành công" · id đơn = ${idDon}`);
      const sau = await trang.kiemTraSauLuu();
      maDon = sau.maDon;
      b.chiTiet.push(`Mã đơn = ${maDon}`);
      const lech = sau.ketQua.truong.filter(t => t.sau !== t.truoc);
      for (const t of lech) {
        b.chiTiet.push(`LỆCH ${t.ten}: nhập "${t.truoc}" → đọc lại "${t.sau}"`);
        loiPhatHien.push(`STEP 10: trường "${t.ten}" lưu lệch: "${t.truoc}" → "${t.sau}"`);
      }
      b.chiTiet.push(`Trường đọc lại khớp: ${sau.ketQua.truong.length - lech.length}/${sau.ketQua.truong.length}`);
      b.bangChung.push(await chup('10-luu-thanh-cong'));
      if (lech.length) throw new Dung('FAIL', `${lech.length} trường lưu lệch`);
    }).catch(async e => {
      // Lưu không rõ kết quả → vẫn phải kiểm trạng thái thật ở Danh sách đơn (không bấm lưu lại)
      if (luuKhongRo) await xacMinhSauLuu().catch(() => undefined);
      throw e;
    });

    // ── STEP 11 ──
    await xacMinhSauLuu();
  } catch (e) {
    if (e instanceof Dung) ketThucBang = e;
    else throw e;
  } finally {
    let traceTep = '';
    if (traceTuGhi) {
      traceTep = path.join(THU_MUC_TRACE, `trace-${dauThoiGian(batDau)}.zip`);
      await page.context().tracing.stop({ path: traceTep }).catch(() => undefined);
    }
    ghiBaoCao({
      batDau,
      ketQua,
      loiPhatHien,
      truongDaNhap,
      kiemTraTrung,
      maDon,
      idDon,
      trace: traceTep ? path.relative(THU_MUC, traceTep).replace(/\\/g, '/') : ghiChuTrace,
    });
  }

  if (ketThucBang?.trangThai === 'FAIL') throw ketThucBang;
  if (ketThucBang) test.skip(true, `${ketThucBang.trangThai}: ${ketThucBang.message}`);

  async function xacMinhSauLuu() {
    await buoc('11', async b => {
      const t = await timDonKhop(page);
      kiemTraTrung.sauKhiLuu = t;
      b.chiTiet.push(`Đơn khớp đủ số + ngày + tòa: ${t.khop.length} (${t.khop.map(k => k.maDon).join(', ') || '-'})`);
      b.bangChung.push(await chup('11-sau-khi-luu'));
      if (t.khop.length === 0) throw new Dung('FAIL', 'Không tìm thấy đơn vừa lưu trong Danh sách đơn');
      if (t.khop.length > 1) throw new Dung('FAIL', `Phát sinh ${t.khop.length} đơn trùng: ${t.khop.map(k => k.maDon).join(', ')}`);
      if (maDon && t.khop[0].maDon !== maDon) {
        throw new Dung('FAIL', `Đơn trong danh sách (mã ${t.khop[0].maDon}) khác đơn vừa lưu (mã ${maDon})`);
      }
      maDon = maDon || t.khop[0].maDon;
      const dong = t.khop[0].noiDung;
      for (const can of [HINH_THUC_DON, THU_TUC]) {
        if (!dong.includes(can)) throw new Dung('FAIL', `Dòng đơn ${maDon} không có "${can}": ${dong.slice(0, 300)}`);
      }
      b.chiTiet.push(`Dòng đơn ${maDon}: có "${HINH_THUC_DON}", "${THU_TUC}", BA ${SO} - ${NGAY} - ${TOA}`);
    });
  }
});

// ───────────────────────────── Hàm phụ ─────────────────────────────

const modalTheoTieuDe = (page: Page, tieuDe: string) =>
  page.locator('.ant-modal-wrap:visible .ant-modal').filter({ has: page.locator('.ant-modal-title', { hasText: tieuDe }) });

/** Ô nhập/chọn của form item theo nhãn chính xác (antd đặt `title` trên label) */
const oTheoNhan = (page: Page, nhan: string) =>
  page.locator('.ant-form-item:visible').filter({ has: page.locator(`label[title="${nhan}"]`) }).locator('input').first();

async function nhanSelect(input: import('@playwright/test').Locator) {
  const item = input
    .locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]')
    .locator('.ant-select-selection-item');
  if ((await item.count()) === 0) return '';
  return ((await item.first().getAttribute('title')) || (await item.first().innerText())).trim();
}

/** Chọn và XÁC MINH nhãn khớp chính xác — không chấp nhận giá trị gần giống */
async function chonTheoNhanChinhXac(page: Page, input: import('@playwright/test').Locator, giaTri: string) {
  if ((await nhanSelect(input)) !== giaTri) await chonSelect(page, input, giaTri, { goDeLoc: false });
  const sau = await nhanSelect(input);
  if (sau !== giaTri) throw new Dung('FAIL', `Chọn "${giaTri}" nhưng ô đang là "${sau}"`);
}

async function kiemCacGiaTriCoDinh(page: Page, b: KetQuaBuoc) {
  const thuc = {
    'Hình thức đơn': await nhanSelect(oTheoNhan(page, 'Hình thức đơn')),
    'Thủ tục giải quyết': await nhanSelect(page.locator('#thongTinBanAn_thuTucGiaiQuyet')),
    'Cấp xét xử': await nhanSelect(page.locator('#thongTinBanAn_capXetXu')),
    'Số BA/QĐ': await page.locator('#thongTinBanAn_soBanAnQd').inputValue(),
    'Ngày BA/QĐ': await page.locator('#thongTinBanAn_ngayBanAnQd').inputValue(),
    'Tòa ra BA/QĐ': await tenToaDangChon(page),
  };
  const mong: Record<string, string> = {
    'Hình thức đơn': HINH_THUC_DON,
    'Thủ tục giải quyết': THU_TUC,
    'Cấp xét xử': CAP,
    'Số BA/QĐ': SO,
    'Ngày BA/QĐ': NGAY,
    'Tòa ra BA/QĐ': TOA,
  };
  const lech = Object.entries(mong).filter(([k, v]) => (thuc as Record<string, string>)[k] !== v);
  if (lech.length) {
    throw new Dung('FAIL', `Giá trị cố định bị lệch: ${lech.map(([k, v]) => `${k} = "${(thuc as Record<string, string>)[k]}" (cần "${v}")`).join('; ')}`);
  }
  b.chiTiet.push('Xác minh 6 giá trị cố định: khớp ✔');
}

/** Giá trị đang hiển thị của một trường vừa điền (để ghi danh sách trường đã nhập) */
async function docTruong(page: Page, ten: string) {
  const o = page.locator('.ant-form-item:visible').filter({ has: page.locator(`label[title="${ten}"]`) }).first();
  if (!(await o.count())) return '(đã điền)';
  const sel = o.locator('.ant-select-selection-item').first();
  if (await sel.count()) return ((await sel.getAttribute('title')) || (await sel.innerText())).trim();
  const inp = o.locator('input:not([type=checkbox]):not([type=radio]), textarea').first();
  return (await inp.count()) ? (await inp.inputValue()).trim() : '(đã điền)';
}

/** Nhãn các trường bắt buộc (dấu *) đang hiển thị trên form chính mà còn trống */
async function truongBatBuocTrong(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const ra: string[] = [];
    for (const fi of Array.from(document.querySelectorAll<HTMLElement>('.ant-form-item'))) {
      if (!fi.offsetParent || fi.closest('.ant-modal-wrap, .ant-drawer')) continue;
      const nhan = fi.querySelector('.ant-form-item-required');
      if (!nhan) continue;
      const ten = (nhan.getAttribute('title') || nhan.textContent || '').trim();
      if (fi.querySelector('.ant-select')) {
        if (!fi.querySelector('.ant-select-selection-item')) ra.push(ten);
        continue;
      }
      const o = fi.querySelector<HTMLInputElement>('input:not([type=checkbox]):not([type=radio]):not([type=file]), textarea');
      if (o) {
        if (!o.value.trim()) ra.push(ten);
        continue;
      }
      const tick = fi.querySelectorAll<HTMLInputElement>('input[type=checkbox], input[type=radio]');
      if (tick.length && !Array.from(tick).some(t => t.checked)) ra.push(ten);
    }
    return ra;
  });
}

async function moDanhSachDon(page: Page) {
  await page.goto('quan-ly-don/danh-sach-don');
  await expect(page.getByRole('button', { name: /Thêm mới$/ })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole('tab', { name: /Tổng số/ })).toBeVisible({ timeout: 60_000 });
  await choHetSpin(page);
}

interface DonKhop {
  maDon: string;
  so: string;
  ngay: string;
  toa: string;
  noiDung: string;
}

/**
 * Danh sách đơn → lọc Số BA/QĐ (máy chủ khớp chuỗi con) → mở đủ trang → đối chiếu CHÍNH XÁC
 * số + ngày + tòa trên từng dòng. Không xác minh được (API lỗi, số dòng lệch tổng) → BLOCKED.
 */
async function timDonKhop(page: Page): Promise<{ tong: number; khop: DonKhop[] }> {
  await moDanhSachDon(page);
  await go(page.getByRole('textbox', { name: 'Số BA/QĐ', exact: true }), SO);
  // So tham số đã GIẢI MÃ: số BA có "/" (vd 12/2026/DS-ST) nằm trên URL dạng 12%2F2026%2FDS-ST
  const cho = page.waitForResponse(r => /\/api\/v1\/don\?/.test(r.url()) && new URL(r.url()).searchParams.get('soBanAnQD') === SO, {
    timeout: 60_000,
  });
  await page.getByRole('button', { name: /Tìm kiếm$/ }).click();
  const res = await cho.catch(() => null);
  if (!res || !res.ok()) throw new Dung('BLOCKED', `Tìm kiếm Danh sách đơn lỗi (${res ? 'HTTP ' + res.status() : 'không phản hồi'}) → dừng để tránh tạo trùng`);
  await choHetSpin(page);

  const rong = page.locator('.ant-table-tbody').getByText('Không có dữ liệu');
  const tongChu = page.getByText(/trong tổng \d+ bản ghi/);
  await expect(rong.or(tongChu).first()).toBeVisible({ timeout: 30_000 });
  if (await rong.isVisible().catch(() => false)) return { tong: 0, khop: [] };

  let tong = Number(/trong tổng (\d+) bản ghi/.exec(await tongChu.first().innerText())?.[1] || 0);
  if (tong > 10) {
    if (tong > 100) throw new Dung('BLOCKED', `${tong} đơn chứa "${SO}" — vượt 1 trang 100, không đối chiếu hết được`);
    await page.getByRole('combobox', { name: 'kích thước trang' }).click();
    const cho100 = page.waitForResponse(r => /\/api\/v1\/don\?/.test(r.url()) && /size=100/.test(r.url()), { timeout: 60_000 });
    await page.locator('.ant-select-item-option').filter({ hasText: '100 / trang' }).click();
    await cho100;
    await choHetSpin(page);
    tong = Number(/trong tổng (\d+) bản ghi/.exec(await tongChu.first().innerText())?.[1] || 0);
  }
  const dong = (await page.locator('.ant-table-tbody tr.ant-table-row').allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim());
  if (dong.length !== tong) throw new Dung('BLOCKED', `Lưới hiện ${dong.length} dòng nhưng tổng ${tong} → không xác minh được trùng`);

  const khop: DonKhop[] = [];
  for (const t of dong) {
    const m = /Số BA\/QĐ:\s*(\S+)\s*-\s*(\d{2}\/\d{2}\/\d{4})\s*-\s*(.+?)(?=\s+(?:Bản án sơ thẩm gốc|Thủ tục giải quyết|Thẩm phán|Đã nhận|Chưa chuyển|Ngày chuyển):|$)/.exec(t);
    if (!m) continue;
    const [, so, ngay, toa] = m;
    if (so === SO && ngay === NGAY && toa.trim() === TOA) {
      khop.push({ maDon: /Mã đơn:\s*(\d+)/.exec(t)?.[1] || '?', so, ngay, toa: toa.trim(), noiDung: t });
    }
  }
  return { tong, khop };
}

/** Kiểm trùng ở TAB MỚI để không rời form đang nhập */
async function timDonKhopOTabMoi(page: Page) {
  const tab = await page.context().newPage();
  try {
    return await timDonKhop(tab);
  } finally {
    await tab.close();
  }
}

/** Gom mọi object có `soBanAn` trong phản hồi tra cứu (không phụ thuộc lớp bọc data/content) */
function timBanAn(json: unknown): Record<string, unknown>[] {
  const ra: Record<string, unknown>[] = [];
  const duyet = (x: unknown) => {
    if (Array.isArray(x)) x.forEach(duyet);
    else if (x && typeof x === 'object') {
      const o = x as Record<string, unknown>;
      if ('soBanAn' in o) ra.push(o);
      Object.values(o).forEach(duyet);
    }
  };
  duyet(json);
  return ra;
}

const khopNgay = (v: unknown) => {
  const s = String(v ?? '');
  return s.startsWith(NGAY) || s.startsWith(NGAY.split('/').reverse().join('-'));
};

const tomTat = (o: Record<string, unknown>) =>
  ['soBanAn', 'ngayBanAn', 'maDonVi', 'tenDonVi', 'giaiDoan', 'loaiAn', 'idVuAn']
    .filter(k => o[k] !== undefined && o[k] !== null)
    .map(k => `${k}=${String(o[k])}`)
    .join(' · ');

const dauThoiGian = (d: Date) => d.toISOString().replace(/[:.]/g, '-').slice(0, 19);

function ghiBaoCao(r: {
  batDau: Date;
  ketQua: KetQuaBuoc[];
  loiPhatHien: string[];
  truongDaNhap: { truong: string; giaTri: string; nguon: string }[];
  kiemTraTrung: unknown;
  maDon: string;
  idDon: string;
  trace: string;
}) {
  const ketThuc = new Date();
  const dem = (s: TrangThai) => r.ketQua.filter(b => b.trangThai === s).length;
  const thongKe = {
    PASS: dem('PASS'),
    FAIL: dem('FAIL'),
    BLOCKED: dem('BLOCKED'),
    SKIPPED_EXISTING: dem('SKIPPED_EXISTING'),
    NOT_RUN: dem('NOT_RUN'),
  };
  const json = {
    kichBan: 'e2e-gdt-1410',
    moiTruong: ORIGIN,
    batDau: r.batDau.toISOString(),
    ketThuc: ketThuc.toISOString(),
    duLieu: { soBaQd: SO, ngayBaQd: NGAY, toaRaBaQd: TOA, hinhThucDon: HINH_THUC_DON, thuTucGiaiQuyet: THU_TUC, capXetXu: CAP },
    thongKe,
    maDon: r.maDon || null,
    idDon: r.idDon || null,
    buoc: r.ketQua,
    loiPhatHien: r.loiPhatHien,
    truongDaNhap: r.truongDaNhap,
    kiemTraTrung: r.kiemTraTrung,
    trace: r.trace,
  };
  fs.writeFileSync(path.join(THU_MUC, 'test-results.json'), JSON.stringify(json, null, 2), 'utf8');

  const o = (s: string) => s.replace(/\|/g, '\\|');
  const md = [
    `# Báo cáo E2E — Đơn đề nghị GĐT bản án ${SO}`,
    '',
    `- Môi trường: ${ORIGIN}`,
    `- Thời gian: ${r.batDau.toLocaleString('vi-VN')} → ${ketThuc.toLocaleString('vi-VN')}`,
    `- Dữ liệu: Số BA/QĐ **${SO}** · Ngày **${NGAY}** · **${TOA}** · ${HINH_THUC_DON} · ${THU_TUC} · Cấp xét xử **${CAP}**`,
    `- Mã đơn: ${r.maDon || '—'} · id đơn: ${r.idDon || '—'}`,
    `- Thống kê: PASS ${thongKe.PASS} · FAIL ${thongKe.FAIL} · BLOCKED ${thongKe.BLOCKED} · SKIPPED_EXISTING ${thongKe.SKIPPED_EXISTING} · NOT_RUN ${thongKe.NOT_RUN}`,
    `- Trace: ${r.trace || '—'}`,
    '',
    '| Bước | Nội dung | Trạng thái | Bằng chứng | Chi tiết |',
    '|---|---|---|---|---|',
    ...r.ketQua.map(
      b =>
        `| ${b.ma} | ${b.ten} | **${b.trangThai}** | ${b.bangChung.map(p => `[${path.basename(p)}](${p})`).join('<br>') || '—'} | ${o(b.chiTiet.join('<br>')) || '—'} |`,
    ),
    '',
    '## Lỗi phát hiện',
    '',
    ...(r.loiPhatHien.length ? r.loiPhatHien.map(l => `- ${l}`) : ['- Không có']),
    '',
    '## Trường đã nhập',
    '',
    '| Trường | Giá trị | Nguồn |',
    '|---|---|---|',
    ...(r.truongDaNhap.length ? r.truongDaNhap.map(t => `| ${o(t.truong)} | ${o(t.giaTri)} | ${t.nguon} |`) : ['| — | — | — |']),
    '',
    '## Kết quả kiểm tra trùng đơn',
    '',
    '```json',
    JSON.stringify(r.kiemTraTrung, (k, v) => (k === 'noiDung' ? String(v).slice(0, 200) : v), 2),
    '```',
    '',
    'Giới hạn: kiểm trùng dựa trên Danh sách đơn của tài khoản đang chạy (chỉ thấy đơn trong phạm vi quyền xem).',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(THU_MUC, 'report.md'), md, 'utf8');
}
