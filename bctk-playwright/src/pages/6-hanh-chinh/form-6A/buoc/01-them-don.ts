import { Locator, expect, test } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { ManHinh, chuaChu, dungChu } from '../../../base.page';
import { DonNguon, TrangThai6A } from '../cau-hinh-6A';
import { hoTen, ngay, soDienThoai } from '../../../../utils/fake-data';
import { ORIGIN } from '../../../../../playwright.config';

const ngauNhien = <T>(ds: T[]) => ds[Math.floor(Math.random() * ds.length)];
const soNgauNhien = (doDai: number) => Array.from({ length: doDai }, () => Math.floor(Math.random() * 10)).join('');

/** Ngày sinh dd/mm/yyyy, năm trong khoảng 1960–2006 (theo hướng dẫn) */
const ngaySinh = () =>
  `${String(1 + Math.floor(Math.random() * 28)).padStart(2, '0')}/${String(1 + Math.floor(Math.random() * 12)).padStart(2, '0')}/${1960 + Math.floor(Math.random() * 47)}`;

/** 3 nhánh "Cấp cơ quan" của người bị kiện — ô Đơn 01, 02, 03… lần lượt dùng nhánh 1, 2, 3, 1… */
const CAP_CO_QUAN = ['Cấp trung ương', 'Cấp tỉnh', 'Cấp xã/đặc khu'] as const;
type CapCoQuan = (typeof CAP_CO_QUAN)[number];

const HANH_VI_BI_KIEN = [
  'Không cấp giấy chứng nhận quyền sử dụng đất',
  'Không giải quyết hồ sơ cấp giấy phép xây dựng đúng thời hạn',
  'Cưỡng chế tháo dỡ công trình không đúng quy định',
  'Không trả lời đơn khiếu nại theo thời hạn luật định',
  'Thu hồi đất không thông báo cho người sử dụng đất',
];
const YEU_CAU_BOI_THUONG = [
  'Bồi thường thiệt hại do quyết định hành chính trái pháp luật gây ra',
  'Bồi thường chi phí thuê nhà trong thời gian bị cưỡng chế',
  'Bồi thường thu nhập bị mất do hành vi hành chính trái pháp luật',
];
const CHUC_VU = ['Chủ tịch', 'Phó Chủ tịch', 'Giám đốc', 'Bộ trưởng', 'Chánh Thanh tra', 'Trưởng phòng'];

/**
 * BƯỚC 01 · Thêm mới đơn khởi kiện hành chính (hướng dẫn bước 1–6) — wizard 5 tab trên cùng một form:
 *
 *  Tab 1 "Thông tin đơn": Trực tiếp · ngày làm đơn ngẫu nhiên ≤ ngày nhận
 *        · số tiếp nhận tự sinh (hệ thống chưa sinh thì điền số ngẫu nhiên 5–7 chữ số) · người nhận đơn
 *        · Hành chính · Đơn khởi kiện (chọn Hành chính thì ô này tự khóa) · quan hệ pháp luật (Thống kê) ngẫu nhiên
 *        · "Không tiến hành đối thoại tại Tòa án" + lý do (ngẫu nhiên) → Tiếp theo
 *          (hướng dẫn ghi "hòa giải"; với đơn hành chính màn hiện "đối thoại")
 *  Tab 2 "Đương sự": Thêm người tham gia → Cá nhân · Người khởi kiện (… → "Lưu & Thêm mới")
 *        → Cơ quan nhà nước / Người có thẩm quyền · tích "Cơ quan nhà nước" · Tư cách "Người bị kiện"
 *          · Cấp cơ quan theo 3 nhánh (xem `themCoQuanNhaNuoc`) · địa chỉ trụ sở · chức vụ người có thẩm quyền → "Lưu"
 *        → Tiếp theo
 *  Tab 3 "Yêu cầu": 1. Quyết định hành chính bị kiện (số 6–8 chữ số, hôm nay, cơ quan ban hành, "Hủy toàn bộ") → Thêm mới
 *        · 2. Hành vi hành chính bị kiện (hành vi, cơ quan bị kiện) → Thêm mới
 *        · 3. Yêu cầu bồi thường thiệt hại (nội dung, 300000, người bị kiện) → Thêm mới
 *        · ô "Yêu cầu Tòa án giải quyết" hệ thống tự ghép từ 3 bảng → Tiếp theo
 *  Tab 4 "Tài liệu đính kèm" → Tiếp theo
 *  Tab 5 "Hoàn thành" → "Xử lý đơn" → sang trang chi tiết đơn (ghi lại link)
 *
 * Wizard là một form liền, đơn chỉ có link sau "Xử lý đơn" → 5 tab gộp thành một bước (mỗi tab một test.step).
 * Ghi chú so với hướng dẫn: checkbox cạnh "Số định danh" nghĩa là "Chưa xác định" (tích vào thì ô bị khóa) nên để KHÔNG tích rồi gõ số.
 */
