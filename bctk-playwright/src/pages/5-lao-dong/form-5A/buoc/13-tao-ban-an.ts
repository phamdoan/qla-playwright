import { Locator, expect, test } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { ManHinh } from '../../../base.page';
import { DonNguon, TrangThai5A, cauHinh5A } from '../cau-hinh-5A';
import { so8 } from '../../../../utils/fake-data';
import { luuDongKetQua } from '../../../../utils/file-helper';
import { chonNeuTrong, moVuAn, popup } from './chung';

/** Nội dung gõ vào từng vùng của trang soạn thảo, theo `data-ba-section` của vùng */
export type NoiDungSoanThao = Record<'NOI_DUNG_VU_AN' | 'NHAN_DINH' | 'QUYET_DINH', string>;

const SOAN_THAO: NoiDungSoanThao = {
  NOI_DUNG_VU_AN: 'Người khởi kiện trình bày người sử dụng lao động đơn phương chấm dứt hợp đồng lao động trái pháp luật, chưa thanh toán đủ tiền lương và trợ cấp. Người bị kiện không đồng ý với yêu cầu khởi kiện.',
  NHAN_DINH: '[1] Tòa án thụ lý, giải quyết đúng thẩm quyền. [2] Căn cứ tài liệu, chứng cứ có trong hồ sơ, yêu cầu khởi kiện của người khởi kiện là có căn cứ, cần được chấp nhận.',
  QUYET_DINH: 'Chấp nhận toàn bộ yêu cầu khởi kiện của người khởi kiện. Án phí sơ thẩm và quyền kháng cáo theo quy định của pháp luật.',
};

/**
 * Ô select (không có nhãn form) tìm theo chữ gợi ý đang hiện, rồi NEO THEO ID input:
 * chọn xong chữ gợi ý mất → locator lọc theo chữ không còn khớp ô nữa.
 */
export async function oChonTheoGoiY(m: ManHinh, d: Locator, goiY: string | RegExp): Promise<Locator> {
  const o = d.locator('.ant-select').filter({ has: m.page.locator('.ant-select-selection-placeholder', { hasText: goiY }) }).last();
  await o.waitFor({ timeout: 10_000 });
  const id = await o.locator('input').first().getAttribute('id');
  return d.locator('.ant-select').filter({ has: m.page.locator(`[id="${id}"]`) }).first();
}

/**
 * Trang soạn thảo bản án (bấm ô "Nội dung vụ án"): trang văn bản liền, hệ thống điền sẵn phần đầu và các đề mục;
 * dưới mỗi đề mục là một vùng nhập `[data-ba-section=…]` → bấm vào vùng rồi GÕ nội dung (điền đè cả trang thì
 * mất các vùng, nội dung không về được các ô "Nội dung vụ án / Nhận định / Nội dung quyết định")
 * → "Lưu bản soạn thảo" → "Đóng"
 */
export async function soanThao(m: ManHinh, d: Locator, noiDung: NoiDungSoanThao = SOAN_THAO) {
  await d.getByText(/Tóm tắt yêu cầu khởi kiện, trình bày của các đương sự/).first().click();
  const trang = m.page.locator('.qla-stba-word-page').first();
  await trang.waitFor({ timeout: 30_000 });
  await m.choTaiXong(1000);
  for (const [vung, chu] of Object.entries(noiDung)) {
    const o = trang.locator(`[data-ba-section="${vung}"]`).first();
    await o.click();
    await m.page.keyboard.type(chu);
    await expect(o, `Vùng soạn thảo ${vung} chưa nhận nội dung`).toContainText(chu.slice(0, 20), { timeout: 5_000 });
  }
  await m.nut(m.page, 'Lưu bản soạn thảo').click();
  await m.page.waitForTimeout(1000);
  // Nút đóng của trang soạn thảo có title="Đóng" (nút "Đóng" của drawer nằm dưới lớp soạn thảo, bấm không tới)
  await m.page.locator('button[title="Đóng"]').filter({ visible: true }).last().click();
  await trang.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => undefined);
  await m.choTaiXong(800);
}

/**
 * BƯỚC 13 · Tạo bản án sơ thẩm (52-DS), ký logic, lưu kết quả (hướng dẫn bước 13)
 *
 *  1. Tab "Xét xử" → "Tạo bản án" → drawer "Bản án sơ thẩm — soạn thảo (Mẫu 52-DS)"
 *  2. Số bản án ngẫu nhiên · Người ký = chủ tài khoản (trống thì chọn) · Tóm tắt nội dung bản án
 *  3. Quyết định: "Chấp nhận toàn bộ yêu cầu" · Căn cứ pháp lý: Điều ngẫu nhiên (Bộ luật mặc định) → mũi tên
 *     · Áp dụng án lệ: "Có" → án lệ ngẫu nhiên → mũi tên
 *  4. Nội dung vụ án / nhận định / quyết định: trang soạn thảo (xem `soanThao`)
 *  5. "Thêm mới bản án" → "Ký logic" → "Đóng"
 *  6. Ghi output/5-lao-dong/output-ma-vu-an-form-5A.xlsx (kèm link đơn và link vụ án)
 */
