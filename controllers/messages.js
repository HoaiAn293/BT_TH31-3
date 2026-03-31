const messageModel = require("../schemas/messages");

module.exports = {
  /**
   * Lấy toàn bộ tin nhắn giữa user hiện tại và userID
   * (từ user hiện tại gửi đến userID, VÀ từ userID gửi đến user hiện tại)
   */
  GetConversation: async function (currentUserId, targetUserId) {
    return await messageModel
      .find({
        $or: [
          { from: currentUserId, to: targetUserId },
          { from: targetUserId, to: currentUserId }
        ]
      })
      .populate("from", "username fullName avatarUrl")
      .populate("to", "username fullName avatarUrl")
      .sort({ createdAt: 1 });
  },

  /**
   * Gửi một tin nhắn mới
   * - type: "text" hoặc "file"
   * - text: nội dung text hoặc đường dẫn file
   */
  SendMessage: async function (fromUserId, toUserId, type, text) {
    let newMessage = new messageModel({
      from: fromUserId,
      to: toUserId,
      messageContent: {
        type: type,
        text: text
      }
    });
    await newMessage.save();
    await newMessage.populate("from", "username fullName avatarUrl");
    await newMessage.populate("to", "username fullName avatarUrl");
    return newMessage;
  },

  /**
   * Lấy tin nhắn cuối cùng của mỗi cuộc trò chuyện
   * (mỗi user đã từng nhắn hoặc được nhắn)
   */
  GetLastMessagePerConversation: async function (currentUserId) {
    // Lấy danh sách user đã từng nhắn với user hiện tại (dù là from hoặc to)
    const conversations = await messageModel.aggregate([
      {
        $match: {
          $or: [{ from: currentUserId }, { to: currentUserId }]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$from", currentUserId] },
              "$to",
              "$from"
            ]
          },
          lastMessage: { $first: "$$ROOT" }
        }
      },
      {
        $replaceRoot: { newRoot: "$lastMessage" }
      },
      {
        $lookup: {
          from: "users",
          localField: "from",
          foreignField: "_id",
          as: "fromUser"
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "to",
          foreignField: "_id",
          as: "toUser"
        }
      },
      {
        $addFields: {
          fromUser: { $arrayElemAt: ["$fromUser", 0] },
          toUser: { $arrayElemAt: ["$toUser", 0] }
        }
      },
      {
        $project: {
          _id: 1,
          messageContent: 1,
          createdAt: 1,
          updatedAt: 1,
          from: 1,
          to: 1,
          "fromUser.username": 1,
          "fromUser.fullName": 1,
          "fromUser.avatarUrl": 1,
          "toUser.username": 1,
          "toUser.fullName": 1,
          "toUser.avatarUrl": 1
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]);

    return conversations;
  }
};
