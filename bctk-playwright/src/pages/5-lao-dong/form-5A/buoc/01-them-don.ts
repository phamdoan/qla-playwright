import { Locator, expect, test } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { ManHinh, dungChu } from '../../../base.page';
import { DonNguon, TrangThai5A } from '../cau-hinh-5A';
import { hoTen, ngay } from '../../../../utils/fake-data';
import { ORIGIN } from '../../../../../playwright.config';

const ngauNhien = <T>(ds: T[]) => ds[Math.floor(Math.random() * ds.length)];
const soNgauNhien = (doDai: number) => Array.from({ length: doDai }, () => Math.floor(Math.random() * 10)).join('');
/** Ngày sinh dd/mm/yyyy, năm trong khoảng 1960–2006 (theo hướng dẫn) */
const ngaySinh = () =>
  `${String(1 + Math.floor(Math.random() * 28)).padStart(2, '0')}/${String(1 + Math.floor(Math.random() * 12)).padStart(2, '0')}/${1960 + Math.floor(Math.random() * 47)}`;

/**
 * BƯỚC 01 · Thêm mới đơn khởi kiện (hướng dẫn bước 1) — wizard 5 tab trên cùng một form:
 *
 *  Tab 1 "Thông tin đơn": Trực tiếp · ngày làm đơn ngẫu nhiên ≤ ngày nhận
 *        · số tiếp nhận tự sinh (hệ thống chưa sinh thì điền số ngẫu nhiên 5–7 chữ số) · người nhận đơn
 *        · Lao động · Đơn khởi kiện · quan hệ pháp luật (Thống kê) = mục lá ngẫu nhiên nhóm tranh chấp lao động
 *        · "Không tiến hành hòa giải tại Tòa án" + lý do (ngẫu nhiên) → Tiếp theo
 *  Tab 2 "Đương sự": Thêm người tham gia → Cá nhân · Người khởi kiện (… → "Lưu & Thêm mới")
 *        → Cá nhân · Người bị kiện (… → "Lưu") → Tiếp theo
 *  Tab 3 "Yêu cầu": nội dung · người khởi kiện · giá trị kê khai → "Thêm mới" → Tiếp theo
 *  Tab 4 "Tài liệu đính kèm" → Tiếp theo
 *  Tab 5 "Hoàn thành" → "Xử lý đơn" → sang trang chi tiết đơn (ghi lại link)
 *
 * Wizard là một form liền, đơn chỉ có link sau "Xử lý đơn" → 5 tab gộp thành một bước (mỗi tab một test.step).
 * Ghi chú so với hướng dẫn: checkbox cạnh "Số định danh" nghĩa là "Chưa xác định" (tích vào thì ô bị khóa) nên để KHÔNG tích rồi gõ số.
 */
export const buoc01: Buoc<DonNguon, TrangThai5A> = {
  so: 1,
  ten: 'Thêm mới đơn khởi kiện (Thông tin đơn → Đương sự → Yêu cầu → Tài liệu → Xử lý đơn)',
  huongDan: '1',
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
      // Trang thêm mới có lúc ra 404/trống sau khi vào → chờ thấy ô đầu form, không thấy thì vào lại (vaoCho)
      await phien.vaoCho('quan-ly-don/don-khoi-kien-va-yeu-cau/them-moi', m.oTheoNhan('Hình thức nhận đơn', main));
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
      if ((await m.docGiaTri('Loại đơn', main)) !== 'Lao động') await m.chon(main, 'Loại đơn', 'Lao động');
      if ((await m.docGiaTri('Phân loại đơn', main)) !== 'Đơn khởi kiện') await m.chon(main, 'Phân loại đơn', 'Đơn khởi kiện');

      const qhpl = await chonQuanHePhapLuat(m, m.oTheoNhan('Quan hệ pháp luật (Thống kê)', main));
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
    await test.step('Tab 3 · Yêu cầu', async () => {
      // Lưu đương sự xong, app có lúc tự tải lại trang sang them-moi?id=… (đơn đã có trên máy chủ) và quay về tab 1
      // kèm thông báo "Có bản nháp chưa hoàn tất" → bỏ bản nháp (giữ bản trên máy chủ) rồi đi lại tới tab Yêu cầu
      if (!(await m.oTheoNhan('Nội dung yêu cầu', main).waitFor({ timeout: 10_000 }).then(() => true).catch(() => false))) {
        const boNhap = m.nut(main, 'Bỏ bản nháp');
        if (await boNhap.isVisible().catch(() => false)) {
          await boNhap.click();
          await m.dongYTatCaXacNhan();
        }
        await m.oTheoNhan('Hình thức nhận đơn', main).waitFor({ timeout: 30_000 });
        await m.choTaiXong(1500);
        await tiepTheo('Đương sự');
        await expect(main.locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: nguoiKhoiKien }).first(), 'Trang tải lại mất đương sự').toBeVisible({ timeout: 15_000 });
        await tiepTheo('Yêu cầu');
      }
      await m.nhap(main, 'Nội dung yêu cầu', ngauNhien([
        'Yêu cầu người sử dụng lao động trả đủ tiền lương còn nợ',
        'Yêu cầu nhận trở lại làm việc và bồi thường do đơn phương chấm dứt hợp đồng lao động trái pháp luật',
        'Yêu cầu thanh toán trợ cấp thôi việc và tiền bảo hiểm xã hội',
      ]));
      // "Quan hệ pháp luật (Thống kê)" tự lấy giống tab 1
      if (!(await m.docGiaTri('Quan hệ pháp luật (Thống kê)', main))) await chonQuanHePhapLuat(m, m.oTheoNhan('Quan hệ pháp luật (Thống kê)', main), quanHePhapLuat);
      await m.chon(main, 'Người khởi kiện', new RegExp(nguoiKhoiKien.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      // Đơn lao động có khi không có ô giá trị kê khai → chỉ điền khi có
      if (await m.oTheoNhan('Giá trị yêu cầu kê khai', main).isVisible().catch(() => false)) {
        await m.nhap(main, 'Giá trị yêu cầu kê khai', String((50 + Math.floor(Math.random() * 450)) * 1_000_000));
      }
      // Nút "Thêm mới" đầu tiên là của khối "Danh sách yêu cầu khởi kiện"
      await main.locator('button').filter({ hasText: dungChu('Thêm mới') }).first().click();
      await expect(main.locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: nguoiKhoiKien }).first(), 'Yêu cầu chưa vào bảng').toBeVisible({ timeout: 15_000 });
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
