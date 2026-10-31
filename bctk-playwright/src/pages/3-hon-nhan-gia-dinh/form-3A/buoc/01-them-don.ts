import { Locator, expect, test } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { ManHinh, dungChu } from '../../../base.page';
import { DonNguon, TrangThai3A } from '../cau-hinh-3A';
import { hoTen, ngay } from '../../../../utils/fake-data';
import { ORIGIN } from '../../../../../playwright.config';

const ngauNhien = <T>(ds: T[]) => ds[Math.floor(Math.random() * ds.length)];
const soNgauNhien = (doDai: number) => Array.from({ length: doDai }, () => Math.floor(Math.random() * 10)).join('');

/**
 * Mục lá của nhóm "Vụ án ly hôn" trong cây "Quan hệ pháp luật (Thống kê)" (đo trên STG 27/10/2026).
 * Bỏ "Các nguyên nhân khác" vì nhóm khác cũng có mục trùng tên → gõ tìm dễ trúng nhầm.
 */
const LY_DO_LY_HON = [
  'Mâu thuẫn gia đình',
  'Bạo lực gia đình',
  'Ngoại tình',
  'Bệnh tật, không có con',
  'Do nghiện ma tuý, rượu chè, cờ bạc',
  'Một bên ở nước ngoài',
  'Một bên bị mất tích',
  'Mâu thuẫn về kinh tế',
];

/** Mô tả tài sản theo loại tài sản chung */
const MO_TA_TAI_SAN: Record<string, string> = {
  'Bất động sản (Đất, nhà…)': 'Nhà đất tại số 12 ngõ 5 Kim Mã, Ba Đình, Hà Nội; GCN QSDĐ số CS 123456',
  Tiền: 'Tiền mặt tích lũy chung của vợ chồng',
  'Sổ tiết kiệm': 'Sổ tiết kiệm tại Ngân hàng Vietcombank đứng tên chồng',
  Vàng: 'Vàng SJC 9999 do vợ chồng mua trong thời kỳ hôn nhân',
};
/** Ngày sinh dd/mm/yyyy, năm trong khoảng 1960–2006 (theo hướng dẫn) */
const ngaySinh = () =>
  `${String(1 + Math.floor(Math.random() * 28)).padStart(2, '0')}/${String(1 + Math.floor(Math.random() * 12)).padStart(2, '0')}/${1960 + Math.floor(Math.random() * 47)}`;

/**
 * BƯỚC 01 · Thêm mới đơn khởi kiện (hướng dẫn bước 1–6) — wizard 5 tab trên cùng một form:
 *
 *  Tab 1 "Thông tin đơn": Trực tiếp · ngày làm đơn ngẫu nhiên ≤ ngày nhận
 *        · số tiếp nhận tự sinh (hệ thống chưa sinh thì điền số ngẫu nhiên 5–7 chữ số) · người nhận đơn
 *        · Hôn nhân và gia đình · Đơn khởi kiện · quan hệ pháp luật (Thống kê) = mục ngẫu nhiên trong nhóm
 *          "Vụ án ly hôn" (chỉ nhóm này mới có các mục ly hôn ở tab Yêu cầu như hướng dẫn)
 *        · "Không tiến hành hòa giải tại Tòa án" + lý do (ngẫu nhiên) → Tiếp theo
 *  Tab 2 "Đương sự": Thêm người tham gia → Cá nhân · Người khởi kiện (… → "Lưu & Thêm mới")
 *        → Cá nhân · Người bị kiện (… → "Lưu") → Tiếp theo
 *  Tab 3 "Yêu cầu": 1. Lý do ly hôn · 2. "Có con chung" (họ tên, ngày sinh, giới tính, người nuôi dưỡng,
 *        "Không yêu cầu cấp dưỡng") · 3. "Có tài sản chung" (loại, mô tả, giá trị, phương thức chia, phần nhận)
 *        · 4. "Không nợ chung" → Tiếp theo
 *  Tab 4 "Tài liệu đính kèm" → Tiếp theo
 *  Tab 5 "Hoàn thành" → "Xử lý đơn" → sang trang chi tiết đơn (ghi lại link)
 *
 * Wizard là một form liền, đơn chỉ có link sau "Xử lý đơn" → 5 tab gộp thành một bước (mỗi tab một test.step).
 * Ghi chú so với hướng dẫn: checkbox cạnh "Số định danh" nghĩa là "Chưa xác định" (tích vào thì ô bị khóa) nên để KHÔNG tích rồi gõ số.
 */
