/**
 * FLOW HÌNH SỰ 001 · BƯỚC 01 — wizard "Thêm mới vụ án" (PHẦN A2 của spec).
 *
 * Năm bước: Thông tin cáo trạng → Danh sách bị can → Thông tin vụ án → Người tham gia tố tụng →
 * Vật chứng → Hoàn thành.
 *
 * Viết theo lối DÒ NGAY TRONG LÚC CHẠY: mỗi bước wizard đều chụp lại danh sách ô và nút trước khi
 * thao tác. Lý do: cả phiên làm KDTM cho thấy đoán tên nhãn/nút luôn tốn vài lượt chạy, trong khi
 * một dòng dump cho ngay đáp án. Nhãn khớp LỎNG (nhãn ô bắt buộc có dấu sao và khoảng trắng thừa),
 * nút tìm bằng `nutTheoChu` (tên trợ năng ở hệ này hay khác chữ hiển thị).
 */
import { Locator, Page, expect } from '@playwright/test';
import { choHetSpin, dienOTheoNhan, dienTrongO, go, hienTrong, moTaForm, nghi, nguyenNhanLoi, toastDaHien } from '../../../common/antd';
import { bieuMauDangMo, nutTheoChu } from '../../../common/bieu-mau';
import type { INPUT } from '../../../data/hinh-su/flow-001-so-tham/case-001/input';

type DuLieuVao = typeof INPUT;
type GhiChu = (khoa: string, giaTri: string) => void;

/**
 * Chụp ô + nút của màn/khung hiện tại.
 *
 * Dump danh sách Ô rất đắt — `moTaForm` trên drawer bị can (~150 ô) mất vài phút và chính nó làm
 * lượt 01/10/2026 hết hạn test. Nên mặc định CHỈ chụp nút; chụp ô khi màn còn lạ (`soiO`) hoặc khi
 * cần dò lại cả luồng: `QLA_SOI=1`.
 */
async function soiMan(page: Page, khung: Locator, ghi: GhiChu, nhan: string, soiO = false) {
  if (soiO || process.env.QLA_SOI === '1') for (const d of await moTaForm(khung)) ghi(`${nhan} · ô`, d);
  const nut = [
    ...new Set(
      (await khung.getByRole('button').allInnerTexts().catch(() => []))
        .map(s => s.replace(/\s+/g, ' ').trim())
        .filter(Boolean),
    ),
  ];
  ghi(`${nhan} · nút`, nut.slice(0, 20).join(' | ') || '(không có)');
}

/**
 * Mở lưới "Vụ án sơ thẩm" và mở vụ án vừa tạo theo TÊN BỊ CAN.
 *
 * ĐỌC LƯỚI TRƯỚC, chỉ gõ tìm khi không thấy dòng: ở luồng KDTM, gõ mã vụ án vào ô tìm làm lưới
 * trống trơn và tôi đã kết luận sai ba lần liên tiếp ("vụ chưa tới tòa", "sai tòa", "lỗi nạp lưới").
 */
async function timVuAnTrenLuoi(page: Page, ghi: GhiChu, tenBiCan: string) {
  /**
   * Spec ghi route là `/vu-an/so-tham`, nhưng gõ thẳng route đó trên STG trả về `/exception/404`
   * (đo 01/10/2026) — các màn danh sách khác của hệ này dùng hậu tố `/danh-sach`. Thử lần lượt,
   * route nào ra lưới thì dùng.
   */
  for (const route of ['vu-an/so-tham/danh-sach', 'vu-an/so-tham', 'vu-an/so-tham/vu-an-so-tham']) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await choHetSpin(page);
    /**
     * Route hợp lệ thì DỪNG NGAY, rồi mới chờ lưới. Bản trước đòi có `.ant-table` ngay trong
     * 1,5–2,5 s: route `/danh-sach` đúng nhưng lưới chưa render nên vòng lặp chạy tiếp và kết thúc
     * ở route 404, rồi đi tìm dòng trên trang 404 (đo 01/10/2026).
     */
    if (!/exception\/404/.test(page.url())) {
      ghi('lưới vụ án sơ thẩm', `route dùng được: ${route}`);
      await page.locator('.ant-table').first().waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {});
      await choHetSpin(page);
      break;
    }
    ghi('lưới vụ án sơ thẩm', `route ${route} → 404`);
  }

  const dong = page.locator('.ant-table-row').filter({ hasText: tenBiCan }).first();
  if (!(await hienTrong(dong, 15_000))) {
    const oTim = page.getByPlaceholder(/Tìm|Nhập|tra cứu/i).first();
    if (await hienTrong(oTim, 5_000)) {
      await go(oTim, tenBiCan);
      await oTim.press('Enter');
      await choHetSpin(page);
      await nghi(page, 2000, 3000);
    }
  }
  if (!(await hienTrong(dong, 20_000))) {
    const soDong = await page.locator('.ant-table-row').count();
    throw new Error(
      `Không thấy vụ án của bị can "${tenBiCan}" trên lưới Vụ án sơ thẩm (lưới đang có ${soDong} dòng). ` +
        `URL: ${page.url()}`,
    );
  }
  await dong.click();
  await choHetSpin(page);
  await expect
    .poll(() => page.url(), { timeout: 120_000, intervals: [2000] })
    .toMatch(/chi-tiet\?id=/);
  ghi('B6 hoàn thành', `mở vụ án từ lưới: ${page.url()}`);
}

