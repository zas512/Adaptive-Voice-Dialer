import mongoose, { type Document, type Model, Schema, type Types } from "mongoose";

export type KycStatus = "pending-review" | "verified" | "requires-action";

export interface IKycRecord extends Document {
  userId: Types.ObjectId;
  name: string;
  contact: string;
  status: KycStatus;
  createdAt: Date;
  updatedAt: Date;
}

const KycRecordSchema = new Schema<IKycRecord>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    contact: {
      type: String,
      required: true,
      trim: true,
      maxlength: 254,
    },
    status: {
      type: String,
      enum: ["pending-review", "verified", "requires-action"],
      default: "pending-review",
      required: true,
    },
  },
  { timestamps: true },
);

KycRecordSchema.index({ userId: 1, createdAt: -1 });

const KycRecord: Model<IKycRecord> =
  mongoose.models.KycRecord ||
  mongoose.model<IKycRecord>("KycRecord", KycRecordSchema);

export default KycRecord;
