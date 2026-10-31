import { Locator, Page, expect, test } from '@playwright/test';
import { ManHinh } from '../../../base.page';
import { Buoc, VuAnLuong } from '../../../common/buoc';
import { TrangThaiChung } from '../../../../utils/trang-thai';
import { PhienDangNhap } from '../../../common/login.page';
import { TaiKhoan } from '../../../../utils/tai-khoan';
import { ngay } from '../../../../utils/fake-data';

/**
 * Thao tác màn hình DÙNG CHUNG cho nhiều bước của luồng 2A.
 * Thao tác riêng của bước nào nằm ngay trong file bước đó. Giao diện đổi → chỉ sửa trong thư mục buoc/.
 */

/** Popup của màn: modal hoặc drawer (màn vụ án dân sự dùng drawer) */
const POPUP = '.ant-modal-wrap:visible .ant-modal, .ant-drawer-open .ant-drawer-content';

/**
 * Vào link chi tiết, chờ tab "Thông tin chung" hiện. Hệ thống đôi khi nhảy sang trang 404 hoặc hiện trang trống
 * → trang trống / 404 / bị đẩy đi thì mở Dashboard rồi vào lại link, đến khi hiện giao diện (PhienDangNhap.vaoCho)
 */
async function vaoChiTiet(phien: PhienDangNhap, url: string): Promise<ManHinh> {
  const m = new ManHinh(phien.page);
  await phien.vaoCho(url, m.page.locator('[role=tab][id$="-tab-thong-tin-chung"]'));
  await m.choTaiXong(1500);
  return m;
}

/** [Bước 02–07] Mở chi tiết đơn theo link (bước 01 để lại) */
export const moChiTietDon = (phien: PhienDangNhap, urlDon: string) => vaoChiTiet(phien, urlDon);

/** [Bước 08–10] Mở chi tiết vụ án dân sự sơ thẩm theo link (bước 07 để lại) */
export const moVuAn = (phien: PhienDangNhap, urlVuAn: string) => vaoChiTiet(phien, urlVuAn);

/** Popup (modal/drawer) đang mở có chứa chữ `tieuDe` */
export const popup = (m: ManHinh, tieuDe: string | RegExp): Locator => m.page.locator(POPUP).filter({ hasText: tieuDe }).last();

/** Bấm `nut` (vd. "Phân công", "Thêm thông báo") trong `khung` rồi chọn mục menu xổ xuống chứa `muc` */
export async function chonMenu(m: ManHinh, khung: Locator, nut: string, muc: string | RegExp) {
  await m.nut(khung, nut).click();
  await m.page.locator('.ant-dropdown:visible li').filter({ hasText: muc }).first().click();
}

/** Người ký = chủ tài khoản (mặc định có khi là Thẩm phán được phân công) */
export async function chonNguoiKy(m: ManHinh, bm: Locator, ten: string) {
  const o = m.oTheoNhan('Người ký/người phân công', bm);
  if ((await m.docGiaTri('Người ký/người phân công', bm)).startsWith(ten)) return;
  await m.chonTrong(o, new RegExp(`^\\s*${ten}`));
  await expect(o.locator('.ant-select-selection-item').first(), `Chưa chọn được người ký ${ten}`).toContainText(ten, { timeout: 5_000 });
}

/**
 * Bấm nút link "Dùng số <số gợi ý>" ngay dưới ô `nhan` → ô có số; trả về số.
 * Nút có khi nằm trong khung ô (popup có 2 ô số, vd. thụ lý), có khi nằm ngoài → không thấy trong ô thì lấy nút đầu của popup.
 */
export async function dungSo(m: ManHinh, bm: Locator, nhan: string): Promise<string> {
  const o = m.oTheoNhan(nhan, bm);
  const ip = o.locator('input').first();
  if (!(await ip.inputValue())) {
    const trongO = m.nut(o, /Dùng số/);
    await ((await trongO.count()) ? trongO : m.nut(bm, /Dùng số/)).click();
  }
  await expect(ip, `Bấm "Dùng số" nhưng ô "${nhan}" vẫn trống`).not.toHaveValue('', { timeout: 10_000 });
  return ip.inputValue();
}

/** "Lưu" → "Lưu quyết định thành công" → "Ký logic" → "Ký logic thành công" → "Đóng" */
export async function luuKyDong(m: ManHinh, bm: Locator) {
  await m.nut(bm, 'Lưu').click();
  await m.choThongBao(/Lưu quyết định thành công/);
  const nutKy = m.nut(bm, /Ký logic/);
  await nutKy.waitFor({ timeout: 30_000 });
  await nutKy.click();
  await m.choThongBao(/Ký logic thành công/);
  await m.nut(bm, 'Đóng').click();
  await bm.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => undefined);
  await m.choTaiXong(1000);
}

