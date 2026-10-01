/**
 * FLOW-001 · nghiệp vụ bước 09–10 — Vụ án sơ thẩm, tab "Chuẩn bị xét xử".
 *
 * Route đúng: `vu-an/dan-su/so-tham/chi-tiet` (StepData sơ thẩm_KDTM · Step 5), và TAB mở bằng
 * cách CLICK THEO TÊN — khoá `?tab=` của màn này khác, truyền sai thì ra trang trắng.
 *
 * Nguồn nghiệp vụ: StepData KDTM · Sơ thẩm Step5 + StepData sơ thẩm_KDTM · Step 7
 */
import { Locator, Page, expect, test } from '@playwright/test';
import {
  choHetSpin,
  chonNgay,
  chonSelectTheoThuTu,
  dienCapO,
  dienOTheoNhan,
  go,
  hienTrong,
  nghi,
  nguyenNhanLoi,
  moTaForm,
  oTheoNhan,
} from '../../../common/antd';
import {
  bieuMauDangMo,
  dongBieuMau,
  laySoVaKyLogic,
  luuBieuMau,
  moLaiVaKy,
  moTab,
  themBieuMauTuDanhSach,
  xacNhanHopThoai,
} from '../../../common/bieu-mau';
import { ddmmyyyy } from '../../../common/du-lieu';
import { O_BAT_BUOC_32DS } from '../../../data/kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/case-001/input';
import type { INPUT } from '../../../data/kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/case-001/input';

type DuLieuVao = typeof INPUT;
type GhiChu = (nhan: string, mo: string) => void;

/** Ngày sau n ngày kể từ hôm nay — tất định theo lượt chạy */
const ngaySau = (n: number) => ddmmyyyy(new Date(Date.now() + n * 86400_000));

/** Khối chứa danh sách quyết định/biểu mẫu của tab */
function khoiTheoTieuDe(page: Page, tieuDe: RegExp): Locator {
  return page.locator('.ant-collapse-item, .ant-card').filter({ hasText: tieuDe }).last();
}

/**
 * Đặt một ô giờ của RangePicker "Giờ xét xử" bằng cách CHỌN TRONG PANEL.
 *
 * Ô được trỏ bằng TÊN TRỢ NĂNG thật trên màn ("* Giờ xét xử" cho ô bắt đầu, "Kết thúc" cho ô sau —
 * đọc từ cây trợ năng ngày 30/09/2026), không quét `.ant-picker input` nữa: quét ra 5 ô lẫn cả ô
 * ngày, chọn nhầm thì click rơi vào lớp khác.
 *
 * Bốn cách ĐÃ THẤT BẠI: `fill` ("Giá trị sau khi nhập không đúng"), gõ + Escape (đóng cả modal),
 * gõ + Tab (antd hoàn tác về 00:00), gõ + Enter (đọc lại vẫn 00:00).
 *
 * Panel hay đóng ngay sau khi mở (dropdown của ô ngày vừa đóng làm cả cụm trượt → click báo
 * "element is not stable" rồi "not visible"), nên phải THỬ LẠI và chỉ tin khi đọc lại đúng giá trị.
 */
export async function datGioTrongPanel(page: Page, o: Locator, muon: string, nhan: string): Promise<string> {
  const [gio, phut] = muon.split(':');
  let cuoi = '';
  for (let lan = 0; lan < 3; lan++) {
    await expect(o, `Form lịch xét xử không có ô "${nhan}"`).toBeVisible({ timeout: 15_000 });
    await o.click({ timeout: 10_000 }).catch(() => {});
    const panel = page
      .locator('.ant-picker-dropdown:not(.ant-picker-dropdown-hidden)')
      .filter({ has: page.locator('.ant-picker-time-panel-column') })
      .last();
    if (!(await hienTrong(panel, 10_000))) continue;
    await nghi(page, 500, 800); // panel còn trượt thì click bị từ chối vì "not stable"

    const cot = panel.locator('.ant-picker-time-panel-column');
    if ((await cot.count()) >= 2) {
      const xong = await cot
        .nth(0)
        .locator('li')
        .filter({ hasText: new RegExp(`^${gio}$`) })
        .first()
        .click({ timeout: 8_000 })
        .then(() => true)
        .catch(() => false);
      if (!xong) continue;
      await cot
        .nth(1)
        .locator('li')
        .filter({ hasText: new RegExp(`^${phut}$`) })
        .first()
        .click({ timeout: 8_000 })
        .catch(() => {});
    }
    const nutOk = panel.getByRole('button', { name: /^OK$/i }).first();
    if (await hienTrong(nutOk, 2_000)) await nutOk.click().catch(() => {});

    cuoi = (await o.inputValue().catch(() => '')).trim();
    if (cuoi === muon) return cuoi;
  }
  throw new Error(`Không đặt được "${nhan}" = ${muon} — ô đang là "${cuoi || '(không đọc được)'}"`);
}

