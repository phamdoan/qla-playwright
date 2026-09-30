/**
 * FLOW-001 · nghiệp vụ bước 11 — Vụ án sơ thẩm, tab "Xét xử".
 *
 * Nguồn nghiệp vụ: StepData_KinhDoanhThuongMai_VuAn · Step6.1–6.3.
 *
 * ĐO THẬT 30/09/2026 (người dùng xác nhận bằng ảnh màn hình): tab "Xét xử" có hai khối
 *   ① "Bản án sơ thẩm"                — nút "+ Tạo bản án"        (bước 12)
 *   ② "Quyết định của Hội đồng xét xử" — nút "+ Thêm mới quyết định" (bước 11)
 * Hai khối này KHÔNG dùng `.ant-card`/`.ant-collapse-item` nên không tìm được bằng
 * `khoiTheoTieuDe` như các tab khác — phải neo theo TIÊU ĐỀ + NÚT (xem `khoiTheoTieuDeVaNut`).
 *
 * Danh mục của ② chỉ có 2 mục và ô chọn ĐÃ ĐIỀN SẴN "Biên bản phiên tòa sơ thẩm (48-DS)":
 *   · Biên bản phiên tòa sơ thẩm (48-DS)
 *   · Quyết định buộc rời khỏi phòng xử án (phòng họp)
 * 51-DS chưa có trong danh mục ở thời điểm chưa lập 48-DS — kỳ vọng hiện ra sau khi ký 48-DS.
 *
 * Mã biểu mẫu ở khối này CÓ dấu gạch ("48-DS"), khác với danh mục tab Chuẩn bị xét xử ("32DS").
 */
import path from 'node:path';
import { Locator, Page, expect, test } from '@playwright/test';
import { choHetSpin, chonSelect, dienOTheoNhan, hienTrong, moTaForm, nghi, nguyenNhanLoi } from '../../../common/antd';
import { datGioTrongPanel } from './chuan-bi-xet-xu.flow';
import {
  bieuMauDangMo,
  dongBieuMau,
  laySoVaKyLogic,
  luuBieuMau,
  moTab,
  themBieuMauTuDanhSach,
} from '../../../common/bieu-mau';
import type { INPUT } from '../../../data/kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/case-001/input';

type DuLieuVao = typeof INPUT;
type GhiChu = (khoa: string, giaTri: string) => void;

/**
 * Khối KHÔNG phải ant-card: neo bằng "thẻ nào vừa chứa tiêu đề vừa chứa nút thao tác".
 * `.last()` lấy thẻ SÂU NHẤT khớp cả hai (Playwright trả theo thứ tự DOM, tổ tiên đứng trước),
 * nhờ vậy không vớ phải cả trang.
 */
function khoiTheoTieuDeVaNut(page: Page, tieuDe: RegExp, tenNut: RegExp): Locator {
  return page
    .locator('div')
    .filter({ hasText: tieuDe })
    .filter({ has: page.getByRole('button', { name: tenNut }) })
    .last();
}

/** Điền ô soạn thảo (contenteditable của trình soạn thảo, hoặc textarea thường) */
async function dienNoiDung(page: Page, bm: Locator, chu: string, ghi: GhiChu, nhan: string): Promise<boolean> {
  const soanThao = bm.locator('[contenteditable="true"]').first();
  if (await hienTrong(soanThao, 3_000)) {
    await soanThao.click();
    await soanThao.fill('').catch(async () => {
      await page.keyboard.press('Control+A');
      await page.keyboard.press('Delete');
    });
    await page.keyboard.insertText(chu);
    await nghi(page, 300, 500);
    ghi(nhan, `nội dung: ${chu.slice(0, 60)}…`);
    return true;
  }
  const vung = bm.locator('textarea').first();
  if (await hienTrong(vung, 3_000)) {
    await vung.fill(chu);
    ghi(nhan, `nội dung (textarea): ${chu.slice(0, 60)}…`);
    return true;
  }
  return false;
}

/**
 * Điền một Ô CHỮ DÀI theo NHÃN — ô có thể là trình soạn thảo (`contenteditable`) hoặc textarea.
 *
 * Vì sao tách riêng: `dienOTheoNhan` chỉ tìm `input, textarea`; gặp ô soạn thảo thì locator rỗng và
 * `isEditable()` treo đủ 30 giây rồi ném `locator.evaluate: Timeout` — không nói được ô nào hỏng.
 */
