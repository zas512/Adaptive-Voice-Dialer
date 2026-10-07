const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ Error: MONGODB_URI is not defined in environment variables.");
  process.exit(1);
}

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    number: { type: String, trim: true },
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
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
    extensionId: { type: String, trim: true },
    host: { type: String, trim: true },
    port: { type: Number, min: 1, max: 65535 },
    secret: { type: String, trim: true },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);

const SEED_USERS = [
  {
    name: "System Administrator",
    email: "admin@dialer.com",
    password: "AdminPassword123!",
    role: "admin",
    number: "+15551001",
    extensionId: "1001",
    host: "sip.dialer.local",
    port: 5060,
    secret: "sip_secret_admin_1001",
  },
  {
    name: "Agent Sarah Jenkins",
    email: "agent@dialer.com",
    password: "AgentPassword123!",
    role: "agent",
    number: "+15551002",
    extensionId: "1002",
    host: "sip.dialer.local",
    port: 5060,
    secret: "sip_secret_agent_1002",
  },
  {
    name: "User Alex Morgan",
    email: "user@dialer.com",
    password: "UserPassword123!",
    role: "user",
    number: "+15551003",
    extensionId: "1003",
    host: "sip.dialer.local",
    port: 5060,
    secret: "sip_secret_user_1003",
  },
];

async function seedDatabase() {
  console.log("🌱 Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log(" Connected to MongoDB successfully.");

  // Clean up legacy/stale indexes if present in the collection
  try {
    const indexes = await User.collection.getIndexes();
    if (indexes.telegramId_1) {
      console.log(" Dropping legacy index: telegramId_1");
      await User.collection.dropIndex("telegramId_1");
    }
  } catch (err) {
    // Collection might not exist yet or index already dropped
  }

  console.log("🔄 Seeding users...");

  for (const userData of SEED_USERS) {
    const existingUser = await User.findOne({ email: userData.email });
    const hashedPassword = bcrypt.hashSync(userData.password, 12);

    if (existingUser) {
      existingUser.name = userData.name;
      existingUser.role = userData.role;
      existingUser.number = userData.number;
      existingUser.extensionId = userData.extensionId;
      existingUser.host = userData.host;
      existingUser.port = userData.port;
      existingUser.secret = userData.secret;
      existingUser.password = hashedPassword;

      await existingUser.save();
      console.log(` Updated existing user: ${userData.email} [${userData.role}]`);
    } else {
      await User.create({
        ...userData,
        password: hashedPassword,
      });
      console.log(` Created new user: ${userData.email} [${userData.role}]`);
    }
  }

  console.log("\n=======================================================");
  console.log("🎉 Seeding completed successfully!");
  console.log("=======================================================");
  console.log("Available credentials for login:\n");
  for (const user of SEED_USERS) {
    console.log(`Role:     ${user.role.toUpperCase()}`);
    console.log(`Email:    ${user.email}`);
    console.log(`Password: ${user.password}`);
    console.log(`Ext:      ${user.extensionId} | Host: ${user.host}:${user.port}`);
    console.log("-------------------------------------------------------");
  }
}

seedDatabase()
  .catch((error) => {
    console.error("❌ Seeding failed with error:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB.");
  });
