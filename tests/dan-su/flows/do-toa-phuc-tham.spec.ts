/**
 * DÒ (read-only, chỉ GET): TÒA PHÚC THẨM nào quản lý tòa sơ thẩm của tài khoản đang đăng nhập, và
 * tòa đó có những cán bộ nào — để biết cần xin tài khoản của ai.
 *
 * Vì sao: luồng dân sự chạy bằng tài khoản tòa sơ thẩm trong đặc tả thì xanh 01→15, nhưng BƯỚC 16
 * tắc vì hồ sơ lên tòa phúc thẩm quản lý tòa ấy, mà bộ chưa có tài khoản ở đó (đo 03/10/2026).
 *
 * API dùng: /don-vi/hien-tai (đơn vị của chính mình) → /don-vi/cap-tren (đơn vị cấp trên).
 *
 *   node tools/chay-ui.js stg --cli --file=do-toa-phuc-tham
 *   QLA_VAI=chanhAnDanSuVuAn (mặc định) · QLA_VAI=chanhAnDanSu để so sánh với tòa của luồng KDTM
 */
import { test } from '@playwright/test';
import { API, layToken } from '../../../common/api-don';
import { moTrangVaiCauHinh } from '../../../common/luong-tkm';

const CAT = (s: unknown, n = 90) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

test('dò tòa phúc thẩm cấp trên của tài khoản đang chạy', async ({ browser }, testInfo) => {
  testInfo.setTimeout(15 * 60_000);
  const vai = process.env.QLA_VAI || 'chanhAnDanSuVuAn';
  const { page } = await moTrangVaiCauHinh(browser, testInfo, vai);
  const token = await layToken(page);
  const hd = { authorization: token, accept: 'application/json' };

  const goi = async (nhan: string, duongDan: string) => {
    const r = await page.request.get(`${API}${duongDan}`, { headers: hd });
    const j: any = await r.json().catch(() => null);
    console.log(`\n=== ${nhan} · GET ${duongDan} → HTTP ${r.status()}`);
    return j?.data ?? j;
  };

  const hienTai = await goi('Đơn vị hiện tại', '/don-vi/hien-tai');
  const dsHt: any[] = Array.isArray(hienTai) ? hienTai : hienTai ? [hienTai] : [];
  for (const d of dsHt) {
    console.log(`   · ma=${CAT(d.ma ?? d.maDonVi, 20)} | ten="${CAT(d.tenDonVi ?? d.ten, 70)}" | cấp=${CAT(d.capToaAn ?? d.cap, 20)}`);
  }

  const capTren = await goi('Đơn vị CẤP TRÊN (tòa phúc thẩm)', '/don-vi/cap-tren');
  const dsCt: any[] = Array.isArray(capTren) ? capTren : capTren ? [capTren] : [];
  for (const d of dsCt) {
    console.log(`   · ma=${CAT(d.ma ?? d.maDonVi, 20)} | ten="${CAT(d.tenDonVi ?? d.ten, 70)}"`);
  }

  // Cán bộ của tòa cấp trên — để biết xin tài khoản của ai (CHỈ in họ tên + chức vụ, KHÔNG in CCCD)
  const maCapTren = dsCt.map(d => d.ma ?? d.maDonVi).filter(Boolean);
  for (const ma of maCapTren.slice(0, 2)) {
    const r = await page.request.get(`${API}/can-bo?dsDonVi=${encodeURIComponent(ma)}&page=0&size=50`, { headers: hd });
    const j: any = await r.json().catch(() => null);
    const ds: any[] = j?.data?.data || j?.data?.content || j?.data || [];
    console.log(`\n=== Cán bộ của đơn vị ${ma} → HTTP ${r.status()} · ${ds.length} người`);
    for (const c of ds.slice(0, 25)) {
      console.log(`   · ${CAT(c.hoTen, 40)} | chức vụ: ${CAT(c.tenChucVu, 35)} | chức danh: ${CAT(c.tenChucDanhTuPhap, 35)}`);
    }
  }
  console.log('\n(CCCD không in ra — xin tài khoản thì lấy theo họ tên ở trên)\n');
});
