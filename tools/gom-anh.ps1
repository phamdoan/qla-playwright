<#
.SYNOPSIS
  Gom ẢNH của một lượt chạy Playwright vào một thư mục, đặt tên theo BƯỚC.

.DESCRIPTION
  Lượt chạy thành công KHÔNG sinh ảnh PNG (playwright.config.ts: screenshot = 'only-on-failure'), nhưng
  mỗi bước có một trace.zip chứa toàn bộ khung hình quay màn, nằm ở "screencast/page@<id>-<mốc ms>.jpeg"
  — tên tệp có MỐC THỜI GIAN nên sắp đúng thứ tự thời gian được.

  Tên bước KHÔNG có trong trace (test.trace chỉ ghi tên thao tác). Script ghép mỗi trace với một bước
  bằng cách so MỐC THỜI GIAN khung cuối với trường "luc" của bước trong SỔ CÁI (state/...state.json);
  không ghép được thì lấy tên thư mục kết quả của Playwright làm tên.

  Mặc định lấy 8 khung rải đều mỗi bước + một ảnh "cuoi" để lướt nhanh. Lấy hết: -MoiBuoc 0
  (716 khung/bước, cỡ 1,4 GB cho 45 bước).

.EXAMPLE
  npm run gom-anh
  npm run gom-anh -- -Nguon D:\gtel\toa-an-chay-rieng-b\e2e -MoiBuoc 12
  npm run gom-anh -- -MoiBuoc 0
#>
param(
  [string]$Nguon = (Get-Location).Path,
  [string]$Dich = "C:\Users\GTEL ICT\Downloads\Playwright",
  [int]$MoiBuoc = 8,
  [string]$ThuMucKetQua = ""
)

Add-Type -AssemblyName System.IO.Compression.FileSystem

function Sach([string]$s) {
  $r = $s -replace '[\\/:*?"<>|]', '-'
  $r = $r -replace '\s+', ' '
  return $r.Trim()
}

# ───── 0. ẢNH THẬT TỪNG BƯỚC (chạy với --anh) — ưu tiên hơn khung hình rút từ trace ─────
$thuMucAnh = Join-Path $Nguon "anh-buoc"
if (Test-Path $thuMucAnh) {
  New-Item -ItemType Directory -Force -Path $Dich | Out-Null
  $dsAnh = Get-ChildItem -Path $thuMucAnh -Recurse -Filter "*.png"
  foreach ($a in $dsAnh) {
    $caseId = $a.Directory.Name
    Copy-Item $a.FullName (Join-Path $Dich ("$caseId - " + $a.Name)) -Force
  }
  Write-Host "Anh that tung buoc: $($dsAnh.Count) tep -> $Dich"
  if ($dsAnh.Count) { Write-Host "(bo qua viec rut khung hinh tu trace vi da co anh co that)"; exit 0 }
}

# ───── 1. Danh sách trace.zip ─────
$goc = if ($ThuMucKetQua) { Join-Path $Nguon $ThuMucKetQua } else { $Nguon }
$dsTrace = Get-ChildItem -Path $goc -Recurse -Filter 'trace.zip' -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -like '*test-results*' }
if (-not $dsTrace) {
  Write-Host "Khong thay trace.zip nao duoi $goc — luot chay chua co ket qua?"
  exit 1
}

# ───── 2. Mốc thời gian của từng bước, lấy từ sổ cái ─────
$buocTheoLuc = @()
$dsSoCai = Get-ChildItem -Path (Join-Path $Nguon 'state') -Recurse -Filter '*.state.json' -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -notlike '*.bak*' }
foreach ($f in $dsSoCai) {
  try {
    $j = Get-Content $f.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
  }
  catch { continue }
  $b = if ($j.buoc) { $j.buoc } elseif ($j.xongBuoc) { $j.xongBuoc } else { $null }
  if (-not $b) { continue }
  foreach ($k in $b.PSObject.Properties.Name) {
    $t = $b.$k
    if ($t.luc) {
      $buocTheoLuc += [pscustomobject]@{
        Ma     = $k
        Case   = $j.caseId
        Luc    = ([datetime]$t.luc).ToUniversalTime()
        Status = $t.status
      }
    }
  }
}

New-Item -ItemType Directory -Force -Path $Dich | Out-Null
$moTaSoKhung = 'TAT CA'
if ($MoiBuoc -gt 0) { $moTaSoKhung = [string]$MoiBuoc }
Write-Host "Nguon  : $goc"
Write-Host "Dich   : $Dich"
Write-Host "Trace  : $($dsTrace.Count) · so cai: $($buocTheoLuc.Count) moc buoc · moi buoc lay $moTaSoKhung khung`n"

