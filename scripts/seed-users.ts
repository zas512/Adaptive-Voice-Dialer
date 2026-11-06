const demoUsers = [
  {
    name: "Admin",
    email: "admin@example.com",
    role: "admin" as const,
    number: "+15550001001",
    extensionId: "1001",
    host: "192.168.1.13",
    port: 5060,
    secret: "demo-sip-password"
  },
  {
    name: "Zain",
    email: "zainalis.914@gmail.com",
    role: "agent" as const,
    number: "1002",
    extensionId: "1001",
    host: "192.168.1.13",
    port: 8088,
    secret: "1001"
  },
  {
    name: "User",
    email: "user@example.com",
    role: "agent" as const,
    number: "1002",
    extensionId: "1002",
    host: "192.168.1.13",
    port: 8088,
    secret: "1002"
  }
];

const demoPassword = "password123";

async function seedUsers() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Demo users cannot be seeded in production.");
  }

  const [{ default: mongoose }, { default: connectDB }, { default: User }] =
    await Promise.all([
      import("mongoose"),
      import("../src/lib/mongodb"),
      import("../src/models/User")
    ]);

  await connectDB();

  try {
    for (const demoUser of demoUsers) {
      const existingUser = await User.findOne({ email: demoUser.email });

      if (existingUser) {
        Object.assign(existingUser, demoUser);
        await existingUser.save();
        console.log(`Updated account: ${demoUser.email}`);
        continue;
      }

      await User.create({ ...demoUser, password: demoPassword });
      console.log(`Created ${demoUser.role} account: ${demoUser.email}`);
    }

    console.log(
      `New accounts use ${demoPassword}; existing accounts keep their passwords.`
    );
  } finally {
    await mongoose.disconnect();
  }
}

seedUsers().catch((error: unknown) => {
  console.error("Could not seed demo users:", error);
  process.exitCode = 1;
});
