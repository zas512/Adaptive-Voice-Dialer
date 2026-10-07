import mongoose from "mongoose";
import User, { IUser } from "../src/models/User";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ Error: MONGODB_URI is not defined in the environment variables.");
  process.exit(1);
}

interface SeedUserData {
  name: string;
  email: string;
  password: string;
  role: "admin" | "agent" | "user";
  number: string;
  extensionId: string;
  host: string;
  port: number;
  secret: string;
}

const SEED_USERS: SeedUserData[] = [
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

async function seedDatabase(): Promise<void> {
  console.log("🌱 Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI as string);
  console.log(" Connected to MongoDB successfully.");

  console.log("🔄 Seeding users...");

  for (const userData of SEED_USERS) {
    const existingUser = await User.findOne({ email: userData.email });

    if (existingUser) {
      existingUser.name = userData.name;
      existingUser.role = userData.role;
      existingUser.number = userData.number;
      existingUser.extensionId = userData.extensionId;
      existingUser.host = userData.host;
      existingUser.port = userData.port;
      existingUser.secret = userData.secret;
      existingUser.password = userData.password; // Triggers pre-save hook to re-hash if modified

      await existingUser.save();
      console.log(` Updated existing user: ${userData.email} [${userData.role}]`);
    } else {
      await User.create(userData);
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
