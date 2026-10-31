import { Locator, expect, test } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { ManHinh } from '../../../base.page';
import { BIEU_MAU_6B, LINH_VUC_6B, TrangThai6B, VuAn6B } from '../cau-hinh-6B';
import { luuDongKetQua } from '../../../../utils/file-helper';
import { chonNeuTrong, dungSo, moVuAn, popup } from './chung';
import { chonKetQuaBanAn } from './11-bien-ban-nghi-an';

/** Các ô chọn còn trống trong bảng "Kết quả giải quyết theo đối tượng và yêu cầu" (và cột tham gia phiên tòa) → chọn ngẫu nhiên */
async function chonKetQuaTrong(m: ManHinh, bm: Locator) {
  const cacO = bm.locator('.ant-table .ant-select:not(.ant-select-disabled)');
  for (let i = 0; i < (await cacO.count()); i++) {
    const o = cacO.nth(i);
    if (!(await o.isVisible().catch(() => false)) || (await o.locator('.ant-select-selection-item').count())) continue;
    await o.scrollIntoViewIfNeeded();
    await m.chonTrong(o);
  }
}

/** "Ký logic" (có khi hỏi xác nhận) → "Ký logic thành công" → "Đóng" */
async function kyLogicVaDong(m: ManHinh, bm: Locator) {
  const nutKy = m.nut(bm, /Ký logic/);
  await nutKy.waitFor({ timeout: 30_000 });
  await nutKy.click();
  const xacNhan = popup(m, /Xác nhận ký/);
  if (await xacNhan.waitFor({ timeout: 3_000 }).then(() => true).catch(() => false)) await m.nut(xacNhan, /Ký logic|Xác nhận|Đồng ý/).last().click();
  await m.choThongBao(/Ký logic thành công/);
  await m.nut(bm, /^\s*Đóng\s*$/).last().click();
  await bm.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => undefined);
  await m.choTaiXong(1000);
}

/**
 * BƯỚC 12 · Tòa phúc thẩm · Bản án hành chính phúc thẩm (46-HC), ghi kết quả (hướng dẫn bước 12)
 *
 *  1. Tab "Xét xử" › "Kết quả xét xử" (loại "Bản án") → "Tạo bản án" → drawer "Bản án hành chính phúc thẩm"
 *  2. "Dùng số" · Ngày bản án = ngày xét xử · Tình trạng cung cấp tài liệu, chứng cứ của người bị kiện — ngẫu nhiên
 *  3. Áp dụng án lệ "Có" → án lệ ngẫu nhiên → "Thêm án lệ"
 *  4. Kết quả bản án sơ thẩm (mặc định) · Nguyên nhân ngẫu nhiên
 *     · bảng kết quả giải quyết (quyết định bị kiện, hành vi bị kiện, yêu cầu bồi thường…) — mỗi dòng ngẫu nhiên
 *  5. "Thêm kiến nghị" → cơ quan ngẫu nhiên · nội dung kiến nghị
 *  6. Căn cứ pháp lý: Điều, Khoản ngẫu nhiên · Điểm "a" → "Thêm căn cứ"
 *  7. "Thêm mới bản án" → "Ký logic" → "Đóng"
 *  8. Ghi dòng của vụ vào output/6-hanh-chinh/output-ma-vu-an-form-6B.xlsx
 * Bản án đã ký (lượt trước) → chỉ đọc số, ngày và ghi kết quả.
 */
