/**
 * DÒ (read-only, chỉ GET): danh mục "Quan hệ pháp luật (Thống kê)" nhóm TRANH CHẤP DÂN SỰ.
 *
 * Vì sao: luồng dân sự (StepData_DanSu_VuAn.txt b4.8) yêu cầu chọn một mục lá trong nhóm tranh chấp
 * dân sự, vd. "tranh chấp hợp đồng vay tài sản". Ô là TreeSelect và helper `chonQhplThongKe` khớp
 * TÊN LÁ CHÍNH XÁC (`^tên$`), mà tên lá ngắn hơn tên nghiệp vụ (KDTM: lá là "Mua bán hàng hoá", không
 * phải "Tranh chấp hợp đồng mua bán hàng hoá"). Đoán tên là treo cả phút rồi hỏng, nên hỏi máy chủ.
 *
 *   node tools/chay-ui.js stg --cli --file=do-danh-muc-qhpl
 *   QLA_TIM=vay   (lọc theo chữ, mặc định in cả nhóm dân sự)
 */
import { test } from '@playwright/test';
import { API, layToken } from '../../../common/api-don';
import { moTrangVaiCauHinh } from '../../../common/luong-tkm';

test('dò danh mục QHPL thống kê · nhóm tranh chấp dân sự', async ({ browser }, testInfo) => {
  testInfo.setTimeout(15 * 60_000);
  const { page } = await moTrangVaiCauHinh(browser, testInfo, process.env.QLA_VAI || 'chanhAnDanSu');
  const token = await layToken(page);
  const tim = (process.env.QLA_TIM || '').toLowerCase();

  for (const loai of (process.env.QLA_NHOM || 'QHPL_TC_DS,QHPL_TC_DS.003,QHPL_TC_DS.002').split(',')) {
    // Tham số thật của /danh-muc là maDanhMucCha (xem các nơi gọi getDataDanhMuc trong qla-webapp)
    for (const qs of [`maDanhMucCha=${loai}&size=999`, `maDanhMucCha=${loai}&size=999&page=0`]) {
      const url = `${API}/danh-muc?${qs}`;
      const r = await page.request.get(url, { headers: { authorization: token, accept: 'application/json' } });
      const j: any = await r.json().catch(() => null);
      const ds: any[] = j?.data?.data || j?.data?.content || (Array.isArray(j?.data) ? j.data : []) || [];
      console.log(`\n=== ${qs} → HTTP ${r.status()} · ${ds.length} mục`);
      if (!ds.length) continue;
      console.log(`   khoá của một mục: ${Object.keys(ds[0]).join(', ')}`);
      const loc = tim ? ds.filter(x => JSON.stringify(x).toLowerCase().includes(tim)) : ds;
      for (const m of loc.slice(0, 60)) {
        console.log(`   · ma=${m.ma ?? m.code ?? m.value ?? '?'} | ten="${m.ten ?? m.tenDanhMuc ?? m.label ?? '?'}" | cha=${m.maCha ?? m.parent ?? '-'}`);
      }
      break; // tham số nào ra dữ liệu thì dùng, rồi sang nhóm kế tiếp
    }
  }
  console.log('\nKhông truy vấn được danh mục bằng các tham số đã thử — xem lại tên tham số của API /danh-muc.\n');
});
