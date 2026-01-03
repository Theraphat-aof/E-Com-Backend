# ============================================
# SSH Key Setup Helper Script
# ============================================

$sshDir = Join-Path $env:USERPROFILE ".ssh"
$keyPath = Join-Path $sshDir "ecom_deploy_id_rsa"
$pubKeyPath = "$keyPath.pub"
$privKeyPath = $keyPath

# Step 1: สร้าง .ssh directory ถ้ายังไม่มี
Write-Host "📁 สร้าง .ssh directory..." -ForegroundColor Cyan
if (-not (Test-Path $sshDir)) {
    New-Item -ItemType Directory -Force -Path $sshDir | Out-Null
    Write-Host "✅ สร้าง .ssh directory สำเร็จ" -ForegroundColor Green
} else {
    Write-Host "✅ .ssh directory มีอยู่แล้ว" -ForegroundColor Green
}

# Step 2: สร้าง SSH key ถ้ายังไม่มี
Write-Host "`n🔑 สร้าง SSH key..." -ForegroundColor Cyan
if (Test-Path $privKeyPath) {
    Write-Host "⚠️  SSH key มีอยู่แล้ว: $privKeyPath" -ForegroundColor Yellow
} else {
    ssh-keygen -t rsa -b 4096 -f $privKeyPath -N "" -C "ecom-deploy-key"
    Write-Host "✅ SSH key สร้างสำเร็จ" -ForegroundColor Green
}

# Step 3: ตรวจสอบไฟล์
Write-Host "`n📋 ตรวจสอบไฟล์..." -ForegroundColor Cyan
if (Test-Path $pubKeyPath) {
    Write-Host "✅ Public key: $pubKeyPath" -ForegroundColor Green
} else {
    Write-Host "❌ Public key ไม่พบ" -ForegroundColor Red
    exit 1
}

if (Test-Path $privKeyPath) {
    Write-Host "✅ Private key: $privKeyPath" -ForegroundColor Green
} else {
    Write-Host "❌ Private key ไม่พบ" -ForegroundColor Red
    exit 1
}

# Step 4: แสดง Public Key
Write-Host "`n📤 Public Key (วางบนเซิร์ฟเวอร์):" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Get-Content $pubKeyPath
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

# Step 5: คัดลอก Public Key ไปยัง Clipboard
Write-Host "`n📋 คัดลอก public key ไป Clipboard..." -ForegroundColor Cyan
Get-Content $pubKeyPath | Set-Clipboard
Write-Host "✅ Public key คัดลอกไป Clipboard แล้ว" -ForegroundColor Green

# Step 6: ขั้นตอนต่อไป
Write-Host "`n📝 ขั้นตอนต่อไป:" -ForegroundColor Cyan
Write-Host "1. วาง public key บนเซิร์ฟเวอร์ (ได้คัดลอกไป Clipboard แล้ว)"
Write-Host "   - SSH เข้าเซิร์ฟเวอร์: ssh deploy@your.server.ip"
Write-Host "   - วางไฟล์: echo '<ที่คัดลอก>' >> ~/.ssh/authorized_keys"
Write-Host ""
Write-Host "2. ทดสอบเชื่อมต่อ SSH:"
Write-Host "   ssh -i `"$privKeyPath`" deploy@your.server.ip"
Write-Host ""
Write-Host "3. เพิ่ม Private Key ไป GitHub Secrets:"
Write-Host "   gh secret set PROD_SERVER_SSH_KEY -b (Get-Content '$privKeyPath' -Raw)"

Write-Host "`n✨ เสร็จแล้ว!" -ForegroundColor Green