async function dienOChuDai(page: Page, bm: Locator, nhan: RegExp, chu: string): Promise<boolean> {
  const oForm = bm
    .locator('.ant-form-item')
    .filter({ has: page.locator('label').filter({ hasText: nhan }) })
    .first();
  // Ô chữ dài của bản án KHÔNG bọc trong .ant-form-item — lùi về thẻ chứa đúng nhãn đó
  const khung = (await oForm.count())
    ? oForm
    : bm
        .locator('div')
        .filter({ hasText: nhan })
        .filter({ has: page.getByRole('button', { name: /bấm để soạn thảo/i }) })
        .last();
  if (!(await hienTrong(khung, 5_000))) return false;

  /**
   * Dạng 1 — Ô là một NÚT "… — bấm để soạn thảo" (đo 30/09/2026 với "Nội dung vụ án",
   * "Nhận định của Tòa án", "Nội dung quyết định" của bản án 52-DS). Bấm nút mới mở trình soạn
   * thảo trong một lớp riêng; soạn xong phải bấm nút lưu của lớp đó, không thì chữ không vào form.
   */
  const nutSoan = khung.getByRole('button', { name: /bấm để soạn thảo/i }).first();
  if (await hienTrong(nutSoan, 3_000)) {
    await nutSoan.click();
    await choHetSpin(page);
    /**
     * Neo lớp soạn thảo theo CHÍNH NÚT LƯU CỦA NÓ, không dùng "lớp đang mở ngoài cùng":
     * drawer soạn thảo mở kèm lớp phủ, và trong lúc nó còn animate thì `bieuMauDangMo` trả về
     * biểu mẫu 52-DS bên dưới → click rơi vào textarea của form cũ rồi bị chính lớp phủ chặn
     * ("ant-drawer-mask … intercepts pointer events", đo 30/09/2026).
     */
    const lop = page
      .locator('.ant-drawer-content:visible, .ant-modal-content:visible')
      .filter({ has: page.getByRole('button', { name: /Lưu bản soạn thảo/i }) })
      .last();
    await expect(lop, `Bấm soạn thảo "${nhan}" nhưng không mở được lớp soạn thảo`).toBeVisible({
      timeout: 30_000,
    });
    const o = lop.locator('[contenteditable="true"], textarea').first();
    await expect(o, `Bấm soạn thảo "${nhan}" nhưng không mở được ô nhập`).toBeVisible({ timeout: 30_000 });
    await o.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Delete');
    await page.keyboard.insertText(chu);
    await nghi(page, 300, 500);

    const nutLuu = lop.getByRole('button', { name: /Lưu bản soạn thảo|^(Lưu|Xong|Đồng ý|Cập nhật|OK)$/i }).first();
    if (!(await hienTrong(nutLuu, 5_000))) {
      const ds = (await lop.getByRole('button').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim());
      throw new Error(`Lớp soạn thảo "${nhan}" không có nút lưu. Nút đang có: ${ds.join(' | ')}`);
    }
    await nutLuu.click();
    await choHetSpin(page);

    /**
     * PHẢI ĐÓNG lớp soạn thảo. Nó KHÔNG tự đóng sau khi lưu, mà `bieuMauDangMo` luôn trỏ vào lớp
     * ngoài cùng — để nguyên thì mọi thao tác sau đó lạc sang lớp soạn thảo và biểu mẫu bản án
     * trơ ra "không thấy ô …" (đo 30/09/2026: mất cả Ngày bản án, Người ký, Tóm tắt, kết quả
     * từng yêu cầu, rồi bảng bản án rỗng).
     */
    const conMo = page
      .locator('.ant-modal-content:visible, .ant-drawer-content:visible')
      .filter({ has: page.getByRole('button', { name: /Lưu bản soạn thảo/i }) });
    if (await conMo.count()) {
      const dong = conMo
        .first()
        .locator('button[aria-label="Close"], .ant-modal-close, .ant-drawer-close')
        .first();
      if (await hienTrong(dong, 3_000)) await dong.click();
      else await conMo.first().getByRole('button', { name: /^Đóng$/ }).first().click().catch(() => {});
      await choHetSpin(page);
      await expect(conMo, `Lưu xong "${nhan}" nhưng lớp soạn thảo không đóng`).toHaveCount(0, {
        timeout: 15_000,
      });
    }
    return true;
  }

  // Dạng 2 — ô soạn thảo nằm thẳng trong form
  const soanThao = khung.locator('[contenteditable="true"]').first();
  if (await hienTrong(soanThao, 3_000)) {
    await soanThao.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Delete');
    await page.keyboard.insertText(chu);
    await nghi(page, 300, 500);
    return true;
  }
  const vung = khung.locator('textarea, input').first();
  if (!(await hienTrong(vung, 3_000))) return false;
  await vung.fill(chu);
  return true;
}

