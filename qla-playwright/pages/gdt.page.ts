import { Locator, Page, expect } from '@playwright/test';
import { choHetSpin, chonNgay, chonRadio, chonSelect, go, hienTrong, luoiDaTai, nghi, nguyenNhanLoi, toastDaHien } from '../common/antd';
import { NguoiGia } from '../common/du-lieu';
import { dienFormNguoi } from '../common/form-nguoi';
import { moMenu } from '../common/menu';
import { moTab, xacNhanHopThoai } from '../common/bieu-mau';

/**
 * Phân hệ Quản lý án GĐT/TT (qla-webapp pages/VuAn/GdtTt):
 * - Nhận đơn và TL vụ án: NhanDonThuLyVuAn (/vu-an/gdt-tt/nhan-don-tl-vu-an/danh-sach)
 * - Quản lý vụ án: QuanLyAn (danh sách) → ChiTietVuAnGDT (/vu-an/gdt-tt/quan-ly-an/chi-tiet?id=)
 * - Phân công TTV: PhanCongTTV
 */
const MENU_GDT = 'Quản lý án GĐT/TT';

/** Regex chấp nhận cả hai kiểu bỏ dấu "oà"/"òa", "oá"/"óa"… (FE và cấu hình không thống nhất) */
function boDauLinhHoat(ten: string): string {
  const cap: [string, string][] = [['oà', 'òa'], ['oá', 'óa'], ['oả', 'ỏa'], ['oã', 'õa'], ['oạ', 'ọa'], ['uỳ', 'ùy'], ['uý', 'úy'], ['uỷ', 'ủy'], ['uỹ', 'ũy'], ['uỵ', 'ụy']];
  let kq = ten.normalize('NFC').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const [a, b] of cap) kq = kq.replace(new RegExp(`${a}|${b}`, 'g'), `(?:${a}|${b})`);
  return kq;
}

/**
 * Ô lọc số bản án/quyết định trên các màn danh sách GĐT-TT. Nhãn và placeholder KHÔNG thống nhất giữa
 * các màn, và trên màn "Phân công TTV" còn đổi theo Hình thức phân công: lọc theo Hồ sơ kháng nghị thì
 * ô tên là "Số BA/QĐ" với placeholder "Nhập dữ liệu" (28/09/2026: B18 treo 30s vì tìm placeholder
 * "Nhập số bản án/quyết định"). Thử lần lượt placeholder → id form (soBanAnQuyetDinh / soBanAnQd) →
 * nhãn; chưa thấy thì bấm "Mở rộng" rồi tìm lại. Trả về null nếu màn thật sự không có ô lọc này.
 */
async function oSoBanAn(page: Page, cho = 5_000): Promise<Locator | null> {
  const tim = async (ms: number) => {
    const ungVien = [
      page.getByPlaceholder(/số (bản án|BA)\s*\/\s*(quyết định|QĐ)/i),
      page.locator('input[id="soBanAnQuyetDinh"], input[id$="_soBanAnQuyetDinh"], input[id="soBanAnQd"], input[id$="_soBanAnQd"]'),
      page.getByLabel(/^Số (BA\/QĐ|bản án\/quyết định)$/i),
    ];
    for (const o of ungVien) if (await hienTrong(o.first(), ms)) return o.first();
    return null;
  };
  const o = await tim(cho);
  if (o) return o;
  const moRong = page.getByRole('button', { name: /Tìm kiếm nâng cao|Mở rộng|Nâng cao/ }).first();
  if (await hienTrong(moRong, 3_000)) {
    await moRong.click();
    return tim(5_000);
  }
  return null;
}

/**
 * Phần đặc trưng của TÊN TÒA để khớp dòng trên bảng. Cần vì bộ dữ liệu 28/09/2026 có số bản án rất
 * ngắn (1, 2, 3, 10) và trên STG trùng dày (số 1 có 17 vụ, số 2 có 8) — lọc theo "số + ngày" là
 * không đủ. Mã vụ án trong file là mã SƠ THẨM, không hiện trên màn GĐT (màn hiện mã vụ giải quyết
 * đơn) nên không dùng làm khoá được; còn tòa ra bản án thì màn nào cũng hiện.
 * FE ghi khi thì đầy đủ "Tòa án nhân dân thành phố Hải Phòng", khi thì tắt "TAND thành phố Hải Phòng"
 * → chỉ khớp phần đuôi sau tiền tố.
 */
const duoiTenToa = (toaAn?: string): RegExp | undefined => {
  const t = (toaAn || '').replace(/^\s*(Tòa án nhân dân|TAND)\s*/i, '').trim();
  return t ? new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : undefined;
};

/**
 * Bộ điều kiện tìm dòng của MỘT vụ trong bảng: số bản án ĐỨNG RIÊNG + ngày bản án + tòa ra bản án.
 *
 * Ngày và tòa là điều kiện PHỤ. Bộ 28/09/2026 có số bản án 1–3 chữ số, trùng hàng chục vụ khác trên
 * STG nên rất cần hai điều kiện này để không thao tác nhầm vụ; nhưng không phải bảng nào cũng hiện đủ
 * (màn "Phân công TTV" chỉ hiện đơn vị gửi là Vụ, còn cột "Thông tin BA/QĐ" ở màn Phân công thẩm phán
 * lấy ngày/tòa từ thongTinBanAn nên có hình thức phân công bỏ trống). Vì vậy gọi noiDieuKienNeuCan()
 * sau mỗi lần lọc/đổi tab: nếu lọc đủ điều kiện ra rỗng thì nới dần (bỏ tòa → bỏ ngày → bỏ cả hai) và
 * CHỈ nhận phương án nới nào cho đúng MỘT dòng, đồng thời ghi rõ đã nới gì vào log.
 */
function boLocDong(
  page: Page,
  soBanAn: string,
  ngayBanAn?: string,
  toaAn?: string,
  soThuLy?: string,
  duongSu?: string,
) {
  const soRieng = new RegExp('(^|[^0-9])' + soBanAn + '([^0-9]|$)');
  const reToaGoc = duoiTenToa(toaAn);
  let reToa = reToaGoc;
  let dungNgay = !!ngayBanAn;
  // Tên đương sự là điều kiện phụ NỮA: ở màn không hiện ngày bản án nó thường là thứ duy nhất tách
  // được hai vụ cùng số (B15 của K07/K09/K10), nhưng màn nào không hiện tên thì lọc kèm sẽ ra rỗng
  // (Danh sách vụ xét xử) → cũng phải nới được như ngày/tòa.
  let dungDuongSu = !!duongSu;
  const dsVoi = (coNgay: boolean, re?: RegExp, coDuongSu = dungDuongSu) => {
    let d = page.locator('.ant-table-row:visible').filter({ hasText: soRieng });
    if (coDuongSu && duongSu) d = d.filter({ hasText: duongSu });
    if (coNgay && ngayBanAn) d = d.filter({ hasText: ngayBanAn });
    return re ? d.filter({ hasText: re }) : d;
  };
  const ds = () => dsVoi(dungNgay, reToa);
  return {
    ds,
    dong: () => ds().first(),
    coToa: () => !!reToa,
    /** Gọi sau mỗi lần lọc/đổi tab, TRƯỚC khi kết luận "không thấy vụ" */
    async noiDieuKienNeuCan(cho = 8_000) {
      if (!reToa && !dungNgay && !dungDuongSu) return;
      if (await hienTrong(ds().first(), cho)) return;
      const phuongAn: { ngay: boolean; re?: RegExp; nguoi?: boolean; mo: string }[] = [];
      if (reToaGoc) phuongAn.push({ ngay: dungNgay, re: undefined, mo: 'bỏ điều kiện tòa' });
      if (ngayBanAn) phuongAn.push({ ngay: false, re: reToaGoc, mo: 'bỏ điều kiện ngày bản án' });
      if (reToaGoc && ngayBanAn) phuongAn.push({ ngay: false, re: undefined, mo: 'bỏ cả ngày và tòa' });
      if (duongSu) {
        phuongAn.push({ ngay: dungNgay, re: reToa, nguoi: false, mo: 'bỏ điều kiện tên đương sự' });
        phuongAn.push({ ngay: false, re: undefined, nguoi: false, mo: 'bỏ cả ngày, tòa và tên đương sự' });
      }
      for (const p of phuongAn) {
        const thu = dsVoi(p.ngay, p.re, p.nguoi ?? dungDuongSu);
        if (!(await hienTrong(thu.first(), 2_000))) continue;
        if ((await thu.count()) !== 1) continue; // còn nhiều dòng → không dám chọn, để báo lỗi rõ
        dungNgay = p.ngay;
        reToa = p.re;
        if (p.nguoi !== undefined) dungDuongSu = p.nguoi;
        const chu = (await thu.first().innerText()).replace(/\s+/g, ' ').trim();
        console.log(
          `    · Bảng thiếu cột để lọc đủ điều kiện → ${p.mo}, còn đúng một dòng số ${soBanAn}: ` +
            chu.slice(0, 160),
        );
        return;
      }
    },
  };
}

/**
 * Đổi cỡ trang của bảng sang 100 dòng.
 *
 * Vì sao: ô lọc "Số BA/QĐ" khớp theo CHUỖI CON ở phía máy chủ — lọc số "3" trả về cả 34, 377, 23…
 * (đo 29/09/2026 ở màn Phân công TTV) — nên dòng của vụ rất dễ rơi sang trang 2 và bị kết luận nhầm là
 * "không có vụ". Bảng nào không có ô đổi cỡ trang thì bỏ qua.
 */
async function moRongCoTrang(page: Page) {
  const o = page.locator('.ant-pagination-options .ant-select').first();
  if (!(await hienTrong(o, 3_000))) return;
  if (/100/.test((await o.innerText().catch(() => '')) || '')) return;
  await o.click();
  const muc = page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: new RegExp('^100\\s*/\\s*trang$') }).last();
  if (await hienTrong(muc, 3_000)) {
    await muc.click();
    await choHetSpin(page);
    await nghi(page, 800, 1200);
  } else {
    await page.keyboard.press('Escape');
  }
}

/**
 * Chọn tab "Tờ trình" ở màn chi tiết vụ án GĐT.
 *
 * ⚠ Mở URL kèm `&tab=to-trinh` KHÔNG còn chọn tab (bản FE 02/10/2026 vẫn mở "Thông tin vụ án"), nên
 * nút "Tạo văn bản" không có trên màn và cú bấm hết 30 s. Bấm thẳng vào tab theo tên.
 */
/**
 * Đặt ô "Chủ tọa" trong popup "Danh sách vụ xét xử đã chọn".
 *
 * ⚠ Chủ toạ QUYẾT ĐỊNH AI DUYỆT Chương trình làm việc HĐXX: văn bản trình ký xong nằm ở hàng chờ của
 * người ký, mà người ký là chủ toạ. Popup trình ký của màn này KHÔNG có ô "Cấp trình"/"Người được
 * trình" (chỉ có Người ký đã khoá), nên không chỉnh được ở bước sau — phải đặt từ đây.
 */
