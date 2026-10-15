/**
 * Trang theo dõi tiến trình seed (chạy tại localhost) — chỉ ĐỌC sổ cái + log, không tác động tới lượt chạy.
 *
 *   node tools/theo-doi-seed.js            → http://localhost:4123
 *   node tools/theo-doi-seed.js 5000       → đổi cổng
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const CONG = Number(process.argv[2]) || 4123;
const THU_MUC = path.resolve(__dirname, '../seed-output');
const TONG = 3000;

const docJson = f => {
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch {
    return {};
  }
};

/** Sổ cái của môi trường có dữ liệu mới nhất (mỗi host một file) */
function soCai() {
  const files = fs.existsSync(THU_MUC) ? fs.readdirSync(THU_MUC).filter(f => f.endsWith('.ledger.json')) : [];
  const ds = files.map(f => ({ f, d: docJson(path.join(THU_MUC, f)) })).sort((a, b) => Object.keys(b.d).length - Object.keys(a.d).length);
  return ds[0] || { f: '(chưa có)', d: {} };
}

/** Vài dòng cuối của log đang chạy */
function docLog(ten, soDong) {
  const f = path.join(THU_MUC, ten);
  if (!fs.existsSync(f)) return [];
  const noiDung = fs.readFileSync(f, 'utf8');
  return noiDung.split(/\r?\n/).filter(Boolean).slice(-soDong);
}

/** Tiến trình Playwright của seed còn sống không (hỏi Windows, nhớ kết quả 10 giây cho nhẹ) */
let cacheTienTrinh = { luc: 0, chay: false };
function tienTrinhSong() {
  if (Date.now() - cacheTienTrinh.luc < 10_000) return cacheTienTrinh.chay;
  const lenh = `(Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match 'tao-don-khong-ocr' } | Measure-Object).Count`;
  const r = spawnSync('powershell', ['-NoProfile', '-Command', lenh], { encoding: 'utf8', timeout: 8000 });
  cacheTienTrinh = { luc: Date.now(), chay: Number((r.stdout || '0').trim()) > 0 };
  return cacheTienTrinh.chay;
}

/** Số phút kể từ lần ghi cuối của file (log còn được ghi = seed còn làm việc) */
function phutTuLanGhi(ten) {
  const f = path.join(THU_MUC, ten);
  if (!fs.existsSync(f)) return null;
  return (Date.now() - fs.statSync(f).mtimeMs) / 60000;
}

function soLieu() {
  const { f, d } = soCai();
  const ds = Object.values(d).sort((a, b) => new Date(a.luc) - new Date(b.luc));
  const n = ds.length;
  const moc = t => ds.filter(x => new Date(x.luc).getTime() > Date.now() - t).length;
  const gio = moc(3600e3);
  const conLai = TONG - n;
  const log = docLog('chay-3000.log', 4000);
  const loi = [...new Set(log.filter(l => /\] FAILED/.test(l)).map(l => (l.match(/\[(\d+)\/\d+\] FAILED/) || [])[1]).filter(Boolean))];
  const dangChay = [...log].reverse().find(l => /\[Lô \d+\/\d+\]/.test(l)) || '';
  const lo = (dangChay.match(/\[Lô (\d+\/\d+)\][^:]*: ?(.*)$/) || []).slice(1);
  const phutLog = phutTuLanGhi('chay-3000.log');
  const phutDonCuoi = n ? (Date.now() - new Date(ds[n - 1].luc).getTime()) / 60000 : null;
  const song = tienTrinhSong();
  // Log vẫn được ghi = còn làm việc; im quá 15 phút dù tiến trình còn sống → nghi treo
  const trangThai = n >= TONG ? 'XONG' : !song ? 'ĐÃ DỪNG' : phutLog !== null && phutLog > 15 ? 'CÓ VẺ TREO' : 'ĐANG CHẠY';
  return {
    trangThai,
    tienTrinhSong: song,
    phutTuLogCuoi: phutLog === null ? null : Number(phutLog.toFixed(1)),
    phutTuDonCuoi: phutDonCuoi === null ? null : Number(phutDonCuoi.toFixed(1)),
    file: f,
    tao: n,
    conLai,
    phanTram: ((n / TONG) * 100).toFixed(1),
    gio,
    phutMoiDon: gio ? (60 / gio).toFixed(1) : null,
    conBaoLau: gio ? (conLai / gio / 24).toFixed(1) : null,
    xong: n >= TONG,
    loi,
    lo,
    ganDay: ds.slice(-12).reverse(),
    dongLog: log.filter(l => /CREATED|FAILED|SKIPPED/.test(l)).slice(-8).reverse(),
  };
}

