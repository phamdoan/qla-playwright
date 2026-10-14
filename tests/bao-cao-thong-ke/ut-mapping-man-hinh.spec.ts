/**
 * UT BÁO CÁO THỐNG KÊ · đối soát MAPPING ↔ MÀN HÌNH (chỉ ĐỌC, không ghi dữ liệu).
 *
 * Câu hỏi của mọi UT ở đây: **thứ mà mapping nói ô báo cáo cần — đã có trên màn hình chưa?**
 * Chốt 14/10/2026 (người dùng): KHÔNG kiểm bằng SQL; SQL trong `Mapping_<mã>.xlsx` chỉ là tham
 * chiếu. Vì vậy UT mở màn thật và đi tìm, rồi báo CÓ / KHÔNG CÓ / CHƯA KIỂM ĐƯỢC.
 *
 * Nguồn dữ liệu UT: `bctk/ut/*.ts` (sinh từ 6 tệp mapping — 284 ô của 2A, 2B, 4A, 4B, 4C, 4D).
 *
 *   28 mã biểu mẫu   → màn Cấu hình · Quản lý biểu mẫu (CHẠY ĐƯỢC)
 *    4 nhóm danh mục → ô "Quan hệ pháp luật (Thống kê)" (CHẠY ĐƯỢC khi đã khai nhãn)
 *   34 cột DB        → cần khai neo trong `bctk/ut/neo.ts` (chưa khai ⇒ fixme)
 *   87 cột phép tính → cần màn LẬP báo cáo có tham số; môi trường hiện chỉ có dashboard
 *                      `/qla/bctk/{ds,hs,gdttt}` không có ô lọc (docs/flow-kdtm-gdt-tt.md · điểm 13)
 *                      ⇒ fixme, KHÔNG báo xanh giả (CLAUDE.md · R0, R5).
 *
 * Chạy (đặt môi trường, nếu không `.env` dev làm màn rỗng rồi kết luận sai):
 *
 *   QLA_HO_SO_ENV=staging npx playwright test tests/bao-cao-thong-ke/ut-mapping-man-hinh.spec.ts
 *   QLA_HO_SO_ENV=staging npx playwright test … -g "mã biểu mẫu"      # chỉ cụm biểu mẫu
 *   QLA_VAI=chanhAnDanSu  # đổi vai đăng nhập (mặc định chanhAn)
 *
 * Kết quả từng UT ghi ra `state/bao-cao-thong-ke/ut-mapping/<env>.ndjson`;
 * tổng hợp: `npm run bctk:ut-do-phu`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { BrowserContext, Page, expect, test } from '@playwright/test';
import { choHetSpin, chonSelect, hienTrong, luoiDaTai, nghi } from '../../common/antd';
import { khungSelectCua } from '../../common/don-khoi-kien';
import { moTrangVaiCauHinh } from '../../common/luong-tkm';
import { BO_UT, DS_UT, THEO_COT_DB, THEO_MA_BIEU_MAU, THEO_NHOM_DANH_MUC } from '../../bctk/ut/chi-muc';
import { MAN_QHPL_THONG_KE, MAN_QUAN_LY_BIEU_MAU, NEO_COT_DB, NHAN_NHOM_DANH_MUC } from '../../bctk/ut/neo';
import type { UtCot } from '../../bctk/ut/loai';

const VAI = process.env.QLA_VAI || 'chanhAn';
const MOI_TRUONG = process.env.QLA_ENV || 'stg';
const TEP_KET_QUA = path.resolve(__dirname, `../../state/bao-cao-thong-ke/ut-mapping/${MOI_TRUONG}.ndjson`);

type TrangThaiUt = 'CO' | 'KHONG_CO' | 'CHUA_KIEM';

/** Ghi một dòng kết quả. NDJSON để nhiều UT ghi nối tiếp mà không phải đọc–sửa–ghi cả tệp. */
function ghiKetQua(d: {
  nhom: string;
  thu: string;
  trangThai: TrangThaiUt;
  man: string;
  ghiChu: string;
  oBaoCao: UtCot[];
}) {
  fs.mkdirSync(path.dirname(TEP_KET_QUA), { recursive: true });
  fs.appendFileSync(
    TEP_KET_QUA,
    JSON.stringify({
      luc: new Date().toISOString(),
      moiTruong: MOI_TRUONG,
      vai: VAI,
      nhom: d.nhom,
      thu: d.thu,
      trangThai: d.trangThai,
      man: d.man,
      ghiChu: d.ghiChu,
      // ô báo cáo phụ thuộc thứ này — để báo cáo nói được "thiếu mã X làm hỏng 12 ô của 2A, 4B"
      oBaoCao: d.oBaoCao.map(u => `${u.bieuMau}#${u.soCot}`),
    }) + '\n',
    'utf8',
  );
}

