/**
 * FLOW HÌNH SỰ 001 · BƯỚC 05–06 — mở phiên tòa và quyết định đưa vụ án ra xét xử (PHẦN B Step4.1–4.2).
 *
 * Khác dân sự/KDTM ở chỗ MỞ LỊCH: hình sự có nút "Mở phiên tòa" ngay trên tab Xét xử, lịch tạo
 * xong mới quay về tab Chuẩn bị xét xử lập quyết định 020 rồi gắn lịch vào. Phần điền form lịch
 * dùng chung `common/lich-xet-xu.ts`.
 *
 * ĐIỀU KIỆN CHẶN của spec: bản án chỉ tạo được khi 020 ĐÃ KÝ ("Cần có quyết định đưa vụ án ra xét
 * xử trước khi tạo bản án"). Nên bước 06 phải lấy được SỐ quyết định, không chấp nhận "đã lưu".
 */
import { Locator, Page, expect } from '@playwright/test';
import { choHetSpin, hienTrong, moTaForm, nghi, nguyenNhanLoi, oTheoNhan, dienOTheoNhan } from '../../../common/antd';
import {
  bieuMauDangMo,
  dongBieuMau,
  laySoVaKyLogic,
  luuBieuMau,
  moKhoi,
  moTabVaCho,
  nutTheoChu,
  themBieuMauTuDanhSach,
} from '../../../common/bieu-mau';
import { dienFormLichXetXu } from '../../../common/lich-xet-xu';
import type { INPUT } from '../../../data/hinh-su/flow-001-so-tham/case-001/input';

type DuLieuVao = typeof INPUT;
type GhiChu = (khoa: string, giaTri: string) => void;

/** Khối (card/collapse) của tab theo tiêu đề */
const khoiTheoTieuDe = (page: Page, tieuDe: RegExp) =>
  page.locator('.ant-collapse-item, .ant-card').filter({ hasText: tieuDe }).last();

async function dsNut(khung: Locator): Promise<string> {
  const ds = (await khung.getByRole('button').allInnerTexts().catch(() => []))
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  return [...new Set(ds)].slice(0, 20).join(' | ') || '(không có)';
}

