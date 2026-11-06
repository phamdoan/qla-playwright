import { Locator, expect, test } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { ManHinh, chuaChu, dungChu } from '../../../base.page';
import { TrangThai1A, VuNguon } from '../cau-hinh-1A';
import { hoTen } from '../../../../utils/fake-data';
import { TaiKhoan, vksCuaToa } from '../../../../utils/tai-khoan';
import { moVuAn, ngauNhien } from './chung';

const NHAN_THAN = ['Nhân thân tốt', 'Chưa có tiền án, tiền sự', 'Có nhân thân tốt, chấp hành tốt chính sách pháp luật tại địa phương'];

/**
 * Ô trong thẻ bị cáo của form bản án (không phải form antd): nhãn là <span> chữ nhỏ,
 * ô nằm cùng khối với nhãn → lấy khối gần nhất bọc nhãn có chứa ô nhập.
 */
const oThe = (khung: Locator, nhan: string) =>
  khung.locator(`xpath=.//span[normalize-space()="${nhan}"]/ancestor::div[.//input][1]`).first();

/**
 * Điền thông tin nhân thân cho thẻ bị cáo là cá nhân (pháp nhân không có ô nào phải điền).
 * Ô chọn/nhập xong tự chuyển sang chữ thường (không còn ô) → chỉ điền ô còn hiện.
 */
async function dienBiCao(m: ManHinh, the: Locator) {
  if (!(await the.locator('input[placeholder="VD: 1993"]').count())) await the.locator('.ant-card-head-title').click();
  await m.page.waitForTimeout(800);
  const nhap = async (nhan: string, giaTri: string) => {
    const o = oThe(the, nhan).locator('input:not([type=search])').first();
    if (await o.isVisible().catch(() => false)) await o.fill(giaTri);
  };
  const chon = async (khung: Locator, nhan: string) => {
    const o = oThe(khung, nhan);
    if (!(await o.locator('.ant-select-selector').isVisible().catch(() => false))) return;
    // Ô sát mép dưới bị thanh nút cuối popup che → bấm trượt, dropdown không mở: cuộn ô ra giữa trước
    await o.evaluate(e => e.scrollIntoView({ block: 'center' }));
    // Danh sách (vd. "Nghề nghiệp") tải chậm lúc máy bận → mở ra vẫn trống, chờ 15s rồi lỗi (1A Vụ 01, 30/10)
    // → bấm ô lần nữa để đóng, chờ rồi mở lại (Escape sẽ đóng cả popup bản án)
    await m.chonTrong(o).catch(async () => {
      await o.locator('.ant-select-selector').click();
      await m.page.waitForTimeout(2000);
      await m.chonTrong(o);
    });
    // Chọn xong: ô hiện mục đã chọn, hoặc đã chuyển sang chữ thường (không còn ô chọn)
    await expect
      .poll(async () => (await o.locator('.ant-select-selection-item').count()) > 0 || !(await o.locator('.ant-select-selector').count()), {
        message: `Chưa chọn được "${nhan}"`,
        // Máy chậm (mỗi lần kiểm 3–5s) thì 5s hết trước khi kịp kiểm lần thứ hai dù ô đã chọn xong (Vụ 08, 29/10)
        timeout: 15_000,
      })
      .toBe(true);
  };

  await nhap('Sinh năm', String(1965 + Math.floor(Math.random() * 36)));
  for (const noi of ['Nơi sinh', 'Nơi cư trú']) {
    const khoi = oThe(the, noi);
    await chon(khoi, 'Tỉnh/Thành phố');
    await m.page.waitForTimeout(800);
    await chon(khoi, 'Phường/Xã');
    const soNha = oThe(khoi, 'Số nhà').locator('input').first();
    if (await soNha.isVisible().catch(() => false)) await soNha.fill(`Số ${1 + Math.floor(Math.random() * 200)} ngõ ${1 + Math.floor(Math.random() * 99)}`);
  }
  for (const nhan of ['Nghề nghiệp', 'Trình độ văn hóa', 'Dân tộc', 'Giới tính', 'Quốc tịch', 'Tôn giáo']) await chon(the, nhan);
  await nhap('Họ tên cha', hoTen());
  await nhap('Họ tên mẹ', hoTen());
  await nhap('Tiền án', 'Không');
  await nhap('Tiền sự', 'Không');
  await nhap('Nhân thân', ngauNhien(NHAN_THAN));
}

