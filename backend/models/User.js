const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: String,
  email: { type: String, unique: true },
  password: String,
  phoneNumber: String,
  emergencyContactName: String,
  emergencyContactNumber: String,
});

module.exports = mongoose.model('User', userSchema);