export const buoc13: Buoc<DonNguon, TrangThai5A> = {
  so: 13,
  ten: 'Tạo bản án sơ thẩm (52-DS), ký logic, lưu kết quả',
  huongDan: '13',
  chay: async ({ vuAn, tt, moPhien, tkToa, can }) => {
    const tk = tkToa(vuAn.toaAn);
    const urlVuAn = can('urlVuAn', 6);
    const m = await moVuAn(await moPhien(tk), urlVuAn);
    await m.moTab('xet-xu');
    const main = m.page.locator('main');

    // Lượt trước đã ký bản án → chỉ ghi lại kết quả
    const daKy = main.locator('.ant-table-row').filter({ hasText: /52-DS|Bản án/ }).filter({ hasText: /Đã ký|Đã có hiệu lực|Hoàn thành/ });
    let soBanAn = tt.soBanAn ?? '';
    if (!(await daKy.count())) {
      await m.nut(main, 'Tạo bản án').click();
      const d = popup(m, /Bản án sơ thẩm/);
      await d.waitFor({ timeout: 30_000 });
      await m.choTaiXong(1500);

      // Ô theo nhãn "Số bản án" là ô ẩn bị khóa — ô nhập thật có placeholder "Nhập số bản án"
      soBanAn = String(100 + Math.floor(Math.random() * 900));
      await d.getByPlaceholder('Nhập số bản án').first().fill(soBanAn);
      if (tk.ten) await chonNeuTrong(m, d, 'Người ký', tk.ten);
      await m.nhap(d, 'Tóm tắt nội dung bản án', 'Tranh chấp lao động: Tòa án chấp nhận toàn bộ yêu cầu khởi kiện của người lao động.');

      // Quyết định đối với yêu cầu của đương sự
      await m.nut(d, /Chấp nhận toàn bộ yêu cầu/).click();
      await m.page.waitForTimeout(500);

      // Căn cứ pháp lý: Bộ luật mặc định · Điều ngẫu nhiên → mũi tên (nút mũi tên thứ 2 của drawer; thứ 1 là người tiến hành tố tụng)
      const oDieu = await oChonTheoGoiY(m, d, 'Chọn điều luật');
      await oDieu.scrollIntoViewIfNeeded();
      const dieu = await m.chonTrong(oDieu);
      await d.locator('button:has(.anticon-arrow-down)').nth(1).click();
      await expect(d.getByText('Chưa có căn cứ pháp lý'), 'Điều luật chưa vào bảng căn cứ pháp lý').toBeHidden({ timeout: 10_000 });

      // Áp dụng án lệ: "Có" → án lệ ngẫu nhiên → mũi tên
      const khoiAnLe = d.locator('div').filter({ has: m.page.getByText(/^\s*Áp dụng án lệ\s*$/) }).filter({ has: m.page.locator('.ant-radio-wrapper') }).last();
      await khoiAnLe.locator('.ant-radio-wrapper').filter({ hasText: /^\s*Có\s*$/ }).click();
      await m.page.waitForTimeout(800);
      const oAnLe = await oChonTheoGoiY(m, d, /án lệ/i);
      const anLe = await m.chonTrong(oAnLe);
      await d.locator('button:has(.anticon-arrow-down)').last().click();
      await m.page.waitForTimeout(800);

      await soanThao(m, d);

      await m.nut(d, 'Thêm mới bản án').click();
      await m.choThongBao(/thành công|Đã lưu/i);
      const nutKy = m.nut(m.page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last(), /Ký logic/);
      await nutKy.waitFor({ timeout: 30_000 });
      await nutKy.click();
      await m.dongYTatCaXacNhan();
      await m.choThongBao(/Ký logic thành công/);
      await m.page.locator('.ant-drawer-open button, .ant-modal-wrap:visible button').filter({ hasText: /^\s*Đóng\s*$/ }).last().click();
      await m.choTaiXong(1500);
      test.info().annotations.push({ type: 'Căn cứ', description: `${dieu} · án lệ ${anLe}` });
    }

    // ── Lưu kết quả (ô này xong; lần chạy sau ô sẽ tạo đơn mới) ──
    await luuDongKetQua(
      cauHinh5A.linhVuc,
      cauHinh5A.bieuMau,
      tk,
      ['Mã vụ án', 'Số tiếp nhận', 'Tên đơn', 'Quan hệ pháp luật', 'Người khởi kiện', 'Người bị kiện', 'Thẩm phán xử lý đơn', 'Số TB 29-DS', 'Số biên lai', 'Ngày thụ lý', 'Thẩm phán chủ tọa', 'Số QĐ phân công TP', 'Số TB 31-DS', 'Số QĐ đưa ra xét xử', 'Ngày xét xử', 'Số bản án', 'Link đơn', 'Link vụ án'],
      [tt.maVuAnHeThong ?? '', tt.soTiepNhan ?? '', tt.tenDon ?? '', tt.quanHePhapLuat ?? '', tt.nguoiKhoiKien ?? '', tt.nguoiBiKien ?? '', tt.thamPhanXuLyDon ?? '', tt.soTB29 ?? '', tt.soBienLai ?? '', tt.ngayThuLy ?? '', tt.thamPhanChuToa ?? '', tt.soQDThamPhan ?? '', tt.soTB31 ?? '', tt.soQDXetXu ?? '', tt.ngayXetXu ?? '', soBanAn, tt.urlDon ?? '', urlVuAn],
      'Mã vụ án',
    );
    test.info().annotations.push({ type: 'Vụ án đã tạo', description: `${tt.maVuAnHeThong} · bản án số ${soBanAn} · ${urlVuAn}` });
    return { soBanAn };
  },
};