/**
 * Popup "Viện kiểm sát đề nghị hình phạt cho bị cáo …" (nút bút ở dòng bị cáo):
 * "Thêm hình phạt" → Hình phạt chính · Tù có thời hạn (cá nhân) / Đình chỉ hoạt động có thời hạn (pháp nhân)
 * · mức từ … đến … ngẫu nhiên trong khung → "Lưu" của dòng → "Lưu" của popup
 */
async function deNghiHinhPhat(m: ManHinh, dongBiCao: Locator) {
  await dongBiCao.locator('button:has(.anticon-edit)').first().click();
  const bm = m.popup('Viện kiểm sát đề nghị hình phạt cho bị cáo');
  await bm.waitFor({ timeout: 30_000 });
  await m.choTaiXong();
  const bang = bm.locator('.ant-table').filter({ hasText: 'Loại hình phạt' }).first();
  await m.nut(bm, /Thêm hình phạt/).click();
  const dong = bang.locator('.ant-table-row').last();
  await m.chonTrong(dong.locator('td').nth(1), dungChu('Hình phạt chính'));
  await m.page.waitForTimeout(600);
  const oHinhPhat = dong.locator('td').nth(2);
  const cacHinhPhat = await m.cacLuaChonTrong(oHinhPhat);
  const tu = dong.locator('td').nth(3);
  const den = dong.locator('td').nth(4);
  if (cacHinhPhat.includes('Tù có thời hạn')) {
    // Khung 03 tháng – 20 năm
    const a = 1 + Math.floor(Math.random() * 5);
    await m.chonTrong(oHinhPhat, dungChu('Tù có thời hạn'));
    await tu.getByPlaceholder('Năm').fill(String(a));
    await den.getByPlaceholder('Năm').fill(String(a + 1 + Math.floor(Math.random() * 3)));
  } else {
    // Pháp nhân: khung 06 tháng – 03 năm
    await m.chonTrong(oHinhPhat, dungChu('Đình chỉ hoạt động có thời hạn'));
    await tu.getByPlaceholder('Tháng').fill(String(6 + Math.floor(Math.random() * 6)));
    await den.getByPlaceholder('Năm').fill(String(1 + Math.floor(Math.random() * 3)));
  }
  await dong.locator('td').last().locator('a').filter({ hasText: dungChu('Lưu') }).click();
  await expect(dong.locator('td').last(), 'Dòng hình phạt chưa lưu').toContainText('Sửa', { timeout: 10_000 });
  await bm.locator('.ant-modal-footer button').filter({ hasText: dungChu('Lưu') }).click();
  await bm.waitFor({ state: 'hidden', timeout: 15_000 });
}

/**
 * Popup "Thêm bản án" (vừa bấm "Tạo bản án"): thông tin bị cáo, nội dung vụ án, ý kiến VKS,
 * nhận định, quyết định lấy theo ý kiến VKS, nơi nhận → "Lưu" (tạo dự thảo).
 * Lần lưu tạo dự thảo này hệ thống BỎ người ký, số và ngày bản án → điền ở `soNgayVaKy` sau đó.
 */