/** Ngày sau n ngày, dd/mm/yyyy */
const ngaySau = (n: number) => {
  const d = new Date(Date.now() + n * 86400_000);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

// ═════════ BƯỚC 05 · Quyết định đưa vụ án ra xét xử sơ thẩm (020) ═════════
/**
 * ⚠ Bước này đi TRƯỚC "mở phiên tòa", ngược với spec 4.1→4.2.
 *
 * Tooltip của nút "Mở phiên tòa" (đang bị vô hiệu) nói rõ:
 *   "Lịch xét xử được tạo khi ký Quyết định đưa vụ án ra xét xử sơ thẩm"
 * Đo 01/10/2026 trên UAT, vụ đã ở trạng thái ĐÃ PHÂN CÔNG TP. Nên thời gian/địa điểm phiên tòa
 * nhập THẲNG trong 020, lịch do hệ thống sinh khi ký.
 */
export async function duaRaXetXu020(page: Page, input: DuLieuVao, ghi: GhiChu) {
  /**
   * THỬ TẠO LỊCH TRƯỚC. Hai câu hướng dẫn của hệ thống chỉ ngược nhau:
   *   · tooltip nút "Mở phiên tòa": "Lịch xét xử được tạo khi ký Quyết định đưa vụ án ra xét xử"
   *   · chữ trong khối: "Chưa có lịch xét xử. Bấm Đăng ký lịch xét xử mới để đăng ký ngày, giờ…"
   * Nút bị vô hiệu trên UAT, nhưng có thể mở được ở môi trường/trạng thái khác — nên thử, có lịch
   * rồi thì mẫu 020 có khả năng xuất hiện trong danh sách.
   */
  await moTabVaCho(page, 'Xét xử', ghi, /Thủ tục mở phiên to|Kết quả xét xử/i);
  await moKhoi(page, /Thủ tục mở phiên to/, ghi);
  const nutMoLich = nutTheoChu(page.locator('body'), /^Mở phiên tòa$|Đăng ký lịch xét xử mới/i);
  if (await hienTrong(nutMoLich, 10_000)) {
    if (await nutMoLich.isDisabled().catch(() => false)) {
      await nutMoLich.hover().catch(() => {});
      await nghi(page, 800, 1200);
      const tip = (await page.locator('.ant-tooltip-inner:visible').first().innerText().catch(() => '')).trim();
      ghi('05 020 · lịch', `nút "Mở phiên tòa" bị vô hiệu — tooltip: ${tip || '(không có)'}`);

      /**
       * Nút trong chi tiết vụ án bị vô hiệu, nhưng chữ hướng dẫn nói "Bấm Đăng ký lịch xét xử mới"
       * — nút đó có thể nằm ở MÀN LỊCH XÉT XỬ riêng (menu trái có mục "Lịch xét xử"). Thử sang đó.
       */
      const urlVuAn = page.url();
      for (const route of ['lich-xet-xu', 'lich-xet-xu/danh-sach', 'vu-an/lich-xet-xu']) {
        await page.goto(route, { waitUntil: 'domcontentloaded' }).catch(() => {});
        await choHetSpin(page);
        if (/exception\/404/.test(page.url())) {
          ghi('05 020 · lịch', `route ${route} → 404`);
          continue;
        }
        const nut = nutTheoChu(page.locator('body'), /Đăng ký lịch xét xử mới|Thêm lịch xét xử|Mở phiên tòa/i);
        ghi(
          '05 020 · lịch',
          `màn ${route}: ${(await hienTrong(nut, 8_000)) ? 'CÓ' : 'không có'} nút đăng ký lịch. ` +
            `Nút đang có: ${await dsNut(page.locator('body'))}`,
        );
        break;
      }
      await page.goto(urlVuAn, { waitUntil: 'domcontentloaded' });
      await choHetSpin(page);
    } else {
      await nutMoLich.click();
      await choHetSpin(page);
      const formLich = page
        .locator('.ant-modal-content:visible, .ant-drawer-content:visible')
        .filter({ hasText: /Thêm lịch xét xử|lịch xét xử/i })
        .first();
      if (await hienTrong(formLich, 20_000)) {
        let ngayLich = ngaySau(14);
        const [dd, mm, yy] = ngayLich.split('/').map(Number);
        if (new Date(yy, mm - 1, dd).getDay() === 0) ngayLich = ngaySau(15);
        const daTao = await dienFormLichXetXu(page, formLich, ghi, '05 020 · lịch', {
          ngay: ngayLich,
          gioBatDau: input.gioBatDauXetXu,
          gioKetThuc: input.gioKetThucXetXu,
          tinhChatPhienToa: input.tinhChatPhienToa,
          hinhThucXetXu: input.hinhThucXetXu,
          diaDiem: input.diaDiemXetXu,
        }).catch((e: Error) => {
          ghi('05 020 · lịch', `không tạo được lịch: ${e.message.slice(0, 200)}`);
          return '';
        });
        if (daTao) ghi('05 020 · lịch', `đã tạo lịch ngày ${daTao}`);
      } else {
        ghi('05 020 · lịch', 'bấm "Mở phiên tòa" nhưng không mở được form lịch');
      }
    }
  }

  await moTabVaCho(page, 'Chuẩn bị xét xử', ghi, /Quyết định tố tụng|Văn bản tố tụng khác/i);
  await moKhoi(page, /Quyết định tố tụng/, ghi);

  const khoi = khoiTheoTieuDe(page, /Quyết định tố tụng/i);
  await expect(khoi, 'Tab Chuẩn bị xét xử không có khối "Quyết định tố tụng"').toBeVisible({
    timeout: 30_000,
  });
  /**
   * Hình ở đây KHÁC dân sự/KDTM: khối KHÔNG có ô "Chọn loại biểu mẫu" trước, mà bấm nút
   * "Thêm biểu mẫu" rồi chọn loại trong danh sách mở ra (spec Step3.4 liệt kê 5 mã: 020, 030,
   * 033, 036, 039). Đo 01/10/2026: `themBieuMauTuDanhSach` báo "Khối không có ô Chọn loại biểu mẫu"
   * trong khi khối đang mở và có nút "user-switch Thêm biểu mẫu".
   */
  /**
   * 020 KHÔNG nằm ở khối "Quyết định tố tụng" dù spec Step3.4 ghi vậy. Dropdown của khối đó chỉ có
   * 4 mục (trả hồ sơ, trả hồ sơ ĐTBS, tạm đình chỉ, đình chỉ) — đo 01/10/2026. Nên thử lần lượt
   * các khối có nút "Thêm biểu mẫu" và GHI LẠI danh sách của từng chỗ, thay vì đoán tiếp.
   */
  const muon = new RegExp(input.maBieuMau020, 'i');
  const mucDropdown = page.locator('.ant-dropdown:not(.ant-dropdown-hidden) .ant-dropdown-menu-item');
  let daMo = false;
  /**
   * Quét CẢ HAI TAB. Danh sách mẫu của tab "Chuẩn bị xét xử" không có 020 (đo 01/10/2026), nên
   * phải xem tiếp tab "Xét xử" — nơi có khối "Thủ tục mở phiên toà" và "Kết quả xét xử".
   */
  const canQuet: [string, RegExp, RegExp][] = [
    ['Chuẩn bị xét xử', /Quyết định tố tụng|Văn bản tố tụng khác/i, /Quyết định tố tụng/],
    ['Chuẩn bị xét xử', /Quyết định tố tụng|Văn bản tố tụng khác/i, /Văn bản tố tụng khác/],
    ['Xét xử', /Thủ tục mở phiên to|Kết quả xét xử/i, /Thủ tục mở phiên to/],
    ['Xét xử', /Thủ tục mở phiên to|Kết quả xét xử/i, /Kết quả xét xử/],
    ['Xét xử', /Thủ tục mở phiên to|Kết quả xét xử/i, /Văn bản tố tụng khác/],
  ];
  let tabDangMo = 'Chuẩn bị xét xử';
  for (const [tenTab, dauHieu, tieuDe] of canQuet) {
    if (tenTab !== tabDangMo) {
      await moTabVaCho(page, tenTab, ghi, dauHieu);
      tabDangMo = tenTab;
    }
    await moKhoi(page, tieuDe, ghi);
    const k = khoiTheoTieuDe(page, tieuDe);
    const nutThem = nutTheoChu(k, /Thêm biểu mẫu|Thêm mới quyết định/i);
    if (!(await hienTrong(nutThem, 8_000))) {
      /**
       * Không có nút "Thêm biểu mẫu" thì IN TOÀN BỘ nút của khối: 020 có thể tạo bằng nút riêng.
       * Backend (`BieuMau020ServiceImpl.validateThemMoi`) chỉ đòi vụ đã thụ lý + đã phân công Thẩm
       * phán chủ toạ/Phó chánh án — cả hai đã có — nên mẫu phải tồn tại ở đâu đó trên màn.
       */
      ghi(
        '05 020 · tìm mẫu',
        `[${tenTab}] khối ${String(tieuDe)}: không có nút "Thêm biểu mẫu". Nút của khối: ${await dsNut(k)}`,
      );
      ghi(
        '05 020 · tìm mẫu',
        `[${tenTab}] khối ${String(tieuDe)} · chữ: ${(await k.innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)}`,
      );
      continue;
    }
    await nutThem.click();
    await choHetSpin(page);
    if (!(await hienTrong(mucDropdown.first(), 8_000))) {
      ghi('05 020 · tìm mẫu', `[${tenTab}] khối ${String(tieuDe)}: bấm "Thêm biểu mẫu" nhưng không mở danh sách`);
      continue;
    }
    const ds = (await mucDropdown.allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
    ghi('05 020 · tìm mẫu', `[${tenTab}] khối ${String(tieuDe)}: ${ds.join(' | ')}`);
    const khop = ds.find(x => muon.test(x));
    if (!khop) {
      await page.keyboard.press('Escape');
      await nghi(page, 500, 800);
      continue;
    }
    await mucDropdown.filter({ hasText: khop }).first().click();
    await choHetSpin(page);
    ghi('05 020', `chọn mẫu "${khop}" ở khối ${String(tieuDe)}`);
    daMo = true;
    break;
  }
  if (!daMo) {
    throw new Error(
      `Không tìm được biểu mẫu khớp "${input.maBieuMau020}" ở khối nào trên tab Chuẩn bị xét xử — ` +
        `xem các danh sách đã in ở trên ("05 020 · tìm mẫu")`,
    );
  }
  await nghi(page, 1200, 2000);

  const bm = bieuMauDangMo(page);
  await expect(bm, 'Không mở được biểu mẫu 020').toBeVisible({ timeout: 30_000 });
  for (const d of await moTaForm(bm)) ghi('05 020 · ô', d);
  ghi('05 020 · nút', await dsNut(bm));

  // Người ký phải là tài khoản đang chạy, không thì nút ký thành "Trình ký" và quyết định treo
  const nguoiKy = await dienOTheoNhan(page, bm, /Người ký/i, input.nguoiKy, true).catch((e: Error) => {
    ghi('05 020', `không đặt được Người ký: ${e.message.slice(0, 120)}`);
    return '';
  });
  if (nguoiKy) ghi('05 020', `Người ký = ${nguoiKy}`);

  /**
   * Thời gian / địa điểm mở phiên tòa nhập ngay trong biểu mẫu. Ngày lấy tất định (hôm nay + 14),
   * đẩy sang thứ Hai nếu rơi Chủ nhật — spec yêu cầu ngày làm việc trong 30 ngày tới.
   */
  let ngay = ngaySau(14);
  const [d, m, y] = ngay.split('/').map(Number);
  if (new Date(y, m - 1, d).getDay() === 0) ngay = ngaySau(15);

  for (const [nhan, giaTri] of [
    [/Ngày mở phiên t/i, ngay],
    [/Giờ mở phiên t/i, input.gioBatDauXetXu],
    [/Tính chất phiên t/i, input.tinhChatPhienToa],
    [/Hình thức xét xử/i, input.hinhThucXetXu],
    [/Địa điểm/i, input.diaDiemXetXu],
  ] as [RegExp, string | undefined][]) {
    const gt = await dienOTheoNhan(page, bm, nhan, giaTri).catch(async (e: Error) => {
      await page.keyboard.press('Escape').catch(() => {});
      ghi('05 020', `không điền được ${String(nhan)}: ${e.message.slice(0, 110)}`);
      return '';
    });
    if (gt) ghi('05 020', `${String(nhan)} = ${gt}`);
    await choHetSpin(page);
  }

  if (!(await luuBieuMau(page, bm, '020 (đưa vụ án ra xét xử)', ghi))) {
    throw new Error(`020: không thấy nút "Lưu". Nút đang có: ${await dsNut(bm)}`);
  }
  await laySoVaKyLogic(page, bm, ghi, '020 (đưa vụ án ra xét xử)');

  const soQuyetDinh020 = (await oTheoNhan(page, bm, /^Số quyết định/).inputValue().catch(() => '')).trim();
  if (!soQuyetDinh020) {
    throw new Error(
      `020: đã lưu nhưng không đọc được số quyết định — ${await nguyenNhanLoi(page, bm, 30_000)}`,
    );
  }
  ghi('05 020', `số quyết định ${soQuyetDinh020} · ngày mở phiên tòa đã nhập ${ngay}`);
  await dongBieuMau(page, bm);
  return { soQuyetDinh020, ngayMoPhienToaDuKien: ngay };
}

// ═════════ BƯỚC 06 · Lịch xét xử do ký 020 sinh ra ═════════
/**
 * Không tạo lịch — chỉ KIỂM lịch hệ thống đã sinh. Bằng chứng là dòng lịch trên tab Xét xử, không
 * phải "đã bấm nút nào".
 */
export async function moPhienToa(page: Page, input: DuLieuVao, ghi: GhiChu) {
  await moTabVaCho(page, 'Xét xử', ghi, /Thủ tục mở phiên to|Kết quả xét xử/i);
  await moKhoi(page, /Thủ tục mở phiên to/, ghi);
  await nghi(page, 1500, 2500);

  const khoi = khoiTheoTieuDe(page, /Thủ tục mở phiên to/i);
  const chu = (await khoi.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
  ghi('06 lịch xét xử · khối', chu.slice(0, 300) || '(rỗng)');

  const ngayMoPhienToa = /(\d{2}\/\d{2}\/\d{4})/.exec(chu)?.[1] || '';
  if (!ngayMoPhienToa) {
    throw new Error(
      `Ký 020 xong nhưng khối "Thủ tục mở phiên toà" không có lịch nào.\n  ` +
        `Khối đang hiện: ${chu.slice(0, 300) || '(rỗng)'}\n  ${await nguyenNhanLoi(page)}`,
    );
  }
  ghi('06 lịch xét xử', `lịch do hệ thống sinh: ngày ${ngayMoPhienToa}`);
  return { ngayMoPhienToa };
}