/**
 * Danh sách nút LỆNH của màn — bỏ thanh bước `.ant-steps`.
 *
 * Thanh bước của wizard cũng là `<button>` nên dump chung làm log đầy "Cáo trạng | Bị can | …" và
 * che mất điều cần biết: vùng nội dung có nút lệnh nào. Đúng chỗ này đã khiến tôi bấm vào ô bước
 * "Hoàn thành" và tưởng là đã chốt wizard (đo 01/10/2026).
 */
async function dsNutCuaMan(khung: Locator): Promise<string> {
  const ds = (
    await khung
      .locator('xpath=//button[not(ancestor::*[contains(@class,"ant-steps")])]')
      .allInnerTexts()
      .catch(() => [])
  )
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  return [...new Set(ds)].slice(0, 25).join(' | ') || '(không có nút lệnh nào)';
}

/** Điền một loạt ô theo nhãn, ghi lại kết quả, không chặn khi một ô trượt */
async function dienCacO(
  page: Page,
  khung: Locator,
  ghi: GhiChu,
  nhan: string,
  o: [RegExp, string | undefined][],
) {
  for (const [ten, giaTri] of o) {
    const gt = await dienOTheoNhan(page, khung, ten, giaTri).catch(async (e: Error) => {
      await page.keyboard.press('Escape').catch(() => {});
      ghi(nhan, `không điền được ${String(ten)}: ${e.message.slice(0, 100)}`);
      return '';
    });
    if (gt) ghi(nhan, `${String(ten)} = ${gt}`);
    await choHetSpin(page);
  }
}

/**
 * Một nhóm địa chỉ trong drawer bị can: ô chi tiết + Tỉnh/Thành phố + Phường/Xã.
 *
 * Phải chọn TỈNH TRƯỚC rồi mới tới PHƯỜNG/XÃ (danh mục phường phụ thuộc tỉnh), dù trong DOM ô
 * Phường/Xã lại nằm trước. "Quốc gia" đã sẵn "Việt Nam" nên không chạm vào.
 *
 * `thuTu` = thứ tự nhóm trên màn: 0 Nơi sinh · 1 Quê quán · 2 Nơi đăng kí HKTT · 3 Nơi tạm trú ·
 * 4 Nơi ở hiện tại.
 */
async function dienNhomDiaChi(
  page: Page,
  drawer: Locator,
  ghi: GhiChu,
  nhanNhom: RegExp,
  thuTu: number,
  chiTiet: string,
  tinh: string,
  phuong?: string,
) {
  const nhomThu = (nhan: RegExp, i: number) =>
    drawer
      .locator('.ant-form-item')
      .filter({ has: page.locator('label').filter({ hasText: nhan }) })
      .nth(i);

  // Bóc vỏ regex: /^Nơi sinh/ → "Nơi sinh". Xoá từng ký tự `/ \ i` thì mất luôn chữ "i" trong tên
  const ten = String(nhanNhom).replace(/^\/\^?/, '').replace(/\/[a-z]*$/, '');
  for (const [nhan, giaTri] of [
    [/Tỉnh\/Thành phố/, tinh],
    [/Phường\/Xã/, phuong],
  ] as [RegExp, string | undefined][]) {
    const gt = await dienTrongO(page, nhomThu(nhan, thuTu), nhan, giaTri).catch(async (e: Error) => {
      await page.keyboard.press('Escape').catch(() => {});
      ghi('B2 địa chỉ', `${ten} · ${String(nhan)}: ${e.message.slice(0, 110)}`);
      return '';
    });
    if (gt) ghi('B2 địa chỉ', `${ten} · ${String(nhan)} = ${gt}`);
    await choHetSpin(page);
  }
  // Ô chi tiết điền SAU CÙNG: chọn tỉnh/phường có thể ghép lại chuỗi địa chỉ và xoá chữ đã gõ
  const gt = await dienOTheoNhan(page, drawer, nhanNhom, chiTiet).catch(() => '');
  if (gt) ghi('B2 địa chỉ', `${ten} = ${gt}`);
}

