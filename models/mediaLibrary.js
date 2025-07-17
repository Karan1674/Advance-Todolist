const mongoose = require("mongoose");

const MediaSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    medialibrary: [
      {
        type: {
          type: String,
          enum: ["image", "url"],
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        tag: {
          type: String,
          required: true,
          trim: true,
        },
        size:{
          type:String,
          required:true
        }
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Media", MediaSchema);
