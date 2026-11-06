import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import connectDB from "./mongodb";
import User from "@/models/User";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please provide email and password");
        }

        await connectDB();

        const user = await User.findOne({ email: credentials.email }).select(
          "+password"
        );

        if (!user) {
          throw new Error("Invalid email or password");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("Invalid email or password");
        }

        return {
          id: (user._id as mongoose.Types.ObjectId).toString(),
          email: user.email,
          name: user.name || "",
          role: user.role,
          number: user.number,
          extensionId: user.extensionId,
          host: user.host,
          port: user.port,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }

      if (token.id && (user || !token.profileLoaded)) {
        await connectDB();
        const profile = await User.findById(token.id)
          .select("-password -secret")
          .lean();

        if (profile) {
          token.id = profile._id.toString();
          token.email = profile.email;
          token.name = profile.name ?? "";
          token.role = profile.role;
          token.number = profile.number;
          token.extensionId = profile.extensionId;
          token.host = profile.host;
          token.port = profile.port;
          token.profileLoaded = true;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.number = token.number;
        session.user.extensionId = token.extensionId;
        session.user.host = token.host;
        session.user.port = token.port;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
