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
import { choHetSpin, dienOTheoNhan, dienTrongO, go, hienTrong, moTaForm, nghi, nguyenNhanLoi } from '../../../common/antd';
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
  if (await hienTrong(drawer, 3_000)) {
    ghi(`CẢNH BÁO · ${nhan}`, `drawer không đóng — ${await nguyenNhanLoi(page, drawer, 30_000)}`);
    const nutDong = nutTheoChu(drawer, /^Đóng$|^Hủy$/);
    if (await hienTrong(nutDong, 5_000)) await nutDong.click();
    await choHetSpin(page);
    return;
  }
  ghi(nhan, 'đã lưu, drawer đã đóng');
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
  await soiMan(page, man, ghi, 'B1 cáo trạng');
  await dienCacO(page, man, ghi, 'B1 cáo trạng', [
    [/Trường hợp thụ lý/i, input.truongHopThuLy],
    [/Số cáo trạng/i, input.soCaoTrang],
    [/Ngày bản cáo trạng|Ngày cáo trạng/i, input.ngayCaoTrang],
    [/Số bút lục/i, input.soButLuc],
    [/Viện kiểm sát/i, undefined],
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
   * Neo drawer theo TIÊU ĐỀ của chính nó, không dùng `bieuMauDangMo` ("lớp đang mở ngoài cùng").
   * Lớp ngoài cùng là locator ĐỘNG: khi drawer bị can đóng, nó trỏ ngay sang lớp còn lại và ta kết
   * luận "drawer không đóng" trong khi toast đã báo "Lưu thành công" (đo 01/10/2026).
   */
  const drawer = page
    .locator('.ant-drawer-content:visible, .ant-modal-content:visible')
    .filter({ hasText: /Thông tin bị can/i })
    .first();
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
  await expect
    .poll(() => dongBiCan.count(), {
      message: `Bấm "Lưu" nhưng bảng bị can không có dòng "${input.tenBiCan}"`,
      timeout: 30_000,
      intervals: [1500],
    })
    .toBeGreaterThan(0);
  ghi('B2 bị can', `đã lưu bị can ${input.tenBiCan} (có dòng trong bảng)`);

  await tiepTheo(page, ghi, 'B2 bị can');

  // ───── b7 · Bước 3: Thông tin vụ án ─────
  await soiMan(page, man, ghi, 'B3 thông tin vụ án');
  await dienCacO(page, man, ghi, 'B3 thông tin vụ án', [[/Nội dung vụ án/i, input.noiDungVuAn]]);
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
      [/^Quốc tịch/, input.quocTich],
    ],
    { chiTiet: input.diaChiBiHai, tinh: input.tinhThanhBiCan, phuong: input.phuongXaBiCan },
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
  );
  await tiepTheo(page, ghi, 'B5 vật chứng');

  // ───── b13 · Bước 6: Hoàn thành ─────
  await soiMan(page, man, ghi, 'B6 hoàn thành', true);
  const nutHoanThanh = nutTheoChu(man, /Hoàn thành|Lưu vụ án|^Lưu$/);
  await expect(nutHoanThanh, 'Bước 6 không có nút "Hoàn thành"').toBeVisible({ timeout: 20_000 });
  await nutHoanThanh.click();
  await choHetSpin(page);

  /**
   * BẰNG CHỨNG của bước này là URL chi tiết vụ án do hệ thống cấp: `…/chi-tiet?id=<uuid>`.
   * Không lấy được id thì KHÔNG coi là xong — bước 02 trở đi đều cần id này.
   */
  await expect
    .poll(() => page.url(), {
      message: 'Bấm "Hoàn thành" nhưng không chuyển sang màn chi tiết vụ án',
      timeout: 120_000,
      intervals: [2000],
    })
    .toMatch(/chi-tiet\?id=/);
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
