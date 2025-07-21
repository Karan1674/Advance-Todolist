const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  gateway: {
    type: String,
    enum: ['stripe', 'razorpay', 'paypal', 'phonepe',null],
    default: null,
  },
  country: {
    type: String,
    enum: ['national', 'international', null],
    default: null,
  },
  subscriptionId: {
    type: String,
    default: null,
  },
  customerId: {
    type: String,
    default: null,
  },
  sessionId: {
    type: String,
    default: null,
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'pending', null],
    default: null,
  },
  lastPaymentDate: {
    type: Date,
    default: null,
  },
  nextBillingDate: {
    type: Date,
    default: null,
  },
  amountPaid: {
    type: Number,
    default: null,
  },
  plan: {
    type: String,
    enum: ['pro', 'premium', null],
    default: null,
  },
}, { timestamps: true });



module.exports = mongoose.model('paymentDetail',paymentSchema)