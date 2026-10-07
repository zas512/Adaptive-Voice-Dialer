import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  name?: string;
  number?: string;
  role: "user" | "admin" | "agent";
  email: string;
  password: string;
  extensionId?: string;
  host?: string;
  port?: number;
  secret?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      trim: true,
    },
    number: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ["user", "admin", "agent"],
      default: "user",
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(.\w{2,3})+$/,
        "Please provide a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // Don't return password by default
    },
    extensionId: {
      type: String,
      trim: true,
    },
    host: {
      type: String,
      trim: true,
    },
    port: {
      type: Number,
      min: 1,
      max: 65535,
    },
    secret: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// Hash password before saving
(UserSchema as any).pre("save", function (this: any, next: (err?: Error) => void) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) {
    return next();
  }

  // Hash password with cost of 12 and then call the hook middleware
  this.password = bcrypt.hashSync(this.password, 12);
  next();
});

// Prevent re-compilation during development
const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
