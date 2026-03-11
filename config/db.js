const mongoose = require('mongoose')

const connectDB= async()=>{
    try {
       await mongoose.connect(process.env.MONGO_URI);
       console.log('connected to the database')
    } catch (error) {
        console.log(error);
        console.log("error occured while connecting to the database")
    }
}

module.exports= connectDB