/**
 * Bước 3 · bảng "Địa điểm xảy ra" (spec b7.4) — chỗ tôi BỎ SÓT và rất có thể là lý do wizard không
 * chốt được: màn 6 hiện "Sẵn sàng hoàn tất!" nhưng nút lệnh chỉ có "Quay lại | Tiếp theo", bấm
 * "Tiếp theo" thì mất hết nút, không toast, lưới 0 dòng (đo 01/10/2026, ba lượt).
 *
 * Spec: "+ Thêm địa điểm xảy ra" → Giờ xảy ra, Ngày xảy ra (không tương lai), Địa điểm chi tiết,
 * Quốc gia/Tỉnh/Phường → tick "Địa điểm chính" → icon "Lưu địa điểm".
 */
async function themDiaDiemXayRa(page: Page, man: Locator, ghi: GhiChu, input: DuLieuVao) {
  const nutThem = nutTheoChu(man, /Thêm địa điểm xảy ra/i);
  if (!(await hienTrong(nutThem, 10_000))) {
    ghi('CẢNH BÁO · B3 địa điểm', 'không thấy nút "+ Thêm địa điểm xảy ra"');
    return;
  }
  // Đã có dòng từ lượt trước thì không thêm trùng
  const bang = man.locator('.ant-table-row').filter({ hasText: input.diaDiemXayRa });
  if (await bang.count()) {
    ghi('B3 địa điểm', `đã có dòng "${input.diaDiemXayRa}"`);
    return;
  }

  await nutThem.click();
  await choHetSpin(page);
  await nghi(page, 1000, 1500);

  /**
   * Dòng nhập nằm NGAY TRONG BẢNG, các ô là ô trong cell — KHÔNG phải `.ant-form-item` có label,
   * nên `dienOTheoNhan` (tìm theo nhãn của form-item) trượt hết. Nhưng chúng CÓ tên trợ năng, nên
   * lấy thẳng bằng `getByRole`.
   *
   * Cấu trúc đo được 01/10/2026 (cây trợ năng):
   *   row: cell[ textbox "Giờ xảy ra" + textbox "Ngày xảy ra" ]
   *        cell[ textbox "Địa điểm chi tiết" + combobox "Chọn Quốc gia / Tỉnh/Thành phố / Phường/Xã" ]
   *        cell[ checkbox (ĐÃ tick sẵn — "Địa điểm chính") ]
   *        cell[ button img"save" · button img"close" ]
   *
   * Địa chỉ ở đây là MỘT combobox gộp ba cấp, không phải hai ô Tỉnh/Phường riêng như drawer bị can.
   */
  const dong = man.locator('tr.ant-table-row').last();
  for (const [ten, giaTri] of [
    ['Giờ xảy ra', input.gioXayRa],
    ['Ngày xảy ra', input.ngayXayRa],
    ['Địa điểm chi tiết', input.diaDiemXayRa],
  ] as [string, string | undefined][]) {
    const o = dong.getByRole('textbox', { name: ten }).first();
    if (!(await hienTrong(o, 10_000))) {
      ghi('B3 địa điểm', `không thấy ô "${ten}" trong dòng`);
      continue;
    }
    await go(o, giaTri || '');
    // Ô giờ/ngày là picker: gõ xong phải Enter, không thì giá trị chưa commit và panel che nút lưu
    if (/Giờ|Ngày/.test(ten)) {
      await o.press('Enter');
      await expect(
        page.locator('.ant-picker-dropdown:not(.ant-picker-dropdown-hidden)'),
        `Gõ "${giaTri}" vào "${ten}" nhưng panel không đóng`,
      ).toHaveCount(0, { timeout: 10_000 });
    }
    ghi('B3 địa điểm', `${ten} = ${(await o.inputValue().catch(() => '')) || giaTri}`);
    await choHetSpin(page);
  }

  // Combobox gộp Quốc gia / Tỉnh / Phường — cây 3 cấp, chọn tới cấp có tỉnh đã gieo
  const oDiaChi = dong.locator('[role="combobox"]').first();
  if (await hienTrong(oDiaChi, 5_000)) {
    const daChon = await dienTrongO(
      page,
      dong.locator('td').filter({ has: oDiaChi }).first(),
      'Quốc gia / Tỉnh/Thành phố / Phường/Xã',
      input.tinhThanhBiCan,
    ).catch(async (e: Error) => {
      await page.keyboard.press('Escape').catch(() => {});
      ghi('B3 địa điểm', `không chọn được địa chỉ: ${e.message.slice(0, 120)}`);
      return '';
    });
    if (daChon) ghi('B3 địa điểm', `địa chỉ = ${daChon}`);
    await choHetSpin(page);
  }

  // "Địa điểm chính" đã tick sẵn cho dòng đầu — chỉ tick khi chưa
  const tickChinh = dong.locator('input[type="checkbox"]').first();
  if ((await hienTrong(tickChinh, 3_000)) && !(await tickChinh.isChecked().catch(() => false))) {
    await tickChinh.click({ force: true });
    ghi('B3 địa điểm', 'đã tick "Địa điểm chính"');
  }

  // Lưu = nút ICON `save` trong cột Thao tác (không có chữ nào)
  const nutLuu = dong.locator('button:has(img[aria-label="save"]), button:has(.anticon-save)').first();
  if (!(await hienTrong(nutLuu, 10_000))) {
    ghi('CẢNH BÁO · B3 địa điểm', `không thấy nút lưu (icon save) trong dòng địa điểm`);
    return;
  }
  await nutLuu.click();
  await choHetSpin(page);
  await expect
    .poll(() => bang.count(), {
      message: `Lưu địa điểm nhưng bảng không có dòng "${input.diaDiemXayRa}"`,
      timeout: 20_000,
      intervals: [1500],
    })
    .toBeGreaterThan(0);
  ghi('B3 địa điểm', `đã lưu địa điểm "${input.diaDiemXayRa}"`);
}

