const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: [true, 'Please add a contact type (e.g. whatsapp, support, telegram, email)'],
      trim: true,
    },
    label: {
      type: String,
      required: [true, 'Please add a contact label'],
      trim: true,
    },
    value: {
      type: String,
      required: [true, 'Please add a contact value or URL'],
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Contact', contactSchema);
