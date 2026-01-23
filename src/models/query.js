const mongoose = require('mongoose');
const { Schema } = mongoose;

const querySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    number: { type: String, required: true, trim: true },
    remark: { type: String, required: true },
    userType: {
      type: String,
      enum: ['driver', 'vendor', 'user'],
      required: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      refPath: 'userModel',
      required: true
    },
    userModel: {
      type: String,
      required: true,
      enum: ['Driver', 'Vendor', 'User']
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'resolved', 'closed'],
      default: 'pending'
    },
    adminReply: { type: String, default: '' },
    repliedAt: { type: Date, default: null }
  },
  {
    timestamps: true
  }
);

const Query = mongoose.model('Query', querySchema);
module.exports = Query;