/**
 * Cả 5 nhóm địa chỉ của một drawer con người (bị can, người tham gia tố tụng).
 *
 * Điền hết cả 5 vì FE báo "Vui lòng chọn thông tin địa chỉ" mà KHÔNG nói nhóm nào thiếu
 * (đo 01/10/2026) — dò từng nhóm thì mỗi lượt chạy mất 8 phút chỉ để loại một khả năng.
 */
async function dienDuDiaChi(
  page: Page,
  drawer: Locator,
  ghi: GhiChu,
  chiTiet: string,
  tinh: string,
  phuong?: string,
) {
  const nhom: [RegExp, number][] = [
    [/^Nơi sinh/, 0],
    [/^Quê quán/, 1],
    [/^Nơi đăng kí HKTT/, 2],
    [/^Nơi tạm trú/, 3],
    [/^Nơi ở hiện tại/, 4],
  ];
  for (const [nhan, thuTu] of nhom) {
    await dienNhomDiaChi(page, drawer, ghi, nhan, thuTu, chiTiet, tinh, phuong);
  }
}

/**
 * Bước wizard có lưới + nút "Tạo mới" (người tham gia tố tụng, vật chứng): mở drawer, CHỤP BẢN ĐỒ,
 * điền, Lưu.
 *
 * Không thêm được thì GHI CẢNH BÁO rồi đóng drawer và đi tiếp, chứ không dừng cả bước: hai bước
 * này là dữ liệu bổ trợ, trong khi thứ bước 01 phải giao là id vụ án. Dừng ở đây thì mỗi lượt chạy
 * 8 phút chỉ đổi được một dòng bản đồ.
 */
async function themQuaDrawer(
  page: Page,
  man: Locator,
  ghi: GhiChu,
  nhan: string,
  o: [RegExp, string | undefined][],
  /** Drawer có 5 nhóm địa chỉ (bị can, người tham gia tố tụng) thì truyền input để điền nốt */
  diaChi?: { chiTiet: string; tinh: string; phuong?: string },
  soiO = false,
  /** Chuỗi phải xuất hiện trong bảng sau khi lưu — bằng chứng do hệ thống vẽ ra */
  chuTrongBang?: string,
) {
  const nutTao = nutTheoChu(man, /Tạo mới|Thêm mới/);
  if (!(await hienTrong(nutTao, 10_000))) {
    ghi(`CẢNH BÁO · ${nhan}`, 'không thấy nút "Tạo mới" → bỏ qua, chưa thêm được bản ghi');
    return;
  }
  await nutTao.click();
  await choHetSpin(page);

  const drawer = bieuMauDangMo(page);
  if (!(await hienTrong(drawer, 20_000))) {
    ghi(`CẢNH BÁO · ${nhan}`, 'bấm "Tạo mới" nhưng không mở được drawer');
    return;
  }
  await soiMan(page, drawer, ghi, `${nhan} · drawer`, soiO);
  await dienCacO(page, drawer, ghi, nhan, o);
  if (diaChi) await dienDuDiaChi(page, drawer, ghi, diaChi.chiTiet, diaChi.tinh, diaChi.phuong);

  const nutLuu = nutTheoChu(drawer, /^Lưu$/);
  if (await hienTrong(nutLuu, 10_000)) {
    await nutLuu.click();
    await choHetSpin(page);
    await nghi(page, 1500, 2500);
  }
  // Bằng chứng: dòng trong bảng. "Drawer đã đóng" KHÔNG phải bằng chứng — locator lớp ngoài cùng
  // trỏ sang lớp khác ngay khi drawer đóng, và lưu hỏng thì drawer cũng có thể bị đóng.
  const dong = chuTrongBang ? man.locator('.ant-table-row').filter({ hasText: chuTrongBang }) : null;
  const daCoDong = dong
    ? await expect
        .poll(() => dong.count(), { timeout: 20_000, intervals: [1500] })
        .toBeGreaterThan(0)
        .then(() => true)
        .catch(() => false)
    : !(await hienTrong(drawer, 3_000));
  if (!daCoDong) {
    ghi(
      `CẢNH BÁO · ${nhan}`,
      `lưu xong nhưng bảng không có dòng "${chuTrongBang ?? '(không khai)'}" — ${await nguyenNhanLoi(page, drawer, 20_000)}`,
    );
    const nutDong = nutTheoChu(drawer, /^Đóng$|^Hủy$/);
    if (await hienTrong(nutDong, 5_000)) await nutDong.click();
    await choHetSpin(page);
    return;
  }
  ghi(nhan, `đã lưu — bảng có dòng "${chuTrongBang ?? ''}"`);
}

