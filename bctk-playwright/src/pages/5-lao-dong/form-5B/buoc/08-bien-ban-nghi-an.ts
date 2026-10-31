import { Locator } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { ManHinh } from '../../../base.page';
import { TrangThai5B, VuAn5B } from '../cau-hinh-5B';
import { ngay } from '../../../../utils/fake-data';
import { O_BIEU_MAU, daCoBieuMau, gio, luuTaiBanKy, moBieuMau, moVuAn } from './chung';

/**
 * Tab "Xét xử" › mục "Kết quả xét xử" của vụ phúc thẩm: biên bản 51/73-DS chỉ chọn được ở loại kết quả "Quyết định"
 * → chưa chọn loại (còn 2 thẻ Bản án / Quyết định) thì bấm thẻ "Quyết định". Loại này không lưu khi tải lại trang.
 */
export async function moKetQuaQuyetDinh(m: ManHinh) {
  await m.moTab('xet-xu');
  const the = m.page.locator('main button').filter({ hasText: /Vụ án kết thúc bằng một hoặc nhiều quyết định/ }).first();
  if (await the.isVisible().catch(() => false)) {
    await the.click();
    await m.choTaiXong(1500);
  }
}

/** Các ô chọn còn trống trong drawer (bảng "kết quả theo từng phạm vi") → chọn mục khớp `mau` */
async function chonKetQuaTrong(m: ManHinh, d: Locator, mau: RegExp) {
  const cacO = d.locator('.ant-table .ant-select:not(.ant-select-disabled)');
  for (let i = 0; i < (await cacO.count()); i++) {
    const o = cacO.nth(i);
    if (!(await o.locator('.ant-select-selection-item').count())) await m.chonTrong(o, mau);
  }
}

/**
 * BƯỚC 08 · Tòa phúc thẩm · Biên bản nghị án (51-DS) (hướng dẫn bước 8)
 *
 *  1. Tab "Xét xử" › "Kết quả xét xử" (loại "Quyết định") → ô chọn biểu mẫu "Biên bản nghị án (51-DS)" → "Thêm mới quyết định"
 *  2. Thời gian nghị án = hôm nay 10:30 (sau giờ mở phiên tòa) · Địa điểm nghị án
 *     · kết quả theo từng phạm vi = "Chấp nhận toàn bộ kháng cáo/kháng nghị"
 *  3. "Lưu" → "Tải bản biên bản đã ký" (PDF mẫu) → "Xác nhận đã ký" → "Đóng"
 */
export const buoc08: Buoc<VuAn5B, TrangThai5B> = {
  so: 8,
  ten: 'Tòa phúc thẩm · Biên bản nghị án (51-DS), tải bản đã ký',
  huongDan: '8',
  chay: async ({ vuAn, moPhien, tkToa, can }) => {
    const m = await moVuAn(await moPhien(tkToa(vuAn.toaPhucTham)), can('urlVuAnPT', 4));
    await moKetQuaQuyetDinh(m);
    if (await daCoBieuMau(m, /Biên bản nghị án/)) return;

    const bm = await moBieuMau(m, O_BIEU_MAU.xetXu, '51', 'Thêm mới quyết định');
    await gio(m, bm, 'Thời gian nghị án', `${ngay(0)} 10:30`);
    await m.nhap(bm, 'Địa điểm nghị án', 'Phòng nghị án');
    await m.nhap(bm, 'Ý kiến, biểu quyết', 'Hội đồng xét xử thống nhất chấp nhận kháng nghị của Viện kiểm sát');
    await chonKetQuaTrong(m, bm, /Chấp nhận toàn bộ/);
    await luuTaiBanKy(m, bm);
  },
};
