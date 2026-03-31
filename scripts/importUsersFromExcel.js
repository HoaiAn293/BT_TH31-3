// Script đọc user.xlsx và tạo users hàng loạt + gửi email
// Chạy: node scripts/importUsersFromExcel.js

const ExcelJS = require('exceljs');
const mongoose = require("mongoose");
const crypto = require("crypto");
const userModel = require("../schemas/users");
const roleModel = require("../schemas/roles");
const mailHandler = require("../utils/mailHandler");

const MONGO_URL = "mongodb://localhost:27017/NNPTUD-S3";

// Tạo random password 16 ký tự
function generatePassword(length = 16) {
  return crypto.randomBytes(length).toString("hex").slice(0, length);
}

// Kết nối MongoDB
mongoose.connect(MONGO_URL)
  .then(() => console.log("✅ Kết nối MongoDB thành công"))
  .catch((err) => console.error("❌ Lỗi kết nối MongoDB:", err));

async function importUsersFromExcel() {
  try {
    // 1. Tìm role USER
    const userRole = await roleModel.findOne({ name: "USER" });
    if (!userRole) {
      console.error("❌ Không tìm thấy role 'USER'. Chạy initRoles.js trước!");
      process.exit(1);
    }

    // 2. Đọc file Excel
    const filePath = "./data/user.xlsx";
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.getWorksheet(1);
    const users = [];

    // 3. Đọc từng dòng (bỏ qua header - dòng 1)
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Bỏ qua header

      const username = row.getCell(1).value;  // Cột A: username
      const email = row.getCell(2).value;     // Cột B: email

      if (username && email) {
        users.push({ username: String(username).trim(), email: String(email).trim() });
      }
    });

    console.log(`📋 Tìm thấy ${users.length} user trong file Excel`);

    if (users.length === 0) {
      console.log("❌ Không có user nào trong file Excel!");
      process.exit(1);
    }

    // 4. Tạo từng user và gửi email
    let successCount = 0;
    let failCount = 0;

    for (const user of users) {
      try {
        // Kiểm tra user đã tồn tại
        const existing = await userModel.findOne({
          $or: [{ username: user.username }, { email: user.email }]
        });
        if (existing) {
          console.log(`⚠️  Bỏ qua (đã tồn tại): ${user.username}`);
          continue;
        }

        // Tạo random password
        const randomPassword = generatePassword(16);
        console.log(`🔑 ${user.username}: ${randomPassword}`);

        // Tạo user mới
        const newUser = new userModel({
          username: user.username,
          password: randomPassword,
          email: user.email,
          role: userRole._id,
          status: true
        });
        await newUser.save();

        // Gửi email
        const emailContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Chào mừng bạn đến với hệ thống!</h2>
            <p>Tài khoản của bạn đã được tạo thành công.</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Username:</strong> ${user.username}</p>
              <p><strong>Email:</strong> ${user.email}</p>
              <p><strong>Password:</strong> <span style="color: #e74c3c; font-weight: bold;">${randomPassword}</span></p>
            </div>
            <p>Vui lòng đổi password sau khi đăng nhập để bảo mật tài khoản.</p>
            <p>Trân trọng,<br>Admin</p>
          </div>
        `;

        await mailHandler.sendMailCustom(user.email, "Thông tin tài khoản mới", emailContent);
        console.log(`✅ Đã tạo & gửi email: ${user.username} → ${user.email}`);
        successCount++;

      } catch (err) {
        console.error(`❌ Lỗi với user ${user.username}:`, err.message);
        failCount++;
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log(`🎉 Hoàn tất!`);
    console.log(`✅ Thành công: ${successCount} users`);
    console.log(`❌ Thất bại: ${failCount} users`);
    console.log(`📧 Kiểm tra Mailtrap inbox để xem các email đã gửi`);
    console.log("=".repeat(50));

    process.exit(0);

  } catch (error) {
    console.error("❌ Lỗi:", error.message);
    process.exit(1);
  }
}

importUsersFromExcel();