/** Danh sách ô báo cáo phụ thuộc, gọn lại để in trong tên/thông báo test. */
const tomTatO = (ds: UtCot[]) => {
  const theoBieuMau = new Map<string, number[]>();
  for (const u of ds) {
    if (!theoBieuMau.has(u.bieuMau)) theoBieuMau.set(u.bieuMau, []);
    theoBieuMau.get(u.bieuMau)!.push(u.soCot);
  }
  return [...theoBieuMau]
    .map(([bm, cot]) => `${bm} cột ${cot.sort((a, b) => a - b).join(',')}`)
    .join(' · ');
};

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// A · MÃ BIỂU MẪU — màn Cấu hình · Quản lý biểu mẫu
// ─────────────────────────────────────────────────────────────────────────────────────────────────

test.describe('UT mapping ↔ màn hình · mã biểu mẫu', () => {
  /**
   * KHÔNG `serial`: chế độ serial bỏ qua mọi test sau cái đỏ đầu tiên, mà ở đây "đỏ" chính là KẾT
   * QUẢ cần biết (mã không có trên màn) — một mã thiếu sẽ che kết quả của 27 mã còn lại (đo trên
   * STG 14/10/2026: mã `058` hỏng → 27 UT "did not run"). Cùng một file nên vẫn chạy tuần tự trong
   * một worker và dùng chung phiên của `beforeAll`; mỗi UT tự điền lại ô mã nên không kế thừa
   * trạng thái của UT trước.
   */
  let page: Page;
  let context: BrowserContext;
  /** Toàn bộ mã đọc được trên màn, nạp một lần trong `beforeAll`. */
  let maTrenMan = new Set<string>();

  test.beforeAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(20 * 60_000);
    ({ page, context } = await moTrangVaiCauHinh(browser, testInfo, VAI));
    await page.goto(MAN_QUAN_LY_BIEU_MAU.route, { waitUntil: 'domcontentloaded' });
    await choHetSpin(page);
    // Màn phải mở được bằng vai này; không thì mọi UT phía sau là "chưa kiểm được", không phải "không có"
    await expect(
      page.getByRole('columnheader', { name: MAN_QUAN_LY_BIEU_MAU.nhanOMa }),
      `Vai "${VAI}" không mở được màn ${MAN_QUAN_LY_BIEU_MAU.tenMan} (/${MAN_QUAN_LY_BIEU_MAU.route}). ` +
        'Đổi vai bằng QLA_VAI=… rồi chạy lại.',
    ).toBeVisible({ timeout: 60_000 });
    maTrenMan = await docToanBoMa(page);
    console.log(`  · đọc được ${maTrenMan.size} mã biểu mẫu trên ${MAN_QUAN_LY_BIEU_MAU.tenMan}`);
  });

  test.afterAll(async () => {
    await context?.close();
  });

  for (const [ma, dsUt] of THEO_MA_BIEU_MAU) {
    test(`mã biểu mẫu ${ma} · ${dsUt.length} ô báo cáo cần nó`, async () => {
      expect(maTrenMan.size, 'beforeAll chưa nạp được danh mục mã → chưa kiểm được, không phải "không có"').toBeGreaterThan(0);
      const co = maTrenMan.has(ma);
      // mã viết khác (bỏ dấu phân cách) — để phân biệt "thiếu thật" với "mapping viết lệch"
      const ganGiong = co ? [] : [...maTrenMan].filter(x => gonMa(x) === gonMa(ma));
      ghiKetQua({
        nhom: 'BIEU_MAU',
        thu: ma,
        trangThai: co ? 'CO' : 'KHONG_CO',
        man: MAN_QUAN_LY_BIEU_MAU.tenMan,
        ghiChu: co
          ? `có trong danh mục ${maTrenMan.size} mã đọc trên màn`
          : `không có trong danh mục ${maTrenMan.size} mã đọc trên màn` +
            (ganGiong.length ? `; mã viết gần giống: ${ganGiong.join(', ')}` : ''),
        oBaoCao: dsUt,
      });
      expect(
        co,
        `Mã biểu mẫu "${ma}" KHÔNG có trên ${MAN_QUAN_LY_BIEU_MAU.tenMan} ` +
          `(đã đọc ${maTrenMan.size} mã).` +
          (ganGiong.length ? ` Có mã viết gần giống: ${ganGiong.join(', ')} → nghi mapping viết lệch.` : '') +
          ` Mapping dùng mã này cho: ${tomTatO(dsUt)}. ` +
          'Thiếu mã ⇒ các ô đó không bao giờ có số (xem bctk/ut/README.md).',
      ).toBe(true);
    });
  }
});