/** Trạng thái dòng biểu mẫu đã lưu nhưng chưa ký */
const CHUA_KY = /Chưa có hiệu lực|Chưa ký|Dự thảo|Chờ ký|Chờ trình ký/;

/**
 * Dòng biểu mẫu lượt trước (hoặc người khác) đã lưu nhưng CHƯA KÝ (vd. 29-DS "Chưa có hiệu lực", người ký là Thẩm phán khác)
 * → bút chì sửa → Người ký = chủ tài khoản · "Dùng số" nếu ô số trống → "Lưu" → "Ký logic" → "Đóng".
 * @returns số trong ô `nhanSo` sau khi ký; dòng đã ký rồi thì trả `undefined` (không làm gì)
 */
export async function kyTiepNeuChuaKy(m: ManHinh, dong: Locator, tieuDe: string | RegExp, nhanSo: string, nguoiKy?: string): Promise<string | undefined> {
  if (!CHUA_KY.test(await dong.innerText())) return undefined;
  await dong.locator('button:has(.anticon-edit)').first().click();
  const bm = popup(m, tieuDe);
  await bm.waitFor({ timeout: 30_000 });
  await m.choTaiXong();
  await expect(bm.getByText('Đang tải dữ liệu...')).toHaveCount(0, { timeout: 30_000 });
  if (nguoiKy) await chonNguoiKy(m, bm, nguoiKy);
  const so = await dungSo(m, bm, nhanSo);
  await luuKyDong(m, bm);
  return so;
}

/**
 * Chọn vai trò + người được phân công rồi bấm mũi tên thêm vào bảng; trả về TÊN ĐỌC TỪ BẢNG.
 * (Chọn ngẫu nhiên trong danh sách ảo đôi khi trúng người khác với tên vừa đọc → lấy tên ở dòng mới thêm.)
 */
