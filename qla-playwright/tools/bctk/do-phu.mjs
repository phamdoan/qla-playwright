/**
 * ĐO ĐỘ PHỦ DỮ LIỆU BÁO CÁO THỐNG KÊ: biểu mẫu nào đã có luồng nuôi số liệu, biểu mẫu nào chưa.
 *
 *   npm run bctk:do-phu            bảng cho người đọc
 *   npm run bctk:do-phu -- --md    bảng Markdown để dán vào tài liệu
 *   npm run bctk:do-phu -- --cong  chỉ kiểm: thoát mã 1 nếu có luồng khai "xong" mà thiếu chốt
 *
 * Quy tắc đếm chỉ có một: luồng chỉ được tính là nuôi được biểu mẫu khi `trangThai === 'xong'`
 * VÀ có `chotKetQua` — vụ chưa lên "Kết quả giải quyết" thì BCTK không đếm vào "Đã giải quyết".
 */
import { DS_BAO_CAO } from '../../bctk/danh-muc-80-bao-cao.ts';
import { DS_LUONG_BCTK } from '../../bctk/ban-do-luong.ts';

const args = process.argv.slice(2);
const raMd = args.includes('--md');
const chiKiem = args.includes('--cong');

/** mã biểu mẫu → các luồng trỏ tới nó */
const luongCua = new Map();
for (const l of DS_LUONG_BCTK) {
  for (const m of l.bieuMau) {
    if (!luongCua.has(m)) luongCua.set(m, []);
    luongCua.get(m).push(l);
  }
}

const nuoiDuoc = l => l.trangThai === 'xong' && !!l.chotKetQua;

const hang = DS_BAO_CAO.map(b => {
  const ds = luongCua.get(b.ma) || [];
  const xong = ds.filter(nuoiDuoc);
  return {
    ...b,
    trangThai: xong.length ? 'có số liệu' : ds.length ? 'có đặc tả, chưa có số liệu' : 'chưa có luồng nào',
    luong: ds.map(l => `${l.phanHe}/${l.flow}${l.daTao ? '' : ' (chưa có mã)'}`).join(', ') || '—',
  };
});

// Cổng kiểm: luồng khai "xong" mà không có chốt là tự mâu thuẫn — đó là mầm của "xanh giả"
const mauThuan = DS_LUONG_BCTK.filter(l => l.trangThai === 'xong' && !l.chotKetQua);
if (mauThuan.length) {
  console.error(
    'SAI KHAI BÁO — luồng ghi trangThai="xong" nhưng không có chotKetQua (vụ chưa lên ' +
      '"Kết quả giải quyết" thì BCTK không đếm):\n  ' +
      mauThuan.map(l => `${l.phanHe}/${l.flow}`).join('\n  '),
  );
  process.exit(1);
}
if (chiKiem) {
  console.log('Bản đồ luồng → biểu mẫu hợp lệ.');
  process.exit(0);
}

const co = hang.filter(h => h.trangThai === 'có số liệu');
const dacTa = hang.filter(h => h.trangThai === 'có đặc tả, chưa có số liệu');
const trong = hang.filter(h => h.trangThai === 'chưa có luồng nào');

if (raMd) {
  console.log('| Nhóm | Mã | Giai đoạn | Tình trạng | Luồng |');
  console.log('|---|---|---|---|---|');
  for (const h of hang) console.log(`| ${h.nhom} | ${h.ma} | ${h.giaiDoan} | ${h.trangThai} | ${h.luong} |`);
  console.log(
    `\n**${co.length}/${hang.length}** biểu mẫu đã có số liệu · ${dacTa.length} có đặc tả nhưng chưa ` +
      `chạy tới chốt · ${trong.length} chưa có luồng nào trỏ tới.`,
  );
} else {
  const nhan = { 'có số liệu': '✓', 'có đặc tả, chưa có số liệu': '~', 'chưa có luồng nào': '·' };
  let nhomTruoc = '';
  for (const h of hang) {
    if (h.nhom !== nhomTruoc) {
      console.log(`\n── ${h.nhom} ──`);
      nhomTruoc = h.nhom;
    }
    console.log(`  ${nhan[h.trangThai]} ${h.ma.padEnd(4)} ${h.giaiDoan.padEnd(25)} ${h.luong}`);
  }
  console.log(
    `\n✓ có số liệu: ${co.length}/${hang.length}` +
      `   ~ có đặc tả, chưa tới chốt: ${dacTa.length}` +
      `   · chưa có luồng nào: ${trong.length}`,
  );
  console.log('\nLuồng theo trạng thái:');
  for (const tt of ['xong', 'dang-lam', 'chua-lam']) {
    const ds = DS_LUONG_BCTK.filter(l => l.trangThai === tt);
    console.log(
      `  ${tt.padEnd(9)} ${ds.length}: ` +
        ds.map(l => `${l.phanHe}/${l.flow}${l.daTao ? '' : ' (chưa có mã)'}`).join(', '),
    );
  }
}