/** Dòng biểu mẫu đã có trong bảng của tab (chạy lại không lập trùng) */
async function daCoBieuMau(page: Page, ma: RegExp): Promise<string> {
  const dong = page.locator('.ant-table-row').filter({ hasText: ma }).first();
  if (!(await hienTrong(dong, 3_000))) return '';
  return (await dong.innerText()).replace(/\s+/g, ' ').trim();
}

interface ThamSoLapBieuMau {
  /**
   * Dùng để TÌM DÒNG trong bảng. Cột "Mẫu" hiện TÊN ĐẦY ĐỦ chứ không có mã (đo 30/09/2026),
   * nên phải khớp theo tên.
   */
  ma: RegExp;
  /** CHUỖI gõ vào ô "Chọn loại biểu mẫu" để lọc, vd. '32DS' — mã KHÔNG có dấu gạch */
  maTim: string;
  ten: string;
  tieuDeKhoi: RegExp;
  tenNut?: RegExp;
  /** Tab mở lại sau khi đóng biểu mẫu (đóng xong trang về tab mặc định) */
  tenTab?: string;
  dienThem?: (bm: Locator) => Promise<void>;
}

/** Lập một biểu mẫu: chọn loại → thêm → điền → Lưu → Lấy số → Ký → Đóng → kiểm dòng trong bảng */
async function lapBieuMau(page: Page, ghi: GhiChu, opt: ThamSoLapBieuMau): Promise<string> {
  const daCo = await daCoBieuMau(page, opt.ma);
  if (daCo) {
    ghi(opt.ten, `đã có ở lượt trước: ${daCo}`);
    if (!/Chưa có hiệu lực/i.test(daCo)) return daCo;
    // Chưa ký thì quyết định chưa có hiệu lực → bước sau không mở ra. Mở lại ký nốt.
    ghi(opt.ten, 'dòng đang "Chưa có hiệu lực" → mở lại để ký nốt');
    await moLaiVaKy(page, page.locator('.ant-table-row').filter({ hasText: opt.ma }).first(), ghi, opt.ten);
    await moTab(page, opt.tenTab ?? 'Chuẩn bị xét xử');
    return await daCoBieuMau(page, opt.ma);
  }

  const khoi = khoiTheoTieuDe(page, opt.tieuDeKhoi);
  const bm = await themBieuMauTuDanhSach(page, khoi, opt.maTim, opt.tenNut);
  await expect(bm, `Không mở được biểu mẫu ${opt.ten}`).toBeVisible({ timeout: 60_000 });
  await choHetSpin(page);

  if (opt.dienThem) await test.step(`Điền ô bắt buộc của ${opt.ten}`, () => opt.dienThem!(bm));

  await luuBieuMau(page, bm, opt.ten, ghi);
  await laySoVaKyLogic(page, bm, ghi, opt.ten);

  if (await bm.isVisible().catch(() => false)) {
    const loi = await nguyenNhanLoi(page, bm);
    if (!/không đọc được/.test(loi)) ghi('sau khi lưu', loi);
  }
  await dongBieuMau(page, bm);
  await choHetSpin(page);
  await moTab(page, opt.tenTab ?? 'Chuẩn bị xét xử');

  const dong = await daCoBieuMau(page, opt.ma);
  if (!dong) {
    const ds = (await page.locator('.ant-table-row').allInnerTexts())
      .map(s => s.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    throw new Error(
      `Lập ${opt.ten} xong nhưng không thấy dòng khớp ${opt.ma} trong bảng. ` +
        `Bảng đang có ${ds.length} dòng: ${ds.slice(0, 6).join(' // ') || '(rỗng)'}`,
    );
  }
  ghi(opt.ten, dong);
  return dong;
}

/**
 * TẠO VÀ GẮN LỊCH XÉT XỬ cho quyết định đưa vụ án ra xét xử — 47-DS (sơ thẩm) và 66-DS (phúc thẩm).
 *
 * Tách dùng chung vì hai biểu mẫu đi cùng một màn: bấm "Chọn lịch xét xử" → lịch THÁNG → click
 * ngày → form "Thêm lịch xét xử (mở phiên tòa)" → điền → "Tạo mới" → xác nhận các cảnh báo trùng
 * phòng xử / trùng thành viên HĐXX.
 *
 * @param ngayThuLy dd/mm/yyyy — ngày cần đặt lịch
 * @param nhan      tiền tố ghi sổ, vd. "47DS · lịch" / "66DS · lịch"
 * @returns ngày xét xử đã đặt, đọc lại từ form (bằng chứng, không gieo)
 */
export async function taoLichXetXu(
  page: Page,
  bm: Locator,
  ghi: GhiChu,
  ngayThuLy: string,
  input: DuLieuVao,
  nhan: string,
): Promise<string> {
  let ngayChon = '';
  /**
   * 47DS đòi CHỌN MỘT LỊCH XÉT XỬ, không phải gõ ngày vào ô — hệ thống báo
   * "Vui lòng chọn 1 lịch xét xử đã đặt trước".
   * Màn "Chọn lịch xét xử cho vụ án" là LỊCH THÁNG (đo 30/09/2026), không phải bảng.
   * Tài liệu (StepData sơ thẩm_KDTM · 7.2–7.4): bấm "Chọn lịch xét xử" → click ngày trùng
   * ngày thụ lý → tick "Cả ngày".
   */
  const nutLich = bm.getByRole('button', { name: /Chọn lịch xét xử/i }).first();
  if (!(await hienTrong(nutLich, 5_000))) {
    const ds = (await bm.getByRole('button').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim());
    throw new Error(`${nhan} không có nút "Chọn lịch xét xử". Nút đang có: ${ds.filter(Boolean).join(' | ')}`);
  }
  await nutLich.scrollIntoViewIfNeeded();
  await nutLich.click();
  await choHetSpin(page);

  const hop = bieuMauDangMo(page);
  await expect(hop, 'Bấm "Chọn lịch xét xử" nhưng không mở được màn chọn lịch').toBeVisible({ timeout: 30_000 });

  // Tài liệu Step 7.3: "Click vào ngày trùng với ngày ở Số thụ lý".
  // Ngày thụ lý LẤY TỪ STATE (bước 07 sinh `ngayThuLySoTham`), không đọc lại từ màn: đọc bằng
  // regex trên header biểu mẫu từng trượt rồi rơi về ngày mặc định ở THÁNG KHÁC, và báo
  // "không thấy ô ngày" dù lịch đang hiện đúng tháng của ngày thụ lý.
  const ngay = ngayThuLy.split('/');
  ghi('47DS · ngày chọn trên lịch', ngayThuLy);

  // Lịch này KHÔNG phải antd Calendar (không có td/.ant-picker-cell) — ô ngày là div chứa số.
  // Khớp theo TEXT CHÍNH XÁC của số ngày, thử cả dạng có số 0 đứng đầu ("01" và "1").
  const soNgay = Number(ngay[0]);
  const oNgay = hop
    .getByText(new RegExp(`^\\s*0?${soNgay}\\s*$`))
    .last();
  if (!(await hienTrong(oNgay, 5_000))) {
    const chu = (await hop.innerText()).replace(/\s+/g, ' ').slice(0, 300);
    throw new Error(`Không thấy ô ngày ${ngay.join('/')} trên lịch. Màn đang hiện: ${chu}`);
  }
  await oNgay.click();
  await choHetSpin(page);

  /**
   * Click ngày mở lớp thứ ba: form "Thêm lịch xét xử (mở phiên tòa)" với nút "Đóng | Tạo mới".
   * ⚠ "Tạo mới" CHÍNH LÀ NÚT LƯU của form này, không phải nút mở form mới — bấm khi chưa điền
   * thì nó báo "Thời gian kết thúc phải lớn hơn thời gian bắt đầu" và "Vui lòng chọn tính chất
   * phiên tòa" (đo 30/09/2026). Tick "Cả ngày" là xong phần giờ.
   */
  /**
   * NGÀY ĐÃ CÓ LỊCH thì click chỉ CHỌN lịch đó, KHÔNG mở form tạo mới. Đó là đường đi của lượt
   * thứ hai: lượt đầu tạo lịch (và biểu mẫu quyết định bị đóng mất), lượt sau mở lại quyết định
   * rồi chỉ chọn lịch sẵn có (người dùng xác nhận 01/10/2026).
   */
  const formLich = page
    .locator('.ant-modal-content:visible, .ant-drawer-content:visible')
    .filter({ hasText: /Thêm lịch xét xử/i })
    .first();
  if (!(await hienTrong(formLich, 10_000))) {
    ghi(nhan, `ngày ${ngayThuLy} đã có lịch — chỉ chọn, không tạo mới`);
    return ngayThuLy;
  }

  // Điền THẲNG cặp ngày và cặp giờ (từ → đến). Chỉ tick "Cả ngày" thì hệ thống vẫn báo
  // "Thời gian kết thúc phải lớn hơn thời gian bắt đầu" (đo 30/09/2026).
  /**
   * PHẢI GHI ĐÈ ngày. Click ô ngày trên lịch THÁNG đã điền sẵn một giá trị, và ô đó có thể rơi vào
   * tháng kế (ô ngày của tháng sau cũng hiển thị trong lưới lịch) — không ghi đè thì giữ nguyên
   * ngày sai và mỗi lượt chạy lại trôi thêm một tháng: 30/09 → 01/12/2026 → 01/01/2027
   * (đo 01/10/2026).
   */
  const dsNgay = await dienCapO(page, formLich, /Ngày xét xử/i, [ngayThuLy, ngayThuLy], true);
  if (dsNgay.length) ghi(nhan, `ngày xét xử: ${dsNgay.join(' → ')}`);
  ngayChon = dsNgay[0] || '';
  /**
   * "Giờ xét xử" — hai ô picker, mặc định `00:00 → 00:00`, phải đè cả hai.
   * Ba cách đã THẤT BẠI (đo 30/09/2026): `fill` (báo giá trị nhập không đúng), gõ rồi Escape
   * (đóng luôn cả modal), gõ rồi Tab (antd hoàn tác về 00:00). Cách ăn: mở panel rồi CHỌN
   * trong panel, hoặc gõ rồi Enter ngay trên chính ô đó.
   */
  const dsGio = [
    await datGioTrongPanel(page, formLich.getByRole('textbox', { name: /Giờ xét xử/ }).first(), input.gioBatDauXetXu, 'Giờ xét xử (bắt đầu)'),
    await datGioTrongPanel(page, formLich.getByRole('textbox', { name: /^Kết thúc$/ }).first(), input.gioKetThucXetXu, 'Giờ xét xử (kết thúc)'),
  ];
  ghi(nhan, `giờ xét xử: ${dsGio.join(' → ')}`);

  const caNgay = formLich.getByRole('checkbox', { name: /Cả ngày/i }).first();
  if (await hienTrong(caNgay, 5_000)) {
    if (!(await caNgay.isChecked().catch(() => false))) await caNgay.click({ force: true });
    ghi(nhan, 'đã tick "Cả ngày"');
  }

  for (const [nhan, giaTri] of [
    [/Tiêu đề lịch xét xử/i, input.tieuDeLichXetXu],
    [/Tính chất phiên tòa/i, input.tinhChatPhienToa],
  ] as [RegExp, string | undefined][]) {
    const gt = await dienOTheoNhan(page, formLich, nhan, giaTri).catch((e: Error) => {
      ghi(nhan, `không điền được ${String(nhan)}: ${e.message.slice(0, 80)}`);
      return '';
    });
    if (gt) ghi(nhan, `${String(nhan)} = ${gt}`);
    await choHetSpin(page);
  }

  /**
   * "Địa điểm xét xử" (thông báo lỗi gọi là "Phòng xét xử") — DANH MỤC THEO ĐƠN VỊ.
   * TANDTC có "Phòng xét xử 102 (PXX102)", "Phòng xử lưu động"…; Tòa án nhân dân khu vực 9 -
   * Hà Nội chỉ có ĐÚNG MỘT mục tên "X" (đo 30/09/2026). Vì vậy ưu tiên giá trị gieo, không có
   * thì lùi về mục đầu theo thứ tự chữ cái — vẫn tất định, và ghi rõ đã lấy gì.
   */
  let diaDiem = await dienOTheoNhan(page, formLich, /Địa điểm xét xử/i, input.diaDiemXetXu).catch(
    () => '',
  );
  if (!diaDiem) {
    diaDiem = await dienOTheoNhan(page, formLich, /Địa điểm xét xử/i);
    ghi(nhan, `đơn vị không có "${input.diaDiemXetXu}" → lấy mục đầu danh mục: ${diaDiem}`);
  } else {
    ghi(nhan, `địa điểm xét xử = ${diaDiem}`);
  }
  await choHetSpin(page);

  // Chọn phòng xử lưu động thì màn ĐẺ THÊM ô bắt buộc "Địa điểm xét xử (chi tiết)".
  const oChiTiet = oTheoNhan(page, formLich, /Địa điểm xét xử \(chi tiết\)/i);
  if (await hienTrong(oChiTiet, 2_000)) {
    await go(oChiTiet, input.diaDiemXetXuChiTiet);
    ghi(nhan, `địa điểm xét xử (chi tiết) = ${input.diaDiemXetXuChiTiet}`);
  }

  // Soi cả form TRƯỚC khi lưu: ô nào "hiện mà chưa vào state" chỉ lộ ra khi nhìn đủ các ô.
  for (const d of await moTaForm(formLich)) ghi('${nhan} · ô', d);

  const nutTaoLich = formLich.getByRole('button', { name: /^Tạo mới$/ }).first();
  await expect(nutTaoLich, 'Form lịch xét xử không có nút "Tạo mới"').toBeVisible({ timeout: 15_000 });
  await nutTaoLich.click();
  /**
   * Hệ thống hỏi xác nhận NHIỀU LẦN NỐI TIẾP, mỗi kiểu trùng một hộp (đo 30/09/2026):
   *   "Lịch xét xử đang trùng phòng xét xử Phòng xét xử 102 với Tuấn Test"
   *   "Lịch xét xử đang trùng thành viên hội đồng xét xử với …"
   * Đây là cảnh báo, không phải lỗi — nhưng bỏ sót một hộp thì lịch KHÔNG lưu mà cũng
   * KHÔNG báo lỗi gì. Vì vậy xác nhận cho tới khi không còn hộp nào.
   */
  const tieuDeHoi = page.locator('.ant-modal-confirm-title:visible');
  for (let lan = 0; lan < 4; lan++) {
    /**
     * PHẢI CHỜ hộp hiện rồi mới kiểm. Hỏi `count()` ngay sau cú bấm thì hộp chưa render, vòng lặp
     * thoát luôn và lịch không được lưu — lỗi hiện ra ở chỗ khác ("form lịch không đóng — đang chờ
     * xác nhận: Lịch xét xử đang trùng phòng xét xử …", đo 01/10/2026 ở 66-DS).
     */
    if (!(await hienTrong(tieuDeHoi.first(), lan === 0 ? 8_000 : 2_000))) break;
    const cauHoi = (await tieuDeHoi.first().innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
    await xacNhanHopThoai(page);
    await choHetSpin(page);
    if (cauHoi) ghi(nhan, `đã xác nhận cảnh báo: ${cauHoi}`);
    await nghi(page, 500, 800);
  }
  await choHetSpin(page);
  /**
   * Lưu được thì form lịch ĐÓNG; còn mở nghĩa là validate chặn — mà form lịch còn mở thì nút
   * "Lưu" của 47DS bên dưới bị che, click sẽ hết giờ 30s không nói được vì sao.
   *
   * Phải neo theo ĐÚNG TIÊU ĐỀ modal lịch: `formLich` là "lớp đang mở ngoài cùng", modal lịch
   * đóng rồi thì nó trỏ ngay sang hộp 47DS và báo nhầm là chưa đóng (đo 30/09/2026 — lúc đó
   * toast đã là "Lưu lịch xét xử thành công").
   */
  const modalLich = page
    .locator('.ant-modal-content:visible, .ant-drawer-content:visible')
    .filter({ hasText: /Thêm lịch xét xử \(mở phiên tòa\)/ });
  const daDong = await modalLich
    .first()
    .waitFor({ state: 'hidden', timeout: 15_000 })
    .then(() => true)
    .catch(() => false);
  if (!daDong && (await modalLich.count())) {
    for (const d of await moTaForm(modalLich.first())) ghi('${nhan} · sau khi lưu', d);
    throw new Error(
      `Bấm "Tạo mới" nhưng form lịch xét xử không đóng — ${await nguyenNhanLoi(page, modalLich.first())}`,
    );
  }
  ghi(nhan, 'đã lưu lịch xét xử (form đã đóng)');
  return ngayChon;
}

// ═════════ BƯỚC 09 · Thông báo phiên họp kiểm tra chứng cứ (32DS) ═════════
/**
 * ĐO THẬT 30/09/2026 — danh mục "Chọn loại biểu mẫu" của tab có 6 mục:
 *   32DS (phiên họp kiểm tra chứng cứ — KHÔNG hòa giải) · 38DS · 02QDDS · 06HC · 22HC · Tài liệu khác
 *
 * Khác tài liệu: mã KHÔNG có dấu gạch ("32DS"), và vụ này được đánh dấu KHÔNG hòa giải nên không
 * có 31-DS/34-DS/35-DS.
 */
export async function soThamPhienHopHoaGiai(page: Page, input: DuLieuVao, ghi: GhiChu) {
  await moTab(page, 'Chuẩn bị xét xử');

  const soThongBao31DS = await lapBieuMau(page, ghi, {
    ma: /Thông báo về phiên họp kiểm tra/i,
    maTim: '32DS',
    ten: '32DS (thông báo phiên họp kiểm tra chứng cứ)',
    tieuDeKhoi: /Danh sách quyết định|Chuẩn bị xét xử/i,
    dienThem: async bm => {
      const oNgayHop = oTheoNhan(page, bm, /Ngày (mở )?phiên họp/i);
      if (await hienTrong(oNgayHop, 3_000)) await chonNgay(oNgayHop, ngaySau(7));
      const oDiaDiem = oTheoNhan(page, bm, /Phòng số|Địa điểm/i);
      if ((await hienTrong(oDiaDiem, 3_000)) && (await oDiaDiem.isEditable().catch(() => false))) {
        await go(oDiaDiem, input.diaDiemPhienHop);
      }
      // Ô bắt buộc khai trong dữ liệu gieo, ĐÚNG THỨ TỰ: "Lý do/căn cứ cụ thể" nạp theo "Phân loại"
      for (const [nhan, giaTri] of O_BAT_BUOC_32DS) {
        const gt = await dienOTheoNhan(page, bm, nhan, giaTri);
        ghi('32DS', `${String(nhan)} = ${gt || '(bỏ qua)'}`);
        await choHetSpin(page);
      }
    },
  });

  return {
    soThongBao31DS,
    soBienBan35DS: '(không áp dụng — vụ không hòa giải)',
    soBienBan34DS: '(không áp dụng — vụ không hòa giải)',
  };
}

// ═════════ BƯỚC 10 · Quyết định đưa vụ án ra xét xử sơ thẩm (47DS) ═════════
/** @param ngayThuLy dd/mm/yyyy, lấy từ state (`ngayThuLySoTham` do bước 07 sinh) */
export async function soThamDuaRaXetXu(page: Page, input: DuLieuVao, ghi: GhiChu, ngayThuLy: string) {
  await moTab(page, 'Chuẩn bị xét xử');
  /**
   * Ngày mở phiên tòa PHẢI đọc từ lịch xét xử đã lưu, không được gieo sẵn.
   * Trước đây chỗ này trả `ngaySau(14)` → sổ cái ghi 14/10/2026 trong khi lịch thật đặt
   * 30/09/2026: bằng chứng giả, và bước sau (bản án) sẽ đối chiếu nhầm ngày.
   */
  let ngayMoPhienToaSoTham = '';

  const soQuyetDinh47DS = await lapBieuMau(page, ghi, {
    ma: /đưa vụ án ra xét xử/i,
    maTim: '47DS',
    ten: '47DS (đưa vụ án ra xét xử)',
    tieuDeKhoi: /Danh sách quyết định|Chuẩn bị xét xử/i,
    dienThem: async bm => {
      ngayMoPhienToaSoTham = await taoLichXetXu(page, bm, ghi, ngayThuLy, input, '47DS · lịch');

      const oDiaDiem = oTheoNhan(page, bm, /Phòng số|Địa điểm/i);
      if ((await hienTrong(oDiaDiem, 3_000)) && (await oDiaDiem.isEditable().catch(() => false))) {
        await go(oDiaDiem, input.diaDiemPhienToa);
      }
    },
  });

  if (!ngayMoPhienToaSoTham) {
    // Chạy lại mà 47DS đã có từ lượt trước thì không mở form lịch nữa → suy ra từ ngày thụ lý,
    // đúng bằng ngày kịch bản luôn đặt lịch (click đúng ô ngày đó trên lịch tháng).
    ngayMoPhienToaSoTham = ngayThuLy;
    ghi('ngày mở phiên tòa sơ thẩm', 'lấy lại theo ngày thụ lý (47DS đã lập từ lượt trước)');
  }
  ghi('ngày mở phiên tòa sơ thẩm', ngayMoPhienToaSoTham);
  return { soQuyetDinh47DS, ngayMoPhienToaSoTham };
}
