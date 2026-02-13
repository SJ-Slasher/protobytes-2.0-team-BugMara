import dbConnect from "@/lib/db";
import User from "@/lib/models/User";

/**
 * Verify that a user has admin or superadmin role in the database.
 * This function should be called in all admin endpoints to enforce authorization.
 *
 * @param userId - The Clerk user ID
 * @returns The admin user document, or null if not authorized
 */
export async function verifyAdminRole(userId: string) {
  try {
    await dbConnect();
    const user = await User.findOne({ clerkId: userId });
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      return null;
    }
    return user;
  } catch (error) {
    console.error("Error verifying admin role:", error);
    return null;
  }
}

/**
 * Check if a user is a superadmin.
 * Superadmins have access to all stations and can manage other admins.
 *
 * @param userId - The Clerk user ID
 * @returns true if user is a superadmin, false otherwise
 */
export async function isSuperAdmin(userId: string) {
  try {
    await dbConnect();
    const user = await User.findOne({ clerkId: userId });
    return user?.role === "superadmin";
  } catch (error) {
    console.error("Error checking superadmin status:", error);
    return false;
  }
}

/**
 * Check if a user is any type of admin (admin or superadmin).
 *
 * @param userId - The Clerk user ID
 * @returns true if user is an admin or superadmin, false otherwise
 */
export async function isAdmin(userId: string) {
  try {
    await dbConnect();
    const user = await User.findOne({ clerkId: userId });
    return user?.role === "admin" || user?.role === "superadmin";
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}
