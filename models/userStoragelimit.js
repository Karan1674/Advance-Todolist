const mongoose = require("mongoose");

const userStorageLimit = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    maxStorage:{
        type:Number,
        default:1024
    },
    useStorage:{
        type:Number,
        default:0
    }
   
  },
  { timestamps: true }
);

module.exports = mongoose.model("userStorageLimit", userStorageLimit);