export const buoc01: Buoc<DonNguon, TrangThai3A> = {
  so: 1,
  ten: 'Thêm mới đơn khởi kiện (Thông tin đơn → Đương sự → Yêu cầu → Tài liệu → Xử lý đơn)',
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
    let lyDoKhongHoaGiai = '';
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
      if (!/Hôn nhân/i.test(await m.docGiaTri('Loại đơn', main))) await m.chon(main, 'Loại đơn', /Hôn nhân/i);
      if ((await m.docGiaTri('Phân loại đơn', main)) !== 'Đơn khởi kiện') await m.chon(main, 'Phân loại đơn', 'Đơn khởi kiện');

      const qhpl = await chonQuanHePhapLuat(m, m.oTheoNhan('Quan hệ pháp luật (Thống kê)', main), ngauNhien(LY_DO_LY_HON));
      // "Quan hệ pháp luật chi tiết" tự điền theo mục vừa chọn — giữ nguyên
      await expect(m.oTheoNhan('Quan hệ pháp luật chi tiết', main).locator('input')).not.toHaveValue('', { timeout: 10_000 });

      // "hòa"/"hoà" trên màn viết không thống nhất → khớp cả hai
      const khongHoaGiai = main.locator('.ant-radio-wrapper').filter({ hasText: /^\s*Không tiến hành h(?:òa|oà) giải tại Tòa án\s*$/ }).first();
      if (!(await khongHoaGiai.locator('input').isChecked())) await khongHoaGiai.click();
      await m.oTheoNhan(/Lý do không tiến hành h(?:òa|oà) giải/, main).waitFor({ timeout: 10_000 });
      lyDoKhongHoaGiai = await m.chon(main, /Lý do không tiến hành h(?:òa|oà) giải/);
      await tiepTheo('Đương sự');
      return qhpl;
    });

    // ── Tab 2 · Đương sự ──
    const { nguoiKhoiKien, nguoiBiKien } = await test.step('Tab 2 · Đương sự', async () => {
      await m.nut(main, 'Thêm người tham gia').click();
      const d = m.popup('Thêm mới thành phần tham gia tố tụng');
      await d.waitFor({ timeout: 30_000 });
      await m.choTaiXong();
      const nkk = await themDuongSu(m, d, 'Người khởi kiện', 'Lưu & Thêm mới');
      const nbk = await themDuongSu(m, d, 'Người bị kiện', 'Lưu');
      await d.waitFor({ state: 'hidden', timeout: 30_000 });
      const bang = main.locator('.ant-table-tbody tr.ant-table-row');
      await expect(bang.filter({ hasText: nkk }).first()).toBeVisible({ timeout: 15_000 });
      await expect(bang.filter({ hasText: nbk }).first()).toBeVisible({ timeout: 15_000 });
      await tiepTheo('Yêu cầu');
      return { nguoiKhoiKien: nkk, nguoiBiKien: nbk };
    });

    // ── Tab 3 · Yêu cầu ──
    await test.step('Tab 3 · Yêu cầu (ly hôn, con chung, tài sản chung, nợ chung)', async () => {
      const radio = (chu: string) => main.locator('.ant-radio-wrapper').filter({ hasText: dungChu(chu) }).first();
      const chonRadio = async (chu: string) => {
        if (!(await radio(chu).locator('input').isChecked())) await radio(chu).click();
        await m.page.waitForTimeout(500);
      };
      // Ô "Yêu cầu" hệ thống tự điền ("Ông/Bà … yêu cầu ly hôn với ông/bà …") — giữ nguyên
      await main.locator('textarea[placeholder="Nhập lý do ly hôn"]').fill(ngauNhien([
        'Vợ chồng mâu thuẫn kéo dài, không thể hàn gắn, mục đích hôn nhân không đạt được',
        'Vợ chồng bất đồng quan điểm sống, thường xuyên cãi vã, đã sống ly thân',
        'Không còn tình cảm, hai bên đã nhiều lần hòa giải nhưng không thành',
      ]));

      // 2. Con chung — một dòng con chung (các ô của dòng có id danhSachConChung_0_…)
      await chonRadio('Có con chung');
      await main.locator('[id="danhSachConChung_0_hoVaTen"]').fill(hoTen());
      const oNgaySinhCon = main.locator('[id="danhSachConChung_0_ngaySinh"]');
      await oNgaySinhCon.click();
      await oNgaySinhCon.fill(ngay(-(365 * (3 + Math.floor(Math.random() * 12)) + Math.floor(Math.random() * 300))));
      await oNgaySinhCon.press('Enter');
      await chonTheoId(m, main, 'danhSachConChung_0_gioiTinh');
      await chonTheoId(m, main, 'danhSachConChung_0_idNguoiNuoiCon');
      await chonTheoId(m, main, 'danhSachConChung_0_maYeuCauCapDuong', 'Không yêu cầu cấp dưỡng');

      // 3. Tài sản chung — một dòng tài sản (id danhSachTaiSanChung_0_…)
      await chonRadio('Có tài sản chung');
      const loaiTaiSan = await chonTheoId(m, main, 'danhSachTaiSanChung_0_maLoaiTaiSan');
      const oMoTaLoai = main.locator('[id="danhSachTaiSanChung_0_moTaLoaiTaiSan"]');
      if (await oMoTaLoai.isEnabled()) await oMoTaLoai.fill('Xe ô tô con'); // chỉ mở khi loại là "Khác"
      await main.locator('[id="danhSachTaiSanChung_0_moTaTaiSan"]').fill(MO_TA_TAI_SAN[loaiTaiSan] ?? 'Tài sản chung hình thành trong thời kỳ hôn nhân');
      const tongGiaTri = (5 + Math.floor(Math.random() * 45)) * 100_000_000;
      await main.locator('[id="danhSachTaiSanChung_0_giaTriTamTinh"]').fill(String(tongGiaTri));
      await chonTheoId(m, main, 'danhSachTaiSanChung_0_maPhuongThucChia');
      // "Chia đôi" thì hệ thống tự tính và khóa ô phần nhận; các phương thức khác tự điền số ≤ tổng giá trị
      const oPhanNhan = main.locator('[id="danhSachTaiSanChung_0_giaTriPhanNhan"]');
      if ((await oPhanNhan.isEnabled()) && !(await oPhanNhan.inputValue())) {
        await oPhanNhan.fill(String(Math.round((tongGiaTri * (20 + Math.floor(Math.random() * 61))) / 100)));
      }

      // 4. Nợ chung
      await chonRadio('Không nợ chung');
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
        lyDoKhongHoaGiai,
        nguoiKhoiKien,
        nguoiBiKien,
      };
    });
  },
};

