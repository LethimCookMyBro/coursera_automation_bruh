# ⚡ Coursera Auto-Cert Pro (All-in-One Chrome Extension)

ส่วนขยายเบราว์เซอร์สำหรับช่วยเร่งการเรียนและเก็บ Certificate บน Coursera ให้จบอย่างรวดเร็วและปลอดภัยที่สุด **โค้ด Open Source 100% โปร่งใส ไม่มีการเข้ารหัส/ซ่อนโค้ด และเชื่อมต่อกับ Google Gemini API โดยตรง ไม่ผ่านเซิร์ฟเวอร์คนกลาง**

---

## ✨ ฟีเจอร์หลัก

| ฟีเจอร์ | รายละเอียด |
| :--- | :--- |
| **⚡ Instant Bypass Module** | สแกนและมาร์กสถานะ Video, Reading, Discussion Prompt ทั้งหมดในหน้านั้นให้เป็น **Completed** ทันทีใน 1-2 วินาที |
| **🤖 AI Quiz Solver (Gemini)** | อ่านโจทย์ข้อสอบ (Single Choice, Multiple Choice, True/False) แล้วส่งให้ AI วิเคราะห์พร้อมคลิกเฉลยให้อัตโนมัติ |
| **🎬 Video Speed Accelerator** | ปรับความเร็ววิดีโอได้สูงสุด **16x** (ข้ามขีดจำกัดปกติของ Coursera) พร้อมจดจำความเร็วอัตโนมัติ |
| **📌 Floating Quick Widget** | มีปุ่มควบคุมลอยอยู่บนหน้าจอ Coursera ใช้งานสะดวก ไม่ต้องคอยกดเปิด Extension |
| **🔗 Peer Review Link Copier** | คัดลอก Shareable Feedback Link ส่งให้เพื่อนตรวจการบ้านได้ทันที |
| **🔒 100% Client-Side & Private** | เก็บ Gemini API Key ไว้เฉพาะใน Local Storage ของเครื่องคุณเท่านั้น |

---

## 🚀 ขั้นตอนการติดตั้ง (ใช้เวลา 1 นาที)

### สำหรับ Google Chrome / Microsoft Edge / Brave / Opera

1. **เปิดหน้าจัดการ Extensions ใน Browser:**
   - Chrome: พิมพ์ `chrome://extensions` ในช่อง URL แล้วกด Enter
   - Edge: พิมพ์ `edge://extensions` ในช่อง URL แล้วกด Enter
2. **เปิดโหมดนักพัฒนา (Developer Mode):**
   - เปิดสวิตช์ **"Developer mode"** (โหมดนักพัฒนา) ที่มุมบนขวา
3. **ติดตั้ง Extension:**
   - คลิกปุ่ม **"Load unpacked"** (โหลดส่วนขยายที่คลายการบีบอัดแล้ว) ที่มุมบนซ้าย
   - เลือกโฟลเดอร์ `coursera-extension`
4. ✅ **เสร็จสิ้น!** ไอคอนรูปสายฟ้า ⚡ จะปรากฏที่แถบเครื่องมือของเบราว์เซอร์

---

## 🔑 วิธีขอ Gemini API Key (ฟรี)

1. เข้าไปที่ [Google AI Studio (aistudio.google.com/app/apikey)](https://aistudio.google.com/app/apikey)
2. เข้าสู่ระบบด้วยบัญชี Google
3. คลิกปุ่ม **"Create API key"**
4. คัดลอก Key ที่ได้ นำมาวางใน Extension:
   - คลิกที่ไอคอน Extension ⚡ บนเบราว์เซอร์
   - ไปที่แท็บ **"⚙️ ตั้งค่า AI & ระบบ"**
   - วาง Key ลงในช่อง **Google Gemini API Key** แล้วกด **"บันทึกการตั้งค่า"**

---

## 🧑‍💻 วิธีใช้งาน

### 1. ข้าม Video & Reading ทั้งหมดใน 1 วินาที
- เปิดหน้าคอร์ส Coursera (เช่น หน้า Week หรือ Module ที่มีลิสต์วิดีโอและบทอ่าน)
- คลิกปุ่ม **"⚡ ข้าม Video & Reading ทั้งหมด"** (บน Popup หรือ Floating Widget ที่มุมขวาล่าง)
- ระบบจะส่งสถานะจบทุกบทเรียนในหน้านั้นและรีเฟรชหน้าเว็บให้อัตโนมัติ

### 2. ทำข้อสอบท้ายบทด้วย AI
- เปิดเข้าไปในหน้าข้อสอบ (Quiz / Practice / Graded Quiz)
- คลิกปุ่ม **"🤖 AI เฉลยข้อสอบ (Gemini)"**
- AI จะตรวจจับทุกข้อ ส่งวิเคราะห์ และคลิกเลือกคำตอบที่ถูกต้องให้พร้อมไฮไลต์สีเขียว

### 3. เร่งความเร็ววิดีโอ
- เลือกสปีดที่ต้องการ (1x, 2x, 5x, 10x, 16x) บนหน้าต่าง Extension หรือ Floating Widget
- เมื่อเปิดวิดีโอใดๆ วิดีโอจะเล่นด้วยความเร็วนั้นโดยอัตโนมัติ

---

## 🛡️ คำแนะนำด้านความปลอดภัยในการเก็บ Certificate

1. **ไม่ควรรันข้ามหลายๆ คอร์สพร้อมกันในวินาทีเดียว:** แนะนำให้ทำทีละ Course / Module เพื่อไม่ให้ประวัติการเรียนดูผิดปกติจนเกินไป
2. **คอร์สที่มี Peer-Graded Assignment (การบ้านส่งตรวจ):** อย่าลืมเข้าไปส่งไฟล์และตรวจงานให้เพื่อน 3 คน เพื่อให้คะแนนปลดล็อก Certificate
