# GitHub Secrets Setup Guide

## สำหรับ CI/CD Pipeline

เพื่อให้ GitHub Actions ทำงานได้ถูกต้อง คุณต้องตั้งค่า Secrets ใน GitHub Repository:

### 📌 ขั้นตอน:
1. ไปที่ Repository Settings
2. ค้นหา "Secrets and variables" → "Actions"
3. เพิ่ม Secrets ทั้งหมดตามรายการด้านล่าง

---

## 🔐 Required Secrets

### 1. **Production Database**
```
PROD_DB_HOST         → ชื่อ host ของ DB เช่น db.example.com
PROD_DB_PORT         → 5432
PROD_DB_USER         → postgres username
PROD_DB_PASSWORD     → postgres password (ต้องเข้มข้น!)
PROD_DB_NAME         → production database name
```

### 2. **Production Server (SSH)**
```
PROD_SERVER_HOST     → IP หรือ domain ของ production server
PROD_SERVER_USER     → SSH username (เช่น deploy)
PROD_SERVER_SSH_KEY  → Private SSH Key (RSA format)
```

### 3. **Slack Notifications (Optional)**
```
SLACK_WEBHOOK_URL    → Incoming Webhook URL จาก Slack
```

### 4. **SonarQube (Optional)**
```
SONAR_TOKEN          → SonarCloud token สำหรับ code quality
```

---

## 🔑 วิธีสร้าง SSH Key (สำหรับ Production)

### Windows (PowerShell):
```powershell
# 1. สร้าง SSH Key
ssh-keygen -t rsa -b 4096 -f C:\Users\YourName\.ssh\id_rsa -N ""

# 2. ดูเนื้อ Private Key (ใช้เป็น PROD_SERVER_SSH_KEY)
cat C:\Users\YourName\.ssh\id_rsa

# 3. ดูเนื้อ Public Key (Copy ไปใส่ ~/.ssh/authorized_keys บน Server)
cat C:\Users\YourName\.ssh\id_rsa.pub
```

### Linux/Mac:
```bash
# 1. สร้าง SSH Key
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""

# 2. ดู Private Key
cat ~/.ssh/id_rsa

# 3. ดู Public Key  
cat ~/.ssh/id_rsa.pub
```

---

## 📝 ตัวอย่างการเพิ่ม Secret ใน GitHub

### ผ่าน Web UI:
1. Repository → Settings
2. Secrets and variables → Actions
3. "New repository secret"
4. Name: `PROD_DB_HOST`
5. Secret: `db.production.com`
6. "Add secret"

### ผ่าน GitHub CLI:
```bash
# ติดตั้ง GitHub CLI จาก https://cli.github.com

# Login
gh auth login

# เพิ่ม Secret
gh secret set PROD_DB_HOST -b "db.production.com"
gh secret set PROD_DB_PASSWORD -b "your_secure_password"
gh secret set PROD_SERVER_SSH_KEY < ~/.ssh/id_rsa
```

---

## ✅ Checklist

- [ ] PROD_DB_HOST
- [ ] PROD_DB_PORT
- [ ] PROD_DB_USER
- [ ] PROD_DB_PASSWORD
- [ ] PROD_DB_NAME
- [ ] PROD_SERVER_HOST
- [ ] PROD_SERVER_USER
- [ ] PROD_SERVER_SSH_KEY
- [ ] SLACK_WEBHOOK_URL (optional)
- [ ] SONAR_TOKEN (optional)
- [ ] GITHUB_TOKEN (auto-generated, ใช้ได้เลย)

---

## 🧪 ทดสอบ CI/CD Pipeline

### 1. Push code ไป Develop branch:
```bash
git checkout develop
git add .
git commit -m "ci: setup GitHub Actions pipeline"
git push origin develop
```

### 2. ดู Workflow Status:
- Repository → Actions
- เลือก commit ล่าสุด
- ดู Test logs

### 3. ตรวจสอบ Output:
```
✅ Run tests & security checks
✅ Code quality analysis
✅ (ข้าม deploy ถ้า branch ไม่ใช่ main)
```

---

## 🚀 Deploy ไป Production

### 1. Merge develop เข้า main:
```bash
git checkout main
git merge develop
git push origin main
```

### 2. GitHub Actions จะ:
- ✅ Run tests
- ✅ Check code quality
- ✅ Deploy ไป production server
- ✅ Notify Slack (ถ้ากำหนดไว้)

---

## ⚠️ Security Tips

1. **Never commit secrets** - ใช้ .env.local สำหรับ local development
2. **Rotate secrets regularly** - เปลี่ยนทุก 3 เดือน
3. **Use strong passwords** - Min 32 characters
4. **Monitor actions logs** - ตรวจสอบ logs เป็นประจำ
5. **Test locally first** - ใช้ npm test ก่อน push

---

## 🔗 Useful Links

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Secrets Management](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [SSH Key Setup](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)
- [Slack Webhooks](https://api.slack.com/messaging/webhooks)