export const buoc01: Buoc<DonNguon, TrangThai6A> = {
  so: 1,
  ten: 'Thêm mới đơn khởi kiện hành chính (Thông tin đơn → Đương sự → Yêu cầu → Tài liệu → Xử lý đơn)',
  huongDan: '1–6',
  chay: async ({ vuAn, tt, moPhien, tkToa }) => {
    // Ô đơn này đã tạo đơn ở lượt trước nhưng chưa chạy hết các bước → không tạo lại, để các bước sau làm tiếp
    if (tt.urlDon) return;

    const phien = await moPhien(tkToa(vuAn.toaAn));
    const m = new ManHinh(phien.page);
    const page = m.page;
    const main = page.locator('main');
    const tiepTheo = async (tabSau: string) => {
      await m.nut(main, 'Tiếp theo').click();
      await expect(page.locator('.ant-steps-item-process'), `Không sang được tab "${tabSau}"`).toContainText(tabSau, { timeout: 30_000 });
      await m.choTaiXong(1000);
    };

    // ── Tab 1 · Thông tin đơn ──
    let lyDoKhongDoiThoai = '';
    const quanHePhapLuat = await test.step('Tab 1 · Thông tin đơn', async () => {
      await phien.vao('quan-ly-don/don-khoi-kien-va-yeu-cau/them-moi');
      await m.oTheoNhan('Hình thức nhận đơn', main).waitFor({ timeout: 60_000 });
      await m.choTaiXong(1500);
      if ((await m.docGiaTri('Hình thức nhận đơn', main)) !== 'Trực tiếp') await m.chon(main, 'Hình thức nhận đơn', 'Trực tiếp');
      await m.ngay(main, 'Ngày làm đơn', ngay(-Math.floor(Math.random() * 10)));
      // HD 2.4: số tiếp nhận do hệ thống tự sinh (có khi điền chậm sau khi trang tải) — chờ tối đa 5s;
      // vẫn trống thì tự điền số ngẫu nhiên 5–7 chữ số
      const oSoTiepNhan = m.oTheoNhan('Số tiếp nhận', main).locator('input').first();
      const daSinh = await expect(oSoTiepNhan).not.toHaveValue('', { timeout: 5_000 }).then(() => true).catch(() => false);
      if (!daSinh) {
        const doDai = 5 + Math.floor(Math.random() * 3);
        await oSoTiepNhan.fill(String(1 + Math.floor(Math.random() * 9)) + soNgauNhien(doDai - 1));
        test.info().annotations.push({ type: 'Số tiếp nhận', description: `Hệ thống chưa sinh số — đã điền ${await oSoTiepNhan.inputValue()}` });
      }
      if ((await m.docGiaTri('Loại đơn', main)) !== 'Hành chính') await m.chon(main, 'Loại đơn', 'Hành chính');
      await expect(m.oTheoNhan('Loại đơn', main).locator('.ant-select-selection-item')).toHaveText('Hành chính', { timeout: 5_000 });
      // Chọn "Hành chính" thì "Phân loại đơn" tự về "Đơn khởi kiện" và bị khóa
      if ((await m.docGiaTri('Phân loại đơn', main)) !== 'Đơn khởi kiện') await m.chon(main, 'Phân loại đơn', 'Đơn khởi kiện');

      const qhpl = await chonQuanHePhapLuat(m, m.oTheoNhan('Quan hệ pháp luật (Thống kê)', main));
      // "Quan hệ pháp luật chi tiết" tự điền theo mục vừa chọn — giữ nguyên
      await expect(m.oTheoNhan('Quan hệ pháp luật chi tiết', main).locator('input')).not.toHaveValue('', { timeout: 10_000 });

      const khongDoiThoai = main.locator('.ant-radio-wrapper').filter({ hasText: /^\s*Không tiến hành đối thoại tại Tòa án\s*$/ }).first();
      if (!(await khongDoiThoai.locator('input').isChecked())) await khongDoiThoai.click();
      await m.oTheoNhan(/Lý do không tiến hành đối thoại/, main).waitFor({ timeout: 10_000 });
      lyDoKhongDoiThoai = await m.chon(main, /Lý do không tiến hành đối thoại/);
      // Lý do "Trường hợp khác theo quy định của pháp luật." mở thêm ô bắt buộc "Lý do khác"
      const oLyDoKhac = m.oTheoNhan('Lý do khác', main).locator('input, textarea').first();
      if (await oLyDoKhac.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await oLyDoKhac.fill('Các bên đều có đơn đề nghị Tòa án đưa vụ án ra xét xử, không tiến hành đối thoại');
      }
      await tiepTheo('Đương sự');
      return qhpl;
    });

    // ── Tab 2 · Đương sự ──
    const capCoQuan = CAP_CO_QUAN[(Number(vuAn.maVuAn.match(/\d+/)?.[0]) - 1 || 0) % CAP_CO_QUAN.length];
    const { nguoiKhoiKien, nguoiBiKien } = await test.step(`Tab 2 · Đương sự (người bị kiện: ${capCoQuan})`, async () => {
      await m.nut(main, 'Thêm người tham gia').click();
      const d = m.popup('Thêm mới thành phần tham gia tố tụng');
      await d.waitFor({ timeout: 30_000 });
      await m.choTaiXong();
      const nkk = await themCaNhan(m, d, 'Người khởi kiện', 'Lưu & Thêm mới');
      const nbk = await themCoQuanNhaNuoc(m, d, capCoQuan);
      await d.waitFor({ state: 'hidden', timeout: 30_000 });
      const bang = main.locator('.ant-table-tbody tr.ant-table-row');
      await expect(bang.filter({ hasText: nkk }).first()).toBeVisible({ timeout: 15_000 });
      await expect(bang.filter({ hasText: nbk }).first()).toBeVisible({ timeout: 15_000 });
      await tiepTheo('Yêu cầu');
      return { nguoiKhoiKien: nkk, nguoiBiKien: nbk };
    });

    // ── Tab 3 · Yêu cầu ──
    await test.step('Tab 3 · Yêu cầu (quyết định bị kiện, hành vi bị kiện, bồi thường)', async () => {
      // Mỗi phần có nút "Thêm mới" riêng, theo thứ tự 3 phần; bấm xong dòng vào bảng của phần đó
      const themMoi = async (thuTu: number, chu: string) => {
        await main.locator('button').filter({ hasText: dungChu('Thêm mới') }).nth(thuTu).click();
        await expect(main.locator('.ant-table-tbody').nth(thuTu).locator('tr.ant-table-row').filter({ hasText: chu }).first(), `Phần ${thuTu + 1} chưa thêm được dòng`).toBeVisible({ timeout: 10_000 });
      };

      // Các ô chọn người chỉ liệt kê người bị kiện; mỗi mục có 2 dòng (tên + tư cách) → chọn theo tên cơ quan bị kiện

      // 1. Quyết định hành chính bị kiện
      const soQD = String(1 + Math.floor(Math.random() * 9)) + soNgauNhien(5 + Math.floor(Math.random() * 3));
      await m.nhap(main, 'Số quyết định bị kiện', soQD);
      await m.ngay(main, 'Ngày quyết định', ngay(0));
      await m.chon(main, 'Người / Cơ quan ban hành QĐ', chuaChu(nguoiBiKien));
      await m.chon(main, 'Loại hủy quyết định', 'Hủy toàn bộ');
      await themMoi(0, soQD);

      // 2. Hành vi hành chính bị kiện
      const hanhVi = ngauNhien(HANH_VI_BI_KIEN);
      await m.nhap(main, 'Hành vi bị kiện', hanhVi);
      await m.chon(main, 'Người / Cơ quan bị kiện', chuaChu(nguoiBiKien));
      await themMoi(1, hanhVi);

      // 3. Yêu cầu bồi thường thiệt hại
      const boiThuong = ngauNhien(YEU_CAU_BOI_THUONG);
      await m.nhap(main, 'Yêu cầu bồi thường', boiThuong);
      await m.nhap(main, 'Số tiền yêu cầu bồi thường', '300000');
      await m.chon(main, /^\s*Người bị kiện\s*$/, chuaChu(nguoiBiKien));
      await themMoi(2, boiThuong);

      // "Yêu cầu Tòa án giải quyết" hệ thống tự ghép từ 3 bảng trên
      await expect(m.oTheoNhan(/Yêu cầu Tòa án giải quyết/, main)).toContainText(soQD, { timeout: 10_000 });
      await tiepTheo('Tài liệu đính kèm');
    });

    // ── Tab 4 · Tài liệu đính kèm → Tab 5 · Hoàn thành → Xử lý đơn ──
    return test.step('Tab 4–5 · Tài liệu đính kèm → Hoàn thành → Xử lý đơn', async () => {
      await tiepTheo('Hoàn thành');
      const tomTat = await main.innerText();
      const soTiepNhan = tomTat.match(/Số tiếp nhận\s*\n\s*(\S+)/)?.[1] ?? '';
      const tenDon = tomTat.match(/Tên đơn\s*\n\s*([^\n]+)/)?.[1]?.trim() ?? '';
      await m.nut(main, 'Xử lý đơn').click();
      await page.waitForURL(/don-khoi-kien-va-yeu-cau\/chi-tiet\?id=/, { timeout: 60_000 });
      const id = new URL(page.url()).searchParams.get('id');
      return {
        urlDon: `${ORIGIN}/qla/quan-ly-don/don-khoi-kien-va-yeu-cau/chi-tiet?id=${id}`,
        soTiepNhan,
        tenDon,
        quanHePhapLuat,
        lyDoKhongHoaGiai: lyDoKhongDoiThoai,
        nguoiKhoiKien,
        nguoiBiKien,
        capCoQuanBiKien: capCoQuan,
      };
    });
  },
};