/**
 * Chọn trong ô select nằm ở bảng con chung / tài sản chung (không có nhãn, chỉ có id của input).
 * Dropdown có lúc bấm một lần không mở (ô vừa chọn trước còn giữ focus) → bấm lại tối đa 3 lần.
 * @param giaTri chữ của mục cần chọn; bỏ trống = chọn ngẫu nhiên. Trả về chữ của mục đã chọn.
 */
async function chonTheoId(m: ManHinh, khung: Locator, id: string, giaTri?: string): Promise<string> {
  const o = khung.locator('.ant-select').filter({ has: m.page.locator(`[id="${id}"]`) }).first();
  const dd = m.page.locator(`.ant-select-dropdown:has([id="${id}_list"])`);
  for (let lan = 0; lan < 3 && !(await dd.isVisible().catch(() => false)); lan++) {
    await o.locator('.ant-select-selector').click();
    await m.page.waitForTimeout(800);
  }
  const cacMuc = dd.locator('.ant-select-item-option:not(.ant-select-item-option-disabled)');
  await cacMuc.first().waitFor({ timeout: 10_000 });
  // Tên người trong danh sách có kèm dòng tư cách ("Lê Văn Quân\nNgười khởi kiện") → lấy title
  const ds = await cacMuc.evaluateAll(es => es.map(e => e.getAttribute('title') || (e as HTMLElement).innerText.trim()));
  const chu = giaTri ?? ngauNhien(ds);
  await cacMuc.nth(ds.indexOf(chu)).click();
  await expect(o.locator('.ant-select-selection-item').first(), `Chưa chọn được ${id}`).not.toBeEmpty({ timeout: 5_000 });
  return chu;
}

