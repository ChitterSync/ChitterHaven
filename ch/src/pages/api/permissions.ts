import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from './prismaClient';

type RolesMap = Record<string, string[]>;
type MembersMap = Record<string, string[]>;

async function load(haven: string) {
  const setting = await prisma.serverSetting.findUnique({ where: { key: haven } });
  let value: any = setting ? JSON.parse(setting.value) : {};
  if (!value.permissions) {
    value.permissions = {
      roles: {
        Owner: ['*'],
        Admin: ['manage_server','manage_roles','manage_channels','manage_messages','pin_messages','send_messages','add_reactions','upload_files','view_channels'],
        Moderator: ['manage_messages','pin_messages','send_messages','add_reactions','upload_files','view_channels'],
        Member: ['send_messages','add_reactions','upload_files','view_channels'],
        Guest: ['view_channels']
      },
      members: {},
      defaults: { everyone: ['send_messages','add_reactions','view_channels'] }
    };
    if (haven === 'ChitterHaven') {
      value.permissions.members['speed_devil50'] = ['Owner'];
    }
    await prisma.serverSetting.upsert({ where: { key: haven }, update: { value: JSON.stringify(value) }, create: { key: haven, value: JSON.stringify(value) } });
  }
  return value;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const haven = String(req.query.haven || req.body?.haven || '').trim();
  if (!haven) return res.status(400).json({ error: 'Missing haven' });

  if (req.method === 'GET') {
    const value = await load(haven);
    return res.status(200).json({ permissions: value.permissions });
  }

  if (req.method === 'POST') {
    const { action } = req.body || {};
    const value = await load(haven);
    const perms = value.permissions as { roles: RolesMap; members: MembersMap; defaults: any };
    if (action === 'set-owner') {
      const user = String(req.body.user || '').trim();
      if (!user) return res.status(400).json({ error: 'Missing user' });
      perms.members[user] = ['Owner'];
    } else if (action === 'assign-role') {
      const user = String(req.body.user || '').trim();
      const role = String(req.body.role || '').trim();
      if (!user || !role) return res.status(400).json({ error: 'Missing user/role' });
      const list = new Set(perms.members[user] || []);
      list.add(role);
      perms.members[user] = Array.from(list);
    } else if (action === 'revoke-role') {
      const user = String(req.body.user || '').trim();
      const role = String(req.body.role || '').trim();
      if (!user || !role) return res.status(400).json({ error: 'Missing user/role' });
      perms.members[user] = (perms.members[user] || []).filter(r => r !== role);
    } else if (action === 'define-role') {
      const role = String(req.body.role || '').trim();
      const permissions = Array.isArray(req.body.permissions) ? req.body.permissions : [];
      if (!role) return res.status(400).json({ error: 'Missing role' });
      perms.roles[role] = permissions;
    } else {
      return res.status(400).json({ error: 'Unknown action' });
    }
    await prisma.serverSetting.upsert({ where: { key: haven }, update: { value: JSON.stringify(value) }, create: { key: haven, value: JSON.stringify(value) } });
    return res.status(200).json({ success: true, permissions: perms });
  }

  res.setHeader('Allow', ['GET','POST']);
  res.status(405).end('Method Not Allowed');
}

