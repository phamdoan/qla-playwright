/**
 * MỞ TAY — không phải bước của flow.
 *
 * Mở sẵn đúng màn đang nghi ngờ bằng phiên đã đăng nhập rồi DỪNG LẠI (`page.pause()`) để người
 * dùng tự bấm và quan sát. Dùng khi cần phân định "kịch bản thiếu thao tác" hay "lỗi hệ thống".
 *
 *   npm run kdtm:mo-tay                      mở tab "Xét xử" của vụ case-001
 *   QLA_MO_TAY_TAB="Quản lý án" npm run kdtm:mo-tay
 *
 * Biến môi trường:
 *   QLA_MO_TAY=1          bắt buộc, để test này không chạy lẫn trong lượt chạy flow
 *   QLA_MO_TAY_ID=<id>    id vụ án (mặc định: vụ case-001 VA26-004877)
 *   QLA_MO_TAY_TAB=<tên>  tab cần mở (mặc định "Xét xử")
 *   QLA_MO_TAY_DIEN=1     mở thêm biểu mẫu 32DS đã điền sẵn (mặc định: KHÔNG)
 */
import { test } from '@playwright/test';
import { choHetSpin, dienOTheoNhan, chonNgay, go, hienTrong, nghi, oTheoNhan } from '../../common/antd';
import { moTab, themBieuMauTuDanhSach } from '../../common/bieu-mau';
import { ddmmyyyy } from '../../common/du-lieu';
import { moTrangVaiCauHinh } from '../../common/luong-tkm';
import { INPUT, O_BAT_BUOC_32DS } from '../../data/kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/case-001/input';

const ID_MAC_DINH = 'dbc27b54-06b1-400b-8c9d-776fb0163348'; // VA26-004877

test('mo-tay · mở sẵn màn rồi dừng cho người dùng bấm', async ({ browser }, testInfo) => {
  test.skip(process.env.QLA_MO_TAY !== '1', 'Chỉ chạy khi QLA_MO_TAY=1');
  testInfo.setTimeout(60 * 60_000); // một giờ để thao tác tay

  const id = process.env.QLA_MO_TAY_ID || ID_MAC_DINH;
  const tenTab = process.env.QLA_MO_TAY_TAB || 'Xét xử';
  const { page } = await moTrangVaiCauHinh(browser, testInfo, process.env.QLA_VAI || INPUT.vaiSoTham);

  // QLA_MO_TAY_ROUTE: mở màn khác màn sơ thẩm, vd. "quan-ly-phuc-tham/dan-su/chi-tiet"
  const route = process.env.QLA_MO_TAY_ROUTE || 'vu-an/dan-su/so-tham/chi-tiet';
  await page.goto(`${route}?id=${id}&tab=thong-tin-chung`, { waitUntil: 'domcontentloaded' });
  await choHetSpin(page);
  await moTab(page, tenTab);
  await choHetSpin(page);
  await nghi(page, 1200, 1600);
  console.log(`\n→ Đã mở tab "${tenTab}" của vụ ${id}`);

  // In sẵn khối và danh mục biểu mẫu để đối chiếu với tài liệu ngay trên màn hình
  const khoi = page.locator('.ant-collapse-item, .ant-card');
  const so = await khoi.count();
  console.log(`\n── KHỐI ĐANG CÓ TRONG TAB "${tenTab}" (${so}) ──`);
  for (let i = 0; i < so; i++) {
    const tieuDe = (
      await khoi.nth(i).locator('.ant-collapse-header, .ant-card-head').first().innerText().catch(() => '')
    )
      .replace(/\s+/g, ' ')
      .trim();
    console.log(`   [${i}] ${tieuDe || '(không tiêu đề)'}`);
  }

  const oChonLoai = page
    .locator('.ant-select')
    .filter({ hasText: /Chọn loại biểu mẫu|Loại biểu mẫu/i })
    .locator('[role="combobox"]')
    .first();
  if (await oChonLoai.count()) {
    await oChonLoai.click({ force: true });
    await nghi(page, 900, 1300);
    const muc = (
      await page
        .locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option')
        .allInnerTexts()
    )
      .map(s => s.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    console.log(`\n── DANH MỤC BIỂU MẪU (${muc.length}) ──`);
    for (const m of muc) console.log('   · ' + m);
    await page.keyboard.press('Escape');
  }

  if (process.env.QLA_MO_TAY_DIEN === '1') {
    const khoiQd = page.locator('.ant-collapse-item, .ant-card').filter({ hasText: /Danh sách quyết định/i }).last();
    const bm = await themBieuMauTuDanhSach(page, khoiQd, '32DS');
    await choHetSpin(page);

    const oNgay = oTheoNhan(page, bm, /Ngày (mở )?phiên họp/i);
    if (await hienTrong(oNgay, 3_000)) await chonNgay(oNgay, ddmmyyyy(new Date(Date.now() + 7 * 86400_000)));
    const oDiaDiem = oTheoNhan(page, bm, /Phòng số|Địa điểm/i);
    if ((await hienTrong(oDiaDiem, 3_000)) && (await oDiaDiem.isEditable().catch(() => false))) {
      await go(oDiaDiem, INPUT.diaDiemPhienHop);
    }
    for (const [nhan, giaTri] of O_BAT_BUOC_32DS) {
      const gt = await dienOTheoNhan(page, bm, nhan, giaTri).catch(() => '');
      console.log(`   · ${String(nhan)} = ${gt || '(không điền được)'}`);
      await choHetSpin(page);
    }
  }

  console.log('\n→ Playwright Inspector sẽ mở. Bấm Resume (▶) khi xong để đóng trình duyệt.\n');
  await page.pause();
});
