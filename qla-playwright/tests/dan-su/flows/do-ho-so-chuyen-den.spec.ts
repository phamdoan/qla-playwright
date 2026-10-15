/**
 * DÒ (read-only, chỉ GET): vụ án đã chuyển lên phúc thẩm đang NẰM Ở ĐÂU.
 *
 * Vì sao: bước 16 báo "Tab Chờ tiếp nhận không có vụ <mã>" bốn lượt liền, trong khi ảnh chụp cho thấy
 * mã vụ nằm ở THẺ LỌC và lưới ghi "Không có dữ liệu". Thay vì tiếp tục mò giao diện, hỏi thẳng API
 * danh sách hồ sơ chuyển đến (services/dan-su-so-tham.ts · layDanhSachVuChuyenDen).
 *
 *   node tools/chay-ui.js stg --cli --file=do-ho-so-chuyen-den
 *   QLA_MA_VU=VA26-005391 (bắt buộc) · QLA_VAI=chanhAnPhucThamHanhChinh (mặc định)
 */
import { test } from '@playwright/test';
import { API, layToken } from '../../../common/api-don';
import { moTrangVaiCauHinh } from '../../../common/luong-tkm';

const CAT = (s: unknown, n = 110) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

test('dò hồ sơ chuyển đến · vụ đang ở trạng thái nào', async ({ browser }, testInfo) => {
  testInfo.setTimeout(15 * 60_000);
  const maVu = process.env.QLA_MA_VU || 'VA26-005391';
  const { page } = await moTrangVaiCauHinh(browser, testInfo, process.env.QLA_VAI || 'chanhAnPhucThamHanhChinh');
  const token = await layToken(page);
  const hd = { authorization: token, accept: 'application/json' };

  for (const qs of [
    `maVuAn=${encodeURIComponent(maVu)}&current=1&pageSize=20`,
    `keySearch=${encodeURIComponent(maVu)}&current=1&pageSize=20`,
    'current=1&pageSize=50',
  ]) {
    const url = `${API}/vu-chuyen/dan-su/so-tham/chuyen-den?${qs}`;
    const r = await page.request.get(url, { headers: hd });
    const j: any = await r.json().catch(() => null);
    const ds: any[] = j?.data?.data || j?.data?.content || j?.data || [];
    console.log(`\n=== ${qs} → HTTP ${r.status()} · ${ds.length} bản ghi (tổng ${j?.data?.total ?? '?'})`);
    if (ds.length) console.log(`   khoá: ${Object.keys(ds[0]).slice(0, 18).join(', ')}`);
    for (const v of ds.slice(0, 20)) {
      const d = `ma=${CAT(v.maVuAn ?? v.ma, 20)} | trạng thái=${CAT(v.trangThai ?? v.trangThaiChuyen, 25)} | tên=${CAT(v.tenVuAn, 45)}`;
      if (String(v.maVuAn ?? v.ma ?? '').includes(maVu)) console.log(`   ★ ${d}`);
      else console.log(`   · ${d}`);
    }
  }
  // Phía TÒA SƠ THẨM: hồ sơ đã chuyển đi đâu, trạng thái gì (chạy lại spec với QLA_VAI=chanhAnDanSu)
  for (const qs of [`maVuAn=${encodeURIComponent(maVu)}&current=1&pageSize=20`, 'current=1&pageSize=20']) {
    const url = `${API}/vu-chuyen/dan-su/so-tham/chuyen-di/danh-sach?${qs}`;
    const r = await page.request.get(url, { headers: hd });
    const j: any = await r.json().catch(() => null);
    const ds: any[] = j?.data?.data || j?.data?.content || j?.data || [];
    console.log(`\n=== [CHUYỂN ĐI] ${qs} → HTTP ${r.status()} · ${ds.length} bản ghi`);
    if (ds.length) console.log(`   khoá: ${Object.keys(ds[0]).slice(0, 20).join(', ')}`);
    for (const v of ds.slice(0, 10)) {
      const dong =
        `ma=${CAT(v.maVuAn ?? v.ma, 20)} | trạng thái=${CAT(v.tenTrangThai ?? v.trangThai, 25)} | ` +
        `tòa nhận=${CAT(v.tenToaAnNhan ?? v.tenToaAnChuyenDen ?? v.tenToaAn, 50)}`;
      console.log(`   ${String(v.maVuAn ?? v.ma ?? '').includes(maVu) ? '★' : '·'} ${dong}`);
    }
  }

  console.log(`\nKẾT LUẬN CẦN RÚT: dòng có ★ là vụ ${maVu}; trạng thái + tòa nhận cho biết bước 16 phải làm gì.\n`);
});
