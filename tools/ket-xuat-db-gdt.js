/**
 * Kết xuất DỮ LIỆU THẬT trên STG (CHỈ SELECT) cho báo cáo hai đợt GĐT/Tái thẩm, để báo cáo không chỉ
 * dựa vào sổ cái Playwright mà đối chiếu được với DB.
 *
 *   set ORA_URL=jdbc:oracle:thin:@<host>:1521/PDB1
 *   set ORA_PASS=<mật khẩu quanlyan>
 *   node tools/ket-xuat-db-gdt.js
 *
 * Mã đơn lấy từ sổ cái của cả hai bộ ở repo gốc + mọi bản sao toa-an-chay-rieng-*. Kết quả ghi ra
 * seed-output/db-stg-gdt.dump.txt đúng định dạng bao-cao-gdt-tt.js đọc (DON| / GD2| / KQ|).
 *
 * Mật khẩu KHÔNG đặt trong mã nguồn (repo này public) — thiếu biến môi trường thì tool dừng và nhắc.
 * Công cụ chạy bằng JDBC qua SqlStg.java: máy không có sqlplus/python-oracle.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const E2E = path.resolve(__dirname, '..');
const GOC = path.resolve(E2E, '..', '..');
const ENV = process.env.QLA_ENV || 'stg';
const BO = ['gdt-tai-tham-phap-nhan-27-09-2026', 'gdt-kdtm-dan-su-28-09-2026'];
const RA = path.join(E2E, 'seed-output', 'db-stg-gdt.dump.txt');

const url = process.env.ORA_URL;
const pass = process.env.ORA_PASS;
if (!url || !pass) {
  console.error('Thiếu ORA_URL / ORA_PASS (kết nối Oracle). Không ghi mật khẩu vào mã nguồn — đặt biến môi trường.');
  process.exit(1);
}
const jar =
  process.env.QLA_OJDBC ||
  path.join(os.homedir(), '.m2', 'repository', 'com', 'oracle', 'database', 'jdbc', 'ojdbc10', '19.20.0.0', 'ojdbc10-19.20.0.0.jar');
if (!fs.existsSync(jar)) {
  console.error('Không thấy ojdbc jar ở ' + jar + ' — khai đường dẫn bằng QLA_OJDBC.');
  process.exit(1);
}

/** Mọi mã đơn đã tạo được, gộp từ sổ cái của cả hai bộ ở mọi thư mục chạy song song */
function dsMaDon() {
  const thuMuc = [path.join(E2E, 'seed-output')];
  for (const t of fs.readdirSync(GOC).filter(t => /^toa-an-chay-rieng-/.test(t))) {
    const tm = path.join(GOC, t, 'e2e', 'seed-output');
    if (fs.existsSync(tm)) thuMuc.push(tm);
  }
  const ma = new Set();
  for (const bo of BO) {
    const dau = bo + '.' + ENV + '.ledger';
    for (const tm of thuMuc) {
      for (const t of fs.readdirSync(tm).filter(t => t.startsWith(dau) && t.endsWith('.json'))) {
        let j;
        try {
          j = JSON.parse(fs.readFileSync(path.join(tm, t), 'utf8'));
        } catch {
          continue;
        }
        for (const v of Object.values(j)) if (v.maDon) ma.add(String(v.maDon));
      }
    }
  }
  return [...ma].sort((a, b) => Number(a) - Number(b));
}

const ma = dsMaDon();
if (!ma.length) {
  console.error('Sổ cái chưa có mã đơn nào → không có gì để kết xuất.');
  process.exit(1);
}
const dsIn = "('" + ma.join("','") + "')";
const vuGoc = '(SELECT ID_VU_GIAIQUYET FROM DON WHERE MA_DON IN ' + dsIn + ')';
const sql =
  [
    "SELECT 'DON|'||d.MA_DON||'|'||NVL(d.ID_VU_GIAIQUYET,'') DONG FROM DON d WHERE d.MA_DON IN " + dsIn,
    "SELECT 'GD2|'||g.ID_VUAN_GOC||'|'||g.MA_VUAN||'|'||g.ID||'|'||NVL(g.SO_THULY,'')||'|'||NVL(g.TRANG_THAI_VU_AN,'')||'|'||NVL(TO_CHAR(g.NGAY_TAO,'DD/MM/YYYY'),'') DONG " +
      'FROM VUAN g WHERE NVL(g.DANH_DAU_XOA,0)=0 AND g.GIAI_DOAN=2 AND g.ID_VUAN_GOC IN ' + vuGoc,
    "SELECT 'KQ|'||k.ID_VUAN||'|'||NVL(k.NGUYEN_NHAN,'')||'|'||NVL(k.TEN_NGUOI_KY,'') DONG FROM VUAN_KETQUA k " +
      'WHERE NVL(k.DANH_DAU_XOA,0)=0 AND k.ID_VUAN IN (SELECT ID FROM VUAN WHERE GIAI_DOAN=2 AND ID_VUAN_GOC IN ' +
      vuGoc +
      ')',
  ].join(';\n') + '\n';

const thuMucTam = fs.mkdtempSync(path.join(os.tmpdir(), 'kq-db-gdt-'));
const fSql = path.join(thuMucTam, 'q.sql');
fs.writeFileSync(fSql, sql, 'utf8');

// SqlStg.java nằm cùng chỗ đã dùng cho các lần truy vấn trước (máy không có sqlplus)
const nguon = process.env.QLA_SQLSTG || path.join(os.tmpdir(), 'sqlstg');
if (!fs.existsSync(path.join(nguon, 'SqlStg.class')) && !fs.existsSync(path.join(nguon, 'SqlStg.java'))) {
  console.error('Không thấy SqlStg.java ở ' + nguon + ' — khai đường dẫn bằng QLA_SQLSTG.');
  process.exit(1);
}
if (!fs.existsSync(path.join(nguon, 'SqlStg.class'))) {
  spawnSync('javac', ['-encoding', 'UTF-8', 'SqlStg.java'], { cwd: nguon, shell: true, stdio: 'inherit' });
}
const kq = spawnSync(
  'java',
  ['-Dfile.encoding=UTF-8', '-Dstdout.encoding=UTF-8', '-cp', `"${jar}";.`, 'SqlStg', `"${fSql}"`],
  { cwd: nguon, shell: true, encoding: 'utf8', env: { ...process.env, ORA_URL: url, ORA_PASS: pass } },
);
const ra = `${kq.stdout || ''}${kq.stderr || ''}`;
const dong = ra.split(/\r?\n/).filter(l => /^(DON|GD2|KQ)\|/.test(l));
if (!dong.length) {
  console.error('Truy vấn không trả về dòng nào. Kết xuất thô:\n' + ra.slice(0, 1500));
  process.exit(1);
}
fs.writeFileSync(RA, dong.join('\n') + '\n', 'utf8');
const dem = t => dong.filter(l => l.startsWith(t + '|')).length;
console.log(`Đã ghi ${RA}: ${dem('DON')} đơn · ${dem('GD2')} vụ xét xử GĐ2 · ${dem('KQ')} vụ có kết quả xét xử`);
