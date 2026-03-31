// Script khởi tạo roles: ADMIN, MODERATOR, USER
// Chạy: node scripts/initRoles.js

const mongoose = require("mongoose");
const roleModel = require("../schemas/roles");

const MONGO_URL = "mongodb://localhost:27017/NNPTUD-S3";

const roles = [
  { name: "ADMIN", description: "Quản trị viên - Toàn quyền" },
  { name: "MODERATOR", description: "Người kiểm duyệt - Quản lý nội dung" },
  { name: "USER", description: "Người dùng - Quyền cơ bản" }
];

mongoose.connect(MONGO_URL)
  .then(() => console.log("✅ Kết nối MongoDB thành công"))
  .catch((err) => console.error("❌ Lỗi kết nối MongoDB:", err));

async function initRoles() {
  try {
    for (const role of roles) {
      const existingRole = await roleModel.findOne({ name: role.name });
      if (!existingRole) {
        const newRole = new roleModel(role);
        await newRole.save();
        console.log(`✅ Tạo role: ${role.name}`);
      } else {
        console.log(`⚠️  Role đã tồn tại: ${role.name}`);
      }
    }
    console.log("\n🎉 Khởi tạo roles hoàn tất!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi:", error.message);
    process.exit(1);
  }
}

initRoles();