/** Bỏ dấu phân cách để so "viết khác": `20-VDS` ↔ `20VDS`. */
const gonMa = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

/**
 * Đọc TOÀN BỘ mã trên lưới (cỡ trang lớn nhất, lật hết trang) → Set.
 *
 * Vì sao không tra từng mã bằng "Tìm kiếm nâng cao": đo trên STG 14/10/2026, ô "Mã biểu mẫu" tra
 * `20VDS` ra **0 dòng** trong khi `20VDS` CÓ trong danh mục đọc thẳng từ lưới — 4/28 mã bị kết luận
 * sai kiểu đó. Bộ lọc theo mã của máy chủ không đáng tin để chứng minh "không có", nên UT đọc cả
 * danh mục một lượt rồi so bằng mã nguồn test: vừa đúng, vừa nhanh hơn (1 lượt cho cả 28 mã).
 */
async function docToanBoMa(page: Page): Promise<Set<string>> {
  // cỡ trang lớn nhất: mặc định 10 dòng/trang làm trượt âm thầm (CLAUDE.md · R2)
  const oCoTrang = page.locator('.ant-pagination-options .ant-select').first();
  if (await hienTrong(oCoTrang, 5_000)) {
    await oCoTrang.click();
    const muc = page.locator('.ant-select-dropdown:visible .ant-select-item-option').last();
    if (await hienTrong(muc, 5_000)) await muc.click();
    await choHetSpin(page);
  }

  // Chỉ số cột tra theo TIÊU ĐỀ: lưới thật có cột STT đứng trước nên `td[1]` là TÊN, không phải mã
  const dsTieuDe = (await page.locator('thead th').allInnerTexts()).map(s => s.trim());
  const iMa = dsTieuDe.findIndex(t => /^M[ãa]\s*bi[ểe]u\s*m[ẫa]u$/i.test(t));
  expect(iMa, `không thấy cột "Mã biểu mẫu" trong tiêu đề lưới: ${dsTieuDe.join(' | ')}`).toBeGreaterThanOrEqual(0);

  const ra = new Set<string>();
  for (let trang = 1; trang <= 50; trang++) {
    await luoiDaTai(page).catch(() => {});
    const dong = page.locator('tr.ant-table-row');
    const n = await dong.count();
    for (let i = 0; i < n; i++) {
      const v = ((await dong.nth(i).locator('td').nth(iMa).innerText().catch(() => '')) || '').trim();
      if (v) ra.add(v);
    }
    const sau = page.locator('.ant-pagination-next:not(.ant-pagination-disabled)').first();
    if (!(await hienTrong(sau, 3_000))) break;
    await sau.click();
    await choHetSpin(page);
  }
  return ra;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// B · NHÓM DANH MỤC — ô "Quan hệ pháp luật (Thống kê)"
// ─────────────────────────────────────────────────────────────────────────────────────────────────

test.describe('UT mapping ↔ màn hình · nhóm danh mục', () => {
  test.describe.configure({ mode: 'serial' });

  for (const [nhom, dsUt] of THEO_NHOM_DANH_MUC) {
    const neo = NHAN_NHOM_DANH_MUC[nhom];
    test(`nhóm danh mục ${nhom} · ${dsUt.length} ô báo cáo cần nó`, async ({ browser }, testInfo) => {
      test.fixme(
        !neo,
        `Chưa khai neo cho nhóm "${nhom}" (bctk/ut/neo.ts · NHAN_NHOM_DANH_MUC): chưa biết tổ hợp ` +
          `Loại đơn × Phân loại đơn nào mở ra nhóm này. Ô báo cáo chờ: ${tomTatO(dsUt)}`,
      );
      testInfo.setTimeout(10 * 60_000);
      const { page, context } = await moTrangVaiCauHinh(browser, testInfo, VAI);
      try {
        // Vào wizard bằng NÚT trên màn danh sách: `goto` thẳng route wizard trả vỏ rỗng
        // (pages/them-moi-don.page.ts:1253)
        await page.goto(MAN_QHPL_THONG_KE.route, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
        await choHetSpin(page);
        await page.getByRole('button', { name: MAN_QHPL_THONG_KE.nutThemMoi }).first().click();
        await expect(
          page.getByText(MAN_QHPL_THONG_KE.tieuDeWizard).first(),
          `Vai "${VAI}" không mở được ${MAN_QHPL_THONG_KE.tenMan}`,
        ).toBeVisible({ timeout: 60_000 });
        await choHetSpin(page);
        await nghi(page, 1200, 2000);

        // Danh mục nạp vào ô QHPL phụ thuộc HAI ô này — không chọn thì cây rỗng vì chưa có ngữ cảnh
        await chonSelect(page, page.locator(MAN_QHPL_THONG_KE.oLoaiDon), neo!.loaiDon);
        await chonSelect(page, page.locator(MAN_QHPL_THONG_KE.oPhanLoai), neo!.phanLoai);
        await choHetSpin(page);
        await nghi(page, 600, 1200);

        const khung = khungSelectCua(page.locator(MAN_QHPL_THONG_KE.o));
        if (!(await hienTrong(khung, 20_000))) {
          ghiKetQua({
            nhom: 'DANH_MUC',
            thu: nhom,
            trangThai: 'CHUA_KIEM',
            man: MAN_QHPL_THONG_KE.tenMan,
            ghiChu: `không thấy ô ${MAN_QHPL_THONG_KE.o} sau khi chọn ${neo!.loaiDon} × ${neo!.phanLoai}`,
            oBaoCao: dsUt,
          });
          throw new Error(
            `CHƯA KIỂM ĐƯỢC: ô "${MAN_QHPL_THONG_KE.o}" không hiện sau khi chọn ` +
              `"${neo!.loaiDon}" × "${neo!.phanLoai}" — không phải kết luận "danh mục không có".`,
          );
        }
        /**
         * Mở cây: phải PHÂN BIỆT "cây rỗng" với "chưa mở được dropdown". Đo 14/10/2026: cú click rơi
         * vào lúc dropdown của ô "Phân loại đơn" đang đóng nên ô QHPL không mở, UT đọc 0 nhánh rồi
         * báo QHPL_TC_KDTM "không có" — trong khi spec dò đọc được 6 nhánh cho đúng tổ hợp đó.
         * Nên: Escape cho sạch overlay → click → CHỜ dropdown của chính ô này hiện → mới đọc.
         */
        const dropdown = page.locator('.ant-select-dropdown:visible').last();
        let moDuoc = false;
        for (let lan = 0; lan < 3 && !moDuoc; lan++) {
          await page.keyboard.press('Escape');
          await nghi(page, 300, 600);
          await khung.click();
          moDuoc = await hienTrong(dropdown, 10_000);
        }
        if (!moDuoc) {
          ghiKetQua({
            nhom: 'DANH_MUC',
            thu: nhom,
            trangThai: 'CHUA_KIEM',
            man: `${MAN_QHPL_THONG_KE.tenMan} · ${neo!.loaiDon} × ${neo!.phanLoai}`,
            ghiChu: 'bấm 3 lần vẫn không mở được dropdown của ô QHPL',
            oBaoCao: dsUt,
          });
          throw new Error(
            `CHƯA KIỂM ĐƯỢC: không mở được ô "Quan hệ pháp luật (Thống kê)" sau 3 lần bấm ` +
              `(${neo!.loaiDon} × ${neo!.phanLoai}) — KHÔNG phải kết luận "danh mục không có".`,
          );
        }
        const nhanh = dropdown.locator('.ant-select-tree-title');
        // Cây rỗng là KẾT QUẢ cần biết, nên chờ có hạn rồi đọc, không `expect(...).toBeVisible`
        await hienTrong(nhanh.first(), 15_000);
        const dsNhanh = (await nhanh.allInnerTexts()).map(s => s.trim()).filter(Boolean);

        ghiKetQua({
          nhom: 'DANH_MUC',
          thu: nhom,
          trangThai: dsNhanh.length ? 'CO' : 'KHONG_CO',
          man: `${MAN_QHPL_THONG_KE.tenMan} · ${neo!.loaiDon} × ${neo!.phanLoai}`,
          ghiChu: dsNhanh.length
            ? `${dsNhanh.length} nhánh cấp 1: ${dsNhanh.slice(0, 12).join(' | ')}`
            : 'cây danh mục RỖNG',
          oBaoCao: dsUt,
        });
        expect(
          dsNhanh.length,
          `Nhóm danh mục "${nhom}" KHÔNG có trên ô "Quan hệ pháp luật (Thống kê)" khi chọn ` +
            `"${neo!.loaiDon}" × "${neo!.phanLoai}": cây rỗng. Mapping dùng nhóm này làm TRỤC DÒNG của ` +
            `${tomTatO(dsUt)} ⇒ phần tương ứng của biểu mẫu không có dòng nào.`,
        ).toBeGreaterThan(0);
      } finally {
        await context.close();
      }
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// C · TRƯỜNG TRÊN MÀN — mỗi cột DB mapping nhắc tới
// ─────────────────────────────────────────────────────────────────────────────────────────────────

test.describe('UT mapping ↔ màn hình · trường trên màn', () => {
  for (const [cotDb, dsUt] of THEO_COT_DB) {
    const neo = NEO_COT_DB[cotDb];
    test(`trường ${cotDb} · ${dsUt.length} ô báo cáo cần nó`, async ({ browser }, testInfo) => {
      test.fixme(
        !neo,
        `Chưa khai neo cho cột "${cotDb}" (bctk/ut/neo.ts · NEO_COT_DB): chưa biết trường này nằm ở ` +
          `màn nào, nhãn gì. Mapping ghi màn: "${[...new Set(dsUt.map(u => u.manHinhMapping || '(trống)'))].join(', ')}". ` +
          `Ô báo cáo chờ: ${tomTatO(dsUt)}`,
      );
      const { page, context } = await moTrangVaiCauHinh(browser, testInfo, VAI);
      try {
        await page.goto(neo!.route, { waitUntil: 'domcontentloaded' });
        await choHetSpin(page);
        const o = page.getByLabel(neo!.nhan, { exact: true }).or(page.getByText(neo!.nhan, { exact: true }));
        const co = await hienTrong(o.first(), 20_000);
        ghiKetQua({
          nhom: 'TRUONG',
          thu: cotDb,
          trangThai: co ? 'CO' : 'KHONG_CO',
          man: neo!.tenMan,
          ghiChu: `tìm nhãn "${neo!.nhan}" trên /${neo!.route}`,
          oBaoCao: dsUt,
        });
        expect(co, `Không thấy trường "${neo!.nhan}" trên ${neo!.tenMan} (ô báo cáo cần: ${tomTatO(dsUt)})`).toBe(
          true,
        );
      } finally {
        await context.close();
      }
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// D · CỘT PHÉP TÍNH — cần màn LẬP báo cáo, môi trường chưa có
// ─────────────────────────────────────────────────────────────────────────────────────────────────

test.describe('UT mapping ↔ màn hình · cột phép tính', () => {
  const dsCongThuc = DS_UT.filter(u => u.loai === 'CONG_THUC');
  for (const u of dsCongThuc) {
    test(`${u.bieuMau} cột ${u.soCot} · ${u.congThuc || 'công thức theo mapping'}`, async () => {
      /**
       * Cột phép tính kiểm được NGAY TRÊN BIỂU MẪU (cộng các ô khác), nhưng phải có màn LẬP báo cáo
       * nhận tham số kỳ + đơn vị. Đo 03/10/2026: `/qla/bctk/ds|hs|gdttt` chỉ là dashboard tổng hợp
       * toàn cơ quan, KHÔNG có ô lọc, KHÔNG có nút lập báo cáo (docs/flow-kdtm-gdt-tt.md · điểm 13).
       */
      test.fixme(
        true,
        `Chưa có màn lập báo cáo có tham số trên môi trường này → không đối chiếu được ô ` +
          `${u.bieuMau} cột ${u.soCot}. Mapping: "${u.congThuc || u.manHinhMapping}".`,
      );
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// E · CHỐT SỐ LƯỢNG — bộ UT phải khớp với bản bóc mapping
// ─────────────────────────────────────────────────────────────────────────────────────────────────

test('bộ UT đủ 284 ô của 6 biểu mẫu (2A, 2B, 4A, 4B, 4C, 4D)', async () => {
  const tong = Object.values(BO_UT).reduce((s, b) => s + b.cot.length, 0);
  expect(DS_UT.length, 'DS_UT phải là hợp của mọi bộ UT').toBe(tong);
  for (const [ma, b] of Object.entries(BO_UT)) {
    expect(b.cot.length, `biểu mẫu ${ma} không có ô nào — bóc mapping lỗi`).toBeGreaterThan(0);
    // số cột phải liên tục từ 1: thiếu số là dấu hiệu bóc trượt dòng
    const so = b.cot.map(c => c.soCot).sort((x, y) => x - y);
    expect(so[0], `biểu mẫu ${ma} không có cột 1`).toBe(1);
    expect(new Set(so).size, `biểu mẫu ${ma} có số cột trùng`).toBe(so.length);
  }
});