/**
 * Ô "Quan hệ pháp luật (Thống kê)" là TreeSelect. Với đơn hành chính các mục đều là mục lá cấp 1 (danh sách ảo);
 * còn có nhóm thì mở ngẫu nhiên một nhóm rồi chọn ngẫu nhiên một mục lá bên trong.
 */
async function chonQuanHePhapLuat(m: ManHinh, item: Locator): Promise<string> {
  await item.locator('.ant-select-selector').click();
  const dd = m.page.locator('.ant-tree-select-dropdown:not(.ant-select-dropdown-hidden)').last();
  await dd.locator('.ant-select-tree-treenode').nth(1).waitFor({ timeout: 15_000 });
  const nut = dd.locator('.ant-select-tree-treenode:not([aria-hidden])');
  const cacNhom = nut.filter({ has: m.page.locator('.ant-select-tree-switcher_close') });
  if (await cacNhom.count()) {
    await ngauNhien(await cacNhom.all()).locator('.ant-select-tree-switcher').click();
    await m.page.waitForTimeout(800);
  }
  const cacLa = nut.filter({ has: m.page.locator('.ant-select-tree-switcher-noop') }).filter({ hasText: /\S/ });
  const ten = ngauNhien((await cacLa.allInnerTexts()).map(s => s.trim()).filter(Boolean));
  await cacLa.filter({ hasText: dungChu(ten) }).first().locator('.ant-select-tree-node-content-wrapper').click();
  await dd.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => undefined);
  await expect(item.locator('.ant-select-selection-item'), 'Chưa chọn được quan hệ pháp luật').toHaveText(ten, { timeout: 10_000 });
  return ten;
}

