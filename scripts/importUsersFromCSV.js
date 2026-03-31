// Script đọc user.csv và tạo users hàng loạt + gửi email qua Mailtrap
// Chạy: node scripts/importUsersFromCSV.js

const fs = require('fs');
const mongoose = require("mongoose");
const crypto = require("crypto");
const userModel = require("../schemas/users");
const roleModel = require("../schemas/roles");
const mailHandler = require("../utils/mailHandler");

const MONGO_URL = "mongodb://localhost:27017/NNPTUD-S3";
const CSV_PATH = "./uploads/user.csv";

// Tạo random password 16 ký tự
function generatePassword(length = 16) {
  return crypto.randomBytes(length).toString("hex").slice(0, length);
}

// Đọc file CSV
function readCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.trim().split('\n');
  const users = [];

  // Bỏ qua header (dòng 1)
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

async function importUsersFromCSV() {
  try {
    // 1. Tìm role USER
    const userRole = await roleModel.findOne({ name: "USER" });
    if (!userRole) {
      console.error("❌ Không tìm thấy role 'USER'. Chạy initRoles.js trước!");
      process.exit(1);
    }

    // 2. Đọc file CSV
    const users = readCSV(CSV_PATH);
    console.log(`📋 Tìm thấy ${users.length} user trong file CSV`);
    console.log("=".repeat(50));

    if (users.length === 0) {
      console.log("❌ Không có user nào trong file CSV!");
      process.exit(1);
    }

    // 3. Tạo từng user và gửi email (có delay để tránh rate limit)
    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;

    // Delay helper - nghỉ 1.5s giữa mỗi email để tránh Mailtrap rate limit
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    for (const user of users) {
      try {
        // Kiểm tra user đã tồn tại
        const existing = await userModel.findOne({
          $or: [{ username: user.username }, { email: user.email }]
        });
        if (existing) {
          console.log(`⚠️  Bỏ qua (đã tồn tại): ${user.username}`);
          skipCount++;
          continue;
        }

        // Tạo random password 16 ký tự
        const randomPassword = generatePassword(16);

        // Tạo user mới
        const newUser = new userModel({
          username: user.username,
          password: randomPassword,
          email: user.email,
          role: userRole._id,
          status: true
        });
        await newUser.save();

        // Gửi email chứa password
        const emailContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h2 style="color: #2c3e50; text-align: center;">🎉 Chào mừng bạn đến với hệ thống!</h2>
            <p>Tài khoản của bạn đã được tạo thành công.</p>
            <div style="background: #ecf0f1; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">📋 Thông tin tài khoản</h3>
              <p><strong>Username:</strong> ${user.username}</p>
              <p><strong>Email:</strong> ${user.email}</p>
              <p><strong>Password:</strong> <span style="color: #e74c3c; font-size: 18px; font-weight: bold;">${randomPassword}</span></p>
            </div>
            <p style="color: #e74c3c;">⚠️ Vui lòng đổi password ngay sau khi đăng nhập để bảo mật tài khoản.</p>
            <hr style="border: none; border-top: 1px solid #eee;">
            <p style="color: #7f8c8d; text-align: center;">Trân trọng,<br><strong>Admin</strong></p>
          </div>
        `;

        await mailHandler.sendMailCustom(user.email, "Thông tin tài khoản mới", emailContent);
        console.log(`✅ ${user.username} → ${user.email} | Password: ${randomPassword}`);
        successCount++;

        // Nghỉ 3s sau mỗi email để tránh rate limit Mailtrap
        await delay(3000);

      } catch (err) {
        console.error(`❌ Lỗi với user ${user.username}:`, err.message);
        failCount++;
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log(`🎉 HOÀN TẤT!`);
    console.log(`✅ Thành công: ${successCount} users`);
    console.log(`⚠️  Bỏ qua (đã tồn tại): ${skipCount} users`);
    console.log(`❌ Thất bại: ${failCount} users`);
    console.log("=".repeat(50));
    console.log(`📧 Kiểm tra Mailtrap inbox để xem ${successCount} email đã gửi!`);
    console.log("=".repeat(50));

    process.exit(0);

  } catch (error) {
    console.error("❌ Lỗi:", error.message);
    process.exit(1);
  }
}

importUsersFromCSV();
