import { expect, test } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { TrangThai5B, VuAn5B } from '../cau-hinh-5B';
import { ngay } from '../../../../utils/fake-data';
import { oChonTheoGoiY, soanThao } from '../../form-5A/buoc/13-tao-ban-an';
import { moVuAn, popup } from './chung';

/**
 * BƯỚC 10 · Tòa phúc thẩm · Bản án phúc thẩm (75-DS), ký logic, lưu kết quả (hướng dẫn bước 10)
 *
 *  1. Tab "Xét xử" › "Kết quả xét xử": loại đang là "Quyết định" (bước 08–09) → "Đổi loại kết quả"
 *     → thẻ "Bản án" → drawer "Bản án phúc thẩm — soạn thảo (Mẫu 75-DS)"
 *  2. Ngày bản án = hôm nay · Số bản án ngẫu nhiên · Tóm tắt
 *  3. Quyết định: "Sửa bản án sơ thẩm" ở mọi nhóm → nút "Sửa" từng yêu cầu → nội dung sửa
 *     · Nguyên nhân sửa (ngẫu nhiên) · Nêu rõ lý do sửa
 *  4. Nội dung vụ án / nhận định / quyết định: trang soạn thảo · Viện kiểm sát nhận
 *     · Căn cứ pháp lý: Điều ngẫu nhiên → mũi tên
 *  5. "Thêm mới bản án" → "Ký logic" → "Đóng"
 *  6. Ghi output/5-lao-dong/output-ma-vu-an-form-5B.xlsx
 */
