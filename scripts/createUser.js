// Script tạo user và gửi email password
// Chạy: node scripts/createUser.js <username> <email>

const mongoose = require("mongoose");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const userModel = require("../schemas/users");
const roleModel = require("../schemas/roles");
const mailHandler = require("../utils/mailHandler");

// Kết nối MongoDB
const MONGO_URL = "mongodb://localhost:27017/NNPTUD-S3";
mongoose.connect(MONGO_URL)
  .then(() => console.log("✅ Kết nối MongoDB thành công"))
  .catch((err) => console.error("❌ Lỗi kết nối MongoDB:", err));

// Tạo random password 16 ký tự
function generatePassword(length = 16) {
  return crypto.randomBytes(length).toString("hex").slice(0, length);
}

// Tạo user và gửi email
async function createUserWithEmail(username, email) {
  try {
    // 1. Tìm role "USER"
    const userRole = await roleModel.findOne({ name: "USER" });
    if (!userRole) {
      console.error("❌ Không tìm thấy role 'USER'. Hãy chạy script tạo roles trước!");
      process.exit(1);
    }

    // 2. Kiểm tra user đã tồn tại chưa
    const existingUser = await userModel.findOne({
      $or: [{ username }, { email }]
    });
    if (existingUser) {
      console.error("❌ Username hoặc email đã tồn tại!");
      process.exit(1);
    }

    // 3. Tạo random password
    const randomPassword = generatePassword(16);
    console.log(`🔑 Password ngẫu nhiên (16 ký tự): ${randomPassword}`);

    // 4. Tạo user mới (password sẽ được hash tự động bởi pre-save hook)
    const newUser = new userModel({
      username: username,
      password: randomPassword,
      email: email,
      role: userRole._id,
      status: true
    });
    await newUser.save();
    console.log(`✅ Tạo user thành công: ${username}`);

    // 5. Gửi email chứa password
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Chào mừng bạn đến với hệ thống!</h2>
        <p>Tài khoản của bạn đã được tạo thành công.</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Username:</strong> ${username}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Password:</strong> <span style="color: #e74c3c; font-weight: bold;">${randomPassword}</span></p>
        </div>
        <p>Vui lòng đổi password sau khi đăng nhập để bảo mật tài khoản.</p>
        <p>Trân trọng,<br>Admin</p>
      </div>
    `;

    await mailHandler.sendMailCustom(email, "Thông tin tài khoản mới", emailContent);
    console.log(`📧 Đã gửi email đến: ${email}`);
    console.log("✅ Hoàn tất! Kiểm tra Mailtrap inbox để xem email.");

    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi:", error.message);
    process.exit(1);
  }
}

// Lấy tham số từ command line
const username = process.argv[2];
const email = process.argv[3];

if (!username || !email) {
  console.log("📝 Cách sử dụng: node scripts/createUser.js <username> <email>");
  console.log("📝 Ví dụ: node scripts/createUser.js johndoe john@example.com");
  process.exit(1);
}

// Chạy
createUserWithEmail(username, email);
