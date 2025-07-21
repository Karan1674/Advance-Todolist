const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
firstName :{
    type:String,
    required:true
},
lastName :{
    type:String,
    required:true
},
email :{
    type:String,
    required:true
},
password :{
    type:String,
},
profilePic :{
    type:String,
},
otp: {
        type: String,
    },
      googleId: {
    type: String,
  },
  packageDetails: {
    type: String,
    enum:['starter', 'pro', 'premium'],
    default: 'starter',
  },

},{timestamps: true })


module.exports = mongoose.model('User',userSchema)