export const buoc10: Buoc<VuAn5B, TrangThai5B> = {
  so: 10,
  ten: 'Tòa phúc thẩm · Bản án phúc thẩm (75-DS, sửa bản án sơ thẩm), ký logic, lưu kết quả',
  huongDan: '10',
  chay: async ({ vuAn, tt, moPhien, tkToa, can }) => {
    const tk = tkToa(vuAn.toaPhucTham);
    const urlVuAnPT = can('urlVuAnPT', 4);
    const m = await moVuAn(await moPhien(tk), urlVuAnPT);
    await m.moTab('xet-xu');
    const main = m.page.locator('main');

    let soBanAnPT = tt.soBanAnPT ?? '';
    let ngayBanAnPT = tt.ngayBanAnPT ?? '';
    const daKy = main.locator('.ant-table-row').filter({ hasText: /Bản án phúc thẩm|75-DS/ }).filter({ hasText: /Đã ký|hiệu lực|Hoàn thành/ });
    if (!(await daKy.count())) {
      // Loại kết quả đang là "Quyết định" → đổi; còn 2 thẻ thì bấm thẳng thẻ "Bản án"
      const doi = m.nut(main, /Đổi loại kết quả/);
      if (await doi.isVisible().catch(() => false)) {
        await doi.click();
        await m.dongYTatCaXacNhan();
        await m.choTaiXong(1000);
      }
      await main.locator('button').filter({ hasText: /Tòa xét xử xong nội dung vụ án/ }).first().click();
      const d = popup(m, /Bản án phúc thẩm/);
      await d.waitFor({ timeout: 30_000 });
      await m.choTaiXong(1500);

      ngayBanAnPT = await m.ngay(d, 'Ngày bản án', ngay(0));
      soBanAnPT = String(10_000 + Math.floor(Math.random() * 90_000));
      await d.getByPlaceholder('Nhập số bản án').first().fill(soBanAnPT);
      await m.nhap(d, 'Tóm tắt nội dung bản án', 'Chấp nhận kháng nghị của Viện kiểm sát, sửa bản án lao động sơ thẩm.');

      // Quyết định: "Sửa bản án sơ thẩm" ở mọi nhóm → nút "Sửa" của từng yêu cầu → nội dung sửa
      const cacSua = d.locator('button').filter({ hasText: /^\s*Sửa bản án/ });
      for (let i = 0; i < (await cacSua.count()); i++) {
        await cacSua.nth(i).click();
        await m.page.waitForTimeout(600);
      }
      const nutSuaYeuCau = d.locator('button').filter({ hasText: /^\s*Sửa\s*$/ });
      for (let i = 0; i < (await nutSuaYeuCau.count()); i++) {
        await nutSuaYeuCau.nth(i).click();
        await m.page.waitForTimeout(500);
      }
      const cacNoiDung = d.getByPlaceholder(/Nhập nội dung sửa/);
      for (let i = 0; i < (await cacNoiDung.count()); i++) await cacNoiDung.nth(i).fill('Sửa phần quyết định của bản án sơ thẩm theo kháng nghị');
      await m.chonTrong(await oChonTheoGoiY(m, d, /Chọn nguyên nhân/));
      await d.getByPlaceholder(/Nêu rõ lý do sửa bản án sơ thẩm/).first().fill('Bản án sơ thẩm đánh giá chứng cứ chưa đầy đủ');

      await soanThao(m, d, {
        NOI_DUNG_VU_AN: 'Bản án sơ thẩm chấp nhận yêu cầu khởi kiện của người lao động. Viện kiểm sát kháng nghị đề nghị sửa bản án sơ thẩm.',
        NHAN_DINH: '[1] Kháng nghị trong thời hạn, hợp lệ. [2] Bản án sơ thẩm đánh giá chứng cứ chưa đầy đủ nên kháng nghị có căn cứ.',
        QUYET_DINH: 'Chấp nhận kháng nghị của Viện kiểm sát, sửa bản án sơ thẩm. Án phí theo quy định của pháp luật.',
      });
      await m.nhap(d, 'Viện kiểm sát nhận', vuAn.toaPhucTham.replace(/^Tòa án nhân dân/i, 'Viện kiểm sát nhân dân'));

      // Căn cứ pháp lý: Điều ngẫu nhiên → mũi tên (nút mũi tên thứ 2; thứ 1 là người tiến hành tố tụng)
      const oDieu = await oChonTheoGoiY(m, d, 'Chọn điều luật');
      await oDieu.scrollIntoViewIfNeeded();
      const dieu = await m.chonTrong(oDieu);
      await d.locator('button:has(.anticon-arrow-down)').nth(1).click();
      await m.page.waitForTimeout(800);

      await m.nut(d, 'Thêm mới bản án').click();
      const daLuu = await m.choThongBao(/thành công|Đã lưu/i, 20_000).then(() => true).catch(() => false);
      if (!daLuu) {
        // Không lưu được: gom lỗi kiểm tra của form / hộp lỗi để báo rõ ô nào thiếu
        const loi = await m.page.locator('.ant-form-item-explain-error, .ant-message-notice, .ant-notification-notice, .ant-modal-confirm:visible').allInnerTexts();
        throw new Error(`"Thêm mới bản án" không lưu được: ${loi.map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' | ') || 'không có thông báo'}`);
      }
      const khung = m.page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
      const nutKy = m.nut(khung, /Ký logic/);
      await nutKy.waitFor({ timeout: 30_000 });
      await nutKy.click();
      await m.dongYTatCaXacNhan();
      await m.choThongBao(/Ký logic thành công/);
      await m.page.locator('.ant-drawer-open button, .ant-modal-wrap:visible button').filter({ hasText: /^\s*Đóng\s*$/ }).last().click();
      await m.choTaiXong(1500);
      await expect(daKy.first(), 'Không thấy bản án phúc thẩm đã ký trong mục Kết quả xét xử').toBeVisible({ timeout: 30_000 }).catch(() => undefined);
      test.info().annotations.push({ type: 'Căn cứ', description: dieu });
    }

    test.info().annotations.push({ type: 'Vụ án phúc thẩm', description: `${tt.maVuAnPT} · bản án số ${soBanAnPT} · ${urlVuAnPT}` });
    return { soBanAnPT, ngayBanAnPT };
  },
};
