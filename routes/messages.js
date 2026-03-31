let express = require("express");
let router = express.Router();
let messageController = require("../controllers/messages");
let { CheckLogin } = require("../utils/authHandler");

/**
 * GET /api/v1/messages/
 * Lấy tin nhắn cuối cùng của mỗi cuộc trò chuyện
 * Yêu cầu: Đã đăng nhập (cookie LOGIN_NNPTUD_S3)
 *
 * Response: Array các message, mỗi message chứa lastMessage của cuộc trò chuyện với một user cụ thể
 * Body: (không cần)
 *
 * Ví dụ response:
 * [
 *   {
 *     "_id": "...",
 *     "messageContent": { "type": "text", "text": "xin chao" },
 *     "from": "...",
 *     "to": "...",
 *     "createdAt": "2026-03-31T...",
 *     "fromUser": { "username": "...", "fullName": "...", "avatarUrl": "..." },
 *     "toUser": { "username": "...", "fullName": "...", "avatarUrl": "..." }
 *   }
 * ]
 */
router.get("/", CheckLogin, async function (req, res, next) {
  try {
    let currentUserId = req.user._id;
    let result = await messageController.GetLastMessagePerConversation(currentUserId);
    res.send(result);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

/**
 * GET /api/v1/messages/:userID
 * Lấy toàn bộ tin nhắn giữa user hiện tại và userID
 * (từ user hiện tại gửi đến userID, và từ userID gửi đến user hiện tại)
 * Sắp xếp theo thời gian tăng dần (cũ nhất trước)
 *
 * Yêu cầu: Đã đăng nhập (cookie LOGIN_NNPTUD_S3)
 *
 * Params:
 *   - userID: ObjectId của user cần xem cuộc trò chuyện
 *
 * Response: Array các message trong cuộc trò chuyện
 *
 * Ví dụ response:
 * [
 *   {
 *     "_id": "...",
 *     "messageContent": { "type": "text", "text": "xin chao" },
 *     "from": { "_id": "...", "username": "...", "fullName": "...", "avatarUrl": "..." },
 *     "to": { "_id": "...", "username": "...", "fullName": "...", "avatarUrl": "..." },
 *     "createdAt": "2026-03-31T..."
 *   }
 * ]
 */
router.get("/:userID", CheckLogin, async function (req, res, next) {
  try {
    let currentUserId = req.user._id;
    let targetUserId = req.params.userID;
    let result = await messageController.GetConversation(currentUserId, targetUserId);
    res.send(result);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

/**
 * POST /api/v1/messages/
 * Gửi một tin nhắn mới đến user khác
 *
 * Yêu cầu: Đã đăng nhập (cookie LOGIN_NNPTUD_S3)
 *
 * Body:
 *   - to (string, bắt buộc): ObjectId của người nhận
 *   - messageContent (object, bắt buộc):
 *       - type (string, bắt buộc): "text" hoặc "file"
 *       - text (string, bắt buộc):
 *           - Nếu type = "text"  → nội dung tin nhắn
 *           - Nếu type = "file" → đường dẫn file đã upload
 *
 * Ví dụ gửi text:
 * {
 *   "to": "69af870aaa71c433fa8dda8f",
 *   "messageContent": {
 *     "type": "text",
 *     "text": "Xin chào bạn!"
 *   }
 * }
 *
 * Ví dụ gửi file:
 * {
 *   "to": "69af870aaa71c433fa8dda8f",
 *   "messageContent": {
 *     "type": "file",
 *     "text": "/uploads/abc123.jpg"
 *   }
 * }
 *
 * Response: Message đã được lưu kèm thông tin user
 */
router.post("/", CheckLogin, async function (req, res, next) {
  try {
    let currentUserId = req.user._id;
    let { to, messageContent } = req.body;

    if (!to) {
      return res.status(400).send({ message: "Thiếu trường 'to' (userID người nhận)" });
    }
    if (!messageContent || !messageContent.type || !messageContent.text) {
      return res.status(400).send({ message: "Thiếu messageContent.type hoặc messageContent.text" });
    }
    if (!["text", "file"].includes(messageContent.type)) {
      return res.status(400).send({ message: "messageContent.type phải là 'text' hoặc 'file'" });
    }

    let result = await messageController.SendMessage(
      currentUserId,
      to,
      messageContent.type,
      messageContent.text
    );
    res.send(result);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

module.exports = router;