const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

function trang() {
  const s = soLieu();
  const hang = s.ganDay
    .map(x => `<tr><td>${x.index}</td><td>${esc(x.maDon || '')}</td><td>${esc(x.nguoiDungDon)}</td><td>${new Date(x.luc).toLocaleTimeString('vi-VN')}</td></tr>`)
    .join('');
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Tiến trình seed đơn</title>
<meta http-equiv="refresh" content="15">
<style>
 :root { color-scheme: light dark; --vien: #d0d5dd; --mo: #667085; }
 body { font-family: system-ui, Segoe UI, Roboto, sans-serif; margin: 24px auto; max-width: 900px; padding: 0 16px; }
 h1 { font-size: 20px; margin-bottom: 4px; }
 .mo { color: var(--mo); font-size: 13px; }
 .thanh { height: 26px; border: 1px solid var(--vien); border-radius: 6px; overflow: hidden; margin: 14px 0 6px; }
 .thanh > div { height: 100%; background: #2e7d32; width: ${s.phanTram}%; }
 .o { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin: 16px 0; }
 .o > div { border: 1px solid var(--vien); border-radius: 8px; padding: 10px 12px; }
 .o b { display: block; font-size: 22px; }
 table { border-collapse: collapse; width: 100%; font-size: 14px; }
 td, th { border-bottom: 1px solid var(--vien); padding: 6px 8px; text-align: left; }
 pre { background: #00000010; padding: 10px; border-radius: 8px; font-size: 12px; overflow-x: auto; }
 .loi { color: #b42318; }
 .trangthai { display: inline-block; font-weight: 600; padding: 6px 12px; border-radius: 999px; margin: 6px 0 10px; }
 .trangthai.ok { background: #e7f6e9; color: #1b5e20; }
 .trangthai.canh { background: #fdecea; color: #b42318; }
 .trangthai .mo { font-weight: 400; }
</style></head><body>
<h1>Tiến trình tạo ${TONG} đơn không qua OCR</h1>
<div class="trangthai ${s.trangThai === 'ĐANG CHẠY' || s.trangThai === 'XONG' ? 'ok' : 'canh'}">
  ${s.trangThai}
  <span class="mo">· tiến trình seed: ${s.tienTrinhSong ? 'còn sống' : 'không thấy'}
  · log ghi cách đây ${s.phutTuLogCuoi === null ? '—' : s.phutTuLogCuoi + ' phút'}
  · đơn gần nhất cách đây ${s.phutTuDonCuoi === null ? '—' : s.phutTuDonCuoi + ' phút'}</span>
</div>
<div class="mo">Sổ cái: ${esc(s.file)} · tự làm mới mỗi 15 giây · ${new Date().toLocaleString('vi-VN')}</div>
<div class="thanh"><div></div></div>
<div class="mo">${s.tao} / ${TONG} đơn (${s.phanTram}%) — còn ${s.conLai}</div>
<div class="o">
  <div><span class="mo">Đã tạo</span><b>${s.tao}</b></div>
  <div><span class="mo">1 giờ qua</span><b>${s.gio}</b>${s.phutMoiDon ? `<span class="mo">${s.phutMoiDon} phút/đơn</span>` : ''}</div>
  <div><span class="mo">Dự kiến còn</span><b>${s.xong ? 'Xong' : s.conBaoLau ? s.conBaoLau + ' ngày' : '—'}</b></div>
  <div><span class="mo">Đơn lỗi (lượt này)</span><b class="${s.loi.length ? 'loi' : ''}">${s.loi.length}</b>${s.loi.length ? `<span class="mo">${s.loi.join(', ')}</span>` : ''}</div>
</div>
${s.lo.length ? `<div class="mo">Đang chạy lô ${esc(s.lo[0])}: ${esc(s.lo[1] || '')}</div>` : ''}
<h3>12 đơn mới nhất</h3>
<table><tr><th>#</th><th>Mã đơn</th><th>Người đứng đơn</th><th>Lúc</th></tr>${hang}</table>
<h3>Log gần đây</h3>
<pre>${esc(s.dongLog.join('\n'))}</pre>
</body></html>`;
}

http
  .createServer((req, res) => {
    if (req.url === '/api') {
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify(soLieu(), null, 1));
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(trang());
  })
  .listen(CONG, () => console.log(`Theo dõi seed: http://localhost:${CONG}  (số liệu thô: /api)`));