async function dienBanAnMoi(m: ManHinh, toiDanh: string, vks: string) {
  const d = m.popup('Thêm bản án');
  await d.waitFor({ timeout: 30_000 });
  await m.choTaiXong(1500);

  // ── Thông tin bị cáo ──
  const cacThe = d.locator('.ant-card').filter({ has: m.page.locator('.ant-card-head', { hasText: 'Đưa vào bản án này' }) });
  for (let i = 0; i < (await cacThe.count()); i++) {
    const the = cacThe.nth(i);
    if (await the.locator('.ant-card-head').filter({ hasText: 'Pháp nhân thương mại' }).count()) continue;
    await dienBiCao(m, the);
  }

  // ── Nội dung vụ án, ý kiến Viện kiểm sát ──
  const noiDung = d.locator('#noiDungVuAn');
  if (!(await noiDung.inputValue())) await noiDung.fill(`Các bị cáo phạm tội "${toiDanh}" như cáo trạng của Viện kiểm sát đã truy tố; tại phiên tòa các bị cáo thừa nhận hành vi phạm tội.`);
  const bangVKS = d.locator('.ant-table').filter({ hasText: 'Hình phạt VKS đề nghị' }).first();
  const dongVKS = bangVKS.locator('.ant-table-row');
  for (let i = 0; i < (await dongVKS.count()); i++) {
    if (/Chưa có mức hình phạt đề nghị/.test(await dongVKS.nth(i).innerText())) await deNghiHinhPhat(m, dongVKS.nth(i));
  }
  await expect(bangVKS, 'Còn bị cáo chưa có hình phạt VKS đề nghị').not.toContainText('Chưa có mức hình phạt đề nghị', { timeout: 10_000 });

  // ── Nhận định, quyết định (lấy theo ý kiến VKS) ──
  await d.locator('#nhanDinh').fill('Hội đồng xét xử xét thấy đề nghị của Viện kiểm sát về tội danh và hình phạt là có căn cứ, đúng pháp luật nên chấp nhận.');
  await m.nut(d, 'Lấy theo ý kiến VKS').click();
  await m.page.locator('.ant-modal-confirm:visible').first().waitFor({ timeout: 10_000 });
  await m.nut(m.page.locator('.ant-modal-confirm:visible').first(), 'Lấy theo ý kiến VKS').click();
  await m.choThongBao(/Đã lấy theo ý kiến Viện kiểm sát/);
  await expect(
    d.locator('.ant-table').filter({ hasText: 'Tổng hợp với bản án khác' }).first(),
    'Phần Quyết định vẫn còn bị cáo "Chưa có hình phạt"',
  ).not.toContainText('Chưa có hình phạt', { timeout: 10_000 });

  const noiNhan = d.getByPlaceholder('Nơi nhận 1');
  if (!(await noiNhan.inputValue())) await noiNhan.fill(vks);

  await m.nut(d, 'Lưu').click();
  await m.choThongBao(/Đã lưu bản án/);
}

/**
 * Popup "Bản án (dự thảo đã lưu)": Người ký = chủ tài khoản (mới "Ký logic" được ngay) · "Dùng số"
 * · Ngày bản án = ngày xét xử → "Lưu" (chưa hiện "Ký logic" thì điền lại, lưu lần nữa)
 * → "Ký logic" → xác nhận → "Đóng".
 * @returns số bản án
 */
async function soNgayVaKy(m: ManHinh, d: Locator, tk: TaiKhoan, ngayXetXu: string): Promise<string> {
  const oKy = m.oTheoNhan(/Người ký/, d);
  const oSo = d.locator('#soBanAn');
  const nutKy = m.nut(d, 'Ký logic');
  for (let lan = 1; lan <= 2 && !(await nutKy.isVisible().catch(() => false)); lan++) {
    if (tk.ten && !(await oKy.locator('.ant-select-selection-item').filter({ hasText: tk.ten }).count())) await m.chonTrong(oKy, chuaChu(tk.ten));
    if (!(await oSo.inputValue())) await m.nut(d, /Dùng số/).click();
    await expect(oSo, 'Bấm "Dùng số" nhưng ô "Số bản án" vẫn trống').not.toHaveValue('', { timeout: 10_000 });
    if ((await d.locator('#ngayBanAn').inputValue()) !== ngayXetXu) await m.ngay(d, 'Ngày bản án', ngayXetXu);
    await m.nut(d, 'Lưu').click();
    await m.choThongBao(/Đã lưu bản án/);
    await m.choTaiXong(1500);
  }
  await expect(nutKy, 'Lưu xong vẫn chưa có nút "Ký logic" (người ký phải là chủ tài khoản, đã có số bản án)').toBeVisible({ timeout: 10_000 });
  const soBanAn = await oSo.inputValue();

  await nutKy.click();
  const xacNhan = m.popup('Xác nhận ký logic');
  await xacNhan.waitFor({ timeout: 15_000 });
  await m.nut(xacNhan, 'Ký logic').click();
  await m.choThongBao(/Ký logic thành công/);
  await m.choTaiXong(1000);
  // Ký xong tiêu đề popup đổi → bấm Đóng của drawer đang mở
  const drawer = m.page.locator('.ant-drawer-open .ant-drawer-content').last();
  await drawer.locator('button').filter({ hasText: dungChu('Đóng') }).last().click();
  await drawer.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => undefined);
  return soBanAn;
}

