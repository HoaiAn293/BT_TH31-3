// Script gửi email cho TẤT CẢ user từ file CSV
// Tự động retry khi lỗi rate limit Mailtrap
// Chạy: node scripts/resendAllEmails.js

// TẮT DEBUG MONGOOSE
process.env.DEBUG = '';

// Disable mongoose debug
const mongoose = require("mongoose");
mongoose.set('debug', false);

const fs = require('fs');
const crypto = require("crypto");
const userModel = require("../schemas/users");
const mailHandler = require("../utils/mailHandler");

const MONGO_URL = "mongodb://localhost:27017/NNPTUD-S3";
const CSV_PATH = "./uploads/user.csv";

// Tạo random password 16 ký tự
function generatePassword(length = 16) {
  return crypto.randomBytes(length).toString("hex").slice(0, length);
}

// Delay helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Đọc file CSV
function readCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.trim().split('\n');
  const users = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const [username, email] = line.split(',').map(s => s.trim());
    if (username && email) {
      users.push({ username, email });
    }
  }
  return users;
}

// Kết nối MongoDB
mongoose.connect(MONGO_URL)
  .then(() => console.log("✅ Kết nối MongoDB thành công"))
  .catch((err) => console.error("❌ Lỗi kết nối MongoDB:", err));

async function sendEmail(user, password, maxRetries = 5) {
  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
      <h2 style="color: #2c3e50; text-align: center;">🎉 Chào mừng bạn đến với hệ thống!</h2>
      <p>Tài khoản của bạn đã được tạo thành công.</p>
      <div style="background: #ecf0f1; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">📋 Thông tin tài khoản</h3>
        <p><strong>Username:</strong> ${user.username}</p>
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>Password:</strong> <span style="color: #e74c3c; font-size: 18px; font-weight: bold;">${password}</span></p>
      </div>
      <p style="color: #e74c3c;">⚠️ Vui lòng đổi password ngay sau khi đăng nhập để bảo mật tài khoản.</p>
      <hr style="border: none; border-top: 1px solid #eee;">
      <p style="color: #7f8c8d; text-align: center;">Trân trọng,<br><strong>Admin</strong></p>
    </div>
  `;

  // Retry logic: tăng delay mỗi lần thử
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await mailHandler.sendMailCustom(user.email, "Thông tin tài khoản mới", emailContent);
      return { success: true, attempts: attempt };
    } catch (err) {
      const waitTime = attempt * 5; // 5s, 10s, 15s, 20s, 25s
      console.log(`   🔄 Retry ${attempt}/${maxRetries} cho ${user.username} (đợi ${waitTime}s)...`);
      if (attempt < maxRetries) {
        await delay(waitTime * 1000);
      }
    }
  }
  return { success: false, attempts: maxRetries };
}

async function resendAllEmails() {
  try {
    const users = readCSV(CSV_PATH);
    console.log(`📋 Tìm thấy ${users.length} user trong file CSV`);
    console.log("=".repeat(60));
    console.log("⚠️  Gửi email cho TẤT CẢ user (có retry tự động)");
    console.log("=".repeat(60) + "\n");

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const progress = `[${i + 1}/${users.length}]`;

      try {
        // Tạo password mới
        const randomPassword = generatePassword(16);

        // Cập nhật password trong DB
        await userModel.findOneAndUpdate(
          { username: user.username },
          { password: randomPassword, status: true }
        );

        // Gửi email với retry
        const result = await sendEmail(user, randomPassword);

        if (result.success) {
          console.log(`✅ ${progress} ${user.username} → ${user.email} | Pass: ${randomPassword} | (${result.attempts} attempts)`);
          successCount++;
        } else {
          console.log(`❌ ${progress} ${user.username}: Gửi thất bại sau ${result.attempts} attempts`);
          failCount++;
        }

      } catch (err) {
        console.error(`❌ ${progress} ${user.username}: ${err.message}`);
        failCount++;
      }

      // Delay 5 giây SAU user (trừ user cuối)
      if (i < users.length - 1) {
        await delay(5000);
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log(`🎉 HOÀN TẤT!`);
    console.log(`✅ Thành công: ${successCount}/${users.length} emails`);
    if (failCount > 0) console.log(`❌ Thất bại: ${failCount} emails`);
    console.log("=".repeat(60));
    console.log(`📧 Kiểm tra Mailtrap inbox!`);
    console.log("=".repeat(60));

    process.exit(0);

  } catch (error) {
    console.error("❌ Lỗi:", error.message);
    process.exit(1);
  }
}

resendAllEmails();