export async function themNguoiPhanCong(m: ManHinh, bm: Locator, vaiTro: string): Promise<string> {
  const bang = bm.locator('tbody tr').filter({ hasNotText: 'Không có dữ liệu' });
  const truoc = await bang.count();
  await m.chon(bm, 'Vai trò', vaiTro);
  await m.page.waitForTimeout(500);
  await m.chon(bm, 'Tên người được phân công');
  await bm.locator('button:has(.anticon-arrow-down)').first().click();
  await expect(bang, 'Người được phân công chưa vào bảng').toHaveCount(truoc + 1, { timeout: 15_000 });
  // Dòng: "<STT> <Vai trò> <Họ tên> (<ngày sinh>)" — bỏ STT, vai trò và phần ngày sinh
  const chu = (await bang.nth(truoc).innerText()).replace(/\s+/g, ' ').trim();
  return chu.replace(/^\d+\s*/, '').replace(new RegExp(`^${vaiTro}\\s*`), '').replace(/\s*\(.*$/, '').trim();
}


/**
 * [Bước 08–10] Tab "Phân công" của vụ án › "Phân công" › `menu` → drawer quyết định:
 *   Ngày quyết định = hôm nay · Người ký = chủ tài khoản · `soNguoi` lần (Vai trò `vaiTro` → người ngẫu nhiên → mũi tên)
 *   → "Dùng số" → "Lưu" → "Ký logic" → "Đóng".
 * Lượt trước đã có đủ người cho vai trò này trong "Danh sách người tiến hành tố tụng" → không phân công lại.
 * @returns tên người được phân công (đọc từ bảng) và số quyết định
 */
export async function phanCongVuAn(m: ManHinh, menu: string, vaiTro: string, soNguoi: number, nguoiKy?: string) {
  await m.moTab('phan-cong');
  const dsNguoi = await m.moMuc('Danh sách người tiến hành tố tụng');
  await m.page.waitForTimeout(1000);
  // Cột 3 "Người được phân công": dòng đầu là họ tên, dòng sau là số định danh — "… dự khuyết" không tính
  const cacDong = dsNguoi.locator('tbody tr').filter({ hasText: new RegExp(`${vaiTro}(?! dự khuyết)`) });
  if ((await cacDong.count()) >= soNguoi) {
    const ten: string[] = [];
    for (let i = 0; i < (await cacDong.count()); i++) {
      ten.push((await cacDong.nth(i).locator('td').nth(2).innerText()).trim().split('\n')[0].trim());
    }
    return { nguoi: ten, soQD: '' };
  }

  await chonMenu(m, m.page.locator('main'), 'Phân công', menu);
  const bm = popup(m, menu);
  await bm.waitFor({ timeout: 30_000 });
  await m.choTaiXong();

  await m.ngay(bm, 'Ngày quyết định', ngay(0));
  if (nguoiKy) await chonNguoiKy(m, bm, nguoiKy);
  const nguoi: string[] = [];
  for (let i = 0; i < soNguoi; i++) nguoi.push(await themNguoiPhanCong(m, bm, vaiTro));
  const soQD = await dungSo(m, bm, 'Số quyết định');
  await luuKyDong(m, bm);
  return { nguoi, soQD };
}

/** Mở (nếu đang đóng) mục thu gọn có tiêu đề khớp `tieuDe` — dùng khi tiêu đề đổi theo trạng thái */
export async function moMucKhop(m: ManHinh, tieuDe: RegExp): Promise<Locator> {
  const muc = m.page.locator('.ant-collapse-item').filter({ has: m.page.locator('.ant-collapse-header', { hasText: tieuDe }) }).first();
  const dau = muc.locator('.ant-collapse-header').first();
  await dau.waitFor({ timeout: 30_000 });
  if ((await dau.getAttribute('aria-expanded')) !== 'true') await dau.click();
  await m.choTaiXong(800);
  return muc;
}

/** Hộp "Hệ thống vừa gặp lỗi" / "Máy chủ báo lỗi 502…" của STG */
const hopLoiMayChu = (p: Page) => p.locator('.ant-modal-confirm:visible').filter({ hasText: /Hệ thống vừa gặp lỗi|Máy chủ báo lỗi/ }).first();

/** Trang bị hệ thống đẩy ra giữa chừng: Trang chủ (qla/dashboard), 404, đăng nhập */
const BI_DAY_RA = /\/qla\/?(dashboard)?\/?(\?.*)?$|exception\/404|\/sso\/login/;

/**
 * Bọc một bước: bước lỗi mà lúc đó (1) trên trang đang có hộp lỗi máy chủ (STG quá tải trả 500/502, popup mở ra trống dữ liệu)
 * hoặc (2) trang đã bị đẩy về Trang chủ / 404 / đăng nhập (tài khoản đang dùng ở nơi khác)
 * → "Bỏ qua" rồi chạy lại cả bước (các bước đều tự nhận ra phần đã làm ở lượt trước), tối đa `soLan` lần.
 * Lỗi khác → báo lỗi ngay như cũ.
 */
export function thuLaiKhiMayChuLoi<V extends VuAnLuong, T extends TrangThaiChung>(buoc: Buoc<V, T>, soLan = 3): Buoc<V, T> {
  return {
    ...buoc,
    chay: async nc => {
      // Máy/STG quá tải (mở một trang 25–55s) → 300s mặc định không đủ cho các bước dài (11, 12)
      test.setTimeout(Math.max(test.info().timeout, 600_000));
      const cacTrang: Page[] = [];
      const moPhien = async (tk: TaiKhoan) => {
        const p = await nc.moPhien(tk);
        if (!cacTrang.includes(p.page)) cacTrang.push(p.page);
        return p;
      };
      for (let lan = 1; ; lan++) {
        try {
          return await buoc.chay({ ...nc, moPhien });
        } catch (loi) {
          const coHopLoi: Page[] = [];
          for (const p of cacTrang) if (await hopLoiMayChu(p).isVisible().catch(() => false)) coHopLoi.push(p);
          const biDay = cacTrang.some(p => !p.isClosed() && BI_DAY_RA.test(p.url()));
          if ((!coHopLoi.length && !biDay) || lan >= soLan) throw loi;
          const lyDo = coHopLoi.length ? 'máy chủ báo lỗi' : 'bị đẩy về Trang chủ/404/đăng nhập';
          test.info().annotations.push({ type: 'Thử lại', description: `Lần ${lan}: ${lyDo} → chạy lại bước` });
          console.log(`  ↻ Thử lại ${nc.vuAn.maVuAn} · Bước ${buoc.so} · lần ${lan}: ${lyDo}`);
          test.setTimeout(test.info().timeout + 180_000);
          for (const p of coHopLoi) await hopLoiMayChu(p).locator('button').filter({ hasText: 'Bỏ qua' }).first().click().catch(() => undefined);
        }
      }
    },
  };
}

// ───────────── Biểu mẫu tab "Chuẩn bị xét xử" / "Xét xử" (bước 11–12) — giao diện giống vụ lao động sơ thẩm (5A) ─────────────
export { O_BIEU_MAU, chonNeuTrong, daCoBieuMau, luuKyBieuMau, moBieuMau } from '../../../5-lao-dong/form-5A/buoc/chung';
