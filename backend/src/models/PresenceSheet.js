const mongoose = require('mongoose');

const presenceSheetSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    year: { type: Number, required: true },
    month: { type: Number, required: true }, // 1..12

    fileName: { type: String, required: true },
    filePath: { type: String, required: true }, // relative path from project root, ex: uploads/presence/2026-01/file.xlsx

    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    generatedAt: { type: Date, default: Date.now },
    size: { type: Number, default: 0 }
  },
  { timestamps: true }
);

presenceSheetSchema.index({ userId: 1, year: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('PresenceSheet', presenceSheetSchema);