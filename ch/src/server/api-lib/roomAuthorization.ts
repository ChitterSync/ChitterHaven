import { getDMForMember } from "@/pages/api/dms";
import { prisma } from "./prismaClient";

export async function canAccessRoom(room: unknown, username: string, permission = "view_channels") {
  if (typeof room !== "string" || !room || room.length > 180) return false;
  if (getDMForMember(room, username)) return true;
  const separator = room.lastIndexOf("__");
  if (separator <= 0 || separator >= room.length - 2) return false;
  try {
    const setting = await prisma.serverSetting.findUnique({ where: { key: room.slice(0, separator) } });
    if (!setting) return false;
    const value = JSON.parse(setting.value || "{}");
    const channel = room.slice(separator + 2);
    if (Array.isArray(value.channels) && value.channels.length && !value.channels.includes(channel)) return false;
    const permissions = value.permissions || {};
    const roles: Record<string, string[]> = permissions.roles || {};
    const memberRoles: string[] = permissions.members?.[username] || [];
    const everyone: string[] = permissions.defaults?.everyone || [];
    return everyone.includes("*") || everyone.includes(permission) || memberRoles.some((role) =>
      (roles[role] || []).includes("*") || (roles[role] || []).includes(permission));
  } catch {
    return false;
  }
}