/**
 * BƯỚC 09 · Tạo bản án sơ thẩm, ký logic, lưu kết quả (thao tác người dùng ghi lại 28/10/2026)
 *
 *  1. Tab "Xét xử" › mục "Kết quả xét xử" → thẻ "Bản án" → "Tạo bản án" → popup "Thêm bản án"
 *  2. Thông tin bị cáo: bị cáo cá nhân điền sinh năm, nơi sinh, nơi cư trú, nghề nghiệp, trình độ, dân tộc,
 *     giới tính, quốc tịch, tôn giáo, cha, mẹ, tiền án, tiền sự, nhân thân — ngẫu nhiên (pháp nhân không phải điền)
 *  3. Nội dung vụ án · Ý kiến VKS: mỗi bị cáo một hình phạt đề nghị (xem `deNghiHinhPhat`)
 *  4. Nhận định của HĐXX → "Lấy theo ý kiến VKS" (đồng ý) · Nơi nhận
 *     → "Lưu" (tạo dự thảo — hệ thống bỏ người ký, số, ngày đã chọn)
 *  5. Popup "Bản án (dự thảo đã lưu)": Người ký lại · "Dùng số" · Ngày bản án = ngày xét xử (bước 08) → "Lưu"
 *     → "Ký logic" (xác nhận) → "Đóng". Lượt trước dừng ở dự thảo thì bấm "Chỉnh sửa dự thảo" làm tiếp từ đây
 *  6. Cập nhật số, ngày bản án vào dòng của vụ trong output/1-hinh-su/output-ma-vu-an-form-1A.xlsx
 */
export const buoc09: Buoc<VuNguon, TrangThai1A> = {
  so: 9,
  ten: 'Tạo bản án sơ thẩm (lấy theo ý kiến VKS), dùng số, ký logic, lưu kết quả',
  huongDan: 'bổ sung',
  chay: async ({ vuAn, tt, moPhien, tkToa, can }) => {
    const tk = tkToa(vuAn.toaAn);
    const urlVuAn = can('urlVuAn', 2);
    const ngayXetXu = can('ngayXetXu', 8);
    const m = await moVuAn(await moPhien(tk), urlVuAn);
    await m.moTab('xet-xu');
    const muc = await m.moMuc('Kết quả xét xử');
    const theBanAn = muc.locator('.kqxx-pick-card').filter({ hasText: 'Bản án' }).first();
    if (await theBanAn.isVisible().catch(() => false)) {
      await theBanAn.click();
      await m.choTaiXong();
    }

    const nutTao = m.nut(muc, 'Tạo bản án');
    await nutTao.waitFor({ timeout: 30_000 });
    const dongBanAn = muc.locator('.ant-table-row').filter({ hasText: 'Bản án sơ thẩm' }).first();
    const daKy = (await dongBanAn.count()) > 0 && /Đã ký/.test(await m.docCot(dongBanAn, 'Trạng thái'));
    // Lượt trước đã ký → chỉ đọc lại số, ngày rồi ghi kết quả (lượt trước có thể chưa ghi được vì file đang mở)
    if (!daKy) {
      if (await dongBanAn.count()) {
        // Lượt trước dừng ở dự thảo → "Chỉnh sửa dự thảo" rồi làm tiếp phần số, ngày, ký
        await dongBanAn.locator('button, a').filter({ hasText: 'Chỉnh sửa dự thảo' }).first().click();
      } else {
        await expect(nutTao, 'Nút "Tạo bản án" đang khóa — cần quyết định đưa vụ án ra xét xử (bước 08)').toBeEnabled({ timeout: 15_000 });
        await nutTao.click();
        await dienBanAnMoi(m, tt.toiDanh ?? '', tt.vienKiemSat ?? vksCuaToa(vuAn.toaAn));
      }
      const duThao = m.popup(/Bản án \(dự thảo/);
      await duThao.waitFor({ timeout: 30_000 });
      await m.choTaiXong(1500);
      await soNgayVaKy(m, duThao, tk, ngayXetXu);
      await expect(dongBanAn, 'Không thấy bản án sơ thẩm "Đã ký logic" trong mục Kết quả xét xử').toContainText('Đã ký', { timeout: 30_000 });
    }
    const soBanAn = await m.docCot(dongBanAn, 'Số bản án');
    const ngayBanAn = await m.docCot(dongBanAn, 'Ngày bản án');

    // ── Lưu kết quả: cập nhật dòng của vụ (bước 07 đã ghi) thêm số, ngày bản án ──
    test.info().annotations.push({ type: 'Bản án', description: `${tt.maVuAnHeThong} · bản án số ${soBanAn} ngày ${ngayBanAn}` });
    return { soBanAn, ngayBanAn };
  },
};