/**
 * Chọn một mục của antd Select NẰM TRONG BẢNG.
 *
 * Không dùng `chonSelect` được: nó cuộn tới thẻ `.ant-select` cha bằng `evaluate`, và với ô trong
 * bảng thì bước đó treo đủ 30 giây rồi ném `locator.evaluate: Timeout` (đo 30/09/2026 ở ô
 * "Chọn kết quả" của bản án 52-DS). Ở đây bấm thẳng ô, đọc danh sách đang mở, đi bằng bàn phím.
 */
async function chonMucTrongDropdown(page: Page, o: Locator, giaTri: string, ten: string) {
  await o.click({ force: true });
  const muc = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option');
  await expect(muc.first(), `Bấm ô "${ten}" nhưng danh sách không mở`).toBeVisible({ timeout: 15_000 });

  const ds = (await muc.allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim());
  const i = ds.findIndex(x => x.toLowerCase().includes(giaTri.toLowerCase()));
  if (i < 0) throw new Error(`Ô "${ten}" không có mục khớp "${giaTri}". Đang có: ${ds.join(' | ') || '(rỗng)'}`);
  for (let k = 0; k < i; k++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await nghi(page);
}

interface ThamSoQuyetDinhHdxx {
  /** Khớp DÒNG trong bảng — cột "Tên quyết định" hiện tên đầy đủ, không có mã */
  ma: RegExp;
  /** CHUỖI gõ vào ô chọn để lọc — ở khối này mã CÓ dấu gạch, vd. '48-DS' */
  maTim: string;
  ten: string;
  noiDung: string;
  /** Ô bắt buộc điền theo NHÃN (text, ngày, select) — giá trị lấy từ dữ liệu gieo */
  oBatBuoc?: [RegExp, string][];
  /** Ô GIỜ: phải chọn trong panel rồi bấm OK, gõ tay không commit */
  oGio?: [RegExp, string][];
}

/**
 * Biên bản HĐXX ký GIẤY: nút "Xác nhận đã ký" bị KHOÁ cho tới khi tải lên bản scan
 * ("Kéo thả hoặc bấm để chọn tệp (PDF/ảnh scan bản ký giấy)" — đo 30/09/2026).
 */
async function taiBanScanNeuCan(page: Page, bm: Locator, ghi: GhiChu, ten: string) {
  const nut = bm.getByRole('button', { name: /Xác nhận đã ký/i }).first();
  if (!(await hienTrong(nut, 3_000))) return; // biểu mẫu ký số, không cần bản scan
  if (await nut.isEnabled().catch(() => false)) return;

  const oTep = bm.locator('input[type="file"]').first();
  if (!(await oTep.count())) {
    ghi(ten, 'nút "Xác nhận đã ký" đang khoá mà biểu mẫu không có ô tải tệp');
    return;
  }
  await oTep.setInputFiles(path.resolve(__dirname, '../../../data/bien-ban-da-ky.pdf'));
  await choHetSpin(page);
  await nghi(page, 1500, 2500);
  ghi(ten, `đã tải bản scan — nút "Xác nhận đã ký" bật? ${await nut.isEnabled().catch(() => '?')}`);
}

/** Bảng "Danh sách quyết định" của khối Hội đồng xét xử (khác bảng ở tab Chuẩn bị xét xử) */
function bangHdxx(page: Page): Locator {
  return khoiTheoTieuDeVaNut(page, /Quyết định của Hội đồng xét xử/i, /Thêm mới quyết định/i);
}

function dongQuyetDinh(page: Page, ma: RegExp): Locator {
  return bangHdxx(page).locator('.ant-table-row').filter({ hasText: ma }).first();
}

async function daCoQuyetDinh(page: Page, ma: RegExp): Promise<string> {
  const dong = dongQuyetDinh(page, ma);
  if (!(await hienTrong(dong, 3_000))) return '';
  return (await dong.innerText()).replace(/\s+/g, ' ').trim();
}

/**
 * Mở lại một quyết định ĐÃ LẬP NHƯNG CHƯA KÝ rồi ký nốt.
 *
 * Vì sao cần: 51-DS chỉ xuất hiện trong danh mục sau khi 48-DS có hiệu lực. Lượt chạy hỏng giữa
 * chừng để lại 48-DS ở trạng thái "Chưa có hiệu lực" — chạy lại mà chỉ bỏ qua vì "đã có" thì
 * luồng kẹt vĩnh viễn (đo 30/09/2026).
 */
async function kyTiepQuyetDinh(page: Page, ghi: GhiChu, ma: RegExp, ten: string): Promise<string> {
  const dong = dongQuyetDinh(page, ma);
  // Cột "Thao tác" là ICON chứ không phải nút: `img "eye"` (xem) và `img "file-pdf"`
  // (đo 30/09/2026 trên cây trợ năng) — `getByRole('button')` trên dòng trả về 0.
  const mat = dong.getByRole('img', { name: 'eye' }).first();
  if (await hienTrong(mat, 5_000)) {
    await mat.click();
  } else {
    const nhan = (await dong.getByRole('img').evaluateAll(ds => ds.map(el => el.getAttribute('aria-label')))).join(
      ' | ',
    );
    throw new Error(`Dòng ${ten} không có icon "eye" để mở. Icon đang có: ${nhan || '(không có)'}`);
  }
  await choHetSpin(page);
  await nghi(page, 1000, 1500);

  const bm = bieuMauDangMo(page);
  if (!(await bm.isVisible().catch(() => false))) {
    throw new Error(`Không mở lại được ${ten} để ký — bấm thao tác trên dòng nhưng không có biểu mẫu nào mở ra`);
  }
  await taiBanScanNeuCan(page, bm, ghi, ten);
  await laySoVaKyLogic(page, bm, ghi, ten);
  await dongBieuMau(page, bm);
  await choHetSpin(page);
  await moTab(page, 'Xét xử');
  return await daCoQuyetDinh(page, ma);
}

/** Lập một quyết định của HĐXX: chọn loại → Thêm mới quyết định → nhập nội dung → Lưu → Ký → Đóng */
async function lapQuyetDinhHdxx(page: Page, ghi: GhiChu, opt: ThamSoQuyetDinhHdxx): Promise<string> {
  const daCo = await daCoQuyetDinh(page, opt.ma);
  if (daCo) {
    ghi(opt.ten, `đã có ở lượt trước: ${daCo}`);
    if (!/Chưa có hiệu lực/i.test(daCo)) return daCo;
    ghi(opt.ten, 'dòng đang "Chưa có hiệu lực" → mở lại để ký nốt');
    return await kyTiepQuyetDinh(page, ghi, opt.ma, opt.ten);
  }

  const khoi = bangHdxx(page);
  await expect(khoi, 'Tab "Xét xử" không có khối "Quyết định của Hội đồng xét xử"').toBeVisible({
    timeout: 30_000,
  });

  const bm = await themBieuMauTuDanhSach(page, khoi, opt.maTim, /Thêm mới quyết định/i);
  await expect(bm, `Không mở được biểu mẫu ${opt.ten}`).toBeVisible({ timeout: 60_000 });
  await choHetSpin(page);

  await test.step(`Nhập nội dung ${opt.ten}`, async () => {
    const xong = await dienNoiDung(page, bm, opt.noiDung, ghi, opt.ten);
    if (!xong) ghi(opt.ten, 'không thấy ô soạn thảo nào — biểu mẫu có thể chỉ gồm ô chọn');

    // Ô chữ/ngày trước, ô GIỜ sau cùng: panel chọn giờ còn mở sẽ nuốt cú click kế tiếp.
    for (const [nhan, giaTri] of opt.oBatBuoc ?? []) {
      const gt = await dienOTheoNhan(page, bm, nhan, giaTri).catch((e: Error) => {
        ghi(opt.ten, `không điền được ${String(nhan)}: ${e.message.slice(0, 90)}`);
        return '';
      });
      if (gt) ghi(`${opt.ten} · ${String(nhan)}`, gt);
      await choHetSpin(page);
    }
    for (const [nhan, gio] of opt.oGio ?? []) {
      const o = bm.getByRole('textbox', { name: nhan }).first();
      ghi(`${opt.ten} · ${String(nhan)}`, await datGioTrongPanel(page, o, gio, String(nhan)));
    }
    // Soi cả form để biết còn ô bắt buộc nào chưa điền, thay vì chờ mù toast rồi hết giờ
    for (const d of await moTaForm(bm)) ghi(`${opt.ten} · ô`, d);
  });

  await luuBieuMau(page, bm, opt.ten, ghi);
  await taiBanScanNeuCan(page, bm, ghi, opt.ten);
  await laySoVaKyLogic(page, bm, ghi, opt.ten);

  if (await bm.isVisible().catch(() => false)) {
    const loi = await nguyenNhanLoi(page, bm);
    if (!/không đọc được/.test(loi)) ghi(`${opt.ten} · sau khi lưu`, loi);
  }
  await dongBieuMau(page, bm);
  await choHetSpin(page);
  await moTab(page, 'Xét xử');

  const dong = await daCoQuyetDinh(page, opt.ma);
  if (!dong) {
    const ds = (await bangHdxx(page).locator('.ant-table-row').allInnerTexts())
      .map(s => s.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    throw new Error(
      `Lập ${opt.ten} xong nhưng không thấy dòng khớp ${opt.ma} trong bảng HĐXX. ` +
        `Bảng đang có ${ds.length} dòng: ${ds.slice(0, 6).join(' // ') || '(rỗng)'}`,
    );
  }
  ghi(opt.ten, dong);
  return dong;
}

// ═════════ BƯỚC 11 · Biên bản phiên tòa sơ thẩm (48-DS) → Biên bản nghị án (51-DS) ═════════
export async function soThamBienBanPhienToa(
  page: Page,
  input: DuLieuVao,
  ghi: GhiChu,
  /** dd/mm/yyyy — ngày mở phiên tòa do bước 10 sinh; nghị án diễn ra cùng ngày */
  ngayMoPhienToa: string,
) {
  await moTab(page, 'Xét xử');

  const soBienBan48DS = await lapQuyetDinhHdxx(page, ghi, {
    ma: /Biên bản phiên tòa sơ thẩm/i,
    maTim: '48-DS',
    ten: '48DS (biên bản phiên tòa sơ thẩm)',
    noiDung: input.noiDungBienBanPhienToaSoTham,
  });

  /**
   * 51-DS chưa chắc có trong danh mục.
   *
   * ĐO 30/09/2026: sau khi 48-DS chuyển "Hoàn thành", danh mục nở từ 2 lên 5 mục
   * (48-DS · buộc rời khỏi phòng xử án · 39-DS · 49-DS · 50-DS) — vẫn KHÔNG có "Biên bản nghị án
   * (51-DS)" như StepData Step6.3 mô tả. Không dựng số giả: ghi đúng những gì danh mục đang có để
   * bước sau và người đọc sổ cái biết luồng hụt ở đâu.
   */
  const soBienBan51DS = await lapQuyetDinhHdxx(page, ghi, {
    ma: /Biên bản nghị án/i,
    maTim: '51-DS',
    ten: '51DS (biên bản nghị án)',
    noiDung: input.noiDungBienBanNghiAn,
    oBatBuoc: [
      [/Ngày bắt đầu nghị án/i, ngayMoPhienToa],
      [/Ngày kết thúc nghị án/i, ngayMoPhienToa],
      [/Địa điểm nghị án/i, input.diaDiemNghiAn],
      [/Căn cứ nghị án/i, input.canCuNghiAn],
      [/Ý kiến thảo luận/i, input.yKienHoiDongXetXu],
    ],
    oGio: [
      [/Vào hồi \(giờ, phút\) bắt đầu nghị án/i, input.gioBatDauNghiAn],
      [/Vào hồi \(giờ, phút\) kết thúc nghị án/i, input.gioKetThucNghiAn],
    ],
  }).catch((e: Error) => {
    if (!/Danh mục không có mục/.test(e.message)) throw e;
    const lyDo = `KHÔNG lập được — ${e.message}`;
    ghi('51DS (biên bản nghị án)', lyDo);
    return lyDo;
  });

  return { soBienBan48DS, soBienBan51DS };
}

/** Khối ① "Bản án sơ thẩm" — nút "Tạo bản án" chỉ mở khi đã có 48-DS (StepData 6.4) */
export function khoiBanAnSoTham(page: Page): Locator {
  return khoiTheoTieuDeVaNut(page, /Bản án sơ thẩm/i, /Tạo bản án/i);
}

/**
 * Bảng "Bản án sơ thẩm" — neo theo CỘT "Số bản án", KHÔNG theo nút "Tạo bản án".
 * Lập xong bản án thì nút đó biến mất, neo theo nút là mất luôn bảng và phép kiểm cuối báo
 * "bảng vẫn không có dòng nào" dù bản án đã ký (đo 30/09/2026).
 */
function bangBanAn(page: Page): Locator {
  return page
    .locator('table')
    .filter({ has: page.getByRole('columnheader', { name: /Số bản án/i }) })
    .first();
}

// ═════════ BƯỚC 12 · Bản án sơ thẩm (52-DS) ═════════
/**
 * StepData Step6.4–6.7: khối "Bản án sơ thẩm" → "Tạo bản án" → popup
 * "Bản án sơ thẩm — soạn thảo (Mẫu 52-DS)" → "Thêm mới bản án" → "Lấy số" → "Ký logic" → "Đóng".
 *
 * Mỗi vụ án chỉ có TỐI ĐA 01 bản án sơ thẩm (chính màn hình ghi vậy) — chạy lại phải nhận ra dòng
 * đã có thay vì lập thêm.
 *
 * @param ngayMoPhienToa dd/mm/yyyy, lấy từ state (`ngayMoPhienToaSoTham` do bước 10 sinh) —
 *        StepData 6.5 yêu cầu "Ngày bản án" = ngày mở phiên tòa ở 47-DS.
 */
export async function soThamBanAn(page: Page, input: DuLieuVao, ghi: GhiChu, ngayMoPhienToa: string) {
  await moTab(page, 'Xét xử');

  const dongCu = bangBanAn(page).locator('.ant-table-row').first();
  if (await hienTrong(dongCu, 3_000)) {
    const dong = (await dongCu.innerText()).replace(/\s+/g, ' ').trim();
    ghi('bản án sơ thẩm', `đã có ở lượt trước: ${dong}`);
    if (!/Chưa có hiệu lực/i.test(dong)) return docBangChungBanAn(page, ghi, dong, input, ngayMoPhienToa);
  }

  const nutTao = khoiBanAnSoTham(page).getByRole('button', { name: /Tạo bản án/i }).first();
  if (!(await nutTao.isEnabled().catch(() => false))) {
    throw new Error(
      'Nút "Tạo bản án" đang khoá — StepData 6.4 nói nút chỉ mở khi đã có 48-DS. ' +
        'Kiểm lại bước 11: biên bản phiên tòa sơ thẩm phải ở trạng thái "Hoàn thành".',
    );
  }
  await nutTao.click();
  await choHetSpin(page);

  const bm = bieuMauDangMo(page);
  await expect(bm, 'Bấm "Tạo bản án" nhưng không mở được popup soạn thảo bản án').toBeVisible({
    timeout: 60_000,
  });
  // Soi cả form trước khi điền: biết ngay ô nào bắt buộc thay vì chờ mù rồi hết giờ
  for (const d of await moTaForm(bm)) ghi('bản án · ô', d);

  /**
   * "Nội dung vụ án" và "Nhận định của Tòa án" là TRÌNH SOẠN THẢO (contenteditable), không phải
   * input — `dienOTheoNhan` đi tìm `input, textarea` rồi treo 30s ở `locator.evaluate`
   * (đo 30/09/2026). Điền riêng bằng `dienOChuDai`.
   */
  for (const [nhan, chu] of [
    [/Nội dung vụ án/i, input.noiDungBanAnSoTham],
    [/Nhận định của Tòa án/i, input.nhanDinhBanAnSoTham],
  ] as [RegExp, string][]) {
    const xong = await dienOChuDai(page, bm, nhan, chu);
    ghi('bản án', `${String(nhan)} ${xong ? '= ' + chu.slice(0, 50) + '…' : 'KHÔNG điền được'}`);
    await choHetSpin(page);
  }

  for (const [nhan, giaTri] of [
    [/Ngày bản án/i, ngayMoPhienToa],
    [/Người ký/i, undefined],
    [/Tóm tắt/i, input.tomTatBanAnSoTham],
  ] as [RegExp, string | undefined][]) {
    const gt = await dienOTheoNhan(page, bm, nhan, giaTri).catch((e: Error) => {
      ghi('bản án', `không điền được ${String(nhan)}: ${e.message.slice(0, 90)}`);
      return '';
    });
    if (gt) ghi('bản án', `${String(nhan)} = ${gt}`);
    await choHetSpin(page);
  }

  /**
   * Card "Kết quả giải quyết theo yêu cầu" — mỗi yêu cầu của đương sự một ô "Chọn kết quả",
   * đều BẮT BUỘC ("Vui lòng chọn Kết quả giải quyết cho tất cả yêu cầu của đương sự").
   * Ô không có nhãn `<label>` nên phải neo theo chữ gợi ý; chọn xong chữ đó biến mất, vì vậy
   * luôn lấy ô CÒN TRỐNG đầu tiên chứ không duyệt theo chỉ số.
   */
  const oKetQua = bm.locator('.ant-select').filter({ hasText: /Chọn kết quả/ });
  // Đếm lại MỖI VÒNG: form vẽ lại sau khi lưu bản soạn thảo, lấy `.first()` theo số đếm cũ thì
  // locator rỗng và `chonSelect` treo 30s ở `locator.evaluate` (đo 30/09/2026).
  await oKetQua.first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
  let daChon = 0;
  for (let vong = 0; vong < 10; vong++) {
    if (!(await oKetQua.count())) break;
    await chonMucTrongDropdown(
      page,
      oKetQua.first().locator('[role="combobox"]').first(),
      input.ketQuaTungYeuCau,
      'Chọn kết quả',
    );
    await choHetSpin(page);
    daChon++;
  }
  ghi('bản án', `kết quả "${input.ketQuaTungYeuCau}" cho ${daChon} yêu cầu của đương sự`);

  await luuBieuMau(page, bm, 'bản án sơ thẩm (52-DS)', ghi, /Thêm mới bản án|^Lưu$/);
  await taiBanScanNeuCan(page, bm, ghi, 'bản án sơ thẩm (52-DS)');
  await laySoVaKyLogic(page, bm, ghi, 'bản án sơ thẩm (52-DS)');
  await dongBieuMau(page, bm);
  await choHetSpin(page);
  await moTab(page, 'Xét xử');

  const dong = await bangBanAn(page)
    .locator('.ant-table-row')
    .first()
    .innerText()
    .then(s => s.replace(/\s+/g, ' ').trim())
    .catch(() => '');
  if (!dong) throw new Error('Lập bản án xong nhưng bảng "Bản án sơ thẩm" vẫn không có dòng nào');
  return docBangChungBanAn(page, ghi, dong, input, ngayMoPhienToa);
}

/** Bằng chứng của bước 12 — ba khoá này là đầu vào BẮT BUỘC của giai đoạn GĐT/TT (bước 24) */
function docBangChungBanAn(
  page: Page,
  ghi: GhiChu,
  dong: string,
  input: DuLieuVao,
  ngayMoPhienToa: string,
) {
  // Cột "Số bản án" nằm trong chuỗi dòng; lấy dạng đầy đủ <số>/<năm>/<ký hiệu>
  const so = dong.match(/\d+\/\d{4}\/[A-ZĐ-]+/)?.[0] || '';
  if (!so) throw new Error(`Không đọc được số bản án từ dòng bảng: ${dong}`);
  const ngay = dong.match(/\d{2}\/\d{2}\/\d{4}/)?.[0] || ngayMoPhienToa;
  ghi('bản án sơ thẩm', dong);
  return { soBanAnSoTham: so, ngayBanAnSoTham: ngay, toaRaBanAnSoTham: input.toaRaBanAnSoTham };
}
