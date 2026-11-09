import mongoose, {
  type Document,
  type Model,
  Schema,
  type Types,
} from "mongoose";

export type CallType = "inbound" | "outbound";
export type CallState =
  | "in_progress"
  | "completed"
  | "missed"
  | "cancelled"
  | "failed";

export interface IAIInference {
  transcription: string;
  model: string;
  classification: {
    classification: "ai" | "human" | "voicemail";
    confidence: number;
    reasoning: string;
  };
  classificationModel: string;
  sampleRate: number;
  channels: number;
  analyzedAt: Date;
}

export interface ICallLog extends Document {
  userId: Types.ObjectId;
  sipSessionId: string;
  phoneNumber: string;
  callType: CallType;
  callState: CallState;
  amdStatus: string | null;
  amdCause: string | null;
  aiInference: IAIInference | null;
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
      enum: ["in_progress", "completed", "missed", "cancelled", "failed"],
      required: true,
    },
    amdStatus: {
      type: String,
      default: null,
      maxlength: 100,
    },
    amdCause: {
      type: String,
      default: null,
      maxlength: 100,
    },
    aiInference: {
      type: new Schema<IAIInference>(
        {
          transcription: { type: String, required: true },
          model: { type: String, required: true, maxlength: 100 },
          classification: {
            classification: {
              type: String,
              enum: ["ai", "human", "voicemail"],
              required: true,
            },
            confidence: { type: Number, min: 0, max: 1, required: true },
            reasoning: { type: String, required: true, maxlength: 2000 },
          },
          classificationModel: {
            type: String,
            required: true,
            maxlength: 100,
          },
          sampleRate: { type: Number, required: true },
          channels: { type: Number, required: true },
          analyzedAt: { type: Date, required: true },
        },
        { _id: false },
      ),
      default: null,
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
