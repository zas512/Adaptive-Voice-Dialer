import mongoose, {
  type Document,
  type Model,
  Schema,
  type Types,
} from "mongoose";

export type CallType = "inbound" | "outbound";
export type CallState = "completed" | "missed" | "cancelled" | "failed";

export interface ICallLog extends Document {
  userId: Types.ObjectId;
  sipSessionId: string;
  phoneNumber: string;
  callType: CallType;
  callState: CallState;
  cancelReason: string | null;
  hangupBy: "local" | "remote" | "system" | null;
  startedAt: Date;
  answeredAt: Date | null;
  endedAt: Date;
  durationSeconds: number;
  createdAt: Date;
  updatedAt: Date;
}

const CallLogSchema = new Schema<ICallLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sipSessionId: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    callType: {
      type: String,
      enum: ["inbound", "outbound"],
      required: true,
    },
    callState: {
      type: String,
      enum: ["completed", "missed", "cancelled", "failed"],
      required: true,
    },
    cancelReason: {
      type: String,
      default: null,
      maxlength: 500,
    },
    hangupBy: {
      type: String,
      enum: ["local", "remote", "system", null],
      default: null,
    },
    startedAt: {
      type: Date,
      required: true,
    },
    answeredAt: {
      type: Date,
      default: null,
    },
    endedAt: {
      type: Date,
      required: true,
    },
    durationSeconds: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true },
);

CallLogSchema.index({ userId: 1, endedAt: -1 });
CallLogSchema.index({ userId: 1, sipSessionId: 1 }, { unique: true });

const CallLog: Model<ICallLog> =
  mongoose.models.CallLog || mongoose.model<ICallLog>("CallLog", CallLogSchema);

export default CallLog;
