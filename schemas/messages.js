const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: [true, "Sender is required"]
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: [true, "Receiver is required"]
    },
    messageContent: {
      type: {
        type: String,
        enum: ["text", "file"],
        required: [true, "Message type is required"]
      },
      text: {
        type: String,
        required: [true, "Message content is required"]
      }
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("message", messageSchema);