/**
 * Ô "Quan hệ pháp luật (Thống kê)" là TreeSelect: cấp 1 có mục lá và nhóm (có mục con).
 * Có `muon` thì gõ tìm đúng mục đó; không thì mở ngẫu nhiên một nhóm rồi chọn ngẫu nhiên một mục lá bên trong.
 */
async function chonQuanHePhapLuat(m: ManHinh, item: Locator, muon?: string): Promise<string> {
  await item.locator('.ant-select-selector').click();
  const dd = m.page.locator('.ant-tree-select-dropdown:not(.ant-select-dropdown-hidden)').last();
  await dd.locator('.ant-select-tree-treenode').nth(1).waitFor({ timeout: 15_000 });
  const nut = dd.locator('.ant-select-tree-treenode:not([aria-hidden])');
  const laNhom = (n: Locator) => n.locator('.ant-select-tree-switcher:not(.ant-select-tree-switcher-noop)');

  let la: Locator;
  if (muon) {
    await item.locator('input').first().fill(muon).catch(() => undefined);
    la = dd.locator('.ant-select-tree-treenode').filter({ hasText: dungChu(muon) }).first();
  } else {
    const cacNhom = nut.filter({ has: m.page.locator('.ant-select-tree-switcher_close') });
    const soNhom = await cacNhom.count();
    if (soNhom) {
      const nhom = cacNhom.nth(Math.floor(Math.random() * soNhom));
      const tenNhom = (await nhom.innerText()).trim();
      await laNhom(nhom).click();
      await m.page.waitForTimeout(800);
      // Mục lá ngay sau nhóm vừa mở (thụt lề sâu hơn nhóm)
      const cacLa = await dd.locator('.ant-select-tree-treenode').evaluateAll((es, ten) => {
        const i = es.findIndex(e => (e as HTMLElement).innerText.trim() === ten);
        const capNhom = es[i].querySelectorAll('.ant-select-tree-indent-unit').length;
        const kq: string[] = [];
        for (let j = i + 1; j < es.length; j++) {
          const cap = es[j].querySelectorAll('.ant-select-tree-indent-unit').length;
          if (cap <= capNhom) break;
          if (es[j].querySelector('.ant-select-tree-switcher-noop')) kq.push((es[j] as HTMLElement).innerText.trim());
        }
        return kq;
      }, tenNhom);
      const ten = cacLa.length ? ngauNhien(cacLa) : tenNhom;
      la = dd.locator('.ant-select-tree-treenode').filter({ hasText: dungChu(ten) }).first();
    } else {
      la = nut.filter({ has: m.page.locator('.ant-select-tree-switcher-noop') }).filter({ hasText: /\S/ }).first();
    }
  }
  const ten = (await la.innerText()).trim();
  await la.locator('.ant-select-tree-node-content-wrapper').click();
  await dd.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => undefined);
  await expect(item.locator('.ant-select-selection-item'), 'Chưa chọn được quan hệ pháp luật').toHaveText(ten, { timeout: 10_000 });
  return ten;
}

/**
 * Điền một đương sự cá nhân trong drawer "Thêm mới thành phần tham gia tố tụng" rồi bấm `nutLuu`.
 * @returns họ tên đã nhập
 */
async function themDuongSu(m: ManHinh, d: Locator, tuCach: string, nutLuu: 'Lưu & Thêm mới' | 'Lưu'): Promise<string> {
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
  const oId = (id: string) => d.locator('.ant-form-item').filter({ has: page.locator(`[id="${id}"]`) }).first();
  await m.chonTrong(oId('diaChi_2_maTinh'));
  await expect(page.locator('[id="diaChi_2_maXa"]')).toBeEnabled({ timeout: 15_000 });
  await m.chonTrong(oId('diaChi_2_maXa'));
  await d.locator('[id="diaChi_2_soNha"]').fill(`Số ${1 + Math.floor(Math.random() * 200)}, ngõ ${1 + Math.floor(Math.random() * 99)}`);
  // Nơi ở hiện tại: "Giống Nơi thường trú"
  const giong = d.locator('label.ant-checkbox-wrapper').filter({ hasText: 'Giống Nơi thường trú' }).first();
  if (!(await giong.locator('input').isChecked())) await giong.click();

  await m.nut(d, nutLuu).click();
  await m.choThongBao(/Thành công/);
  await m.choTaiXong();
  return ten;
}