async function datChuToaHdxx(page: Page, pop: Locator, ten: string) {
  const o = pop
    .locator('.ant-form-item')
    .filter({ has: page.locator('label').filter({ hasText: /^\s*Chủ tọa/ }) })
    .first();
  const khung = (await o.count()) ? o : pop.locator('.ant-select').filter({ hasText: /Chủ tọa/ }).first();
  if (!(await hienTrong(khung, 5_000))) {
    console.log('    · Popup danh sách vụ xét xử: không thấy ô "Chủ tọa" → giữ nguyên người hệ thống phân công');
    return;
  }
  const dangCo = (await khung.locator('.ant-select-selection-item').first().innerText().catch(() => ''))
    .replace(/\s+/g, ' ')
    .trim();
  if (dangCo.toLowerCase().includes(ten.toLowerCase())) {
    console.log(`    · Chủ tọa đã là "${dangCo}" → không đổi`);
    return;
  }
  const oNhap = khung.locator('input').first();
  await chonSelect(page, oNhap, ten, { goDeLoc: true }).catch(async () => {
    const ds = (await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').allInnerTexts().catch(() => []))
      .map(x => x.replace(/\s+/g, ' ').trim())
      .slice(0, 20);
    throw new Error(`Không chọn được Chủ tọa "${ten}". Danh sách đang có: ${ds.join(' | ') || '(không đọc được)'}`);
  });
  const sau = (await khung.locator('.ant-select-selection-item').first().innerText().catch(() => '')).trim();
  console.log(`    · Chủ tọa: "${dangCo || '(trống)'}" → "${sau}"`);
}

async function moTabToTrinh(page: Page) {
  /**
   * NEO TRONG `main`: Menu V3 cũng dùng `role=tab` (thẻ Ghim nhanh / Gần đây) nên `getByRole('tab')`
   * trên cả trang rồi `.first()` có thể trúng tab của menu, click xong vẫn ở "Thông tin vụ án".
   */
  // CHỜ MÀN CHI TIẾT VẼ XONG trước: gọi ngay sau `goto` thì chưa có thẻ tab nào, hàm thoát sớm
  await page.getByText(/Chi tiết vụ án/).first().waitFor({ state: 'visible', timeout: 60_000 }).catch(() => {});
  await choHetSpin(page);

  const nutTaoVanBan = page.getByRole('button', { name: /Tạo văn bản/ }).first();
  if (await hienTrong(nutTaoVanBan, 3_000)) return; // đang ở đúng tab rồi

  /**
   * Dùng `moTab` dùng chung (common/bieu-mau) — nó đã gánh các cái bẫy của thẻ tab antd: tên chính
   * xác trước rồi mới khớp chuỗi con, và bấm vào `.ant-tabs-tab` khi `[role=tab]` bị lớp khác che
   * (`click({force:true})` trên thẻ bị che vẫn gửi sự kiện cho lớp che, nên tab không đổi).
   */
  await moTab(page, 'Tờ trình').catch(() => {});
  await nghi(page, 1000, 1500);
  console.log(`    · Bấm tab "Tờ trình": ${(await hienTrong(nutTaoVanBan, 10_000)) ? 'đã thấy nút "Tạo văn bản"' : 'VẪN CHƯA thấy nút "Tạo văn bản"'}`);
}

export class GdtPage {
  /**
   * Loại án của vụ đang thao tác ("Kinh doanh thương mại", "Dân sự", "Hình sự"…).
   *
   * BẮT BUỘC đặt trước các bước dùng màn "Quản lý xét xử GĐT" / "Danh sách vụ xét xử" / "Phân công
   * Hội đồng xét xử": ô lọc "Loại án" của những màn này MẶC ĐỊNH LÀ "Hình sự" (đo trên STG
   * 30/09/2026: các ô select đang chọn = "Hình sự | Tòa án nhân dân tối cao"). Không đổi ô đó thì
   * mọi vụ không phải hình sự đều bị lọc mất — lọc theo số bản án ra 0 dòng dù vụ vẫn ở đó.
   * Đây là nguyên nhân B15/B21/B23 của đợt KDTM 28/09/2026 luôn báo "Không thấy vụ án".
   */
  loaiAn?: string;

  constructor(readonly page: Page) {}

  /** Đặt ô lọc "Loại án" đúng loại án của vụ (bỏ qua nếu màn không có ô này hoặc đã đúng) */
  private async datLoaiAn() {
    if (!this.loaiAn) return;
    const { page } = this;
    const o = page.getByLabel(/^Loại án$/).or(page.locator('#loaiAn')).first();
    if (!(await hienTrong(o, 4_000))) return;
    const khung = o.locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]');
    const dangChon = (await khung.locator('.ant-select-selection-item').first().innerText().catch(() => '')).trim();
    if (dangChon === this.loaiAn) return;
    await chonSelect(page, o, this.loaiAn);
    console.log(`    · Ô lọc "Loại án" đang là "${dangChon || '(trống)'}" → đổi sang "${this.loaiAn}"`);
  }

  /**
   * Mở "Tìm kiếm nâng cao" (nút link của SearchableProTable, nhãn "Tìm kiếm nâng cao"/"Thu gọn") rồi
   * đặt hai ô lọc phía MÁY CHỦ để danh sách chỉ còn vụ của bản án này: "Ngày BA/QĐ" và "Tòa ra BA/QĐ".
   *
   * Vì sao cần: nhiều màn không hiện ngày bản án trên dòng, nên lọc bằng chữ trên dòng vô hiệu với bộ
   * 28/09/2026 (số bản án 1–3 chữ số trùng hàng chục vụ khác trên STG).
   * Ô nào không có/không chọn được thì bỏ qua — không làm hỏng các màn khác.
   */
  private async locNangCaoBanAn(
    ngayBanAn?: string,
    toaAn?: string,
    soThuLy?: string,
    moNangCao = true,
    maDon?: string,
  ) {
    const { page } = this;
    if (!ngayBanAn && !toaAn && !soThuLy && !maDon) return;
    // Nút link của SearchableProTable: đang đóng thì nhãn là "Tìm kiếm nâng cao", đang mở là "Thu gọn"
    const nut = page.getByRole('button', { name: /Tìm kiếm nâng cao$/ }).first();
    if (moNangCao && (await hienTrong(nut, 5_000))) {
      await nut.click();
      await nghi(page, 800, 1200);
    }
    if (ngayBanAn) {
      // Tuỳ màn mà ô này là DatePicker đơn (Phân công TTV: ProFormDatePicker "Ngày bản án/quyết định")
      // hoặc RangePicker hai ô (Quản lý vụ án: "Ngày BA/QĐ"). RangePicker chỉ điền ô đầu thì khoảng
      // ngày không hợp lệ và máy chủ trả về danh sách CHƯA LỌC → phải gõ cả ô kết thúc.
      const oNgay = page.getByLabel(/^Ngày (BA\/QĐ|bản án\/quyết định)$/).first();
      if (await hienTrong(oNgay, 5_000)) {
        const laKhoang = await oNgay.evaluate(el => !!el.closest('.ant-picker-range')).catch(() => false);
        await oNgay.click();
        await oNgay.fill(ngayBanAn);
        await page.keyboard.press('Enter');
        if (laKhoang) {
          await nghi(page, 400, 800);
          await page.keyboard.type(ngayBanAn); // antd chuyển con trỏ sang ô kết thúc sau Enter
          await page.keyboard.press('Enter');
        }
        await page.keyboard.press('Escape');
      }
    }
    if (toaAn) {
      const oToa = page.getByLabel(/^Tòa ra (BA\/QĐ|bản án\/quyết định)$/).first();
      if (await hienTrong(oToa, 5_000)) {
        // Danh mục tòa án dài (hàng nghìn dòng, ảo hoá) → gõ để lọc rồi chọn. CHỌN NHẦM TÒA thì danh
        // sách trả về rỗng và bước sau kết luận sai là "vụ chưa có" → chọn xong phải ĐỐI CHIẾU nhãn
        // đang hiện, lệch thì xoá điều kiện tòa đi.
        const khung = oToa.locator('xpath=ancestor::*[contains(@class,"ant-select")][1]');
        await chonSelect(page, oToa, toaAn, { goDeLoc: true }).catch(() => undefined);
        const nhan = khung.locator('.ant-select-selection-item').first();
        const dangChon = ((await nhan.getAttribute('title').catch(() => null)) ||
          (await nhan.innerText().catch(() => '')) ||
          '') as string;
        const reToa = duoiTenToa(toaAn);
        if (!dangChon || !reToa || !reToa.test(dangChon)) {
          console.log(`    · "Tòa ra bản án/quyết định" đang là "${dangChon || '(trống)'}" ≠ ${toaAn} → bỏ điều kiện tòa`);
          const xoa = khung.locator('.ant-select-clear');
          if (await xoa.count()) await xoa.first().click({ force: true }).catch(() => undefined);
        }
      }
    }
    if (soThuLy) {
      const oTL = page.getByLabel(/^Số thụ lý$/).first();
      if (await hienTrong(oTL, 3_000)) await go(oTL, soThuLy);
    }
    if (maDon) {
      // "Mã đơn" là khoá chắc chắn nhất ở màn "Nhận đơn và TL vụ án": mỗi dòng đều hiện "Mã đơn:xxxxx"
      // và ô lọc nằm trong Tìm kiếm nâng cao (extraAdvancedSearchItems của NhanDonThuLyVuAn/index.tsx).
      const oMa = page.getByLabel(/^Mã đơn$/).first();
      if (await hienTrong(oMa, 3_000)) await go(oMa, maDon);
      else console.log('    · Màn không có ô lọc "Mã đơn" → giữ nguyên bộ lọc hiện tại');
    }
  }

  /**
   * Xoá lại các ô lọc ngày/tòa đã đặt rồi Tìm kiếm lại.
   *
   * Vì sao cần: lọc phía máy chủ ra RỖNG không có nghĩa là vụ chưa có. Nhiều bản ghi để trống ngày/tòa
   * bản án (cột "Thông tin BA/QĐ" ở màn Phân công thẩm phán lấy từ thongTinBanAn, có hình thức không
   * có dữ liệu này), và danh mục tòa có thể lệch mã. Khi lọc đủ điều kiện ra rỗng thì nới bằng cách xoá
   * hai ô này và tìm lại, rồi để noiDieuKienNeuCan() khớp dòng (chỉ nhận khi còn đúng một dòng).
   */
  /**
   * Lọc theo ô "Nguyên đơn/Người khiếu nại" (hoặc "Bị đơn/Bị cáo") nếu màn có. Trả về true khi đã điền.
   *
   * Vì sao cần: ở màn "Quản lý xét xử GĐT" (quan-ly-vu-xet-xu) hai ô "Số BA/QĐ" và "Ngày BA/QĐ" KHÔNG
   * tìm ra gì — nghiệp vụ đã thử tay ngày 29/09/2026 và DB xác nhận nguyên nhân: KHÔNG vụ án GĐ2 nào có
   * bản ghi BAN_AN (kiểm VA26-004803/4805/4806/4589), nên điều kiện lọc theo bản án luôn rỗng. Tên đương
   * sự nằm ngay trên vụ nên lọc được.
   */
  private async locTheoDuongSuNeuCo(duongSu?: string): Promise<boolean> {
    const { page } = this;
    if (!duongSu) return false;
    const oNguoi = () =>
      page
        .getByLabel(/^(Nguyên đơn\/Người khiếu nại|Bị đơn\/Bị cáo)$/)
        .or(page.getByPlaceholder(/Nhập tên nguyên đơn|Nhập tên bị đơn/))
        .first();
    // Ô này thường nằm trong "Tìm kiếm nâng cao" (thanh lọc mặc định chỉ có vài ô đầu) → mở rồi tìm lại
    if (!(await hienTrong(oNguoi(), 4_000))) {
      const nut = page.getByRole('button', { name: /Tìm kiếm nâng cao$/ }).first();
      if (await hienTrong(nut, 4_000)) {
        await nut.click();
        await nghi(page, 800, 1200);
      }
    }
    if (!(await hienTrong(oNguoi(), 5_000))) {
      console.log('    · Màn không có ô "Nguyên đơn/Người khiếu nại" → không lọc được theo tên đương sự');
      return false;
    }
    await go(oNguoi(), duongSu);
    return true;
  }

  private async xoaLocNgayToaVaTimLai() {
    const { page } = this;
    const oNgay = page.getByLabel(/^Ngày (BA\/QĐ|bản án\/quyết định)$/).first();
    if (await hienTrong(oNgay, 3_000)) {
      await oNgay.click();
      await oNgay.fill('');
      await page.keyboard.press('Escape');
      // RangePicker: nút xoá của cả khoảng ngày
      const xoa = page.locator('.ant-picker-clear:visible').first();
      if (await hienTrong(xoa, 1_500)) await xoa.click().catch(() => {});
    }
    const oToa = page.getByLabel(/^Tòa ra (BA\/QĐ|bản án\/quyết định)$/).first();
    if (await hienTrong(oToa, 2_000)) {
      const xoaToa = oToa.locator('xpath=ancestor::*[contains(@class,"ant-select")][1]').locator('.ant-select-clear');
      if (await xoaToa.count()) await xoaToa.first().click({ force: true }).catch(() => {});
    }
    const nut = page.getByRole('button', { name: /Tìm kiếm$/ }).first();
    if (await hienTrong(nut, 3_000)) {
      await nut.click();
      await choHetSpin(page);
      await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
      await nghi(page, 1200, 2000);
    }
  }

  /** Nhận đơn và TL vụ án → tab "Đã có vụ án" → lọc Số bản án → phải thấy đúng mã đơn (vụ án đã tự sinh) */
  async kiemTraDaCoVuAn(soBanAn: string, maDon: string) {
    const { page } = this;
    await moMenu(page, [MENU_GDT, 'Nhận đơn và TL vụ án']);
    await page.getByRole('tab', { name: /^Đã có vụ án/ }).click();
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    await go(page.locator('#soBanAnQd'), soBanAn);
    await page.getByRole('button', { name: /Tìm kiếm$/ }).first().click();
    const dong = page.locator('.ant-table-row').filter({ hasText: `Mã đơn:${maDon}` }).or(
      page.locator('.ant-table-row').filter({ hasText: `Mã đơn: ${maDon}` }),
    );
    await this.phaiThayDong(dong.first(), `Đơn ${maDon} chưa có vụ án ở màn Nhận đơn và TL vụ án`);
  }

  /** Quản lý vụ án → lọc Số BA/QĐ → "Xem chi tiết" → trả về id vụ án */
  async moVuAn(soBanAn: string, ngayBanAn?: string, toaAn?: string, duongSu?: string) {
    const { page } = this;
    await moMenu(page, [MENU_GDT, 'Quản lý vụ án']);
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    // Màn này KHÔNG hiện ngày bản án trên dòng (cột chỉ có "Số TL / Ngày TL" là số–ngày thụ lý) nên
    // KHÔNG dùng ô lọc "Ngày BA/QĐ" / "Tòa ra BA/QĐ" trong Tìm kiếm nâng cao của màn này: hai ô đó nối
    // sang bản ghi BAN_AN, mà vụ án GĐ3 KHÔNG có BAN_AN (thông tin bản án nằm trên ĐƠN) nên lọc kèm là
    // danh sách RỖNG dù vụ vẫn ở đó — ảnh chụp lỗi 29/09/2026 của VG03 (bản án 514) cho thấy đúng cảnh
    // này: lọc Số 514 + Ngày 16/09 + Tòa → "Không có dữ liệu".
    // Chỉ lọc SỐ bản án (máy chủ khớp chuỗi con) rồi mở rộng cỡ trang và khớp ngày/tòa trên DÒNG.
    const o = await oSoBanAn(page, 10_000);
    if (!o) throw new Error('Màn Quản lý vụ án: không thấy ô lọc số bản án/quyết định');
    await go(o, soBanAn);
    // Thêm TÊN ĐƯƠNG SỰ: hai vụ cùng số bản án mà màn không hiện ngày thì không có cách nào tách
    // (đo 29/09/2026: K03 – bản án 2 ra 2 vụ). Màn có sẵn ô "Nguyên đơn/Người khiếu nại" và "Bị cáo".
    if (duongSu) {
      const oNguoi = page
        .getByPlaceholder(/Nhập tên nguyên đơn|Nhập tên bị cáo/)
        .or(page.getByLabel(/^(Nguyên đơn\/Người khiếu nại|Bị cáo)$/))
        .first();
      if (await hienTrong(oNguoi, 5_000)) await go(oNguoi, duongSu);
    }
    await page.getByRole('button', { name: /Tìm kiếm$/ }).first().click();
    await choHetSpin(page);
    await moRongCoTrang(page);
    // Bảng nhóm theo vụ: có dòng ẩn (quan-ly-an-group-row) → chỉ lấy dòng đang hiện.
    // Số bản án phải ĐỨNG RIÊNG + đúng ngày: khớp chuỗi con làm B13a mở nhầm vụ khác cùng số bản án
    // rồi tạo dự thảo kháng nghị trên vụ đó, trong khi vụ của mình vẫn trắng (27/09/2026: VG02 số 515
    // ngày 09/09/2024 bị mở sang vụ 515 ngày 07/10/2024 của VG06).
    const soRieng = new RegExp(`(^|[^0-9])${soBanAn}([^0-9]|$)`);
    const dsTheoSo = () => page.locator('.ant-table-row:visible').filter({ hasText: soRieng });
    let reToa = duoiTenToa(toaAn);
    let ds = reToa ? dsTheoSo().filter({ hasText: reToa }) : dsTheoSo();
    // Tòa ra bản án để phân biệt các vụ cùng số bản án (bộ 28/09/2026 số 1–3 chữ số). Nếu lọc kèm tòa
    // ra rỗng mà bỏ tòa lại có dòng thì tên tòa trên màn viết khác bộ dữ liệu → bỏ điều kiện tòa, kẻo
    // báo lỗi giả.
    if (reToa && !(await hienTrong(ds.first(), 8_000)) && (await hienTrong(dsTheoSo().first(), 2_000))) {
      console.log(`    · Quản lý vụ án: lọc kèm tòa "${toaAn}" không ra dòng nào → bỏ điều kiện tòa`);
      reToa = undefined;
      ds = dsTheoSo();
    }
    let dong = (ngayBanAn ? ds.filter({ hasText: ngayBanAn }) : ds).first();
    // Nghiệp vụ yêu cầu (28/09/2026) tạm bỏ điều kiện ngày bản án: vụ án trên màn có thể mang ngày khác
    // với ngày trong bộ dữ liệu (đơn bị gộp vào vụ cùng số bản án). Bỏ ngày là RỦI RO — vụ khác cùng số
    // bản án sẽ bị mở nhầm rồi tạo dự thảo kháng nghị lên đó — nên chỉ bỏ khi lọc theo ngày không ra và
    // sau khi lọc CHỈ CÒN ĐÚNG MỘT dòng, đồng thời in rõ dòng đã chọn để đối chiếu.
    if (ngayBanAn && !(await hienTrong(dong, 15_000))) {
      const soDong = await ds.count();
      if (soDong === 1) {
        dong = ds.first();
        const chuDong = (await dong.innerText()).replace(/\s+/g, ' ').trim();
        console.log(
          `    · Quản lý vụ án: không có vụ số ${soBanAn} ngày ${ngayBanAn}; bỏ điều kiện ngày, dùng vụ duy nhất ` +
            `còn lại — ${chuDong.slice(0, 200)}`,
        );
      } else if (soDong > 1) {
        const dsChu = (await ds.allInnerTexts()).slice(0, 5).map(t => t.replace(/\s+/g, ' ').trim().slice(0, 140));
        throw new Error(
          `Không thấy vụ án số ${soBanAn} ngày ${ngayBanAn}, mà bỏ điều kiện ngày thì còn ${soDong} vụ cùng số ` +
            `bản án → không xác định được vụ nào là của bản án này: ${dsChu.join(' || ')}`,
        );
      }
    }
    if (!(await hienTrong(dong, 60_000))) {
      // Màn này lọc theo QUYỀN của tài khoản đang đăng nhập: Thẩm tra viên chỉ thấy vụ mình được phân
      // công, Vụ trưởng thấy cả Vụ. Đo 28/09/2026: vụ 515–09/09/2024 (VA26-002576) hiện với Vụ trưởng
      // nhưng KHÔNG hiện với TTV Bùi Thị Thanh Loan → lỗi là do phân công/quyền, không phải chưa nhập đơn.
      // Vì vậy liệt kê những vụ tài khoản này đang thấy, để phân biệt hai nguyên nhân.
      const dangHien = (await page.locator('.ant-table-row:visible').allInnerTexts())
        .slice(0, 5)
        .map(t => t.replace(/\s+/g, ' ').trim().slice(0, 320));
      throw new Error(
        `Không thấy vụ án số bản án ${soBanAn}${ngayBanAn ? ` (${ngayBanAn})` : ''} ở Quản lý vụ án với tài khoản ` +
          `đang đăng nhập. Màn này chỉ hiện vụ tài khoản được phân công (TTV) nên hãy kiểm tra B11 đã phân ` +
          `công TTV cho đúng vụ này chưa. Vụ đang thấy: ${dangHien.join(' || ') || '(danh sách trống)'}`,
      );
    }
    await dong.locator('button, a').filter({ has: page.locator('[aria-label="eye"]') }).first().click();
    await page.waitForURL(/quan-ly-an\/chi-tiet\?id=/, { timeout: 60_000 });
    await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
    return new URL(page.url()).searchParams.get('id')!;
  }

  /**
   * Chi tiết vụ án → tab "Thông tin vụ án" → "Sửa thông tin" → Thời hiệu 3 năm → Tra cứu bản án (nếu bật) → "Lưu".
   */
  async capNhatThongTinVuAn(biCao: NguoiGia, tinh: string, noiDungKhieuNai: string) {
    const { page } = this;
    await page.getByRole('tab', { name: 'Thông tin vụ án' }).click();
    await page.getByRole('button', { name: /Sửa thông tin$/ }).click();
    await nghi(page, 800, 1200);
    await chonRadio(page, 'Thời hiệu: 3 năm');

    // Tra cứu bản án cũ (bật khi đủ số, ngày, tòa) → tự bổ sung người liên quan
    const traCuu = page.getByRole('button', { name: /Tra cứu$/ }).first();
    if ((await hienTrong(traCuu, 3_000)) && (await traCuu.isEnabled())) {
      await traCuu.click();
      await toastDaHien(page, /Tìm thấy thông tin bản án|Không tìm thấy thông tin bản án/, 60_000, /Lỗi khi tra cứu/);
    }

    // Vụ án hình sự: bắt buộc có Bị cáo và Thông tin khiếu nại (Tab_ThongTinVuAn.tsx: "... không được để trống")
    const khoiBiCao = this.khoiTheoTieuDe(/Bị cáo$/);
    if (await this.khoiTrong(khoiBiCao)) {
      await khoiBiCao.getByRole('button', { name: /Thêm mới$/ }).first().click();
      const dr = page.locator('.ant-drawer-content').filter({ has: page.locator('.ant-drawer-title', { hasText: 'Thêm Bị cáo' }) });
      await dienFormNguoi(page, dr, biCao, tinh, 'Bị cáo', 'Lừa đảo chiếm đoạt tài sản');
      await expect(khoiBiCao).toContainText(biCao.hoTen);
    }
    const khoiKhieuNai = this.khoiTheoTieuDe(/Thông tin khiếu nại$/);
    if (await this.khoiTrong(khoiKhieuNai)) {
      await khoiKhieuNai.getByRole('button', { name: /Thêm mới$/ }).first().click();
      const m = page.locator('.ant-modal').filter({ has: page.locator('.ant-modal-title', { hasText: 'Thêm thông tin khiếu nại' }) });
      await expect(m).toBeVisible({ timeout: 15_000 });
      // Người khiếu nại: từ danh sách người đứng đơn; Người được khiếu nại: từ danh sách bị cáo
      await chonSelect(page, m.locator('#idDoiTuongChinh'), undefined, { goDeLoc: false });
      await chonSelect(page, m.locator('#idDoiTuongLienQuan'), undefined, { goDeLoc: false });
      await go(m.locator('#noiDung'), noiDungKhieuNai);
      await m.getByRole('button', { name: /^Thêm$/ }).click();
      await expect(m).toBeHidden({ timeout: 15_000 });
    }

    await page.getByRole('button', { name: /^(save )?Lưu$/ }).last().click();
    await this.baoLoiCanhBao();
    await toastDaHien(page, 'Cập nhật vụ án thành công', 60_000, /thất bại|không được để trống|Vui lòng/);
  }

  // ───────────── Bước 5a: Thẩm tra viên lập Tờ trình thẩm tra vụ việc ─────────────

  /**
   * Chi tiết vụ án → tab "Tờ trình" → "Tạo văn bản" → "Tạo tờ trình thẩm tra vụ việc" → modal "Thêm mới tờ trình":
   * tóm tắt, diễn biến; (hình sự) "Chọn đơn" → đơn của luồng → ý kiến TTV → "Lưu" → "Thêm tờ trình thành công".
   */
  async lapToTrinhThamTra(idVuAn: string, maDon: string, noi: { tomTat: string; dienBien: string; yKien: string }) {
    const { page } = this;
    await page.goto(`vu-an/gdt-tt/quan-ly-an/chi-tiet?id=${idVuAn}&tab=to-trinh`);
    await moTabToTrinh(page);
    await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
    await page.getByRole('button', { name: /Tạo văn bản/ }).first().click();
    await page.getByRole('menuitem', { name: /Tạo tờ trình thẩm tra vụ việc/ }).click();

    const m = page.locator('.ant-modal').filter({ has: page.locator('.ant-modal-title', { hasText: 'Thêm mới tờ trình' }) });
    await expect(m).toBeVisible({ timeout: 30_000 });
    await nghi(page, 1000, 1500); // tóm tắt có thể tự điền từ vụ án sơ thẩm
    if (!(await m.locator('#tomTatNoiDung').inputValue())) await go(m.locator('#tomTatNoiDung'), noi.tomTat);
    await go(m.locator('#quaTrinhGiaiQuyet'), noi.dienBien);

    // Án hình sự: phải chọn ít nhất một đơn cần xử lý, mỗi đơn có ý kiến TTV + nội dung chính (tự sinh theo ý kiến)
    const chonDon = m.getByRole('button', { name: /^Chọn đơn$/ });
    if (await hienTrong(chonDon, 3_000)) {
      await chonDon.click();
      const md = page.locator('.ant-modal').filter({ hasText: 'Chọn đơn xử lý' }).last();
      await expect(md).toBeVisible({ timeout: 30_000 });
      const dongDon = md.locator('.ant-table-row').filter({ hasText: maDon }).first();
      const dong = (await hienTrong(dongDon, 15_000)) ? dongDon : md.locator('.ant-table-row').first();
      await dong.locator('.ant-checkbox-input').first().check();
      await md.getByRole('button', { name: /Chọn đơn xử lý$/ }).click();
      await expect(md).toBeHidden({ timeout: 15_000 });
      // id ổn định: danhSachDon_<idĐơn>_yKien (placeholder "Chọn ý kiến" mất sau khi chọn → không dùng để tìm)
      const oYKien = m.locator('[id^="danhSachDon_"][id$="_yKien"]').first();
      await chonSelect(page, oYKien, noi.yKien, { goDeLoc: false });
    }
    await m.getByRole('button', { name: /^(save )?Lưu$/ }).click();
    await toastDaHien(page, 'Thêm tờ trình thành công', 60_000, /thất bại|Có lỗi|Vui lòng/);
    await expect(m).toBeHidden({ timeout: 15_000 });
  }

  /**
   * Tờ trình vừa lập (dòng đầu tab "Tờ trình", trạng thái "Chờ ký"): điều kiện "Trình văn bản"
   * (DanhSachVanBanToTrinh.tsx) là đã có Tiểu hồ sơ và đã ký → "Tiểu hồ sơ" (thêm tài liệu) → "Ký logic"
   * → tick dòng → "Trình văn bản" → trang Trình ký: Cấp trình (người được trình tự gợi ý) → "Xin ý kiến".
   */
  async trinhToTrinhThamTra(
    idVuAn: string,
    capTrinh: string,
    mauDong: RegExp = /Tờ trình thẩm tra/,
    canTieuHoSo = true,
    nguoiDuocTrinh?: string,
  ) {
    const { page } = this;
    await page.goto(`vu-an/gdt-tt/quan-ly-an/chi-tiet?id=${idVuAn}&tab=to-trinh`);
    await moTabToTrinh(page);
    await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
    const dong = () => page.locator('.ant-table-row:visible').filter({ hasText: mauDong }).first();
    await expect(dong(), `Không thấy văn bản khớp ${mauDong} ở tab Tờ trình`).toBeVisible({ timeout: 60_000 });

    // Tờ trình đã trình ở lượt chạy trước (trạng thái "Đang trình"/"Đã duyệt"): không trình lại,
    // dùng id dòng (= id văn bản) làm khoá để bước Lãnh đạo Vụ mở đúng bản ghi
    if (await hienTrong(dong().getByText(/Đang trình|Chờ duyệt|Đã duyệt/), 3_000)) {
      return (await dong().getAttribute('data-row-key')) || undefined;
    }

    // 1. Tiểu hồ sơ: nút chỉ render khi mã biểu mẫu của dòng là TỜ TRÌNH
    // (DanhSachVanBanToTrinh.tsx: `isToTrinh && <Button>Tiểu hồ sơ</Button>`), dự thảo kết quả giải
    // quyết không có. Quyết định theo LOẠI VĂN BẢN mà nơi gọi truyền xuống, không dò DOM đoán —
    // dò 5s mà bảng render chậm thì tờ trình thật bị coi như không có nút và cả khối tiểu hồ sơ +
    // ký logic bị bỏ qua âm thầm, văn bản vẫn trình được nhưng thiếu hồ sơ và chưa ký.
    if (canTieuHoSo) {
      const nutTHS = dong().getByRole('button', { name: /Tiểu hồ sơ/ });
      await expect(nutTHS, 'Văn bản là tờ trình nhưng không có nút "Tiểu hồ sơ" — kiểm tra mã biểu mẫu của dòng').toBeVisible({
        timeout: 30_000,
      });
      await nutTHS.click();
      const ths = page.locator('.ant-modal:visible').filter({ hasText: 'DANH SÁCH TÀI LIỆU' }).last();
      await expect(ths).toBeVisible({ timeout: 30_000 });
      // Modal vừa mở hiện "Chưa có tài liệu" trong lúc danh sách còn đang tải → chờ tải xong rồi mới rẽ nhánh
      await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
      await nghi(page, 1500, 2500);
      if (await hienTrong(ths.getByText('Chưa có tài liệu'), 2_000)) {
        await ths.getByRole('button', { name: /Thêm tài liệu vào THS/ }).click();
        const kho = page.locator('.ant-modal:visible, .ant-drawer-content:visible').filter({ hasText: 'Hồ sơ lưu trữ' }).last();
        await expect(kho.locator('.ant-checkbox-input').first()).toBeVisible({ timeout: 30_000 });
        const hop = kho.locator('.ant-checkbox-input');
        for (let i = 0; i < (await hop.count()); i++) await hop.nth(i).check();
        await kho.getByRole('button', { name: /^(plus )?Thêm$/ }).last().click();
        await expect(ths.getByText('Chưa có tài liệu')).toBeHidden({ timeout: 30_000 });
      }
      await this.dongTieuHoSo(ths);
    }

    // 2. Ký logic tờ trình (trình văn bản yêu cầu tờ trình đã ký)
    if (await hienTrong(dong().getByRole('button', { name: /Ký logic/ }), 5_000)) {
      await dong().getByRole('button', { name: /Ký logic/ }).click();
      const xn = page.locator('.ant-modal-confirm, .ant-modal').filter({ has: page.getByRole('button', { name: /^(Đồng ý|Xác nhận|Ký)$/ }) }).last();
      if (await hienTrong(xn, 5_000)) await xn.getByRole('button', { name: /^(Đồng ý|Xác nhận|Ký)$/ }).last().click();
      await toastDaHien(page, /Ký logic.*thành công/i, 60_000, /thất bại|Vui lòng|lỗi/i);
    }

    // 3. Trình văn bản → trang Trình ký (XinYKienPageV2, vai TTV)
    // id dòng bảng = id văn bản tờ trình: dùng làm khoá dự phòng nếu API xin ý kiến không trả id
    const idVanBan = await dong().getAttribute('data-row-key').catch(() => null);
    // Đã trình ở lượt trước: dòng mang trạng thái "Chờ duyệt"/"Đã trình"/"Đã duyệt"… và không còn ô
    // tick + nút "Trình văn bản" → bắt thao tác tiếp sẽ treo hết giờ dù bước này đã xong.
    const ttDong = (await dong().innerText().catch(() => '')).replace(/\s+/g, ' ');
    const daTrinhVB = /(Chờ duyệt|Đã trình|Đã duyệt|Đã ký số|Đã ban hành)/i.exec(ttDong)?.[1];
    if (daTrinhVB) {
      console.log(`    · Trình văn bản: tờ trình đã ở trạng thái "${daTrinhVB}" → bỏ qua bước trình`);
      return idVanBan as string | undefined;
    }
    await dong().locator('.ant-checkbox-input').first().check();
    await page.getByRole('button', { name: /Trình văn bản$/ }).first().click();
    await page.waitForURL(/xin-y-kien-lanh-dao/, { timeout: 60_000 });
    await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
    await chonSelect(page, page.locator('#nguoiDuocTrinhMoi_capTrinh'), capTrinh, { goDeLoc: false });
    await nghi(page, 1000, 1500); // "Người được trình" tự gợi ý người đầu tiên
    const oNguoiDuocTrinh = page.locator('#nguoiDuocTrinhMoi_nguoiDuocTrinh');
    // Có chỉ định người thì CHỌN ĐÚNG người đó, không để hệ thống tự gợi ý: gợi ý lấy người đầu
    // danh sách, văn bản sẽ rơi vào hàng chờ của người khác và bước duyệt sau không tìm thấy.
    if (nguoiDuocTrinh) {
      await chonSelect(page, oNguoiDuocTrinh, nguoiDuocTrinh, { goDeLoc: false });
    } else {
      const daCoNguoi = await oNguoiDuocTrinh
        .locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]')
        .locator('.ant-select-selection-item')
        .count();
      if (!daCoNguoi) await chonSelect(page, oNguoiDuocTrinh, undefined, { goDeLoc: false });
    }
    // Lấy id yêu cầu phê duyệt từ API để bước Lãnh đạo Vụ mở đúng bản ghi
    const choApi = page
      .waitForResponse(r => r.request().method() === 'POST' && /phe-duyet-de-xuat|xin-y-kien|trinh-van-ban/.test(r.url()), { timeout: 90_000 })
      .catch(() => null);
    await page.getByRole('button', { name: /Xin ý kiến$/ }).click();
    await toastDaHien(page, 'Gửi xin ý kiến thành công', 60_000, /thất bại|Không thể|Vui lòng/);
    const res = await choApi;
    const kq: any = res ? await res.json().catch(() => null) : null;
    const d = Array.isArray(kq?.data) ? kq.data[0] : kq?.data;
    return (d?.dsIdVanBanDaTrinh?.[0] || d?.id || d?.idYeuCauPheDuyet || idVanBan) as string | undefined;
  }

  /**
   * Đóng modal "Tiểu hồ sơ" (toàn màn hình, không có nút X): bấm mũi tên "←" cạnh tiêu đề.
   * Bấm ngay khi modal vừa hiện thì click rơi vào nút sắp bị React dựng lại (danh sách tài liệu +
   * khung xem PDF tải xong mới render lại header) nên không ăn → chờ nội dung ổn định rồi thử lại.
   */
  private async dongTieuHoSo(ths: Locator) {
    const { page } = this;
    const nut = ths.locator('button').filter({ has: page.locator('[aria-label="arrow-left"]') }).first();
    await expect(nut).toBeVisible({ timeout: 30_000 });
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    for (let lan = 0; lan < 4; lan++) {
      await nut.click({ timeout: 15_000 }).catch(() => {});
      if (await ths.isHidden().catch(() => true)) return;
      if (await hienTrong(ths.locator('.ant-modal-content'), 3_000)) await page.keyboard.press('Escape');
      if (await ths.isHidden().catch(() => true)) return;
      await nghi(page, 1500, 2500);
    }
    await expect(ths, 'Không đóng được modal Tiểu hồ sơ').toBeHidden({ timeout: 15_000 });
  }

  /**
   * Bước 12 (Luồng nhập data.txt): tab "Tờ trình" của vụ án → "Tạo văn bản" → "Tạo dự thảo kết quả
   * giải quyết" → điền modal "Thêm dự thảo" → Lưu.
   * Form trong modal không có `name` nên id là tên trường trần (#ketQuaGiaiQuyet, #MA_NGUOI_KY…).
   */
  async taoDuThaoKetQuaGiaiQuyet(
    idVuAn: string,
    d: { ketQua: string; nguoiKy: string; thamQuyenXetXu: string; noiDungVuAn: string; xetThay: string },
  ) {
    const { page } = this;
    await page.goto(`vu-an/gdt-tt/quan-ly-an/chi-tiet?id=${idVuAn}&tab=to-trinh`);
    await moTabToTrinh(page);
    await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
    await choHetSpin(page);
    await nghi(page, 1500, 2500);

    // discover → reuse: vụ đã có dự thảo thì KHÔNG tạo thêm. Mỗi đơn chỉ gắn được vào một dự thảo,
    // nên dự thảo thứ hai mở ra với ô "Đơn liên quan" trống và bị khoá — lỗi "Ô chọn đang bị khoá".
    //
    // Bộ lọc cũ /Kháng nghị|Dự thảo/ khớp QUÁ LỎNG: tab Tờ trình còn liệt kê tờ trình phân công,
    // thông báo… nên gặp một dòng bất kỳ có hai chữ đó là bỏ qua và ghi sổ cái "xong" trong khi vụ
    // CHƯA hề có dự thảo — đo được 27/09/2026: 15/28 vụ báo pass mà không sinh văn bản MS_056 nào.
    // Nay đòi đúng tên quyết định kháng nghị giám đốc thẩm / tái thẩm.
    const tenDuThao = /Quyết định kháng nghị (giám đốc thẩm|tái thẩm)/i;
    const duThaoCu = page.locator('.ant-table-row:visible').filter({ hasText: tenDuThao }).first();
    if (await hienTrong(duThaoCu, 5_000)) {
      return (await duThaoCu.innerText()).replace(/\s+/g, ' ').trim().slice(0, 200);
    }

    await page.getByRole('button', { name: /Tạo văn bản/ }).first().click();
    const muc = page.getByRole('menuitem', { name: /Tạo dự thảo kết quả giải quyết/ });
    await expect(muc, 'Không thấy mục "Tạo dự thảo kết quả giải quyết"').toBeVisible({ timeout: 15_000 });
    await muc.click();

    const m = page.locator('.ant-modal:visible').filter({ hasText: /Thêm dự thảo/ }).last();
    await expect(m, 'Không mở được modal "Thêm dự thảo"').toBeVisible({ timeout: 30_000 });
    await nghi(page, 800, 1200);

    // Đơn liên quan: chọn tất cả đơn đang gợi ý
    const oDon = m.locator('#dsDonLienQuan');
    if (await hienTrong(oDon, 5_000)) {
      await oDon.click();
      const dd = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
      await expect(dd).toBeVisible({ timeout: 15_000 });
      const ds = dd.locator('.ant-select-item-option');
      const n = await ds.count();
      for (let i = 0; i < n; i++) await ds.nth(i).click();
      await page.keyboard.press('Escape');
      await nghi(page, 500, 900);
    }

    // "Kết quả giải quyết" là nhóm RADIO (Trả lời đơn / Viện kiểm sát đang giải quyết / Kháng nghị),
    // không phải select — chọn select ở đây sẽ treo tới hết timeout. Đổi kết quả làm form đổi luôn
    // các trường phía dưới (Trả lời đơn có "Nội dung trả lời", Kháng nghị có "Thẩm quyền xét xử"…).
    const oKetQua = m.getByRole('radio', { name: d.ketQua }).first();
    await expect(oKetQua, `Không thấy lựa chọn "${d.ketQua}" ở Kết quả giải quyết`).toBeVisible({ timeout: 15_000 });
    if (!(await oKetQua.isChecked())) await oKetQua.check({ force: true });
    await choHetSpin(page);
    await nghi(page, 1200, 2000);

    await chonSelect(page, m.locator('#MA_NGUOI_KY'), d.nguoiKy, { goDeLoc: false });

    // Bị cáo: chọn tất cả mục đang hiện
    const oBiCao = m.locator('#idBiDons');
    if (await hienTrong(oBiCao, 5_000)) {
      await oBiCao.click();
      const dd = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
      await expect(dd).toBeVisible({ timeout: 15_000 });
      const ds = dd.locator('.ant-select-item-option');
      const n = await ds.count();
      for (let i = 0; i < n; i++) await ds.nth(i).click();
      await page.keyboard.press('Escape');
      await nghi(page, 500, 900);
    }

    // "Ngày quyết định" và "Ngày phát hành" là trường bắt buộc (KetQuaGDTTSection.tsx: required),
    // ngày quyết định còn phải >= ngày thụ lý xét xử. Không có nguồn dữ liệu riêng nên lấy ngày
    // nhập, đúng quy ước của tài liệu ("chọn ngày nhập") và luôn thoả điều kiện >= ngày thụ lý.
    // Hai màn đặt tên trường khác nhau: modal dự thảo dùng NGAY_QUYET_DINH (hoa, xem
    // KetQuaTraDonModal/configs/fieldKeys.ts), tab Kết quả xét xử dùng ngayQuyetDinh (thường).
    const homNay = new Date().toLocaleDateString('en-GB');
    for (const id of ['#NGAY_QUYET_DINH', '#ngayQuyetDinh', '#ngayPhatHanh']) {
      const o = m.locator(id).first();
      if (!(await hienTrong(o, 3_000))) continue;
      if (await o.inputValue().catch(() => '')) continue;
      // Dự thảo phụ thuộc: các ô này readonly vì đồng bộ từ bản kháng nghị đầu tiên → bỏ qua
      if (!(await o.isEditable().catch(() => false))) continue;
      await chonNgay(o, homNay);
      await page.keyboard.press('Escape');
    }

    // Dự thảo "phụ thuộc" (đã có bản kháng nghị đầu tiên của vụ) bị KHOÁ các trường đồng bộ — xem
    // khangNghiFormLogic.laBanKhangNghiPhuThuoc: trạng thái TAO_BAN_PHU_THUOC/SUA_BAN_PHU_THUOC thì
    // `disabled: disabled || khoaThongTinDongBoKhangNghi`. Hệ thống tự lấy giá trị từ bản đầu tiên,
    // ta không nhập đè. Chỉ điền khi ô đang mở; ô khoá thì ghi nhận lý do và đi tiếp.
    const dienNeuMo = async (o: typeof m, nhan: string, dien: () => Promise<unknown>) => {
      if (!(await hienTrong(o, 15_000))) return `${nhan}: không thấy ô`;
      // Dùng isEditable: ô khoá có thể là disabled HOẶC readonly, isDisabled không bắt được readonly
      if (!(await o.isEditable().catch(() => false))) return `${nhan}: bị khoá (đồng bộ từ bản kháng nghị đầu tiên)`;
      await dien();
      return '';
    };

    const oThamQuyen = m.locator('#THAM_QUYEN_XET_XU');
    const bo: string[] = [];
    bo.push(await dienNeuMo(oThamQuyen, 'Thẩm quyền xét xử', () => chonSelect(page, oThamQuyen, d.thamQuyenXetXu, { goDeLoc: false })));
    await choHetSpin(page);
    await nghi(page, 1200, 2000);

    const oNoiDung = m.locator('#NOI_DUNG_VU_AN');
    const oXetThay = m.locator('#XET_THAY');
    bo.push(await dienNeuMo(oNoiDung, 'Nội dung vụ án', () => go(oNoiDung, d.noiDungVuAn)));
    bo.push(await dienNeuMo(oXetThay, 'Xét thấy', () => go(oXetThay, d.xetThay)));
    const boQua = bo.filter(Boolean);
    if (boQua.length) console.log('    · dự thảo kháng nghị, trường không nhập:', boQua.join(' | '));

    await m.getByRole('button', { name: /^(save )?Lưu$/ }).last().click();
    await toastDaHien(page, /thành công/i, 90_000, /thất bại|Vui lòng|lỗi|không hợp lệ/i);
    await nghi(page, 1500, 2500);

    // KIỂM CHỨNG BẰNG MÀN, KHÔNG TIN TOAST: nạp lại tab Tờ trình và đòi thấy đúng dòng dự thảo.
    // Thiếu bước này thì bước sau ghi sổ cái "xong" dù vụ chưa có văn bản kháng nghị nào.
    await page.goto(`vu-an/gdt-tt/quan-ly-an/chi-tiet?id=${idVuAn}&tab=to-trinh`);
    await moTabToTrinh(page);
    await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
    await choHetSpin(page);
    await nghi(page, 1500, 2500);
    await expect(
      page.locator('.ant-table-row:visible').filter({ hasText: tenDuThao }).first(),
      `Lưu xong nhưng tab Tờ trình của vụ ${idVuAn} vẫn không có dòng "Quyết định kháng nghị" — dự thảo chưa được tạo`,
    ).toBeVisible({ timeout: 30_000 });
    return '';
  }
  /**
   * Bước thụ lý của Vụ (tài liệu chưa ghi): Quản lý án GĐT/TT › Nhận đơn và TL vụ án › tab
   * "Đã có vụ án" → tick đơn → "Giao THS" → màn "Giao tiểu hồ sơ" → chọn Thẩm tra viên → Lưu.
   * Giao tiểu hồ sơ xong thì Thẩm tra viên mới thấy vụ ở màn Quản lý vụ án.
   */
  async giaoTieuHoSo(
    soBanAn: string,
    soThuLy: string,
    d: { nguoiGiao: string; nguoiNhan: string; ngayBanAn?: string; toaAn?: string; maDon?: string },
  ) {
    const { page } = this;
    // Chốt chặn: cả hai màn ở đây đều phân trang và KHÔNG tự lọc theo vụ. soThuLy rỗng thì
    // filter({ hasText: '' }) khớp mọi dòng và .first() rơi vào đơn của vụ khác.
    expect(soThuLy, 'giaoTieuHoSo cần số thụ lý để tìm đúng dòng — truyền rỗng sẽ thao tác nhầm đơn').toBeTruthy();
    await moMenu(page, [MENU_GDT, 'Nhận đơn và TL vụ án']);
    await page.getByRole('tab', { name: /Đã có vụ án/ }).click();
    await choHetSpin(page);
    await nghi(page, 1200, 2000);

    await go(page.getByLabel('Số bản án/quyết định', { exact: true }), soBanAn);
    // Lọc theo NGÀY + TÒA bản án, KHÔNG lọc theo mã đơn/số thụ lý của mình: mỗi vụ án GĐ3 gom nhiều
    // đơn cùng bản án và màn chỉ hiện ĐƠN CHÍNH (DON.IS_DON_CHINH=1) — mà đơn chính thường là đơn cũ,
    // không phải đơn Playwright vừa nhập (kiểm DB 29/09/2026: vụ 958eebc1 có đơn chính 9870, đơn của
    // mình là 10234). Thao tác trên dòng đơn chính là đúng nghiệp vụ vì cùng một vụ án.
    await this.locNangCaoBanAn(d.ngayBanAn, d.toaAn, undefined, false);
    await page.getByRole('button', { name: /Tìm kiếm$/ }).first().click();
    await choHetSpin(page);
    await nghi(page, 1500, 2500);
    await moRongCoTrang(page);

    // Ưu tiên đúng đơn của mình nếu nó có mặt; không có thì dùng dòng của vụ (đơn chính) sau khi đã
    // thu hẹp bằng số + ngày + tòa bản án.
    const bl = boLocDong(page, soBanAn, d.ngayBanAn, d.toaAn);
    const reMa = d.maDon ? new RegExp('Mã đơn:\s*' + d.maDon + '(?![0-9])') : undefined;
    const dongCuaMinh = reMa ? page.locator('.ant-table-row:visible').filter({ hasText: reMa }).first() : undefined;
    let dong = bl.dong();
    if (dongCuaMinh && (await hienTrong(dongCuaMinh, 5_000))) {
      dong = dongCuaMinh;
    } else {
      await bl.noiDieuKienNeuCan();
      if (reMa) console.log('    · Đơn ' + d.maDon + ' là đơn phụ, không hiện ở danh sách → dùng dòng đơn chính của vụ');
    }
    if (!(await hienTrong(dong, 60_000))) {
      const dangHien = (await page.locator('.ant-table-row:visible').allInnerTexts())
        .slice(0, 5)
        .map(t => t.replace(/\s+/g, ' ').trim().slice(0, 160));
      throw new Error(
        `Không thấy vụ của bản án ${soBanAn}${d.ngayBanAn ? ' ngày ' + d.ngayBanAn : ''} ở tab "Đã có vụ án" ` +
          `(đơn của mình: ${d.maDon || soThuLy}). ` +
          `Dòng đang hiện sau khi lọc: ${dangHien.join(' || ') || '(danh sách trống)'}`,
      );
    }
    // Nhớ khoá của DÒNG ĐÃ TICK (thường là đơn chính của vụ, không phải đơn mình vừa nhập) để nhận ra
    // đúng dòng đó ở màn Giao THS — màn kia liệt kê TẤT CẢ đơn đang chờ giao, không chỉ đơn vừa tick.
    const chuDongDaTick = (await dong.innerText()).replace(/\s+/g, ' ');
    const khoaDaTick = [
      soThuLy,
      /Mã đơn:\s*(\d+)/.exec(chuDongDaTick)?.[1],
      /Thụ lý mới:\s*(\d+)/.exec(chuDongDaTick)?.[1],
      /Số thụ lý:\s*(\d+)/.exec(chuDongDaTick)?.[1],
    ].filter((x): x is string => !!x);
    await dong.locator('.ant-checkbox-input').first().check();
    await nghi(page, 600, 1000);

    // "Giao THS" mở MÀN RIÊNG /nhan-don-tl-vu-an/giao-ths (không phải popup)
    await page.getByRole('button', { name: /Giao THS/ }).first().click();
    await page.waitForURL(/giao-ths/, { timeout: 60_000 });
    await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
    await choHetSpin(page);
    await nghi(page, 1500, 2500);

    // Màn /giao-ths liệt kê MỌI đơn của Vụ và phân trang 10 dòng — không lọc thì đơn của vụ mình
    // thường nằm ở trang sau và báo "không có dòng của đơn ...". Màn này chỉ có ô lọc số bản án
    // (không có ô số thụ lý), lọc xong mới tìm dòng theo số thụ lý cho chắc.
    const oLoc = page.getByLabel('Số bản án/quyết định', { exact: true });
    if (await hienTrong(oLoc, 10_000)) {
      await oLoc.fill(soBanAn);
      await page.getByRole('button', { name: /Tìm kiếm$/ }).first().click();
      await choHetSpin(page);
      await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
      await nghi(page, 1500, 2500);
    }

    // Trong dòng có 2 ô: "Chọn người giao" (Văn phòng HCTP) và "Chọn người nhận" (Vụ GĐ,KT).
    // Màn này chỉ liệt kê những đơn vừa tick ở màn trước. Dòng mang số thụ lý của ĐƠN CHÍNH (đơn của
    // mình là đơn phụ nên không hiện ở màn trước) → ưu tiên khớp số thụ lý của mình, không có thì dùng
    // dòng duy nhất đang hiện.
    const dsDongGiao = page.locator('.ant-table-row:visible');
    let dongGiao = dsDongGiao.first();
    let daKhop = false;
    for (const k of khoaDaTick) {
      const thu = dsDongGiao.filter({ hasText: new RegExp('(^|[^0-9])' + k + '([^0-9]|$)') });
      if (await hienTrong(thu.first(), k === khoaDaTick[0] ? 8_000 : 2_000)) {
        dongGiao = thu.first();
        daKhop = true;
        if (k !== soThuLy) console.log(`    · Màn Giao tiểu hồ sơ: khớp dòng theo khoá "${k}" của đơn chính`);
        break;
      }
    }
    if (!daKhop) {
      const soDong = await dsDongGiao.count();
      if (soDong !== 1) {
        // Không dòng nào khớp mà cũng không chỉ còn một dòng → đơn chính của vụ ĐÃ ĐƯỢC GIAO tiểu hồ sơ
        // ở lượt trước nên không còn trong danh sách chờ giao (màn đang liệt kê đơn của vụ khác). Không
        // phải lỗi thao tác: bỏ qua để luồng đi tiếp B11 — bước quyết định quyền xem vụ của Thẩm tra viên.
        const chu = (await dsDongGiao.allInnerTexts())
          .slice(0, 2)
          .map(t => t.replace(/\s+/g, ' ').trim().slice(0, 120));
        console.log(
          `    · Giao tiểu hồ sơ: không còn dòng nào của vụ (bản án ${soBanAn}, đơn ${soThuLy}) trong ${soDong} ` +
            `dòng đang chờ giao → coi như đã giao từ trước. Dòng đang hiện: ${chu.join(' || ') || '(trống)'}`,
        );
        return;
      }
      dongGiao = dsDongGiao.first();
      console.log(`    · Màn Giao tiểu hồ sơ không có số thụ lý ${soThuLy} (đơn phụ) → dùng dòng duy nhất đang hiện`);
    }
    // Chọn người giao/nhận và ngày trước, TICK DÒNG SAU CÙNG: mỗi lần đổi một ô, GiaoTieuHSTable gọi
    // handleFieldChange → setEditVersion → bảng render lại và MẤT ô tick. Bấm Lưu lúc không còn dòng
    // nào được chọn thì handleSubmit chỉ cảnh báo "Vui lòng chọn đơn cần lưu giao tiểu hồ sơ".
    const oGiao = dongGiao.getByRole('combobox').nth(0);
    const oNhan = dongGiao.getByRole('combobox').nth(1);
    /**
     * Danh mục người giao/người nhận ở màn này do HỆ THỐNG dựng theo đơn vị, không phải ai cũng có.
     * Vụ dân sự (D01.107) chỉ có Phạm Tiến Thành | Trần Phương Nguyên | Lương Thanh Giang |
     * Nguyễn Thị Phương Thảo | Đinh Gia Huy | Vũ Trung Hiếu — không có người đang khai trong config
     * (Phạm Minh Tùng). Bước này tài liệu chưa ghi và người nhận tiểu hồ sơ KHÔNG quyết định việc
     * Thẩm tra viên thấy vụ (quyền đó đến từ B11 phân công TTV), nên chọn tạm mục đầu danh mục và ghi
     * rõ ra log để nghiệp vụ chỉnh lại nếu cần, thay vì dừng cả luồng.
     */
    const chonNguoi = async (o: Locator, ten: string, vaiTro: string) => {
      try {
        await chonSelect(page, o, ten);
      } catch (loi) {
        if (!/Danh mục không có mục/.test((loi as Error).message)) throw loi;
        const daChon = await chonSelect(page, o);
        console.log(`    · Giao tiểu hồ sơ: danh mục ${vaiTro} không có "${ten}" → chọn tạm "${daChon}"`);
      }
    };
    await chonNguoi(oGiao, d.nguoiGiao, 'người giao');
    await chonNguoi(oNhan, d.nguoiNhan, 'người nhận');
    // Cột "Ngày Vụ nhận" (payload ngayNhan) — điền ngày hiện tại, bỏ trống thì bản ghi thiếu ngày nhận
    const oNgayNhan = dongGiao.getByPlaceholder('dd/mm/yyyy').first();
    if (await hienTrong(oNgayNhan, 5_000)) {
      const homNay = new Date().toLocaleDateString('en-GB');
      if ((await oNgayNhan.inputValue().catch(() => '')) !== homNay) await chonNgay(oNgayNhan, homNay);
    }
    await nghi(page, 800, 1200);

    // Tick ngay trước khi Lưu, thử lại nếu bảng render lại làm mất ô tick
    const oTick = () => dongGiao.locator('.ant-checkbox-input').first();
    for (let i = 0; i < 3 && !(await oTick().isChecked().catch(() => false)); i++) {
      await oTick().check({ force: true }).catch(() => {});
      await nghi(page, 400, 800);
    }
    await expect(oTick(), 'Dòng giao tiểu hồ sơ không giữ được ô tick sau khi chọn người giao/nhận').toBeChecked({ timeout: 10_000 });

    // Bằng chứng là API POST /don/don-giao-ths, KHÔNG phải toast: handleSubmit thoát sớm (chỉ hiện
    // cảnh báo rồi return) khi chưa tick dòng hoặc thiếu người giao/nhận → chờ toast "thành công"
    // treo hết 90s mà không biết vì sao (lỗi VT02 28/09/2026).
    const choLuu = page
      .waitForResponse(r => r.request().method() === 'POST' && /\/don\/don-giao-ths/.test(r.url()), { timeout: 60_000 })
      .catch(() => null);
    await page.getByRole('button', { name: /^(save )?Lưu$/ }).last().click();
    const xn = page.locator('.ant-modal').filter({ has: page.getByRole('button', { name: /^(Đồng ý|Xác nhận)$/ }) }).last();
    if (await hienTrong(xn, 5_000)) await xn.getByRole('button', { name: /^(Đồng ý|Xác nhận)$/ }).last().click();
    const res = await choLuu;
    if (!res) {
      throw new Error(
        `Bấm "Lưu" ở màn Giao tiểu hồ sơ nhưng hệ thống KHÔNG gọi API /don/don-giao-ths (đơn ${soThuLy}) — ` +
          `${await nguyenNhanLoi(page)}`,
      );
    }
    const kqLuu = (await res.json().catch(() => null)) as { success?: boolean; message?: string } | null;
    if (!kqLuu?.success) throw new Error(`Giao tiểu hồ sơ thất bại: ${kqLuu?.message || res.status()}`);
    await choHetSpin(page);
    await nghi(page, 1500, 2500);
  }
  /** Khối nhỏ nhất bao tiêu đề (h5) + nút "Thêm mới" + bảng dữ liệu (bảng Bị cáo, Thông tin khiếu nại...) */
  private khoiTheoTieuDe(tieuDe: RegExp) {
    return this.page
      .getByRole('heading', { name: tieuDe })
      .first()
      .locator('xpath=ancestor::div[.//button[contains(normalize-space(.),"Thêm mới")] and .//table][1]');
  }

  private async khoiTrong(khoi: Locator) {
    await khoi.scrollIntoViewIfNeeded();
    await nghi(this.page, 300, 500);
    return (await khoi.locator('.ant-table-row:visible').count()) === 0;
  }

  /** Modal.warning "Thông báo" (vd. "Danh sách bị cáo không được để trống.") → ném lỗi rõ ràng thay vì chờ toast */
  private async baoLoiCanhBao(tienTo = 'Không lưu được vụ án') {
    const canhBao = this.page.locator('.ant-modal-confirm-warning, .ant-modal-confirm').filter({ hasText: 'Thông báo' }).last();
    if (await hienTrong(canhBao, 3_000)) {
      const noiDung = (await canhBao.innerText()).replace(/\s+/g, ' ');
      await canhBao.getByRole('button', { name: /OK|Đã hiểu|Đóng/ }).first().click().catch(() => {});
      throw new Error(`${tienTo}: ${noiDung}`);
    }
  }

  /**
   * Phân công TTV → tab "Chưa phân công TTV" → radio "Phân công chỉ định" → lọc Số BA
   * → tick dòng → chọn Thẩm tra viên (Lãnh đạo tự điền) → "Phân công" → "Đồng ý".
   */
  /**
   * Phân công Thẩm tra viên. Dùng cho CẢ HAI lần trong tài liệu:
   *  · Bước 11 — phân công TTV cho ĐƠN (không lọc Hình thức phân công)
   *  · Bước 18 — phân công TTV cho HỒ SƠ KHÁNG NGHỊ, lọc Hình thức = "Hồ sơ kháng nghị GĐT-TT"
   * Truyền ngayBanAn để khớp đúng dòng: số bản án ngắn (23–36) trùng nhau giữa các đợt.
   */
  async phanCongTTV(
    soBanAn: string,
    tenTTV: string,
    tenLanhDao: string,
    d: { hinhThuc?: string; ngayBanAn?: string; toaAn?: string } = {},
  ) {
    const { page } = this;
    const bl = boLocDong(page, soBanAn, d.ngayBanAn, d.toaAn, d.soThuLy);
    const dsDong = bl.ds;
    const locDong = bl.dong;

    const datHinhThuc = async () => {
      if (!d.hinhThuc) return;
      const o = page.getByLabel('Hình thức phân công', { exact: true }).first();
      if (await hienTrong(o, 5_000)) await chonSelect(page, o, d.hinhThuc, { goDeLoc: false });
    };
    const locSoVaTim = async () => {
      // CHỈ lọc số bản án ở màn này. Đo 29/09/2026: thêm ô "Ngày bản án/quyết định" (hoặc "Tòa ra bản
      // án/quyết định") vào bộ lọc là danh sách RỖNG dù vụ vẫn ở đó — bộ lọc ngày/tòa nối sang bản ghi
      // BAN_AN mà vụ GĐ3 không có (thông tin bản án nằm trên ĐƠN). Ngày và tòa vì vậy khớp trên DÒNG
      // ("Số BAST:… Ngày:… Tại:…"), còn số bản án lọc kiểu chuỗi con nên phải mở rộng cỡ trang.
      const oLocSo = await oSoBanAn(page, 10_000);
      if (!oLocSo) throw new Error('Màn Phân công TTV: không thấy ô lọc "Số BA/QĐ" (kiểm tra lại Hình thức phân công)');
      await go(oLocSo, soBanAn);
      await page.getByRole('button', { name: /Tìm kiếm$/ }).first().click();
      await choHetSpin(page);
      await nghi(page, 1200, 2000);
      await moRongCoTrang(page);
      await bl.noiDieuKienNeuCan();
    };
    /**
     * Bật "Phân công chỉ định" — phải làm SAU khi lọc. Chọn "Hình thức phân công" làm form lọc render
     * lại và radio quay về "Phân công ngẫu nhiên": ảnh chụp lỗi VG01 (28/09/2026) cho thấy đúng lúc
     * nhập số bản án thì radio ngẫu nhiên đang được chọn, nên bảng KHÔNG có cột tick và cột "Thẩm tra
     * viên" chỉ là chữ, không có ô chọn. Bật xong kiểm lại từ khoá: danh sách tải lại có thể xoá ô số
     * bản án → lọc lần nữa.
     */
    const batCheDoChiDinh = async () => {
      await chonRadio(page, 'Phân công chỉ định');
      await choHetSpin(page);
      await nghi(page, 800, 1200);
      const o = await oSoBanAn(page, 5_000);
      if (o && (await o.inputValue().catch(() => '')) !== soBanAn) await locSoVaTim();
    };

    // Menu thật trên hệ thống là "Phân công TTV" (trước đây tài liệu ghi "Danh sách phân công TTV")
    await moMenu(page, [MENU_GDT, 'Phân công TTV']);
    await page.getByRole('tab', { name: /^Chưa phân công TTV/ }).click();
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    await datHinhThuc();
    await locSoVaTim();
    /**
     * Với hình thức "Hồ sơ kháng nghị GĐT-TT" (B18) dòng KHÔNG hiện số bản án — cột chỉ có mã văn thư,
     * đơn vị gửi, số/ngày quyết định kháng nghị (đo 29/09/2026: "Mã văn thư:903 Đơn vị gửi:Vụ Giám đốc,
     * kiểm tra về dân sự 270 28/09/2026 …"). Bộ lọc "Số BA/QĐ" phía máy chủ đã thu hẹp danh sách rồi,
     * nên nếu chỉ còn ĐÚNG MỘT dòng thì dùng luôn dòng đó.
     */
    const dongDuyNhatSauLoc = async () => {
      const ds = page.locator('.ant-table-row:visible');
      if ((await ds.count()) !== 1) return undefined;
      const chu = (await ds.first().innerText()).replace(/\s+/g, ' ').trim();
      console.log(`    · Dòng không hiện số bản án ${soBanAn}; sau khi lọc chỉ còn một dòng → dùng dòng đó: ${chu.slice(0, 140)}`);
      return ds.first();
    };
    let dong = locDong();
    if (!(await hienTrong(dong, 8_000))) dong = (await dongDuyNhatSauLoc()) || dong;
    // Vụ có thể đã được phân công TTV ở lượt chạy trước bị dừng giữa chừng (sổ cái chưa kịp ghi) →
    // không còn ở tab "Chưa phân công TTV". Kiểm tab "Đã phân công TTV" rồi mới kết luận là lỗi.
    if (!(await hienTrong(dong, 20_000))) {
      const tabDa = page.getByRole('tab').filter({ hasText: /^Đã phân công TTV/ }).first();
      if (await tabDa.count()) {
        await tabDa.click();
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
        await choHetSpin(page);
        await datHinhThuc();
        await locSoVaTim();
        if ((await hienTrong(locDong(), 20_000)) || (await dongDuyNhatSauLoc())) {
          // In rõ nhánh đã đi: "pass" ở đây là vụ đã phân công từ trước, KHÔNG phải vừa phân công xong
          console.log('    · Phân công TTV: vụ đã có ở tab "Đã phân công TTV" từ trước → bỏ qua');
          return;
        }
      }
      // Báo luôn các dòng đang hiện: lọc không ra thì phải biết màn đang có gì (hồ sơ kháng nghị của vụ
      // chưa về tới đây, hay lọc sai ô) chứ không chỉ "không thấy".
      const dangHien = (await page.locator('.ant-table-row:visible').allInnerTexts())
        .slice(0, 8)
        .map((t) => t.replace(/\s+/g, ' ').trim());
      throw new Error(
        `Không thấy vụ có số bản án ${soBanAn}${d.ngayBanAn ? ` (${d.ngayBanAn})` : ''} ở cả tab Chưa phân công TTV lẫn Đã phân công TTV. ` +
          `Dòng đang hiện sau khi lọc: ${dangHien.join(' || ') || '(danh sách trống)'}`,
      );
    }
    await batCheDoChiDinh();

    // ① Tick để bảng cho sửa dòng. Ưu tiên ô chọn tất cả ở dòng tiêu đề (nghiệp vụ 28/09/2026), NHƯNG
    //    chỉ khi danh sách đã lọc còn đúng các dòng của vụ này: chọn tất cả lúc còn dòng vụ khác sẽ
    //    phân công TTV lây sang vụ đó (đã gặp với "Phân công ngẫu nhiên" ở B14b).
    const tongDong = await page.locator('.ant-table-row:visible').count();
    const dongCuaVu = await dsDong().count();
    const chonTatCa = page
      .locator('input.ant-checkbox-input[aria-label="Select all"], .ant-table-thead input.ant-checkbox-input')
      .first();
    if (tongDong === dongCuaVu && (await hienTrong(chonTatCa, 5_000))) {
      await chonTatCa.check();
    } else {
      await dong.locator('.ant-checkbox-input').first().check();
    }
    await nghi(page, 500, 800);

    // ② + ③ + ngày phân công. Lấy ô theo VỊ TRÍ CỘT (đọc header lúc chạy) chứ không phải combobox thứ
    //    0/1 của dòng: bật "Phân công chỉ định" làm mọc thêm cột tick, và bảng xen hai cột ngày.
    const tdTheoCot = async (tenCot: RegExp): Promise<Locator | null> => {
      const th = page.locator('.ant-table-thead').first().locator('th');
      const soCot = await th.count();
      for (let i = 0; i < soCot; i++) {
        const nhan = ((await th.nth(i).innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
        if (tenCot.test(nhan)) return dong.locator('td').nth(i);
      }
      return null;
    };
    const oChonTrongCot = async (tenCot: RegExp) => {
      const td = await tdTheoCot(tenCot);
      if (!td) throw new Error('Không thấy cột ' + tenCot.source + ' ở bảng Phân công TTV');
      const o = td.getByRole('combobox').first();
      if (!(await hienTrong(o, 10_000))) {
        throw new Error('Cột ' + tenCot.source + ' không có ô chọn — kiểm tra radio "Phân công chỉ định" đã bật chưa');
      }
      return o;
    };
    /**
     * Điền ngày phân công. FE bắt buộc cả hai ngày (usePhanCongTTV_HoSo.tsx validatePayload):
     * "Vui lòng chọn ngày phân công cho Thẩm tra viên" / "…cho Lãnh đạo", và ngày phân công lãnh đạo
     * phải >= ngày phân công TTV >= ngày nhận hồ sơ → điền ngày TTV trước, rồi ngày LĐ, đều là hôm nay.
     */
    const dienNgayCot = async (tenCot: RegExp, ngay: string) => {
      const td = await tdTheoCot(tenCot);
      if (!td) return;
      const o = td.getByPlaceholder('dd/mm/yyyy').first();
      const oNgay = (await hienTrong(o, 5_000)) ? o : td.locator('input').first();
      if (!(await hienTrong(oNgay, 5_000))) return;
      if ((await oNgay.inputValue().catch(() => '')) === ngay) return;
      await chonNgay(oNgay, ngay);
      await nghi(page, 400, 800);
    };

    const homNay = new Date().toLocaleDateString('en-GB');
    // Danh sách ảo (chỉ render vài mục đầu) → gõ tên để lọc rồi chọn
    await chonSelect(page, await oChonTrongCot(/Thẩm tra viên/i), tenTTV);
    await dienNgayCot(/Ngày phân công TTV/i, homNay);
    // Lãnh đạo có thể tự điền theo cấu hình TTV (GET /cau-hinh-ttv/theo-tai-khoan): đúng người thì giữ,
    // trống hoặc khác cấu hình thì chọn lại theo nghiepVu.lanhDaoPhuTrach
    await nghi(page, 1200, 1800);
    const oLanhDao = await oChonTrongCot(/Lãnh đạo/i);
    const lanhDaoDangChon = (
      await oLanhDao
        .locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]')
        .locator('.ant-select-selection-item')
        .innerText()
        .catch(() => '')
    ).trim();
    if (lanhDaoDangChon !== tenLanhDao) await chonSelect(page, oLanhDao, tenLanhDao);
    await dienNgayCot(/Ngày phân công LĐ/i, homNay);

    // ④ Nút lưu đổi nhãn theo chế độ (usePhanCongTTV_HoSo.tsx: toolbarActions):
    //      đã phân công  → "Lưu phân công"
    //      chỉ định      → "Phân công TTV/LĐ (n)"   ← nhánh của bước này
    //      ngẫu nhiên    → "Phân công tự động"      ← KHÔNG được bấm, đó là phân công tự động
    const nutLuu = page
      .getByRole('button', { name: /^(\S+ )?(Lưu phân công|Phân công TTV\/LĐ(\s*\(\d+\))?|Phân công)$/ })
      .first();
    if (!(await hienTrong(nutLuu, 15_000))) {
      const dsNut = (await page.locator('button:visible').allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
      throw new Error(`Không thấy nút lưu phân công TTV (các nút đang có: ${dsNut.join(' | ')})`);
    }
    await nutLuu.click();
    await this.baoLoiCanhBao('Không phân công được TTV');
    // Bản mới lưu luôn, không hỏi lại → có hộp xác nhận thì bấm Đồng ý, không có thì bỏ qua
    const xn = page.locator('.ant-modal').filter({ has: page.getByRole('button', { name: 'Đồng ý' }) }).last();
    if (await hienTrong(xn, 10_000)) await xn.getByRole('button', { name: 'Đồng ý' }).click();
    await toastDaHien(page, /Phân công TTV\/LĐ thành công|thành công/, 60_000, /thất bại|Vui lòng/);
    console.log('    · Phân công TTV: vừa lưu ' + tenTTV + ' – ' + tenLanhDao + ' (ngày ' + homNay + ') cho số bản án ' + soBanAn);
  }

  // ───────────── Bước 14–17 (Playwright nhập data GDT-TT.txt) ─────────────

  /**
   * Bước 14: Quản lý án GĐT/TT › Hồ sơ kháng nghị › tab "Hồ sơ kháng nghị đi" → "Chuyển hồ sơ"
   * → popup: Số bút lục HSKN, Đơn vị chuyển đến, bật "Đính kèm tài liệu, hồ sơ" → "Chuyển hồ sơ"
   * → "Đồng ý". Sau đó sang tab "Hồ sơ kháng nghị đến" → "Nhận hồ sơ".
   */
  async chuyenVaNhanHoSoKhangNghi(
    soBanAn: string,
    d: { donViNhan: string; soButLuc: string; ngayBanAn?: string; toaAn?: string },
  ) {
    const { page } = this;
    await moMenu(page, [MENU_GDT, 'Hồ sơ kháng nghị']);
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    await choHetSpin(page);

    // Danh sách có hàng trăm hồ sơ và phân trang → PHẢI lọc theo số bản án rồi mới tìm dòng,
    // nhìn trang đầu là trượt.
    const moTab = async (ten: RegExp) => {
      await page.getByRole('tab').filter({ hasText: ten }).first().click();
      await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
      await choHetSpin(page);
      await nghi(page, 1500, 2500);
      const oLoc = await oSoBanAn(page);
      if (oLoc) {
        await go(oLoc, soBanAn);
        await page.getByRole('button', { name: /Tìm kiếm$/ }).first().click();
        await choHetSpin(page);
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
        await nghi(page, 1500, 2500);
      }
      await bl.noiDieuKienNeuCan();
    };
    // Số bản án phải đứng RIÊNG, không được khớp chuỗi con: bản án "45" từng trúng dòng có số thụ lý
    // 1234567945 và khiến bước này chuyển + nhận hồ sơ kháng nghị CỦA VỤ KHÁC rồi vẫn báo pass
    // (27/09/2026, VG20). Có ngày bản án + tòa thì lọc thêm cho chắc.
    const bl = boLocDong(page, soBanAn, d.ngayBanAn, d.toaAn);
    const dongTheoBanAn = bl.dong;

    await moTab(/kháng nghị đi/i);
    // Hai tab thao tác KHÁC nhau (useHoSoKhangNghi.tsx):
    //  - tab "đi": không có cột checkbox, không có nút trên thanh công cụ; chỉ có icon swap
    //    (Tooltip "Chuyển hồ sơ") trên từng dòng, và icon đó CHỈ hiện khi hồ sơ chưa chuyển;
    //  - tab "đến": có cột checkbox + nút "Nhận hồ sơ"/"Trả hồ sơ" trên thanh công cụ.
    const nutChuyenDong = () => dongTheoBanAn().locator('.anticon-swap').first();
    if (await nutChuyenDong().count()) {
      await nutChuyenDong().click();
      const pop = page.locator('.ant-modal:visible').filter({ hasText: /Chuyển hồ sơ kháng nghị/i }).last();
      await expect(pop, 'Không mở được popup "Chuyển hồ sơ kháng nghị"').toBeVisible({ timeout: 30_000 });

      await go(pop.locator('#soButLucHSKN').first(), d.soButLuc);
      // Loại đơn vị chuyển đến để mặc định "Tòa án" → ô select là maDonViChuyenDen
      await chonSelect(page, pop.locator('#maDonViChuyenDen').first(), d.donViNhan);

      // "Đính kèm tài liệu, hồ sơ" là BẮT BUỘC (validateDinhKem: phải bật công tắc VÀ chọn ≥1 tài liệu)
      const congTac = pop.locator('.ant-switch').first();
      if ((await congTac.getAttribute('aria-checked')) !== 'true') await congTac.click();
      await nghi(page, 1200, 2000);
      await pop.getByRole('button', { name: /Thêm mới\/Chỉnh sửa$/ }).first().click();
      const popTL = page.locator('.ant-modal:visible').filter({ hasText: /Chọn hồ sơ, tài liệu đính kèm/i }).last();
      await expect(popTL, 'Không mở được popup "Chọn hồ sơ, tài liệu đính kèm"').toBeVisible({ timeout: 30_000 });
      await choHetSpin(page);
      await nghi(page, 1500, 2500);
      // Cây hồ sơ trộn thư mục và tài liệu, không phân biệt được bằng DOM. Tick lần lượt và đọc
      // chính bộ đếm "Đã chọn N tài liệu" của màn hình để biết đã chọn được tài liệu thật chưa
      // (thư mục rỗng tick vào vẫn là 0). recursiveFolderSelection nên tick thư mục là chọn cả trong.
      const daChon = async () => {
        const chu = await popTL.getByText(/Đã chọn \d+ tài liệu/).first().innerText().catch(() => '');
        return Number(chu.match(/\d+/)?.[0] || 0);
      };
      const hop = popTL.locator('.ant-checkbox-input:not([disabled])');
      const soHop = await hop.count();
      for (let i = 0; i < soHop && (await daChon()) === 0; i++) {
        await hop.nth(i).check({ force: true }).catch(() => {});
        await nghi(page, 400, 800);
      }
      expect(await daChon(), 'Vụ án không có tài liệu nào để đính kèm vào hồ sơ kháng nghị').toBeGreaterThan(0);
      await popTL.getByRole('button', { name: /^Lưu$/ }).first().click();
      await expect(popTL, 'Popup chọn tài liệu không đóng sau khi Lưu').toBeHidden({ timeout: 30_000 });

      await pop.getByRole('button', { name: /^Chuyển hồ sơ$/ }).last().click();
      // Hộp xác nhận có khi là .ant-modal-confirm, có khi là .ant-modal thường mang tiêu đề
      // "Xác nhận chuyển hồ sơ" và nút không phải lúc nào cũng tên "Đồng ý" (đo 29/09/2026: hồ sơ vẫn
      // "Chưa chuyển" vì hộp này còn mở) → nhận cả hai dạng và mọi nhãn nút xác nhận.
      const nutXacNhan = /^(Đồng ý|Xác nhận|Xác nhận chuyển hồ sơ|OK|Chuyển hồ sơ)$/;
      const xn = page
        .locator('.ant-modal-confirm:visible, .ant-modal:visible')
        .filter({ hasText: /Xác nhận|chuyển hồ sơ/i })
        .filter({ has: page.getByRole('button', { name: nutXacNhan }) })
        .last();
      if (await hienTrong(xn, 8_000)) {
        await xn.getByRole('button', { name: nutXacNhan }).last().click();
        await nghi(page, 800, 1200);
      }
      await choHetSpin(page);
      // Không chờ toast: màn này đóng popup rồi nạp lại lưới nên toast tắt trước khi đọc được.
      // Kiểm chứng bằng trạng thái thật của dòng (badge "Đã chuyển" trong TrangThaiPhatHanhCell).
      await expect(
        dongTheoBanAn(),
        `Hồ sơ kháng nghị của bản án ${soBanAn} vẫn "Chưa chuyển" sau khi bấm Chuyển hồ sơ${await nguyenNhanLoi(page)}`,
      ).toContainText(/Đã chuyển/i, { timeout: 60_000 });
    } else if (!(await dongTheoBanAn().count())) {
      // Chưa chuyển thì phải nằm ở tab "đi"; không có → xem đã chuyển từ lượt trước chưa
      await moTab(/kháng nghị đến/i);
      if (!(await dongTheoBanAn().count())) {
        // Lọc theo số bản án thường vẫn ra dòng của VỤ KHÁC cùng số (515 có ở cả 09/09/2024 và
        // 07/10/2024) → in ra dòng đang hiện để thấy ngay là hồ sơ của vụ mình chưa sinh, chứ không
        // phải lọc sai. Hồ sơ kháng nghị chỉ xuất hiện sau khi B13b ký số Quyết định kháng nghị.
        const dangHien = (await page.locator('.ant-table-row:visible').allInnerTexts())
          .slice(0, 5)
          .map(t => t.replace(/\s+/g, ' ').trim().slice(0, 160));
        throw new Error(
          `Không thấy hồ sơ kháng nghị của bản án ${soBanAn}${d.ngayBanAn ? ` (${d.ngayBanAn})` : ''} ở cả tab ` +
            `"Hồ sơ kháng nghị đi" lẫn "Hồ sơ kháng nghị đến" → vụ này chưa ký số Quyết định kháng nghị ` +
            `(B12a → B13b). Dòng đang hiện khi lọc số ${soBanAn}: ${dangHien.join(' || ') || '(danh sách trống)'}`,
        );
      }
    }

    await moTab(/kháng nghị đến/i);
    const dongDen = dongTheoBanAn();
    await this.phaiThayDong(dongDen, `Hồ sơ kháng nghị của bản án ${soBanAn} chưa sang tab "Hồ sơ kháng nghị đến"`);
    // Đã nhận ở lượt trước thì dòng hiện "Đã nhận" → không nhận lại
    if (/Đã nhận/i.test(await dongDen.innerText())) return;
    await dongDen.locator('.ant-checkbox-input').first().check({ force: true });
    await nghi(page, 600, 1000);
    const nutNhan = page.getByRole('button', { name: /Nhận hồ sơ$/ }).first();
    await expect(nutNhan, 'Không thấy nút "Nhận hồ sơ" trên thanh công cụ sau khi tick dòng').toBeVisible({ timeout: 30_000 });
    await nutNhan.click();
    const xn2 = page.locator('.ant-modal-confirm, .ant-modal').filter({ has: page.getByRole('button', { name: /^(Đồng ý|Xác nhận|Nhận)$/ }) }).last();
    if (await hienTrong(xn2, 5_000)) await xn2.getByRole('button', { name: /^(Đồng ý|Xác nhận|Nhận)$/ }).last().click();
    await choHetSpin(page);
    await nghi(page, 2000, 3000);
    // Kiểm chứng bằng trạng thái thật trên dòng, không dựa vào toast
    await expect(dongTheoBanAn().first(), `Hồ sơ kháng nghị ${soBanAn} chưa chuyển sang "Đã nhận"`).toContainText(/Đã nhận/i, {
      timeout: 60_000,
    });
  }

  /**
   * Bước 14b (tài liệu chưa ghi; bắt buộc trước B15): Quản lý án GĐT/TT › Phân công thẩm phán
   * (qla-webapp PhanCongThamPhanVu) — Vụ trưởng phân công Thẩm phán TANDTC cho vụ xét xử GĐT:
   *  1. Tab "DS chưa phân công chỉ định" → lọc Số BA/QĐ → tick vụ → "Chọn thẩm phán" + "Lý do phân công
   *     (chung)" → "Phân công chỉ định (1 …)".
   *  2. Tab "Quản lý kết quả phân công" → tick vụ → "Lưu số văn bản và in báo cáo" → modal Tờ trình phân công
   *     thẩm phán TANDTC (MS_02_TC): Người ký → "Lưu văn bản" → "Lấy số" → "Trình ký" (tự trình người ký).
   * Popup "Danh sách vụ xét xử đã chọn" (B15) lấy chủ tọa từ PHAN_CONG vai trò TA.TP.001 ĐÃ DUYỆT
   * (XetXuGdtServiceImpl.getDanhSach) → sau bước này Phó Chánh án còn phải duyệt tờ trình (B14c).
   * Dòng khớp theo số bản án đứng riêng + ngày bản án. Trả về id văn bản tờ trình (null nếu đã lưu từ trước).
   */
  async phanCongThamPhanTANDTC(
    soBanAn: string,
    ngayBanAn: string,
    d: {
      nguoiKy: string;
      hinhThucPhanCong?: string;
      toaAn?: string;
      /**
       * Tên Thẩm phán TANDTC muốn CHỈ ĐỊNH. Bỏ trống → phân công ngẫu nhiên như tài liệu B16. Truyền
       * tên → người đó thành CHỦ TOẠ, và Chương trình làm việc HĐXX (khoá người ký theo chủ toạ) sẽ
       * chờ duyệt ở hàng của người đó, nên phải là người mình có tài khoản.
       */
      thamPhanChiDinh?: string;
    },
  ): Promise<string | null> {
    const { page } = this;
    const bl = boLocDong(page, soBanAn, ngayBanAn, d.toaAn);
    const hinhThuc = d.hinhThucPhanCong || 'Hồ sơ kháng nghị GĐT-TT';
    /** Mở tab, lọc Hình thức phân công + Số BA/QĐ rồi trả về các dòng khớp đúng vụ */
    const moTabVaLoc = async (tab: RegExp) => {
      await page.getByRole('tab', { name: tab }).first().click();
      await choHetSpin(page);
      await nghi(page, 1200, 2000);
      // Tài liệu Bước 16: PHẢI lọc "Hình thức phân công" = Hồ sơ kháng nghị GĐT-TT
      const oHinhThuc = page.getByLabel('Hình thức phân công', { exact: true }).first();
      if (await hienTrong(oHinhThuc, 5_000)) await chonSelect(page, oHinhThuc, hinhThuc, { goDeLoc: false });
      // Dòng chỉ hiện "Số/Ngày/Tòa" trong cột "Thông tin BA/QĐ" mà ngày–tòa lấy từ thongTinBanAn nên
      // có hình thức để trống → lọc phía máy chủ bằng "Ngày BA/QĐ" + "Tòa ra BA/QĐ" của chính màn.
      // KHÔNG bật "Tìm kiếm nâng cao" ở màn này: bật xong form đổi và ô "Số BA/QĐ" biến mất
      // (đo 29/09/2026 với D03 — B16 báo "không thấy ô lọc Số BA/QĐ").
      await this.locNangCaoBanAn(ngayBanAn, d.toaAn, undefined, false);
      // Ô lọc đổi nhãn/placeholder theo Hình thức phân công (đã treo 30s ở B18) → dùng helper chung
      const oLocSo = await oSoBanAn(page, 10_000);
      if (!oLocSo) throw new Error('Màn Phân công thẩm phán: không thấy ô lọc "Số BA/QĐ"');
      await go(oLocSo, soBanAn);
      await page.getByRole('button', { name: /Tìm kiếm$/ }).first().click();
      await choHetSpin(page);
      await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
      await nghi(page, 1500, 2500);
      await bl.noiDieuKienNeuCan();
      return bl.ds();
    };

    await moMenu(page, [MENU_GDT, 'Phân công thẩm phán']);
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    await choHetSpin(page);

    // 1. PHÂN CÔNG NGẪU NHIÊN theo đúng tài liệu Bước 16 — hệ thống tự chọn thẩm phán, KHÔNG nhập tên.
    //    (Trước đây code dùng "phân công chỉ định" và tự gán một thẩm phán lấy từ vụ mẫu trên STG;
    //     luồng GĐT/TT không hề có việc đó.)
    //    Vụ đã phân công ở lượt trước thì không còn ở tab này → bỏ qua, sang bước 2.
    let vuaPhanCong = false;
    let loiToast: string | undefined;
    /** Tên Thẩm phán TANDTC phải thấy trên dòng sau khi phân công (chỉ khi chỉ định đích danh) */
    let tenTpCanCo: RegExp | null = null;

    // 1b. CHỈ ĐỊNH (khi có tên) — tab "DS chưa phân công chỉ định".
    //  ⚠ Ô "-- Chọn thẩm phán --" và ô "Lý do phân công (chung)" nằm trên THANH CÔNG CỤ của bảng,
    //    KHÔNG ở trong dòng (như màn Phân công TTV) và KHÔNG ở trong hộp thoại nào. Nút
    //    "Phân công chỉ định (n …)" chỉ hiện sau khi tick dòng; thiếu thẩm phán hoặc thiếu lý do thì nó
    //    chỉ bật message.warning rồi THOÁT, không mở hộp nào (PhanCongThamPhanVu/index.tsx:
    //    kiemTraTruocKhiPhanCong → Modal.confirm 'Xác nhận phân công'). Đo 02/10/2026 ở case-002.
    //  Danh sách thẩm phán = cán bộ chức danh TPTATC của các đơn vị GĐT/TT, trừ người đã tắt nhận
    //  phân công (useDanhSachThamPhan + getDsChucDanhTheoFilter) → người cần chỉ định phải có trong đó.
    if (d.thamPhanChiDinh) {
      const tenTp = new RegExp(boDauLinhHoat(d.thamPhanChiDinh), 'i');
      const dsChiDinh = await moTabVaLoc(/^DS chưa phân công chỉ định/);
      if (await hienTrong(dsChiDinh.first(), 8_000)) {
        const dong = dsChiDinh.first();
        await dong.locator('.ant-checkbox-input').first().check();
        await nghi(page, 600, 1000);
        const oTp = page.locator('.ant-select').filter({ hasText: /Chọn thẩm phán/ }).first().locator('input').first();
        await expect(
          oTp,
          'Tab "DS chưa phân công chỉ định": không thấy ô "-- Chọn thẩm phán --" trên thanh công cụ',
        ).toBeVisible({ timeout: 15_000 });
        const daChon = await chonSelect(page, oTp, d.thamPhanChiDinh, { goDeLoc: true }).catch((e: Error) => {
          // GIỮ NGUYÊN thông báo của chonSelect: nó liệt kê các mục đang có, bỏ đi là mất dữ kiện
          throw new Error(
            `Không chọn được Thẩm phán TANDTC "${d.thamPhanChiDinh}" ở tab "DS chưa phân công chỉ định" ` +
              `(vụ ${soBanAn}).\n  ${e.message}`,
          );
        });
        if (!daChon) throw new Error(`Chọn Thẩm phán TANDTC "${d.thamPhanChiDinh}" xong mà ô vẫn trống (vụ ${soBanAn})`);
        const oLyDo = page.getByPlaceholder(/Lý do phân công/i).first();
        await expect(oLyDo, 'Không thấy ô "Lý do phân công (chung)" trên thanh công cụ').toBeVisible({ timeout: 10_000 });
        await go(oLyDo, 'Phân công Thẩm phán TANDTC giải quyết hồ sơ kháng nghị.');
        const nutChiDinh = page.getByRole('button', { name: /^Phân công chỉ định/ }).first();
        await expect(nutChiDinh, 'Tick dòng rồi mà không hiện nút "Phân công chỉ định"').toBeVisible({ timeout: 15_000 });
        await nutChiDinh.click();
        const xnCd = page.locator('.ant-modal-confirm:visible').filter({ hasText: /Xác nhận phân công/i }).last();
        await expect(
          xnCd,
          'Bấm "Phân công chỉ định" mà không mở hộp "Xác nhận phân công" → ô thẩm phán hoặc ô lý do chưa ' +
            'nhận giá trị (màn chỉ bật message.warning rồi thoát)',
        ).toBeVisible({ timeout: 15_000 });
        await xnCd.getByRole('button', { name: /^(Xác nhận|Đồng ý|OK)$/ }).last().click();
        await choHetSpin(page);
        await toastDaHien(page, /thành công/i, 30_000, /thất bại|Vui lòng/i).catch((e: Error) => {
          loiToast = e.message;
        });
        await choHetSpin(page);
        vuaPhanCong = true;
        console.log(`    · B16: đã chỉ định Thẩm phán TANDTC "${daChon}" cho vụ ${soBanAn}`);
      } else {
        console.log(
          `    · B16: vụ ${soBanAn} không có ở "DS chưa phân công chỉ định" → có thể đã phân công ở lượt trước`,
        );
      }
      // Bằng chứng + đường sửa nằm ở tab "Quản lý kết quả phân công" bên dưới.
      tenTpCanCo = tenTp;
    }

    const dsCho = d.thamPhanChiDinh ? null : await moTabVaLoc(/^DS chưa phân công ngẫu nhiên/);
    if (dsCho && !(await hienTrong(dsCho.first(), 5_000))) {
      // Vụ đã phân công ở lượt trước thì KHÔNG còn ở tab này → không bấm gì và cũng KHÔNG chờ toast
      // (chờ toast ở nhánh này chính là "page.waitForFunction: Timeout 60000ms"), sang tab kết quả kiểm.
      console.log(
        '    · B16: vụ ' + soBanAn + ' không có ở "DS chưa phân công ngẫu nhiên" → kiểm ở "Quản lý kết quả phân công"',
      );
    } else if (dsCho) {
      // "Phân công ngẫu nhiên" xử lý TOÀN BỘ bản ghi đang hiện. Lọc xong mà còn dòng của vụ khác thì
      // dừng, không bấm — tránh đụng vào vụ không thuộc phạm vi đang chạy.
      const tongDong = await page.locator('.ant-table-row:visible').count();
      const dongCuaVu = await dsCho.count();
      expect(
        tongDong,
        `Sau khi lọc (${hinhThuc}, số BA ${soBanAn}) vẫn còn ${tongDong} dòng nhưng chỉ ${dongCuaVu} dòng là của vụ ` +
          `${soBanAn} – ${ngayBanAn}. Bấm "Phân công ngẫu nhiên" lúc này sẽ phân công cả vụ khác.`,
      ).toBe(dongCuaVu);
      await page.getByRole('button', { name: /Phân công ngẫu nhiên/ }).first().click();
      const xn = page
        .locator('.ant-modal-confirm:visible, .ant-modal:visible')
        .filter({ has: page.getByRole('button', { name: /^(Đồng ý|Xác nhận|OK)$/ }) })
        .last();
      if (await hienTrong(xn, 8_000)) await xn.getByRole('button', { name: /^(Đồng ý|Xác nhận|OK)$/ }).last().click();
      // Toast KHÔNG phải bằng chứng: nó có thể tắt trước khi đọc kịp, hoặc hiện lỗi mà bản ghi vẫn được
      // phân công. Bằng chứng là tab "Quản lý kết quả phân công" có dòng của vụ khi lọc theo Số BA/QĐ
      // (nghiệp vụ chốt 28/09/2026) — kiểm ngay bên dưới.
      await toastDaHien(page, /thành công/i, 20_000, /thất bại|Vui lòng/i).catch((e: Error) => {
        loiToast = e.message;
      });
      await choHetSpin(page);
      vuaPhanCong = true;
    }

    // 2. Kiểm chứng phân công: sang tab "Quản lý kết quả phân công", lọc Hình thức + Số BA/QĐ — có dòng
    //    của vụ nghĩa là phân công thành công. Rồi mới Lưu tờ trình → Lấy số → Trình ký.
    const dongKq = (await moTabVaLoc(/^Quản lý kết quả phân công/)).first();
    if (!(await hienTrong(dongKq, 60_000))) {
      const dangHien = (await page.locator('.ant-table-row:visible').allInnerTexts())
        .slice(0, 5)
        .map(t => t.replace(/\s+/g, ' ').trim());
      throw new Error(
        `Lọc ${hinhThuc} + số BA/QĐ ${soBanAn} ở tab "Quản lý kết quả phân công" không thấy vụ ` +
          `${soBanAn} (${ngayBanAn}) → phân công thẩm phán CHƯA thành công` +
          `${vuaPhanCong ? ' (đã bấm "Phân công ngẫu nhiên" ở tab DS chưa phân công)' : ''}` +
          `${loiToast ? `. Thông báo lúc phân công: ${loiToast}` : ''}` +
          `. Dòng đang hiện: ${dangHien.join(' || ') || '(danh sách trống)'}`,
      );
    }
    if (vuaPhanCong) console.log(`    · B16: phân công ngẫu nhiên xong, đã thấy vụ ${soBanAn} ở tab "Quản lý kết quả phân công"`);

    // 2b. CHỈ ĐỊNH ĐÍCH DANH: cột "Thẩm phán" phải là đúng người. Vụ đã phân công ngẫu nhiên ở lượt
    //     trước thì cột đó có nút "Sửa" (hiện khi record.khoaSua = false) mở Select "Chọn thẩm phán" +
    //     "Chọn thời điểm" + "Lý do thay đổi" → "Lưu". Đây là đường duy nhất đổi chủ toạ HĐXX sau khi
    //     hệ thống đã tự chọn (PhanCongThamPhanVu/index.tsx, cột 'Thẩm phán' → batDauSua/luuSua).
    if (tenTpCanCo) {
      if (!tenTpCanCo.test((await dongKq.innerText()).replace(/s+/g, ' '))) {
        const nutSua = dongKq.getByRole('button', { name: /^Sửa$/ }).first();
        if (!(await hienTrong(nutSua, 5_000))) {
          throw new Error(
            `Vụ ${soBanAn} đã phân công cho người khác và dòng KHÔNG có nút "Sửa" (bị khoá sửa) → không ` +
              `đổi được Thẩm phán TANDTC sang "${d.thamPhanChiDinh}". Dòng: ` +
              (await dongKq.innerText()).replace(/s+/g, ' ').trim().slice(0, 240),
          );
        }
        await nutSua.click();
        await nghi(page, 900, 1400);
        const oSua = dongKq.getByRole('combobox').first();
        await expect(oSua, 'Bấm "Sửa" mà dòng không hiện ô chọn thẩm phán').toBeVisible({ timeout: 10_000 });
        const daSua = await chonSelect(page, oSua, d.thamPhanChiDinh!, { goDeLoc: true });
        if (!daSua) throw new Error(`Sửa Thẩm phán TANDTC: chọn "${d.thamPhanChiDinh}" xong mà ô vẫn trống`);
        const oThoiDiem = dongKq.getByPlaceholder(/Chọn thời điểm/i).first();
        if (await hienTrong(oThoiDiem, 4_000)) await chonNgay(page, oThoiDiem, new Date().toLocaleDateString('en-GB'));
        const oLyDoSua = dongKq.getByPlaceholder(/Lý do thay đổi/i).first();
        if (await hienTrong(oLyDoSua, 4_000)) {
          await go(oLyDoSua, 'Đổi Thẩm phán TANDTC cho đúng chủ toạ Hội đồng xét xử.');
        }
        await dongKq.getByRole('button', { name: /^Lưu$/ }).first().click();
        await choHetSpin(page);
        await toastDaHien(page, /thành công/i, 30_000, /thất bại|Vui lòng/i).catch((e: Error) => {
          loiToast = e.message;
        });
        await choHetSpin(page);
        await nghi(page, 1500, 2500);
      }
      // Bằng chứng: chính dòng trên lưới ghi tên thẩm phán (cột "Thẩm phán", không còn "Chưa phân công")
      await expect(
        dongKq,
        `Phân công xong mà cột "Thẩm phán" của vụ ${soBanAn} vẫn không phải "${d.thamPhanChiDinh}"` +
          `${loiToast ? ` (thông báo: ${loiToast})` : ''}`,
      ).toContainText(tenTpCanCo, { timeout: 30_000 });
      console.log(`    · B16: cột "Thẩm phán" của vụ ${soBanAn} = ${d.thamPhanChiDinh} (chủ toạ HĐXX)`);
    }

    // discover → reuse: cột "Tờ trình phân công" đã có số + trạng thái (Chờ duyệt / Đã ban hành) nghĩa là
    // tờ trình MS_02_TC đã lập và trình ký xong ở lượt trước. Lúc đó ô tick của dòng bị KHOÁ, bấm check
    // sẽ treo tới hết giờ. Không làm lại gì, để B18 (Phó Chánh án ký logic) xử lý tiếp.
    const chuDong = (await dongKq.innerText()).replace(/\s+/g, ' ').trim();
    if (/TTr-TANDTC|Chờ duyệt|Đã ban hành/i.test(chuDong)) {
      console.log('    · B16: vụ đã có tờ trình phân công, bỏ qua bước lập —', chuDong.slice(0, 160));
      return null;
    }

    await dongKq.locator('.ant-checkbox-input').first().check();
    await nghi(page, 600, 1000);
    // Nút này đã đổi tên: bản cũ "Lưu số văn bản và in báo cáo" → nay "Tạo tờ trình phân công"
    // (thanh công cụ tab "Quản lý kết quả phân công", đo trên STG 27/09/2026). Nhận cả hai tên.
    await page
      .getByRole('button', { name: /Lưu số văn bản và in báo cáo|Tạo tờ trình phân công/ })
      .first()
      .click();
    // Tiêu đề modal đi kèm tên nút: bản cũ "Lưu số văn bản & In báo cáo", bản mới "Tờ trình phân công"
    const m = page
      .locator('.ant-modal:visible')
      .filter({ hasText: /Lưu số văn bản & In báo cáo|Tờ trình phân công/i })
      .last();
    await expect(m, 'Không mở được modal tờ trình phân công Thẩm phán TANDTC').toBeVisible({ timeout: 30_000 });
    await nghi(page, 1500, 2500);

    let idVanBan: string | null = null;
    // Ô "Người ký" (labelInValue) có thể HIỂN THỊ tên nhưng giá trị form trống (mở lại modal sau khi đã lưu)
    // → Trình ký dừng ở validateFields ("Vui lòng chọn người ký") mà không gọi API. Luôn chọn lại trước khi
    // Lưu văn bản và trước khi Trình ký.
    const oNguoiKy = m.locator('#nguoiKy');
    const nutLuu = m.getByRole('button', { name: /Lưu văn bản$/ });
    if (await nutLuu.isEnabled().catch(() => false)) {
      await chonSelect(page, oNguoiKy, d.nguoiKy);
      const cho = page.waitForResponse(r => r.request().method() === 'POST' && /\/phan-cong\/gdt-tt\/to-trinh/.test(r.url()), {
        timeout: 90_000,
      });
      await nutLuu.click();
      const res = await cho;
      const kq: any = await res.json().catch(() => null);
      if (!kq?.success) throw new Error(`Lưu tờ trình phân công thất bại: ${kq?.message || res.status()}`);
      idVanBan = kq.data?.[0]?.id || null;
      await choHetSpin(page);
      await nghi(page, 1500, 2500);
    }
    const nutLaySo = m.getByRole('button', { name: /Lấy số$/ });
    if (await hienTrong(nutLaySo, 5_000)) {
      await nutLaySo.click();
      await toastDaHien(page, /Lấy số thành công|thành công/i, 60_000, /thất bại/i);
      await choHetSpin(page);
      await nghi(page, 1200, 2000);
    }
    const nutTrinh = m.getByRole('button', { name: /Trình ký$/ });
    if ((await hienTrong(nutTrinh, 5_000)) && (await nutTrinh.isEnabled())) {
      await chonSelect(page, oNguoiKy, d.nguoiKy);
      await nghi(page, 600, 1000);
      // Kết quả lấy từ chính API trình ký (POST /phe-duyet-de-xuat/trinh-ky), không dựa vào hộp thông báo
      const choTrinh = page.waitForResponse(r => r.request().method() === 'POST' && /\/phe-duyet-de-xuat\/trinh-ky/.test(r.url()), {
        timeout: 180_000,
      });
      await nutTrinh.click();
      const res = await choTrinh;
      const kq: any = await res.json().catch(() => null);
      if (!kq?.success) throw new Error(`Trình ký tờ trình phân công TANDTC thất bại: ${kq?.message || res.status()}`);
      const hopXong = page.locator('.ant-modal-confirm:visible, .ant-modal:visible').filter({ hasText: /Trình ký thành công/ }).last();
      if (await hienTrong(hopXong, 15_000)) await hopXong.getByRole('button', { name: /^Đóng$/ }).last().click().catch(() => {});
    }
    await m.getByRole('button', { name: /^Đóng$/ }).first().click().catch(() => {});
    return idVanBan;
  }

  /**
   * Bước 15: Quản lý xét xử GĐT → vụ vừa nhận từ Hồ sơ kháng nghị đến → "Xem chi tiết" → tab
   * "Thụ lý" → "Thụ lý" ở phần "Thông tin thụ lý vụ án GĐT,TT".
   */
  /**
   * Mở "Quản lý xét xử GĐT" và LỌC theo ô "Nhập số BA/QĐ" (danh sách hàng trăm vụ, phân trang — không lọc
   * thì vụ mới/cũ nằm ngoài trang 1 là không thấy). Trả về dòng có số bản án đứng riêng (không phải
   * chuỗi con: "23" không khớp "65500423").
   */
  /**
   * Bước 23: Quản lý xét xử GĐT → lọc "Số BA/QĐ" + "Ngày BA/QĐ" → mở chi tiết vụ ở tab
   * "Kết quả xét xử" (/quan-ly-vu-xet-xu/chi-tiet?id=...&tab=ket-qua-xet-xu).
   * Trả về id vụ xét xử để bước sau dùng lại.
   */
  async moKetQuaXetXu(
    soBanAn: string,
    ngayBanAn?: string,
    d?: { nguyenNhan?: string; ketQuaXetXu?: string; toaAn?: string; duongSu?: string },
  ): Promise<string> {
    const { page } = this;
    await page.goto('vu-an/gdt-tt/quan-ly-vu-xet-xu/danh-sach');
    await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
    await choHetSpin(page);
    await nghi(page, 1200, 2000);

    // KHÔNG lọc theo "Nguyên đơn/Người khiếu nại" ở màn này. Điều tra DB + mã nguồn ngày 29/09/2026:
    // vụ xét xử GĐ2 gắn với một ĐƠN KỸ THUẬT mới (hồ sơ kháng nghị đến) có ID_VU_GIAIQUYET = NULL và
    // KHÔNG có bản ghi DON_DOITUONG_LIENQUAN, trong khi bộ lọc nguyên đơn của server là
    // EXISTS(VuGiaiQuyetDtlq WHERE idVuGiaiQuyet = Don.idVuGiaiQuyet ...) → LUÔN ra 0 dòng.
    // Ngược lại SO_BANAN_QD / NGAY_BANAN_QD trên đơn kỹ thuật đó ĐÚNG → lọc theo số BA/QĐ mới ra vụ.
    await this.datLoaiAn();
    await this.locNangCaoBanAn(ngayBanAn, d?.toaAn, undefined, false);
    const oSo = await oSoBanAn(page, 10_000);
    if (!oSo) throw new Error('Màn Quản lý xét xử GĐT: không thấy ô lọc "Số BA/QĐ"');
    await go(oSo, soBanAn);
    const nutTim = page.getByRole('button', { name: /Tìm kiếm$/ }).first();
    if (await hienTrong(nutTim, 5_000)) {
      await nutTim.click();
      await choHetSpin(page);
      await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
      await nghi(page, 1500, 2500);
    }

    // Số bản án phải ĐỨNG RIÊNG, kèm ngày + tòa: số ngắn (1–3 chữ số, 23–36) trùng nhau giữa các đợt
    // Dòng ở màn này KHÔNG hiện tên đương sự (VUAN giai đoạn 2 có 0 bản ghi CONNGUOI_VU — kiểm DB
    // 29/09/2026) nên không đưa đương sự vào điều kiện khớp dòng.
    const bl = boLocDong(page, soBanAn, ngayBanAn, d?.toaAn);
    await bl.noiDieuKienNeuCan();
    let dong = bl.dong();
    // Lọc xong mà vẫn không khớp được dòng nào nhưng danh sách chỉ còn ĐÚNG MỘT dòng thì dùng dòng đó.
    if (!(await hienTrong(dong, 8_000))) {
      const ds = page.locator('.ant-table-row:visible');
      if ((await ds.count()) === 1) {
        dong = ds.first();
        const chu = (await dong.innerText()).replace(/\s+/g, ' ').trim();
        console.log(`    · Lọc số BA/QĐ "${soBanAn}" còn đúng một dòng → dùng dòng đó: ${chu.slice(0, 160)}`);
      }
    }
    await this.phaiThayDong(
      dong,
      `Không thấy vụ ${soBanAn}${ngayBanAn ? ` (${ngayBanAn})` : ''} ở màn Quản lý xét xử GĐT`,
    );

    await dong.locator('button, a').filter({ has: page.locator('[aria-label="eye"]') }).first().click();
    await page.waitForURL(/quan-ly-vu-xet-xu\/chi-tiet\?id=/, { timeout: 60_000 });
    const idVuXetXu = new URL(page.url()).searchParams.get('id') || '';
    expect(idVuXetXu, 'Không lấy được id vụ xét xử từ URL chi tiết').toBeTruthy();

    await page.goto(`vu-an/gdt-tt/quan-ly-vu-xet-xu/chi-tiet?id=${idVuXetXu}&tab=ket-qua-xet-xu`);
    await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
    await choHetSpin(page);
    await nghi(page, 1500, 2500);

    // Tab "Kết quả xét xử" — hai ô nghiệp vụ yêu cầu điền (28/09/2026):
    //  · "Nguyên nhân" nằm ở khối "Kết quả giám đốc thẩm, tái thẩm", có nhãn nên lấy bằng getByLabel
    //  · "Kết quả giải quyết" nằm TRONG khối "Kết quả xét xử chi tiết từng bị cáo", ô chọn KHÔNG có
    //    nhãn (chỉ có placeholder "Chọn kết quả giải quyết") → neo theo tiêu đề khối rồi lấy combobox.
    // Không dùng chonSelect ở đây: nó đi ngược lên tổ tiên có class "ant-select", mà hai ô này được bọc
    // bằng thẻ khác nên xpath không khớp và treo hết 30s (lỗi VG01 28/09/2026).
    const daChon: string[] = [];
    /** Khung .ant-select bao ngoài ô input — đọc nhãn đang chọn để biết đã chọn được chưa */
    const khungCua = (o: Locator) =>
      o.locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]');
    const chuan = (t: string) => t.toLowerCase().replace(/\s+/g, ' ').trim();
    /**
     * Chọn một mục trong ô danh mục ở tab "Kết quả xét xử".
     * Hai điểm khác các ô khác trong dự án:
     *  · ô không bọc bằng thẻ có class "ant-select" → không dùng chonSelect (xpath tổ tiên treo 30s)
     *  · nhãn trên màn NGẮN HƠN nhãn nghiệp vụ gửi (màn: "Không chấp nhận kháng nghị"; nghiệp vụ:
     *    "Không chấp nhận kháng nghị, giữ nguyên bản án, quyết định có hiệu lực pháp luật")
     *    → gõ cả câu dài sẽ lọc rỗng; đọc danh mục thật rồi khớp theo tiền tố/chứa nhau.
     */
    /** Dropdown của đúng ô: antd gắn aria-controls="<id>_list" lên input và render #<id>_list trong dropdown */
    const ddCua = async (o: Locator) => {
      const ma = await o.getAttribute('aria-controls').catch(() => null);
      return ma
        ? page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').filter({ has: page.locator(`[id="${ma}"]`) }).last()
        : page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
    };
    /** Chọn MỤC ĐẦU TIÊN trong danh mục (nghiệp vụ 28/09/2026: "Người ký", "Quá hạn luật định") */
    const chonMucDauTien = async (o: Locator, ten: string) => {
      const dd = await ddCua(o);
      if (!(await dd.isVisible().catch(() => false))) {
        await o.evaluate(e => e.scrollIntoView({ block: 'center' })).catch(() => {});
        await o.click({ force: true });
      }
      await expect(dd, `Không mở được danh mục "${ten}"`).toBeVisible({ timeout: 20_000 });
      const muc = dd.locator('.ant-select-item-option:not(.ant-select-item-option-disabled)').first();
      await expect(muc, `Danh mục "${ten}" không có mục nào để chọn`).toBeVisible({ timeout: 20_000 });
      const nhan = ((await muc.getAttribute('title')) || (await muc.innerText())).trim();
      // Chọn bằng BÀN PHÍM: danh sách ảo dựng lại liên tục nên bấm chuột vào mục hay gặp
      // "element is not stable"/"not attached" rồi hết giờ (VT01 28/09/2026). ArrowDown + Enter
      // chọn đúng mục đang tô sáng (mục đầu) mà không phụ thuộc vị trí trên màn.
      await o.press('ArrowDown').catch(() => {});
      await o.press('Enter').catch(() => {});
      await nghi(page, 500, 900);
      const daHien = await khungCua(o).locator('.ant-select-selection-item').first().innerText().catch(() => '');
      if (!daHien.trim()) {
        await muc.click({ force: true, timeout: 8_000 });
        await nghi(page, 400, 800);
      }
      daChon.push(`${ten}=${(daHien.trim() || nhan)}`);
    };
    const chonTuDanhMuc = async (o: Locator, giaTri: string, ten: string) => {
      const dd = await ddCua(o);
      const mo = async () => {
        if (await dd.isVisible().catch(() => false)) return;
        await o.evaluate(e => e.scrollIntoView({ block: 'center' })).catch(() => {});
        await o.click({ force: true });
        await expect(dd, `Không mở được danh mục "${ten}"`).toBeVisible({ timeout: 20_000 });
      };
      const doc = async () =>
        (await dd.locator('.ant-select-item-option').evaluateAll(es => es.map(e => (e.getAttribute('title') || e.textContent || '').trim()))).filter(Boolean);
      const dainhat = (ds: string[]) => ds.sort((x, y) => y.length - x.length)[0];
      const khop = (ds: string[]) =>
        ds.find(t => chuan(t) === chuan(giaTri)) ||
        dainhat(ds.filter(t => chuan(giaTri).startsWith(chuan(t)) || chuan(t).startsWith(chuan(giaTri)))) ||
        dainhat(ds.filter(t => chuan(giaTri).includes(chuan(t)) || chuan(t).includes(chuan(giaTri))));

      await mo();
      const tatCa = new Set<string>();
      let nhan: string | undefined;
      // Cuộn và tìm trong CÙNG một vòng: danh sách ảo chỉ render phần đang hiện, mà cuộn xong quay lại
      // tìm thì dropdown có thể đã đóng.
      for (let i = 0; i < 100; i++) {
        await mo();
        const ds = await doc();
        ds.forEach(t => tatCa.add(t));
        nhan = khop(ds);
        if (nhan) break;
        const cuon = dd.locator('.rc-virtual-list-holder').first();
        const het = await cuon
          .evaluate(h => {
            const truoc = h.scrollTop;
            h.scrollTop += h.clientHeight * 0.8;
            return h.scrollTop === truoc;
          })
          .catch(() => true);
        if (het) break;
        await page.waitForTimeout(80);
      }
      if (!nhan) {
        const ds = [...tatCa];
        throw new Error(
          `Danh mục "${ten}" không có mục khớp "${giaTri}". Danh mục đang có ${ds.length} mục: ${ds.join(' | ')}`,
        );
      }
      await mo();
      const muc = dd
        .locator(`.ant-select-item-option[title="${nhan}"]`)
        .or(dd.locator('.ant-select-item-option').filter({ hasText: nhan }))
        .first();
      await expect(muc, `Không bấm được mục "${nhan}" trong danh mục "${ten}"`).toBeVisible({ timeout: 15_000 });
      // Biết nhãn THẬT trên màn rồi thì gõ chính nhãn đó để lọc còn vài mục, xong Enter — không bấm
      // chuột vào danh sách ảo nữa (bấm hay gặp "element is not stable" rồi hết 30s: VG05 28/09/2026).
      let daChonXong = false;
      if (await o.isEditable().catch(() => false)) {
        await o.fill('').catch(() => {});
        await o.pressSequentially(nhan.slice(0, 30), { delay: 15 }).catch(() => {});
        await nghi(page, 500, 900);
        await o.press('Enter').catch(() => {});
        await nghi(page, 400, 800);
        daChonXong = !!(await khungCua(o).locator('.ant-select-selection-item').first().innerText().catch(() => '')).trim();
      }
      if (!daChonXong) {
        await muc.scrollIntoViewIfNeeded().catch(() => {});
        await nghi(page, 250, 450);
        try {
          await muc.click({ timeout: 8_000 });
        } catch {
          await muc.click({ force: true, timeout: 8_000 });
        }
      }
      await nghi(page, 600, 1000);
      daChon.push(`${ten}=${nhan}`);
      if (chuan(nhan) !== chuan(giaTri)) console.log(`    · ${ten}: bộ dữ liệu ghi "${giaTri}" → màn hình dùng nhãn "${nhan}"`);
    };

    // Ba ô bắt buộc còn lại của khối "Kết quả giám đốc thẩm, tái thẩm" (nghiệp vụ chốt 28/09/2026):
    // Người ký = người đầu danh sách, Ngày phát hành = hôm nay, Quá hạn luật định = mục đầu danh sách.
    const oNguoiKy = page.getByLabel(/Người ký/i).first();
    if (await hienTrong(oNguoiKy, 10_000)) await chonMucDauTien(oNguoiKy, 'Người ký');
    const oNgayPhatHanh = page.getByLabel(/Ngày phát hành/i).first();
    if (await hienTrong(oNgayPhatHanh, 5_000)) {
      const homNay = new Date().toLocaleDateString('en-GB');
      if ((await oNgayPhatHanh.inputValue().catch(() => '')) !== homNay) {
        await chonNgay(oNgayPhatHanh, homNay);
        daChon.push(`Ngày phát hành=${homNay}`);
      }
    }
    const oQuaHan = page.getByLabel(/Quá hạn luật định/i).first();
    if (await hienTrong(oQuaHan, 5_000)) await chonMucDauTien(oQuaHan, 'Quá hạn luật định');
    // "Kết quả GĐT,TT" — ô BẮT BUỘC nằm ngay cạnh "Quá hạn luật định" (ảnh chụp lỗi D02 ngày
    // 29/09/2026: đỏ viền, báo "Vui lòng chọn kết quả"). Khác với ô "Kết quả giải quyết" của từng
    // bị cáo/đương sự ở khối bên dưới.
    const oKetQuaGdt = page.getByLabel(/Kết quả GĐT/i).first();
    if (await hienTrong(oKetQuaGdt, 5_000)) {
      if (d?.ketQuaXetXu) await chonTuDanhMuc(oKetQuaGdt, d.ketQuaXetXu, 'Kết quả GĐT,TT');
      else await chonMucDauTien(oKetQuaGdt, 'Kết quả GĐT,TT');
    }
    // "Nguyên nhân" điền SAU "Kết quả GĐT,TT": danh mục nguyên nhân phụ thuộc kết quả, chọn kết quả
    // làm ô nguyên nhân bị xoá trắng (đo 29/09/2026: điền nguyên nhân trước thì Lưu báo "Vui lòng chọn
    // nguyên nhân" dù trước đó đã chọn). Ô này BẮT BUỘC; bộ dữ liệu không khai thì lấy mục đầu danh mục.
    {
      const o = page.getByLabel(/Nguyên nhân/i).first();
      if (await hienTrong(o, 10_000)) {
        if (d?.nguyenNhan) await chonTuDanhMuc(o, d.nguyenNhan, 'Nguyên nhân');
        else await chonMucDauTien(o, 'Nguyên nhân');
      }
    }
    {
      // Tiêu đề khối đổi theo loại án: hình sự là "…từng bị cáo", dân sự/KDTM là "…từng đương sự".
      const khoi = page
        .locator('div')
        .filter({ has: page.getByRole('button', { name: /Kết quả xét xử chi tiết/ }) })
        .last();
      // Một giá trị dùng chung cho mọi bị cáo/đương sự (vụ nhiều người thì tick ô "Chọn tất cả")
      const chungTatCa = khoi.getByRole('checkbox', { name: /Chọn tất cả/ }).first();
      if ((await hienTrong(chungTatCa, 3_000)) && !(await chungTatCa.isChecked().catch(() => false))) {
        await chungTatCa.check().catch(() => {});
        await nghi(page, 800, 1200);
      }
      let o = khoi.getByRole('combobox').first();
      // Khối có thể đang THU GỌN → không thấy ô chọn, bỏ qua rồi Lưu sẽ bị chặn im lặng (đo 29/09/2026
      // với D09: màn không báo lỗi, nút Lưu bấm mà không gọi API). Bấm tiêu đề khối để mở ra trước.
      if (!(await hienTrong(o, 5_000))) {
        const tieuDe = khoi.getByRole('button', { name: /Kết quả xét xử chi tiết/ }).first();
        if (await hienTrong(tieuDe, 3_000)) {
          await tieuDe.click().catch(() => undefined);
          await nghi(page, 800, 1200);
          o = khoi.getByRole('combobox').first();
        }
      }
      if (await hienTrong(o, 10_000)) {
        // Ô BẮT BUỘC: bộ dữ liệu không khai thì lấy mục đầu danh mục, bỏ trống là "Vui lòng chọn kết quả"
        if (d?.ketQuaXetXu) await chonTuDanhMuc(o, d.ketQuaXetXu, 'Kết quả giải quyết');
        else await chonMucDauTien(o, 'Kết quả giải quyết');
      } else if (await hienTrong(khoi.getByText(/Không có bị cáo|Không có đương sự/i).first(), 3_000)) {
        // Vụ xét xử không có bị cáo nào → khối này không có ô "Kết quả giải quyết" để điền.
        // Không phải lỗi thao tác: dữ liệu vụ thiếu bị cáo (VT06 28/09/2026).
        console.log('    · B23: khối "Kết quả xét xử chi tiết từng bị cáo" báo "Không có bị cáo" → bỏ qua Kết quả giải quyết');
      }
    }

    if (daChon.length) {
      const nutLuu = page.getByRole('button', { name: /^(save )?Lưu$/ }).last();
      if (await hienTrong(nutLuu, 5_000)) {
        // Bằng chứng là API PUT /xetxu-gdt/ketqua (services/Xet-Xu-GDT-TT.ts), KHÔNG phải toast hay
        // nút "Chỉnh sửa thông tin vụ án": lưu tab này có lúc chạy lâu, nút Lưu còn ở trạng thái
        // loading khi toast đã hết giờ chờ (lỗi VT06 28/09/2026 — treo 30s rồi timeout vô nghĩa).
        const choLuu = page
          .waitForResponse(
            r => ['PUT', 'POST'].includes(r.request().method()) && /\/xetxu-gdt\/ketqua(\/|\?|$)/.test(r.url()),
            { timeout: 120_000 },
          )
          .catch(() => null);
        await nutLuu.click();
        await nghi(page, 1200, 2000);
        // Form chặn ngay ở client thì KHÔNG có request nào được gửi → liệt kê ô bắt buộc còn trống
        const loi = (await page.locator('.ant-form-item-explain-error:visible').allInnerTexts())
          .map(t => t.replace(/\s+/g, ' ').trim())
          .filter(Boolean);
        if (loi.length) {
          throw new Error(`Lưu tab "Kết quả xét xử" không được, các ô bắt buộc còn trống: ${[...new Set(loi)].join(' | ')}`);
        }
        const res = await choLuu;
        if (!res) {
          throw new Error(
            `Bấm "Lưu" ở tab Kết quả xét xử nhưng hệ thống không gọi API /xetxu-gdt/ketqua — ${await nguyenNhanLoi(page)}`,
          );
        }
        const kq = (await res.json().catch(() => ({ success: res.ok() }))) as { success?: boolean; message?: string };
        if (kq?.success === false) {
          const hint = /Quyết định phân công HĐXX|Thông báo VKS/i.test(kq.message || '')
            ? ' → phải xong B21 (thêm 2 biểu mẫu HĐXX, trình ký) và B22 (Phó Chánh án ký logic) trước khi lưu Kết quả xét xử ở B23.'
            : '';
          throw new Error(`Lưu Kết quả xét xử thất bại: ${kq.message || res.status()}${hint}`);
        }
        await choHetSpin(page);
      }
      console.log('    · B23 kết quả xét xử:', daChon.join(' | '));
    }

    return idVuXetXu;
  }

  private async locDanhSachXetXu(
    soBanAn: string,
    tab?: RegExp,
    ngayBanAn?: string,
    toaAn?: string,
    duongSu?: string,
  ) {
    const { page } = this;
    await moMenu(page, [MENU_GDT, 'Quản lý xét xử GĐT']);
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    await choHetSpin(page);
    if (tab) {
      await page.getByRole('tab', { name: tab }).first().click();
      await choHetSpin(page);
      await nghi(page, 1000, 1500);
    }
    return this.locTheoBanAn(soBanAn, ngayBanAn, toaAn, duongSu);
  }

  /**
   * Lọc danh sách đang mở theo ô "Nhập số BA/QĐ" (nếu có) rồi trả về dòng có số bản án ĐỨNG RIÊNG và
   * đúng ngày bản án: số ngắn (23–36) trùng giữa các đợt (vd "26" có ở cả 24/07/2025 và 28/10/2024).
   * Các danh sách Quản lý xét xử GĐT / Danh sách tham mưu / Phân công HĐXX đều hiện "Ngày: dd/mm/yyyy".
   */
  private async locTheoBanAn(
    soBanAn: string,
    ngayBanAn?: string,
    toaAn?: string,
    duongSu?: string,
    khongLocSoBanAn = false,
  ) {
    const { page } = this;
    // KHÔNG bật "Tìm kiếm nâng cao": bật xong form đổi, ô "Số BA/QĐ" biến mất và bộ lọc ngày/tòa nối
    // sang BAN_AN (vụ GĐ2 mới sinh chưa có) → danh sách rỗng dù vụ vẫn ở đó (đo 29/09/2026: B15 của K07,
    // K09, K10 sau khi đã tạo được vụ xét xử). Chỉ lọc số bản án rồi khớp ngày/tòa trên dòng.
    // KHÔNG dùng ô "Nguyên đơn/Người khiếu nại" ở các màn giai đoạn 2. Điều tra 29/09/2026 (DB + mã
    // nguồn qla): vụ xét xử GĐ2 neo vào ĐƠN KỸ THUẬT "hồ sơ kháng nghị đến" (IS_DON_CHINH=1) — đơn này
    // KHÔNG có DON_DOITUONG_LIENQUAN và ID_VU_GIAIQUYET = NULL, còn bộ lọc nguyên đơn của server là
    // EXISTS(VuGiaiQuyetDtlq WHERE idVuGiaiQuyet = Don.idVuGiaiQuyet ...) nên LUÔN trả 0 dòng.
    // Số/ngày/tòa bản án trên đơn kỹ thuật đó thì ĐÚNG (PhanCongHoiDongXetXuServiceImpl và
    // XetXuGdtServiceImpl đều lọc trên Don.soBanAnQD của đơn chính) → lọc theo số BA/QĐ là cách chạy được.
    await this.datLoaiAn();
    if (!khongLocSoBanAn) await this.locNangCaoBanAn(ngayBanAn, toaAn, undefined, false);
    const o = khongLocSoBanAn ? null : await oSoBanAn(page);
    if (o) {
      await go(o, soBanAn);
      await page.getByRole('button', { name: /Tìm kiếm$/ }).first().click();
      await choHetSpin(page);
      await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
      await nghi(page, 1500, 2500);
    }
    await moRongCoTrang(page);
    // Dòng ở các màn này không in tên đương sự (VUAN GĐ2 có 0 bản ghi CONNGUOI_VU) → chỉ khớp số/ngày/tòa
    const bl = boLocDong(page, soBanAn, ngayBanAn, toaAn);
    await bl.noiDieuKienNeuCan();
    return bl.dong();
  }

  /**
   * Khẳng định đã khớp được ĐÚNG dòng cần thao tác — báo lỗi NGAY khi bảng đã tải xong mà không có
   * dòng nào, kèm các dòng đang hiện để biết vì sao trượt.
   *
   * Vì sao không dùng thẳng `expect(dong).toBeVisible({ timeout: 60_000 })`: đo trên 526 lần chạy
   * bước đợt 27–28/09/2026, 324 lần có vụ hỏng ngốn 24,1 trên 31,5 giờ — gần hết là ngồi chờ một
   * dòng không bao giờ xuất hiện. Bảng đã tải xong mà 0 dòng khớp thì chờ thêm 60s cũng vô ích.
   */
  private async phaiThayDong(dong: Locator, thongBao: string) {
    const { page } = this;
    await luoiDaTai(page);
    if ((await dong.count()) === 0) {
      const ds = await page
        .locator('.ant-table-row:visible')
        .evaluateAll(es => es.slice(0, 5).map(e => (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 160)));
      throw new Error(`${thongBao}. Dòng đang hiện (${ds.length}): ${ds.join(' ¦ ') || '(trống)'}`);
    }
    await expect(dong, thongBao).toBeVisible({ timeout: 15_000 });
  }

  async thuLyVuAnGdt(soBanAn: string, ngayBanAn?: string, toaAn?: string, duongSu?: string) {
    const { page } = this;
    const dong = await this.locDanhSachXetXu(soBanAn, undefined, ngayBanAn, toaAn, duongSu);
    await this.phaiThayDong(dong, `Không thấy vụ án ${soBanAn} ở Quản lý xét xử GĐT`);
    await dong.locator('button, a').filter({ has: page.locator('[aria-label="eye"]') }).first().click();
    await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
    await choHetSpin(page);

    const tab = page.getByRole('tab').filter({ hasText: /^\s*Thụ lý\s*$/ }).first();
    if (await hienTrong(tab, 10_000)) await tab.click();
    await choHetSpin(page);
    await nghi(page, 1500, 2500);
    // Nút thật trên màn là "Thụ Lý" (L hoa) → không phân biệt hoa thường
    const nut = page.getByRole('button', { name: /^(\S+ )?Thụ lý$/i }).first();
    if (!(await hienTrong(nut, 10_000))) {
      // KHÔNG mặc định "đã thụ lý ở lượt trước": phải thấy Số thụ lý trên tab mới được coi là xong.
      // Trước đây trả về false vô điều kiện → bước ghi sổ cái "xong" trong khi VUAN.SO_THULY vẫn NULL
      // (đo STG 30/09/2026, vụ VA26-004805). Đó là pass giả.
      const chu = (await page.locator('.ant-tabs-tabpane-active, .ant-pro-card').first().innerText().catch(() => '')).replace(/\s+/g, ' ');
      const soTL = (chu.match(/Số thụ lý[^0-9]{0,20}(\d{4,})/) || [])[1];
      if (soTL) {
        console.log(`    · Vụ đã thụ lý từ lượt trước — Số thụ lý ${soTL}`);
        return false;
      }
      throw new Error(
        'Không thấy nút "Thụ lý" mà tab Thụ lý cũng KHÔNG có Số thụ lý → vụ chưa thụ lý, không được ' +
          `ghi sổ cái là xong. Chữ trên tab: ${chu.slice(0, 300) || '(trống)'}`,
      );
    }
    await nut.click();
    const hop = page.locator('.ant-modal:visible').last();
    if (await hienTrong(hop.getByRole('button', { name: /Xác nhận thụ lý|^(Đồng ý|Lưu)$/ }), 5_000)) {
      await hop.getByRole('button', { name: /Xác nhận thụ lý|^(Đồng ý|Lưu)$/ }).last().click();
    }
    await toastDaHien(page, /thành công/i, 90_000, /thất bại|Vui lòng|lỗi/i);
    return true;
  }

  /**
   * Bước 15 (tiếp): Danh sách vụ xét xử → tick vụ → "Tạo danh sách vụ xét xử" → chọn loại hội đồng
   * → "Chọn lịch xét xử" → chọn lịch đã tạo sẵn → "Lưu"; rồi "Danh sách tham mưu" → xem chi tiết →
   * "Lấy số" → "Trình ký" → "Gửi".
   */
  async taoDanhSachVuXetXu(
    soBanAn: string,
    loaiHoiDong: string,
    ngayBanAn?: string,
    toaAn?: string,
    duongSu?: string,
    /**
     * Tên Thẩm phán làm CHỦ TOẠ. Bỏ trống thì lấy người hệ thống đã phân công — và Chương trình làm
     * việc HĐXX sẽ chờ duyệt ở hàng của người đó (xem `datChuToaHdxx`).
     */
    chuToa?: string,
  ): Promise<boolean> {
    const { page } = this;
    // Chỉ tìm ở tab "Chưa có DS xét xử": vụ đã có danh sách (lượt trước) thì không tạo lại (tránh trùng)
    const dong = await this.locDanhSachXetXu(soBanAn, /^Chưa có DS xét xử/, ngayBanAn, toaAn, duongSu);
    if (!(await hienTrong(dong, 15_000))) {
      const daCo = await this.locDanhSachXetXu(soBanAn, /^Đã có DS xét xử/, ngayBanAn, toaAn, duongSu);
      if (await hienTrong(daCo, 15_000)) return false;
    }
    if (!(await hienTrong(dong, 60_000))) {
      // Liệt kê dòng đang hiện: lọc không ra thì phải biết màn đang có gì (vụ chưa về tới danh sách,
      // hay đang ở tab khác) chứ không chỉ "không thấy".
      const dangHien = (await page.locator('.ant-table-row:visible').allInnerTexts())
        .slice(0, 5)
        .map(t => t.replace(/s+/g, ' ').trim().slice(0, 200));
      throw new Error(
        `Không thấy vụ án ${soBanAn}${ngayBanAn ? ` (${ngayBanAn})` : ''} ở Danh sách vụ xét xử. ` +
          `Dòng đang hiện: ${dangHien.join(' || ') || '(danh sách trống)'}`,
      );
    }
    await dong.locator('.ant-checkbox-input').first().check();
    await nghi(page, 800, 1200);
    await page.getByRole('button', { name: /Tạo danh sách vụ xét xử$/ }).first().click();

    const pop = page.locator('.ant-modal:visible, .ant-drawer-open').filter({ hasText: /Danh sách vụ xét xử đã chọn/i }).last();
    await expect(pop, 'Không mở được popup "Danh sách vụ xét xử đã chọn"').toBeVisible({ timeout: 30_000 });

    // "Loại hội đồng" là antd Segmented (ModalTaoDSVuXetXu: "Hội đồng 5 thẩm phán" | "Hội đồng toàn thể"),
    // không phải Select → bấm đúng mục theo nhãn rồi kiểm lớp ant-segmented-item-selected.
    const mucHoiDong = pop.locator('.ant-segmented-item').filter({ hasText: loaiHoiDong }).first();
    if (await hienTrong(mucHoiDong, 5_000)) {
      if (!/ant-segmented-item-selected/.test((await mucHoiDong.getAttribute('class')) || '')) await mucHoiDong.click();
      await expect(mucHoiDong, `Không chọn được loại hội đồng "${loaiHoiDong}"`).toHaveClass(/ant-segmented-item-selected/, {
        timeout: 10_000,
      });
    } else {
      // Giao diện cũ (Select) — giữ để chạy được trên môi trường chưa cập nhật
      const oHoiDong = pop.locator('.ant-select').filter({ hasNot: page.locator('.ant-select-selection-item') }).first();
      if (await hienTrong(oHoiDong, 3_000)) await chonSelect(page, oHoiDong.locator('input').first(), loaiHoiDong, { goDeLoc: false });
    }
    await nghi(page, 800, 1200);
    if (chuToa) await datChuToaHdxx(page, pop, chuToa);

    await pop.getByRole('button', { name: /Chọn lịch xét xử$/ }).first().click();
    const lich = page.locator('.ant-modal:visible').filter({ has: page.locator('.ant-modal-title', { hasText: /^Chọn lịch xét xử$/ }) }).last();
    await expect(lich, 'Không mở được màn chọn lịch xét xử GĐT').toBeVisible({ timeout: 30_000 });
    await choHetSpin(page);
    await nghi(page, 2000, 3000);
    // Lịch GĐT/TT (đỏ) đã tạo sẵn: CHỌN bằng nút "Chọn lịch này" trong tooltip khi rê chuột lên lịch.
    // Bấm thẳng vào lịch không chọn — khung lịch vẫn mở và đè lên nút Lưu của popup.
    const dsLich = lich.locator('.rbc-event');
    await expect(dsLich.first(), 'Không thấy lịch xét xử đã tạo sẵn để chọn').toBeVisible({ timeout: 30_000 });
    let daChon = false;
    for (let i = (await dsLich.count()) - 1; i >= 0 && !daChon; i--) {
      const ev = dsLich.nth(i);
      if (!(await ev.isVisible().catch(() => false))) continue;
      await ev.hover();
      const nutChon = page.locator('.ant-tooltip:visible, .ant-popover:visible').getByRole('button', { name: /Chọn lịch này/ }).last();
      if (!(await hienTrong(nutChon, 4_000))) continue;
      await nutChon.click();
      daChon = await lich.waitFor({ state: 'hidden', timeout: 10_000 }).then(() => true, () => false);
    }
    expect(daChon, 'Không chọn được lịch xét xử (nút "Chọn lịch này" trong tooltip)').toBe(true);
    await choHetSpin(page);
    await nghi(page, 1200, 2000);
    // CHỐT CHẶN: lịch đã có danh sách vụ xét xử → popup nạp danh sách đó (chế độ cập nhật) và "Lưu" sẽ THAY
    // danh sách vụ cũ bằng vụ này (27/09/2026 đã làm VA017 bị gỡ khỏi danh sách đã duyệt). Dừng, không Lưu.
    const soRiengDs = new RegExp(`(^|[^0-9])${soBanAn}([^0-9]|$)`);
    const vuKhac = pop.locator('.ant-table-row:visible').filter({ hasNotText: soRiengDs });
    const daCoDs = pop.getByRole('button', { name: /Xem biểu mẫu$/ });
    if ((await vuKhac.count()) > 0 || (await daCoDs.count()) > 0) {
      const tt = (await vuKhac.allInnerTexts()).map(t => t.replace(/\s+/g, ' ').slice(0, 80));
      throw new Error(
        `Lịch vừa chọn đã có danh sách vụ xét xử (${tt.join(' | ') || 'có nút Xem biểu mẫu'}) — Lưu sẽ ghi đè danh sách đó. ` +
          `MỖI VỤ CẦN MỘT LỊCH XÉT XỬ RIÊNG (xem docs/stepdata/GDT-TT-bao-cao-thong-ke.txt: ghi chú sau BƯỚC 15). ` +
          `Hãy tạo thêm lịch xét xử GĐT/TT rồi chạy lại cho vụ ${soBanAn}.`,
      );
    }

    await pop.getByRole('button', { name: /^(save )?Lưu$/ }).last().click();
    // Màn cảnh báo bằng message (vd. "Vụ án chưa xác định thẩm phán chủ tọa, không thể trình ký") và giữ
    // popup → báo đúng nội dung thay vì chờ toast "thành công" hết giờ.
    // "Đã trình ký danh sách vụ xét xử" là thông báo THÀNH CÔNG của màn này (không có chữ "thành công")
    const canhBao = page.locator('.ant-message-notice:visible').filter({ hasNotText: /thành công|Đã trình ký|Đã lưu/i }).first();
    if (await hienTrong(canhBao, 4_000)) {
      const noiDung = (await canhBao.innerText()).replace(/\s+/g, ` `).trim();
      // "chưa xác định thẩm phán chủ tọa" = THIẾU B17/B18, không phải selector sai và không phải lỗi
      // backend: ModalTaoDSVuXetXu chặn ngay đầu handleLuu khi thamPhanChuToaHoTen rỗng; trường đó là
      // tenTP do XetXuGdtServiceImpl lấy từ PHAN_CONG vai trò Thẩm phán TAND tối cao (TA.TP.001) của
      // vụ xét xử, ở trạng thái ĐÃ DUYỆT.
      if (/chưa xác định thẩm phán chủ tọa/i.test(noiDung)) {
        throw new Error(
          noiDung +
            ` — vụ xét xử chưa có PHAN_CONG Thẩm phán TAND tối cao (TA.TP.001) ĐÃ DUYỆT. Chạy B17 ` +
            `(Vụ trưởng: Phân công thẩm phán → tab "DS chưa phân công ngẫu nhiên", lọc Hình thức ` +
            `"Hồ sơ kháng nghị GĐT-TT" → "Phân công ngẫu nhiên" → tờ trình MS_02_TC → Lấy số → Trình ký) ` +
            `rồi B18 (Phó Chánh án ký logic tờ trình) trước B19. ` +
            `Xem "Playwright nhập data GDT-TT (1).docx" Bước 16 và 17.`,
        );
      }
      throw new Error(`Không lưu được danh sách vụ xét xử: ` + noiDung);
    }
    await toastDaHien(page, /thành công|Đã trình ký/i, 90_000, /thất bại|Vui lòng|lỗi|chưa xác định/i);
    // Lưu xong popup KHÔNG tự tắt: nó chuyển sang chế độ chỉ đọc (footer Đóng / Xem biểu mẫu / Hủy cấp số).
    // Để nguyên thì bước "Lấy số → Trình ký" sau đó thao tác trên màn bị popup che và không thấy nút Trình ký.
    await this.dongPopupConMo();
    return true;
  }

  /** Đóng mọi popup đang mở (nút "Đóng"/"Close", cuối cùng là Escape) để màn phía sau bấm được. */
  private async dongPopupConMo() {
    const { page } = this;
    for (let i = 0; i < 3; i++) {
      const modal = page.locator('.ant-modal-wrap:visible').last();
      if (!(await modal.count()) || !(await modal.isVisible().catch(() => false))) return;
      const nutDong = modal.getByRole('button', { name: /^(close )?Đóng$/ }).last();
      if (await hienTrong(nutDong, 2_000)) await nutDong.click().catch(() => {});
      else await page.keyboard.press('Escape').catch(() => {});
      await choHetSpin(page);
      await nghi(page, 600, 1000);
    }
  }

  /**
   * Trạng thái dòng "Danh sách tham mưu" đọc được ở lần gọi `laySoVaTrinhKyThamMuu` gần nhất
   * (Chưa trình / Chờ duyệt / Đã duyệt). Bước 42 cần nó: chạy lại mà chương trình ĐÃ ĐƯỢC DUYỆT thì
   * không còn gì để duyệt, và hàng chờ của Chánh án không mang dấu hiệu vụ nên không dò được.
   */
  trangThaiThamMuu?: string;

  /** Bước 15 (cuối): Danh sách tham mưu → xem chi tiết vụ đã tham mưu → "Lấy số" → "Trình ký" → "Gửi". */
  async laySoVaTrinhKyThamMuu(
    soBanAn: string,
    ngayBanAn?: string,
    toaAn?: string,
    /**
     * `trinhLai`: văn bản đã trình thì THU HỒI rồi trình lại — dùng khi chủ toạ (người ký, cũng là
     * người duyệt) không phải tài khoản của bộ. `chuToa`: tên chủ toạ đặt lại trước khi trình lại.
     */
    d: { trinhLai?: boolean; chuToa?: string } = {},
  ): Promise<string | undefined> {
    const { page } = this;
    // Chạy lại sau lần lỗi trước, hoặc danh sách đã có từ trước → popup đọc-only còn mở, phải đóng trước
    await this.dongPopupConMo();
    // Vào hẳn trang tham mưu rồi mới tìm dòng — tìm ngay sau khi bấm sẽ trúng dòng của trang danh sách vụ
    // cũ (icon mắt ở đó mở CHI TIẾT VỤ, không phải màn Lấy số/Trình ký).
    if (!/\/quan-ly-vu-xet-xu\/tham-muu/.test(page.url())) {
      if (!/\/quan-ly-vu-xet-xu\/danh-sach/.test(page.url())) await moMenu(page, [MENU_GDT, 'Quản lý xét xử GĐT']);
      await page.getByRole('button', { name: /Danh sách tham mưu$/ }).first().click();
      await page.waitForURL(/\/quan-ly-vu-xet-xu\/tham-muu/, { timeout: 60_000 });
    }
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    await choHetSpin(page);
    await nghi(page, 1500, 2500);
    const dong = await this.locTheoBanAn(soBanAn, ngayBanAn, toaAn);
    await this.phaiThayDong(dong, `Không thấy vụ ${soBanAn} ${ngayBanAn || ''} ở Danh sách tham mưu vụ xét xử GĐT`);
    // Cột "Trạng thái" của dòng là bằng chứng nhanh nhất: danh sách đã Lấy số → Trình ký → duyệt xong
    // thì popup chi tiết KHÔNG còn nút "Trình ký" (chỉ còn Đóng / Xem biểu mẫu / Hủy cấp số), mở ra rồi
    // mới kết luận là báo lỗi nhầm (VG11 28/09/2026). Thấy "Đã duyệt"/"Đã trình"/"Chờ ký duyệt" → xong.
    const chuDong = (await dong.innerText()).replace(/\s+/g, ' ').trim();
    if (/Từ chối/i.test(chuDong)) {
      throw new Error(
        `Danh sách tham mưu của vụ ${soBanAn} đang ở trạng thái "Từ chối" — người duyệt đã trả lại, ` +
          `phải xử lý tay trước khi chạy tiếp. Dòng: ${chuDong.slice(0, 400)}`,
      );
    }
    const trangThai = /(Đã duyệt|Chờ duyệt|Đã trình ký|Đã trình|Chờ ký duyệt)/i.exec(chuDong)?.[1];
    this.trangThaiThamMuu = trangThai || /Chưa trình/i.exec(chuDong)?.[0];
    if (trangThai && !d.trinhLai) {
      console.log(`    · B19: danh sách tham mưu của vụ ${soBanAn} đã ở trạng thái "${trangThai}" → bỏ qua Lấy số/Trình ký`);
      return undefined;
    }
    if (trangThai) console.log(`    · B19: trạng thái "${trangThai}" + trinhLai → mở chi tiết để THU HỒI rồi trình lại`);
    await dong.locator('button, a').filter({ has: page.locator('[aria-label="eye"]') }).first().click();
    await choHetSpin(page);
    await nghi(page, 2000, 3000);

    if (d.trinhLai) {
      const nutThuHoi = page.getByRole('button', { name: /^Thu hồi$/ }).first();
      if (await hienTrong(nutThuHoi, 5_000)) {
        await nutThuHoi.click({ force: true });
        await xacNhanHopThoai(page).catch(() => undefined);
        await choHetSpin(page);
        await nghi(page, 1500, 2500);
        console.log('    · Danh sách tham mưu: ĐÃ THU HỒI trình ký để trình lại');
      }
      if (d.chuToa) {
        const pop = page.locator('.ant-modal:visible, .ant-drawer-open').filter({ hasText: /Danh sách vụ xét xử đã chọn/i }).last();
        if (await hienTrong(pop, 5_000)) {
          await datChuToaHdxx(page, pop, d.chuToa);
          const nutLuu = pop.getByRole('button', { name: /^(save )?Lưu$/ }).last();
          if (await hienTrong(nutLuu, 5_000)) {
            await nutLuu.click();
            await choHetSpin(page);
            await nghi(page, 1500, 2500);
            console.log('    · Danh sách vụ xét xử: đã lưu chủ toạ mới');
          }
        }
      }
    }

    const nutLaySo = page.getByRole('button', { name: /Lấy số$/ }).first();
    if (await hienTrong(nutLaySo, 10_000)) {
      await nutLaySo.click();
      await toastDaHien(page, /thành công/i, 90_000, /thất bại|Vui lòng|lỗi/i);
      await choHetSpin(page);
    }
    // Danh sách đã bị vụ khác ghi đè (dùng chung lịch xét xử): popup chi tiết mở ra chỉ còn
    // Đóng / Xem biểu mẫu / Hủy cấp số — KHÔNG có Trình ký. Báo ngay thay vì chờ hết 30s.
    const nutTrinhKy = page.getByRole('button', { name: /Trình ký$/ }).first();
    if (!(await hienTrong(nutTrinhKy, 15_000))) {
      const daTrinh = page.getByRole('button', { name: /Đã trình ký|Thu hồi|Hủy trình ký/ }).first();
      if (await hienTrong(daTrinh, 2_000)) {
        /**
         * Lượt chạy trước đã trình ký xong (sổ cái chưa kịp ghi) → không phải lỗi, nhưng KHÔNG bắt
         * được idVanBan nữa vì không có request trình ký; bước phê duyệt sẽ phải tìm đề xuất theo tên.
         *
         * IN RA TRẠNG THÁI + NÚT: bước phê duyệt sau đó có thể không thấy đề xuất ở tài khoản nào cả
         * (đo 02/10/2026: cả Chánh án lẫn Phó Chánh án đều không có "Chương trình làm việc"), lúc đó
         * chỉ hai dòng này nói được văn bản đang ở đâu.
         */
        const dsNutPop = (await page.locator('.ant-modal:visible button:visible').allInnerTexts().catch(() => []))
          .map(t => t.replace(/\s+/g, ' ').trim())
          .filter(Boolean);
        console.log('    · Danh sách tham mưu: văn bản đã trình ký từ trước → bỏ qua bước trình ký');
        console.log(`    · Danh sách tham mưu · dòng: ${chuDong.replace(/\s+/g, ' ').trim().slice(0, 500)}`);
        console.log(`    · Danh sách tham mưu · nút: ${dsNutPop.slice(0, 14).join(' | ') || '(không đọc được)'}`);
        // Người ký quyết định văn bản này chờ duyệt ở hàng của AI → in cả popup để thấy "Người ký"
        const chuPop = (await page.locator('.ant-modal:visible').first().innerText().catch(() => ''))
          .replace(/\s+/g, ' ')
          .trim();
        console.log(`    · Danh sách tham mưu · popup: ${chuPop.slice(0, 700) || '(không đọc được)'}`);
        return undefined;
      }
      const dsNut = (await page.locator('.ant-modal:visible button:visible, .ant-drawer-open button:visible').allInnerTexts())
        .map(t => t.replace(/\s+/g, ' ').trim())
        .filter(Boolean);
      throw new Error(
        `Không có nút "Trình ký" ở chi tiết Danh sách tham mưu của vụ ${soBanAn} (các nút đang có: ` +
          `${dsNut.join(' | ') || 'không đọc được'}); trạng thái dòng: "${chuDong.slice(0, 400)}". Hai nguyên nhân ` +
          `đã gặp: (1) danh sách vụ xét xử bị vụ ` +
          `khác ghi đè vì dùng chung một lịch xét xử — Chương trình làm việc HĐXX (CTLVHDXX) đã lấy số ` +
          `nhưng không trình ký được, cần lịch xét xử GĐT/TT riêng rồi tạo lại danh sách; (2) văn bản đã ` +
          `được trình/ký ở lượt trước nhưng popup không hiện nút trạng thái.`,
      );
    }
    await nutTrinhKy.click();
    const pop = page.locator('.ant-modal:visible').filter({ hasText: /Nhập thông tin trình duyệt ký/i }).last();
    await expect(pop, 'Không mở được popup "Nhập thông tin trình duyệt ký"').toBeVisible({ timeout: 30_000 });
    // Lấy idVanBan từ chính request trình ký (giống laySoTrinhKyBieuMau) → B20 mở đúng đề xuất của vụ
    // này theo id. Tìm theo tên văn bản là không đủ: màn Phê duyệt đề xuất có đề xuất cùng tên của vụ
    // khác (28/09/2026: dòng "Tờ trình thẩm tra vụ việc số 1" của Vụ giải quyết đơn 5864).
    const choTrinh = page.waitForRequest(
      q => q.method() === 'POST' && //phe-duyet-de-xuat/trinh-(ky|duyet)/.test(q.url()),
      { timeout: 60_000 },
    );
    this.trangThaiThamMuu = 'Chờ duyệt';
    await pop.getByRole('button', { name: /Gửi$/ }).last().click();
    const idVanBan = ((await choTrinh.catch(() => null))?.postDataJSON() as { idVanBan?: string } | undefined)?.idVanBan;
    await toastDaHien(page, /thành công/i, 90_000, /thất bại|Vui lòng|lỗi/i);
    return idVanBan;
  }

  /**
   * Bước 17: Phân công hội đồng xét xử → xem chi tiết hội đồng đã duyệt chương trình làm việc →
   * "Thêm biểu mẫu" (QĐ thành lập HĐXX, Thông báo VKS tham gia phiên toà) → người ký + ngày thông
   * báo + cấu hình nơi nhận → "Lưu" → "Trình ký" → "Gửi".
   */
  async themBieuMauHoiDong(
    soBanAn: string,
    d: {
      dsBieuMau: string[];
      nguoiKy: string;
      ngayThongBao: string;
      ngayBanAn?: string;
      toaAn?: string;
      duongSu?: string;
    },
  ): Promise<string[]> {
    const { page } = this;
    /** Id văn bản vừa trình ký (để Bước 18 mở theo id) */
    const dsId: string[] = [];
    await moMenu(page, [MENU_GDT, 'Phân công Hội đồng xét xử']);
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    await choHetSpin(page);
    let dong = await this.locTheoBanAn(soBanAn, d.ngayBanAn, d.toaAn, d.duongSu, true);
    // Màn này KHÔNG có ô lọc theo đương sự và ba ô lọc bản án của nó nối sang BAN_AN (vụ GĐ2 không có)
    // → dòng thường không mang số bản án. Không khớp được thì tìm theo TÊN ĐƯƠNG SỰ trên bảng, rồi mới
    // đến "chỉ còn đúng một dòng".
    if (!(await hienTrong(dong, 15_000)) && d.duongSu) {
      const theoNguoi = page.locator('.ant-table-row:visible').filter({ hasText: d.duongSu });
      if (await hienTrong(theoNguoi.first(), 5_000)) {
        dong = theoNguoi.first();
        console.log(`    · Phân công HĐXX: khớp dòng theo tên đương sự "${d.duongSu}"`);
      }
    }
    if (!(await hienTrong(dong, 15_000))) {
      const ds = page.locator('.ant-table-row:visible');
      const soDong = await ds.count();
      const chu = (await ds.allInnerTexts()).slice(0, 3).map(t => t.replace(/s+/g, ' ').trim().slice(0, 160));
      if (soDong === 1) {
        dong = ds.first();
        console.log(`    · Phân công HĐXX: chỉ còn một dòng → dùng dòng đó: ${chu[0] || ''}`);
      } else {
        throw new Error(
          `Không thấy hội đồng của bản án ${soBanAn} ${d.ngayBanAn || ''} ở màn Phân công Hội đồng xét xử ` +
            `(đương sự: ${d.duongSu || '-'}). Dòng đang hiện (${soDong}): ${chu.join(' || ') || '(trống)'}`,
        );
      }
    }
    await dong.locator('button, a').filter({ has: page.locator('[aria-label="eye"]') }).first().click();
    await choHetSpin(page);
    await nghi(page, 2000, 3000);

    for (const tenBieuMau of d.dsBieuMau) {
      // "toà"/"tòa", "hoà"/"hòa"… hai cách bỏ dấu khác mã Unicode: cấu hình và FE không thống nhất
      const reTen = new RegExp(boDauLinhHoat(tenBieuMau), 'i');
      const pop = page.locator('.ant-modal:visible, .ant-drawer-open').filter({ hasText: reTen }).last();
      // Đã có biểu mẫu (lần chạy trước lưu rồi mà chưa trình ký): mở lại và chỉ làm phần Lấy số → Trình ký
      const dongBieuMau = page.locator('.ant-table-row:visible').filter({ hasText: reTen }).first();
      if (await hienTrong(dongBieuMau, 3_000)) {
        await dongBieuMau.locator('button, a').filter({ has: page.locator('[aria-label="eye"]') }).first().click();
        await expect(pop, `Không mở được biểu mẫu "${tenBieuMau}" đã có`).toBeVisible({ timeout: 30_000 });
        await choHetSpin(page);
        await nghi(page, 1500, 2500);
        const id = await this.laySoTrinhKyBieuMau(pop, tenBieuMau);
        if (id) dsId.push(id);
        continue;
      }
      await page.getByRole('button', { name: /Thêm biểu mẫu$/ }).first().click();
      await nghi(page, 1200, 2000);
      const muc = page
        .getByRole('menuitem', { name: reTen })
        .or(page.locator('.ant-dropdown:visible, .ant-popover:visible, .ant-select-dropdown:visible').getByText(reTen))
        .first();
      await expect(muc, `Menu "Thêm biểu mẫu" không có mục "${tenBieuMau}"`).toBeVisible({ timeout: 10_000 });
      await muc.click();
      await expect(pop, `Không mở được popup "${tenBieuMau}"`).toBeVisible({ timeout: 30_000 });

      const oNguoiKy = pop.locator('[id$="MA_NGUOI_KY"], #nguoiKy').first();
      if (await hienTrong(oNguoiKy, 5_000)) await chonSelect(page, oNguoiKy, d.nguoiKy);
      // TB VKS: "Ngày thông báo" bắt buộc (BieuMauForm ngayQuyetDinhRequired); QĐ thành lập HĐXX thì ngày có sau Lấy số.
      // Tìm theo nhãn vì id do BieuMauForm sinh (…_ngayQuyetDinh) không chứa "thongBao".
      const oNgay = pop
        .locator('.ant-form-item')
        .filter({ has: page.locator('label.ant-form-item-required', { hasText: /^Ngày (thông báo|quyết định)$/ }) })
        .locator('input')
        .first();
      if ((await hienTrong(oNgay, 3_000)) && !(await oNgay.inputValue()) && (await oNgay.isEditable())) await chonNgay(oNgay, d.ngayThongBao);

      // Cấu hình nơi nhận (bắt buộc ≥ 1 dòng, FE báo "Vui lòng cấu hình ít nhất một nơi nhận"):
      // "Thêm nơi nhận" → dòng sửa của EditableProTable có 2 ô Select "Chọn phân loại" / "Chọn nơi nhận"
      // (ô sau khoá tới khi chọn phân loại) → link "Lưu" trên dòng. Form nạp lại dsNoiNhan cũ thì bỏ qua.
      const bangNoiNhan = pop.locator('.ant-card, .ant-pro-card').filter({ hasText: /Cấu hình nơi nhận/ }).last();
      const themNoiNhan = pop.getByRole('button', { name: /Thêm (mới )?nơi nhận$|Thêm mới nhận$/i }).first();
      const daCoNoiNhan = await bangNoiNhan
        .locator('.ant-table-row:visible')
        .filter({ hasNot: page.locator('.ant-select') })
        .count()
        .catch(() => 0);
      if (!daCoNoiNhan && (await hienTrong(themNoiNhan, 5_000))) {
        await themNoiNhan.scrollIntoViewIfNeeded();
        await themNoiNhan.click();
        await nghi(page, 800, 1200);
        const dongMoi = pop
          .locator('.ant-table-row:visible')
          .filter({ has: page.locator('.ant-select-selection-placeholder', { hasText: /^Chọn phân loại$/ }) })
          .last();
        await expect(dongMoi, 'Không thấy dòng nơi nhận mới sau khi bấm "Thêm nơi nhận"').toBeVisible({ timeout: 10_000 });
        // Ghim dòng theo data-row-key (placeholder mất ngay khi chọn giá trị)
        const khoaDong = await dongMoi.getAttribute('data-row-key');
        const dongNoiNhan = khoaDong ? pop.locator(`.ant-table-row[data-row-key="${khoaDong}"]`) : dongMoi;
        const oSelect = (i: number) => dongNoiNhan.locator('.ant-select').nth(i).locator('input').first();
        const loai = await chonSelect(page, oSelect(0), undefined, { goDeLoc: false });
        await expect(dongNoiNhan.locator('.ant-select').nth(1), 'Ô "Nơi nhận chi tiết" vẫn khoá sau khi chọn phân loại').not.toHaveClass(
          /ant-select-disabled/,
          { timeout: 10_000 },
        );
        const chiTiet = await chonSelect(page, oSelect(1), undefined, { goDeLoc: false });
        await dongNoiNhan.locator('a, button').filter({ hasText: /^Lưu$/ }).first().click();
        await expect(
          pop.locator('.ant-table-row:visible').filter({ hasText: loai }).filter({ hasNot: page.locator('.ant-select') }).first(),
          `Dòng nơi nhận "${loai} – ${chiTiet}" chưa được lưu`,
        ).toBeVisible({ timeout: 10_000 });
        await nghi(page, 600, 1000);
      }

      await pop.getByRole('button', { name: /^(save )?Lưu$/ }).last().click();
      await toastDaHien(page, /thành công/i, 90_000, /thất bại|Vui lòng|lỗi/i);
      await choHetSpin(page);
      await nghi(page, 1500, 2500);
      // Lưu xong popup vẫn mở, footer hiện thêm Lấy số / Trình ký (tài liệu: "Ấn button Lưu ở cuối popup và Trình ký")
      const id = await this.laySoTrinhKyBieuMau(pop, tenBieuMau);
      if (id) dsId.push(id);
    }
    return dsId;
  }

  /**
   * Footer biểu mẫu (VanBanCapSoActions): "Lấy số" nếu còn → "Trình ký" → popup "Nhập thông tin trình duyệt ký"
   * → "Gửi" → đóng popup biểu mẫu. Văn bản đã trình/đã ký (không còn nút Trình ký) thì chỉ đóng.
   * Toast: Lấy số "Đã cấp số thành công", Trình ký "Đã trình ký văn bản" (không có chữ "thành công").
   */
  private async laySoTrinhKyBieuMau(pop: Locator, tenBieuMau: string): Promise<string | undefined> {
    const { page } = this;
    let idVanBan: string | undefined;
    // Nút có icon antd → tên truy cập kèm tên icon ("number Lấy số", "send Trình ký")
    const nutLaySo = pop.getByRole('button', { name: /^(\S+ )?Lấy số$/ }).first();
    if ((await hienTrong(nutLaySo, 5_000)) && (await nutLaySo.isEnabled())) {
      await nutLaySo.click();
      await toastDaHien(page, /cấp số thành công|thành công/i, 90_000, /thất bại|Vui lòng|lỗi/i);
      await choHetSpin(page);
      await nghi(page, 1000, 1600);
    }
    const nutTrinh = pop.getByRole('button', { name: /^(\S+ )?(Trình ký|Trình lại)$/ }).first();
    const daTrinh = pop.getByRole('button', { name: /Đã trình ký|Thu hồi|Hủy trình ký/ }).first();
    if (!(await hienTrong(nutTrinh, 8_000)) && !(await hienTrong(daTrinh, 1_000))) {
      // Biểu mẫu đã trình/ký ở lượt trước: popup chỉ còn Đóng / Xem biểu mẫu… nhưng có nhãn trạng thái
      // → đó là PASS chứ không phải lỗi (nghiệp vụ 28/09/2026).
      // Đọc trạng thái ở CẢ popup lẫn dòng biểu mẫu phía sau: có trường hợp popup chỉ còn
      // "In biểu mẫu | Đóng" mà nhãn "Đã ký"/"Đã ban hành" nằm ở dòng bảng (VG01, VG12 — 28/09/2026).
      const chuPop = (
        (await pop.innerText().catch(() => '')) +
        ' ' +
        (await page
          .locator('.ant-table-row:visible')
          .filter({ hasText: new RegExp(boDauLinhHoat(tenBieuMau), 'i') })
          .first()
          .innerText()
          .catch(() => ''))
      ).replace(/\s+/g, ' ');
      const tt = /(Đã trình ký|Đã trình|Chờ duyệt|Đã duyệt|Đã ký số|Đã ký|Đã ban hành)/i.exec(chuPop)?.[1];
      if (tt) {
        console.log(`    · Biểu mẫu "${tenBieuMau}" đã ở trạng thái "${tt}" → bỏ qua Lấy số/Trình ký`);
        const nutDongSom = pop.getByRole('button', { name: /^Đóng$/ }).last();
        if (await hienTrong(nutDongSom, 3_000)) await nutDongSom.click().catch(() => {});
        return undefined;
      }
      const dsNut = (await pop.locator('button:visible').allInnerTexts()).map(t => t.trim()).filter(Boolean);
      throw new Error(`"${tenBieuMau}": không thấy nút Trình ký (các nút đang có: ${dsNut.join(' | ')})`);
    }
    if ((await nutTrinh.isVisible()) && (await nutTrinh.isEnabled())) {
      await nutTrinh.click();
      const popKy = page.locator('.ant-modal:visible').filter({ hasText: /Nhập thông tin trình duyệt ký/i }).last();
      await expect(popKy, `Không mở được popup "Nhập thông tin trình duyệt ký" của "${tenBieuMau}"`).toBeVisible({ timeout: 30_000 });
      await nghi(page, 800, 1200);
      // idVanBan lấy từ chính request trình ký → Bước 18 mở đúng yêu cầu theo id (danh sách Chờ duyệt phân trang)
      const choTrinh = page.waitForRequest(q => q.method() === 'POST' && /\/phe-duyet-de-xuat\/trinh-(ky|duyet)/.test(q.url()), { timeout: 60_000 });
      await popKy.getByRole('button', { name: /Gửi$/ }).last().click();
      idVanBan = ((await choTrinh.catch(() => null))?.postDataJSON() as { idVanBan?: string } | undefined)?.idVanBan;
      await toastDaHien(page, /Đã trình (ký|duyệt)|thành công/i, 90_000, /thất bại|Vui lòng|lỗi/i);
      await choHetSpin(page);
      await nghi(page, 1000, 1600);
    }
    const nutDong = pop.getByRole('button', { name: /^Đóng$/ }).last();
    if (await hienTrong(nutDong, 3_000)) await nutDong.click();
    else await pop.locator('.ant-modal-close').first().click().catch(() => {});
    await expect(pop).toBeHidden({ timeout: 15_000 }).catch(() => {});
    await choHetSpin(page);
    await nghi(page, 1000, 1600);
    return idVanBan;
  }
}
