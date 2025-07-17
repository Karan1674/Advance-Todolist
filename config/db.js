const mongoose = require('mongoose')

const connectDB= async()=>{
    try {
       await mongoose.connect('mongodb://localhost:27017/advance-todo');
       console.log('connected to the database')
    } catch (error) {
        console.log(error);
        console.log("error occured while connecting to the database")
    }
}

module.exports= connectDB