/** Ô form trong drawer theo id của input bên trong */
const oId = (d: Locator, id: string) => d.locator('.ant-form-item').filter({ has: d.page().locator(`[id="${id}"]`) }).first();

/**
 * Điền một đương sự cá nhân trong drawer "Thêm mới thành phần tham gia tố tụng" rồi bấm `nutLuu`.
 * @returns họ tên đã nhập
 */
async function themCaNhan(m: ManHinh, d: Locator, tuCach: string, nutLuu: 'Lưu & Thêm mới' | 'Lưu'): Promise<string> {
  const page = m.page;
  await d.locator('.ant-radio-wrapper').filter({ hasText: dungChu('Cá nhân') }).first().click();

  // "Tư cách tham gia tố tụng" là combobox tự viết: danh sách dòng checkbox + chữ
  const tuCachO = m.oTheoNhan('Tư cách tham gia tố tụng', d).locator('[role=combobox]').first();
  await tuCachO.click();
  const ds = page.locator('[role=listbox]:visible').last();
  await ds.locator('div').filter({ has: page.locator('label.ant-checkbox-wrapper') }).filter({ hasText: dungChu(tuCach) }).last().click();
  await tuCachO.click(); // đóng danh sách
  await expect(tuCachO).toContainText(tuCach, { timeout: 5_000 });

  const ten = hoTen();
  await m.nhap(d, 'Họ và tên', ten);
  await m.chon(d, 'Giới tính');
  await m.oTheoNhan('Ngày sinh', d).locator('input').first().fill(ngaySinh());

  // Số định danh: checkbox cạnh ô = "Chưa xác định" → bỏ tích rồi gõ 12 số
  const oDinhDanh = m.oTheoNhan(/Số định danh cá nhân/, d);
  const chuaXacDinh = oDinhDanh.locator('label.ant-checkbox-wrapper').first();
  if (await chuaXacDinh.locator('input').isChecked()) await chuaXacDinh.click();
  await oDinhDanh.locator('input[type=text]').first().fill('0' + soNgauNhien(11));

  // Nơi thường trú = khối địa chỉ diaChi_2 (tỉnh → phường/xã → địa chỉ chi tiết)
  await m.chonTrong(oId(d, 'diaChi_2_maTinh'));
  await expect(page.locator('[id="diaChi_2_maXa"]')).toBeEnabled({ timeout: 15_000 });
  await m.chonTrong(oId(d, 'diaChi_2_maXa'));
  await d.locator('[id="diaChi_2_soNha"]').fill(`Số ${1 + Math.floor(Math.random() * 200)}, ngõ ${1 + Math.floor(Math.random() * 99)}`);
  // Nơi ở hiện tại: "Giống Nơi thường trú"
  const giong = d.locator('label.ant-checkbox-wrapper').filter({ hasText: 'Giống Nơi thường trú' }).first();
  if (!(await giong.locator('input').isChecked())) await giong.click();

  await m.nut(d, nutLuu).click();
  await m.choThongBao(/Thành công/);
  await m.choTaiXong();
  return ten;
}