$tongAnh = 0
$ketQua = @()
foreach ($t in $dsTrace) {
  $zip = [System.IO.Compression.ZipFile]::OpenRead($t.FullName)
  try {
    # Khung hình: screencast/page@<id>-<mốc ms>.jpeg → sắp theo mốc ms
    $khung = $zip.Entries |
      Where-Object { $_.FullName -like 'screencast/*' -and $_.Name -like '*.jpeg' } |
      ForEach-Object {
        $ms = 0
        if ($_.Name -match '-(\d{10,})\.jpeg$') { $ms = [int64]$matches[1] }
        [pscustomobject]@{ Entry = $_; Ms = $ms }
      } | Sort-Object Ms
    if (-not $khung) {
      $khung = $zip.Entries | Where-Object { $_.Name -like '*.jpeg' } | ForEach-Object { [pscustomobject]@{ Entry = $_; Ms = 0 } }
    }
    if (-not $khung) { continue }

    # Ghép với bước trong sổ cái theo mốc thời gian khung cuối (lệch dưới 15 phút thì nhận)
    $msCuoi = ($khung | Select-Object -Last 1).Ms
    $ten = $null
    if ($msCuoi -gt 0 -and $buocTheoLuc.Count) {
      $tCuoi = [datetimeoffset]::FromUnixTimeMilliseconds($msCuoi).UtcDateTime
      $gan = $buocTheoLuc |
        ForEach-Object { [pscustomobject]@{ Ma = $_.Ma; Case = $_.Case; Lech = [math]::Abs((($_.Luc) - $tCuoi).TotalSeconds) } } |
        Sort-Object Lech | Select-Object -First 1
      if ($gan -and $gan.Lech -lt 900) { $ten = "$($gan.Ma)" }
    }
    if (-not $ten) { $ten = $t.Directory.Name }
    $ten = Sach $ten
    if ($ten.Length -gt 70) { $ten = $ten.Substring(0, 70) }

    # Chọn khung: rải đều, luôn giữ khung đầu và khung cuối
    $chon = @()
    if ($MoiBuoc -le 0 -or $khung.Count -le $MoiBuoc) {
      $chon = 0..($khung.Count - 1)
    }
    else {
      for ($i = 0; $i -lt $MoiBuoc; $i++) {
        $chon += [int][math]::Round($i * ($khung.Count - 1) / [double]($MoiBuoc - 1))
      }
      $chon = $chon | Select-Object -Unique
    }

    # TAT CA anh nam CHUNG MOT THU MUC (khong thu muc con): ten tep mang luon ten buoc
    $stt = 0
    foreach ($i in $chon) {
      $e = $khung[$i].Entry
      $stt++
      $tepRa = Join-Path $Dich ('{0} - {1:d2}.jpeg' -f $ten, $stt)
      [System.IO.Compression.ZipFileExtensions]::ExtractToFile($e, $tepRa, $true)
      $tongAnh++
      if ($i -eq ($khung.Count - 1)) {
        [System.IO.Compression.ZipFileExtensions]::ExtractToFile($e, (Join-Path $Dich "$ten - cuoi.jpeg"), $true)
        $tongAnh++
      }
    }
    $ketQua += [pscustomobject]@{ Buoc = $ten; Khung = $stt; Tong = $khung.Count }
  }
  finally {
    $zip.Dispose()
  }
}

$ketQua | Sort-Object Buoc | ForEach-Object { Write-Host ("  {0,-72} {1,3} / {2}" -f $_.Buoc, $_.Khung, $_.Tong) }

# ───── 3. Ảnh lỗi thật (nếu có) ─────
$dsPng = Get-ChildItem -Path $goc -Recurse -Filter '*.png' -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -like '*test-results*' }
if ($dsPng) {
  $thuMucLoi = $Dich
  foreach ($p in $dsPng) {
    Copy-Item $p.FullName (Join-Path $thuMucLoi ('LOI - ' + (Sach $p.Directory.Name) + ' - ' + $p.Name)) -Force
    $tongAnh++
  }
  Write-Host "`n  anh loi (test-failed): $($dsPng.Count) tep -> $thuMucLoi"
}

Write-Host "`nXONG: $tongAnh anh -> $Dich"