/** Nút "Tiếp theo" của wizard */
async function tiepTheo(page: Page, ghi: GhiChu, nhan: string) {
  // Tên nút là "Tiếp theo arrow-right" — icon nằm SAU chữ nên neo hai đầu trượt (đo 01/10/2026)
  const nut = nutTheoChu(page.locator('body'), /Tiếp theo/);
  await expect(nut, `${nhan}: không thấy nút "Tiếp theo"`).toBeVisible({ timeout: 20_000 });
  await nut.click();
  await choHetSpin(page);
  await nghi(page, 1200, 2000);
  ghi(nhan, 'đã bấm "Tiếp theo"');
}

export async function taoVuAnHinhSu(page: Page, input: DuLieuVao, ghi: GhiChu) {
  await choHetSpin(page);
  await nghi(page, 1500, 2500);

  // ───── b3 · Bước 1: Thông tin cáo trạng ─────
  const man = page.locator('body');

  /**
   * STG thỉnh thoảng trả TRANG TRẮNG: HTTP 200, khung ngoài vẽ xong nhưng vùng nội dung không nạp
   * (lượt 01/10/2026: cả màn không một ô, không một nút, rồi lỗi báo là "không thấy nút Tiếp
   * theo"). Bộ bắt 5xx của khung không nhận ra vì mã trả về vẫn 200 — tải lại một lần là qua.
   */
  for (let lan = 0; lan < 3; lan++) {
    if (await man.locator('.ant-form-item').count()) break;
    ghi('B1 cáo trạng', `màn chưa nạp nội dung (lần ${lan + 1}) → tải lại`);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await choHetSpin(page);
    await nghi(page, 2000, 3000);
  }
  await expect(
    man.locator('.ant-form-item').first(),
    'Màn "Thêm mới vụ án" không nạp được nội dung sau 3 lần tải lại',
  ).toBeVisible({ timeout: 30_000 });

  await soiMan(page, man, ghi, 'B1 cáo trạng');
  await dienCacO(page, man, ghi, 'B1 cáo trạng', [
    [/Trường hợp thụ lý/i, input.truongHopThuLy],
    [/Số cáo trạng/i, input.soCaoTrang],
    [/Ngày bản cáo trạng|Ngày cáo trạng/i, input.ngayCaoTrang],
    [/Số bút lục/i, input.soButLuc],
    // KHÔNG chạm ô "Viện kiểm sát": spec b3.5 ghi "mặc định phần tử đầu danh mục, giữ nguyên".
    // Mở dropdown rồi chọn "mục đầu theo thứ tự chữ cái" là ĐỔI mất giá trị FE đã nạp sẵn.
  ]);
  await tiepTheo(page, ghi, 'B1 cáo trạng');

  // ───── b5 · Bước 2: Danh sách bị can ─────
  await soiMan(page, man, ghi, 'B2 bị can');
  const nutTaoBiCan = nutTheoChu(man, /Tạo mới/);
  await expect(nutTaoBiCan, 'Bước 2 không có nút "Tạo mới" để thêm bị can').toBeVisible({
    timeout: 20_000,
  });
  await nutTaoBiCan.click();
  await choHetSpin(page);

  /**
   * Vẫn dùng `bieuMauDangMo` ("lớp đang mở ngoài cùng") để THAO TÁC. Thử neo theo tiêu đề
   * `/Thông tin bị can/` thì các ô vẫn điền được nhưng nút "+ Chọn tội danh" biến mất
   * (locator trỏ vào một lớp khác cùng chứa chữ đó) — đo 01/10/2026.
   *
   * Cái phải sửa nằm ở chỗ KIỂM SAU KHI LƯU: xem bảng có dòng bị can chưa, chứ không hỏi
   * "drawer đã đóng chưa" — lớp ngoài cùng là locator động nên câu hỏi đó luôn sai.
   */
  const drawer = bieuMauDangMo(page);
  await expect(drawer, 'Không mở được drawer "Thêm mới bị can"').toBeVisible({ timeout: 30_000 });
  await soiMan(page, drawer, ghi, 'B2 drawer bị can');

  await dienCacO(page, drawer, ghi, 'B2 bị can', [
    [/Trẻ vị thành niên/i, input.treViThanhNien],
    [/Tên bị can|Họ (và )?tên/i, input.tenBiCan],
    [/Ngày (tháng năm )?sinh/i, input.ngaySinhBiCan],
    [/Số định danh/i, input.soDinhDanhBiCan],
    [/Giới tính/i, input.gioiTinhBiCan],
    [/Quốc tịch/i, input.quocTich],
    [/Dân tộc/i, input.danToc],
    [/Nghề nghiệp/i, input.ngheNghiep],
    [/Trình độ văn hóa/i, input.trinhDoVanHoa],
    [/Đảng viên/i, input.dangVien],
    [/Công chức/i, input.congChuc],
    [/Nghiện ma túy/i, input.nghienMaTuy],
    [/Thời điểm phạm tội/i, input.thoiDiemPhamToi],
    [/Ngày bị khởi tố/i, input.ngayBiKhoiTo],
    [/Địa bàn phạm tội/i, input.diaBanPhamToi],
    [/Tiền án/i, input.tienAn],
    [/Tiền sự/i, input.tienSu],
  ]);

  /**
   * ĐỊA CHỈ bắt buộc: bấm "Lưu" khi để trống thì FE báo "Vui lòng chọn thông tin địa chỉ" mà không
   * chỉ ra nhóm nào (đo 01/10/2026) → điền cả 5 nhóm cho chắc.
   */
  await dienDuDiaChi(page, drawer, ghi, input.diaChiBiCan, input.tinhThanhBiCan, input.phuongXaBiCan);

  // ───── 5.3 · điều luật áp dụng: "+ Chọn tội danh" → cây Bộ luật Hình sự ─────
  const nutToiDanh = nutTheoChu(drawer, /Chọn tội danh/);
  await expect(nutToiDanh, 'Drawer bị can không có nút "+ Chọn tội danh"').toBeVisible({
    timeout: 15_000,
  });
  await nutToiDanh.click();
  await choHetSpin(page);

  const cay = bieuMauDangMo(page);
  await expect(cay, 'Không mở được modal cây điều luật').toBeVisible({ timeout: 30_000 });
  await soiMan(page, cay, ghi, 'B2 cây điều luật');

  /**
   * Cây điều luật rất dài nên phải LỌC rồi mới chọn. Gõ số điều vào ô tìm của modal; không có ô
   * tìm thì bấm thẳng vào dòng có chữ "Điều 173".
   */
  const oTim = cay.getByRole('searchbox').or(cay.getByPlaceholder(/Tìm|Nhập|tra cứu/i)).first();
  if (await hienTrong(oTim, 5_000)) {
    await go(oTim, input.dieuLuat);
    await oTim.press('Enter');
    await choHetSpin(page);
    await nghi(page, 1200, 1800);
  }
  for (const ten of [new RegExp(input.dieuLuat, 'i'), new RegExp(input.khoanDieuLuat, 'i')]) {
    const dong = cay.getByText(ten).first();
    if (await hienTrong(dong, 8_000)) {
      await dong.click();
      await choHetSpin(page);
      await nghi(page, 600, 1000);
      ghi('B2 tội danh', `đã chọn ${String(ten)}`);
    } else {
      ghi('B2 tội danh', `không thấy dòng ${String(ten)} trong cây điều luật`);
    }
  }
  const nutXong = nutTheoChu(cay, /Thêm|Chọn|Đồng ý|Lưu/);
  if (await hienTrong(nutXong, 5_000)) {
    await nutXong.click();
    await choHetSpin(page);
  }

  // ───── 5.4 · Lưu bị can ─────
  const nutLuuBiCan = nutTheoChu(drawer, /^Lưu$/);
  await expect(nutLuuBiCan, 'Drawer bị can không có nút "Lưu"').toBeVisible({ timeout: 15_000 });
  await nutLuuBiCan.click();
  await choHetSpin(page);
  await nghi(page, 1500, 2500);

  /**
   * BẰNG CHỨNG là DÒNG BỊ CAN TRONG BẢNG của bước 2, không phải "drawer đã đóng".
   * Trước đây kiểm theo drawer: toast đã báo "Lưu thành công" mà vẫn ném lỗi, vì locator "lớp
   * ngoài cùng" trỏ sang lớp khác sau khi drawer đóng (đo 01/10/2026).
   */
  const dongBiCan = man.locator('.ant-table-row').filter({ hasText: input.tenBiCan });
  const daCoDongBiCan = await expect
    .poll(() => dongBiCan.count(), { timeout: 30_000, intervals: [1500] })
    .toBeGreaterThan(0)
    .then(() => true)
    .catch(() => false);
  if (!daCoDongBiCan) {
    // Nói rõ FE đang chặn vì gì: danh mục/ô bắt buộc khác nhau giữa STG và UAT (đo 01/10/2026)
    const loi = await nguyenNhanLoi(page, drawer, 30_000);
    const oLoi = (await moTaForm(drawer)).filter(d => d.includes('⚠')).slice(0, 12);
    throw new Error(
      `Bấm "Lưu" nhưng bảng bị can không có dòng "${input.tenBiCan}".\n  Màn báo: ${loi}\n  ` +
        `Ô còn lỗi: ${oLoi.join(' · ') || '(không ô nào gắn cờ lỗi)'}`,
    );
  }
  ghi('B2 bị can', `đã lưu bị can ${input.tenBiCan} (có dòng trong bảng)`);

  await tiepTheo(page, ghi, 'B2 bị can');

  // ───── b7 · Bước 3: Thông tin vụ án ─────
  await soiMan(page, man, ghi, 'B3 thông tin vụ án');
  await dienCacO(page, man, ghi, 'B3 thông tin vụ án', [[/Nội dung vụ án/i, input.noiDungVuAn]]);
  await themDiaDiemXayRa(page, man, ghi, input);
  await tiepTheo(page, ghi, 'B3 thông tin vụ án');

  // ───── b9 · Bước 4: người tham gia tố tụng (bị hại) ─────
  await soiMan(page, man, ghi, 'B4 người tham gia');
  /**
   * Nhãn là "Tư cách tham gia tố tụng". Regex rộng (`Loại người tham gia`) trúng ô radio
   * "Phân loại người tham gia tố tụng" ở trên và ghi "= 0" — điền sai ô mà vẫn báo thành công
   * (đo 01/10/2026).
   */
  await themQuaDrawer(
    page,
    man,
    ghi,
    'B4 bị hại',
    [
      [/^Tư cách tham gia tố tụng/, 'Bị hại'],
      [/^Họ và tên/, input.tenBiHai],
      [/^Ngày sinh/, input.ngaySinhBiHai],
      [/^Giới tính/, 'Nữ'],
      [/^Dân tộc/, input.danToc],
      /**
       * Căn cước BẮT BUỘC: bỏ trống thì "Lưu" báo "Vui lòng nhập căn cước" (đo 01/10/2026).
       * KHÔNG điền "Quốc tịch" ở drawer này: chọn "Việt Nam" xong đọc lại ô vẫn trống — ô tự nạp
       * theo chỗ khác, ép vào chỉ tốn thời gian và sinh cảnh báo giả.
       */
      [/^Số căn cước/, input.soDinhDanhBiHai],
      [/^Ngày cấp CCCD/, input.ngayCapCCCDBiHai],
    ],
    { chiTiet: input.diaChiBiHai, tinh: input.tinhThanhBiCan, phuong: input.phuongXaBiCan },
    false,
    input.tenBiHai,
  );
  await tiepTheo(page, ghi, 'B4 người tham gia');

  // ───── b11 · Bước 5: vật chứng (màn còn lạ → chụp cả danh sách ô) ─────
  await soiMan(page, man, ghi, 'B5 vật chứng', true);
  await themQuaDrawer(
    page,
    man,
    ghi,
    'B5 vật chứng',
    [
      [/Tên vật chứng|Tên tài sản/i, input.tenVatChung],
      [/Số lượng/i, input.soLuongVatChung],
      [/Thuộc sở hữu|Sở hữu/i, input.thuocSoHuu],
    ],
    undefined,
    true,
    input.tenVatChung,
  );
  await tiepTheo(page, ghi, 'B5 vật chứng');

  // ───── b13 · Bước 6: Hoàn thành ─────
  await soiMan(page, man, ghi, 'B6 hoàn thành', true);
  ghi('B6 hoàn thành · URL', page.url());
  ghi(
    'B6 hoàn thành · màn',
    (await man.innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 400),
  );
  /**
   * CHỐT WIZARD. Spec b13: nút lệnh là "Hoàn thành" → "Đang xử lý…" → "Tạo vụ án thành công".
   * Spec b12 ghi sẵn một lỗi FE: ở bước "Hoàn thành" ("Sẵn sàng hoàn tất!") phải bấm "Tiếp theo"
   * THÊM MỘT LẦN NỮA thì nút "Hoàn thành" mới hiện.
   *
   * Nên vòng lặp chỉ làm một việc: thấy "Hoàn thành" thì bấm, không thấy thì bấm "Tiếp theo" rồi
   * TÌM LẠI. Bản trước bấm "Tiếp theo" xong thoát luôn nên không bao giờ tới được nút chốt.
   *
   * ⚠ Thanh tiến trình cũng là <button> và cũng mang chữ "Hoàn thành" (ban đầu "6 Hoàn thành",
   * sau một lượt thì mất số). Bấm nhầm vào đó thì log ghi "đã bấm Hoàn thành" mà không tạo gì:
   * không toast, lưới 0 dòng (đo 01/10/2026, hai lượt). Vì vậy nút lệnh phải lấy trong khối chứa
   * chữ "Sẵn sàng hoàn tất", không lấy trên cả màn.
   */
  /**
   * Tìm trên CẢ MÀN, loại trừ thanh bước `.ant-steps`.
   *
   * Không neo vào khối chứa chữ "Sẵn sàng hoàn tất": chữ đó BIẾN MẤT ngay sau cú "Tiếp theo" — mà
   * đúng lúc ấy nút "Hoàn thành" mới hiện ra. Lượt 01/10/2026 vì vậy báo "không hiện nút lệnh"
   * trong khi log của chính nó in `Nút lệnh: Quay lại | Hoàn thành`.
   */
  const nutChot = () =>
    man
      .locator(
        'xpath=//button[normalize-space()="Hoàn thành" or normalize-space()="Lưu vụ án" or normalize-space()="Tạo vụ án"]' +
          '[not(ancestor::*[contains(@class,"ant-steps")])]',
      )
      .first();

  let daBamHoanThanh = false;
  for (let lan = 0; lan < 4 && !daBamHoanThanh; lan++) {
    if (await hienTrong(nutChot(), lan === 0 ? 20_000 : 30_000)) {
      await nutChot().click();
      ghi('B6 hoàn thành', `đã bấm "Hoàn thành" (sau ${lan} lượt "Tiếp theo")`);
      daBamHoanThanh = true;
      break;
    }
    const nutTiep = nutTheoChu(man, /Tiếp theo/);
    if (!(await hienTrong(nutTiep, 5_000))) {
      ghi('B6 hoàn thành', `không còn nút nào để bấm. Nút lệnh: ${await dsNutCuaMan(man)}`);
      break;
    }
    await nutTiep.click();
    ghi('B6 hoàn thành', `bấm "Tiếp theo" lượt ${lan + 1} để làm hiện nút "Hoàn thành" (spec b12)`);
    await choHetSpin(page);
    await nghi(page, 2500, 3500);
  }
  if (!daBamHoanThanh) {
    throw new Error(
      `Màn 6 không hiện nút lệnh "Hoàn thành" sau 4 lượt thử. ` +
        `Nút lệnh đang có: ${await dsNutCuaMan(man)}`,
    );
  }
  await choHetSpin(page);

  /**
   * Spec b13: "Hoàn thành" → "Đang xử lý..." → "Tạo vụ án thành công" → tự chuyển. Khâu "Đang xử
   * lý" là tạo cả vụ án nên CHẬM; chờ toast trước rồi mới chờ URL, và nới hẳn thời gian.
   */
  await toastDaHien(page, /Tạo vụ án thành công|thành công/i, 150_000, /thất bại|lỗi/i).catch(() => {
    ghi('B6 hoàn thành', 'không thấy toast "Tạo vụ án thành công" — vẫn chờ chuyển màn');
  });
  await choHetSpin(page);

  /**
   * BẰNG CHỨNG của bước này là URL chi tiết vụ án do hệ thống cấp: `…/chi-tiet?id=<uuid>`.
   * Không lấy được id thì KHÔNG coi là xong — bước 02 trở đi đều cần id này.
   */
  const toiChiTiet = await expect
    .poll(() => page.url(), { timeout: 150_000, intervals: [2000] })
    .toMatch(/chi-tiet\?id=/)
    .then(() => true)
    .catch(() => false);
  /**
   * Không tự chuyển thì đi tìm vụ án TRÊN LƯỚI — đường vòng, nhưng cũng là bằng chứng mạnh hơn
   * chuyện "trang có đổi URL không": vụ án phải thật sự nằm trong danh sách của đơn vị.
   */
  if (!toiChiTiet) {
    ghi('B6 hoàn thành', 'bấm "Hoàn thành" xong nhưng không tự chuyển màn → tìm vụ án trên lưới');
    await timVuAnTrenLuoi(page, ghi, input.tenBiCan);
  }
  if (!/chi-tiet\?id=/.test(page.url())) {
    const chu = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 400);
    throw new Error(
      `Bấm xong bước 6 nhưng không mở được chi tiết vụ án.\n  URL: ${page.url()}\n  ` +
        `Nút: ${await dsNutCuaMan(man)}\n  Màn đang hiện: ${chu}\n  ${await nguyenNhanLoi(page)}`,
    );
  }
  const idVuAnHinhSu = new URL(page.url()).searchParams.get('id') || '';
  if (!idVuAnHinhSu) throw new Error(`URL chi tiết không có tham số id: ${page.url()}`);

  const tenVuAn = (
    await page
      .getByText(/^Vụ án /)
      .first()
      .innerText()
      .catch(() => '')
  )
    .replace(/\s+/g, ' ')
    .trim();
  ghi('B6 hoàn thành', `đã tạo vụ án id=${idVuAnHinhSu} · ${tenVuAn || '(chưa đọc được tên)'}`);

  return { idVuAnHinhSu, tenVuAn, tenBiCan: input.tenBiCan };
}