/**
 * Người bị kiện là cơ quan nhà nước: "Cơ quan nhà nước / Người có thẩm quyền" → tích "Cơ quan nhà nước"
 * → Tư cách "Người bị kiện" → mục "Xác định cơ quan nhà nước" theo `cap` (đo trên STG 27/10/2026):
 *   · Cấp trung ương: Loại cơ quan trung ương (Bộ / Cơ quan ngang bộ / Cơ quan khác ở trung ương / Cơ quan thuộc/dưới bộ)
 *       → Tên cơ quan (chọn) — riêng "Cơ quan thuộc/dưới bộ": Cơ quan chủ quản (chọn) + Tên cơ quan thuộc/dưới Bộ (nhập)
 *   · Cấp tỉnh: Tỉnh/TP trực thuộc trung ương → Cơ quan cấp tỉnh (UBND / Sở, ban ngành / Cơ quan khác thuộc tỉnh)
 *   · Cấp xã/đặc khu: Tỉnh/TP trực thuộc trung ương → Xã/Phường/Đặc khu → Cơ quan cấp xã
 *   "Tên cơ quan nhà nước hiện tại" hệ thống tự ghép theo lựa chọn; các ô không bắt buộc (tên gọi cũ, mã định danh,
 *   số điện thoại) cũng điền ngẫu nhiên theo hướng dẫn.
 * → Thông tin địa chỉ (tỉnh, phường/xã, địa chỉ chi tiết) → Chức vụ của người có thẩm quyền → "Lưu".
 * @returns tên cơ quan (cũng là tên hiện ở danh sách đương sự)
 */