export const buoc12: Buoc<VuAn6B, TrangThai6B> = {
  so: 12,
  ten: 'Tòa phúc thẩm · Bản án hành chính phúc thẩm (46-HC), ký logic, lưu kết quả',
  huongDan: '12',
  chay: async ({ vuAn, tt, moPhien, tkToa, can }) => {
    const tk = tkToa(vuAn.toaPhucTham);
    const urlVuAnPT = can('urlVuAnPT', 7);
    const ngayXetXu = can('ngayXetXu', 9);
    const m = await moVuAn(await moPhien(tk), urlVuAnPT);
    await chonKetQuaBanAn(m);
    const main = m.page.locator('main');
    const dongBanAn = main.locator('.ant-table-row').filter({ hasText: /Bản án phúc thẩm/ }).first();

    if (!(await dongBanAn.isVisible().catch(() => false))) {
      const nutTao = m.nut(main, /Tạo bản án/);
      await expect(nutTao, 'Không thấy "Tạo bản án" — loại kết quả xét xử không phải "Bản án"?').toBeVisible({ timeout: 30_000 });
      await nutTao.click();
      const bm = popup(m, /Bản án hành chính phúc thẩm/);
      await bm.waitFor({ timeout: 30_000 });
      await m.choTaiXong(2000);

      await dungSo(m, bm, 'Số bản án');
      await m.ngay(bm, 'Ngày bản án', ngayXetXu);
      if (tk.ten) await chonNeuTrong(m, bm, 'Người ký', new RegExp(tk.ten));
      await chonNeuTrong(m, bm, 'Quan hệ pháp luật thống kê');
      await chonNeuTrong(m, bm, 'Tình trạng cung cấp tài liệu');

      // Áp dụng án lệ: "Có" → ô "— Chọn án lệ —" → "Thêm án lệ"
      await bm.getByRole('radio', { name: 'Có', exact: true }).first().check();
      const oAnLe = bm.locator('.ant-select').filter({ hasText: /Chọn án lệ/ }).first();
      await oAnLe.waitFor({ timeout: 10_000 });
      await m.chonTrong(oAnLe);
      await m.nut(bm, /Thêm án lệ/).click();
      await expect(bm.locator('tbody tr').filter({ hasText: /\/AL/ }).first(), 'Chưa thêm được án lệ').toBeVisible({ timeout: 10_000 });

      await chonNeuTrong(m, bm, 'Kết quả bản án sơ thẩm');
      await m.page.waitForTimeout(500);
      await chonNeuTrong(m, bm, 'Nguyên nhân');
      await chonKetQuaTrong(m, bm);

      // Kiến nghị: dòng mới có ô chọn cơ quan + ô nội dung
      await m.nut(bm, /Thêm kiến nghị/).click();
      const oNoiDung = bm.getByPlaceholder('Nhập nội dung kiến nghị').last();
      await oNoiDung.waitFor({ timeout: 10_000 });
      const dongKienNghi = bm.locator('tr').filter({ has: oNoiDung }).last();
      const oCoQuan = dongKienNghi.locator('.ant-select').first();
      if (!(await oCoQuan.locator('.ant-select-selection-item').count())) await m.chonTrong(oCoQuan);
      await oNoiDung.fill('Kiến nghị cơ quan có thẩm quyền xem xét, rà soát quy trình ban hành quyết định hành chính');

      // Căn cứ pháp lý: Điều → Khoản → Điểm → "Thêm căn cứ"
      await m.chon(bm, /^\s*Điều\s*$/);
      await m.page.waitForTimeout(500);
      await m.chon(bm, /^\s*Khoản\s*$/);
      await bm.getByPlaceholder('Nhập điểm').first().fill('a');
      await m.nut(bm, /Thêm căn cứ/).click();

      await m.nut(bm, /Thêm mới bản án/).click();
      await m.choThongBao(/thành công/i);
      await kyLogicVaDong(m, bm);
    } else if (!/Đã ký/.test(await dongBanAn.innerText())) {
      // Lượt trước đã lưu nhưng chưa ký → mở lại để ký
      await dongBanAn.locator('button:has(.anticon-eye), a:has(.anticon-eye), button:has(.anticon-edit)').first().click();
      const bm = popup(m, /Bản án hành chính phúc thẩm/);
      await bm.waitFor({ timeout: 30_000 });
      await m.choTaiXong(1500);
      await kyLogicVaDong(m, bm);
    }

    await expect(dongBanAn, 'Bản án phúc thẩm chưa ở trạng thái đã ký').toContainText(/Đã ký/, { timeout: 30_000 });
    const chu = await dongBanAn.innerText();
    const soBanAnPT = (chu.match(/(\d+\/\d{4}\/HC-PT)/) ?? ['', ''])[1];
    const ngayBanAnPT = (chu.match(/\d{2}\/\d{2}\/\d{4}/) ?? [ngayXetXu])[0];

    const kq = { ...tt, soBanAnPT, ngayBanAnPT };
    await luuDongKetQua(
      LINH_VUC_6B,
      BIEU_MAU_6B,
      tk,
      ['Mã vụ án', 'Mã định danh', 'Luồng', 'Tòa án sơ thẩm', 'Số QĐ kháng nghị', 'Người kháng cáo', 'Số thông báo 32-HC',
        'Mã vụ án phúc thẩm', 'Số thụ lý phúc thẩm', 'Thẩm phán chủ tọa', 'Số QĐ phân công', 'Số QĐ đưa vụ án ra xét xử', 'Ngày xét xử',
        'Số bản án phúc thẩm', 'Ngày bản án', 'Link vụ án phúc thẩm'],
      [vuAn.maVuAn, kq.maDinhDanh ?? '', vuAn.luong, vuAn.toaSoTham, kq.soKhangNghi ?? '', kq.nguoiKhangCao ?? '', kq.soThongBao ?? '',
        kq.maVuAnPT ?? '', kq.soThuLyPT ?? '', kq.chuToa ?? '', kq.soQDPhanCong ?? '', kq.soQDXetXu ?? '', ngayXetXu,
        soBanAnPT, ngayBanAnPT, urlVuAnPT],
      'Mã vụ án',
    );
    test.info().annotations.push({ type: 'Bản án phúc thẩm', description: `${vuAn.maVuAn} → ${kq.maVuAnPT} · ${soBanAnPT} · ${urlVuAnPT}` });
    return { soBanAnPT, ngayBanAnPT };
  },
};