async function themCoQuanNhaNuoc(m: ManHinh, d: Locator, cap: CapCoQuan): Promise<string> {
  const page = m.page;
  await d.locator('.ant-radio-wrapper').filter({ hasText: /Cơ quan nhà nước \/ Người có thẩm quyền/ }).first().click();
  await m.choTaiXong(500);
  const coCoQuan = d.locator('label.ant-checkbox-wrapper').filter({ hasText: dungChu('Cơ quan nhà nước') }).first();
  if (!(await coCoQuan.locator('input').isChecked())) await coCoQuan.click();
  await m.chonTrong(oId(d, 'nhaNuoc_tuCachCoQuan'), 'Người bị kiện');

  // ── Xác định cơ quan nhà nước ──
  await m.chon(d, 'Cấp cơ quan', cap);
  await page.waitForTimeout(800);
  if (cap === 'Cấp trung ương') {
    await m.chon(d, 'Loại cơ quan trung ương');
  } else {
    await m.chon(d, 'Tỉnh/TP trực thuộc trung ương');
    if (cap === 'Cấp tỉnh') {
      await m.chon(d, 'Cơ quan cấp tỉnh');
    } else {
      await expect(m.oTheoNhan('Xã/Phường/Đặc khu', d).locator('.ant-select')).not.toHaveClass(/ant-select-disabled/, { timeout: 15_000 });
      await m.chon(d, 'Xã/Phường/Đặc khu');
      await m.chon(d, 'Cơ quan cấp xã');
    }
  }
  await page.waitForTimeout(800);
  await lapOBatBuocCoQuan(m, d);
  const oTen = oId(d, 'nhaNuoc_tenCoQuanHienTai').locator('input').first();
  if (!(await oTen.inputValue())) await oTen.fill(`Ủy ban nhân dân ${ngauNhien(['quận Ba Đình', 'phường Hoàn Kiếm', 'xã Sóc Sơn'])}`);
  const tenCoQuan = (await oTen.inputValue()).trim();
  await d.locator('[id="nhaNuoc_tenGoiCu"]').fill(`${tenCoQuan} (trước sáp nhập)`);
  await d.locator('[id="nhaNuoc_maDinhDanh"]').fill(`H${soNgauNhien(2)}.${soNgauNhien(2)}.${soNgauNhien(2)}`);
  await d.locator('[id="nhaNuoc_soDienThoai"]').fill(soDienThoai());

  // ── Thông tin địa chỉ (trụ sở chính) ──
  await m.chonTrong(oId(d, 'nhaNuocDiaChi_maTinh'));
  await expect(page.locator('[id="nhaNuocDiaChi_maXa"]')).toBeEnabled({ timeout: 15_000 });
  await m.chonTrong(oId(d, 'nhaNuocDiaChi_maXa'));
  await d.locator('[id="nhaNuocDiaChi_soNha"]').fill(`Số ${1 + Math.floor(Math.random() * 200)} đường ${ngauNhien(['Trần Phú', 'Lê Lợi', 'Hùng Vương', 'Quang Trung'])}`);

  // ── Người có thẩm quyền của cơ quan nhà nước ──
  await d.locator('[id="nguoiCoThamQuyen_chucVu"]').fill(ngauNhien(CHUC_VU));

  await m.nut(d, 'Lưu').click();
  await m.choThongBao(/Thành công/);
  await m.choTaiXong();
  return tenCoQuan;
}

/**
 * Lấp các ô BẮT BUỘC còn trống của mục "Xác định cơ quan nhà nước" (ô nhaNuoc_xdCoQuan_…): ô chọn → ngẫu nhiên, ô nhập → chữ.
 * Nhánh con mở thêm ô mới sau mỗi lựa chọn (vd. Loại cơ quan → Tên cơ quan; Cơ quan thuộc/dưới bộ → Cơ quan chủ quản…)
 * nên lặp đến khi không còn ô trống.
 */
async function lapOBatBuocCoQuan(m: ManHinh, d: Locator) {
  const cacO = d.locator('.ant-form-item:visible').filter({ has: m.page.locator('.ant-form-item-required') }).filter({ has: m.page.locator('[id^="nhaNuoc_xdCoQuan_"]') });
  for (let vong = 0; vong < 5; vong++) {
    let daLap = false;
    for (const o of await cacO.all()) {
      const sel = o.locator('.ant-select').first();
      if (await sel.count()) {
        const trong = !(await sel.locator('.ant-select-selection-item').count());
        const khoa = /ant-select-disabled/.test((await sel.getAttribute('class')) ?? '');
        if (trong && !khoa) {
          await m.chonTrong(o);
          daLap = true;
          await m.page.waitForTimeout(800);
        }
      } else {
        const ip = o.locator('input:not([type=checkbox]):not([type=radio])').first();
        if ((await ip.count()) && (await ip.isEnabled()) && !(await ip.inputValue())) {
          await ip.fill(ngauNhien(['Cục Quản lý thị trường', 'Tổng cục Thuế', 'Cục Đường bộ Việt Nam', 'Cục Quản lý đất đai']));
          daLap = true;
        }
      }
    }
    if (!daLap) return;
  }
}
