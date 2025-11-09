import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";

const R2_BUCKET = process.env.R2_BUCKET!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

const s3 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const CHANNELS_KEY = "channels.json";

async function getAllChannels(): Promise<Record<string, Channel>> {
  try {
    const data = await s3.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: CHANNELS_KEY }));
    const stream = data.Body as Readable;
    const json = await new Promise<string>((resolve, reject) => {
      let str = "";
      stream.on("data", (chunk) => (str += chunk));
      stream.on("end", () => resolve(str));
      stream.on("error", reject);
    });
    return JSON.parse(json);
  } catch (e) {
    return {};
  }
}

async function saveAllChannels(channels: Record<string, Channel>) {
  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: CHANNELS_KEY,
    Body: JSON.stringify(channels),
    ContentType: "application/json",
  }));
}

export type Channel = {
  id: string;
  name: string;
  isGroup: boolean;
  members: string[]; // user IDs
  createdAt: number;
};

export async function createChannel(name: string, members: string[], isGroup = false): Promise<Channel> {
  const channels = await getAllChannels();
  const id = `ch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const channel: Channel = {
    id,
    name,
    isGroup,
    members,
    createdAt: Date.now(),
  };
  channels[id] = channel;
  await saveAllChannels(channels);
  return channel;
}

export async function getChannel(id: string): Promise<Channel | undefined> {
  const channels = await getAllChannels();
  return channels[id];
}

export async function listUserChannels(userId: string): Promise<Channel[]> {
  const channels = await getAllChannels();
  return Object.values(channels).filter((ch) => ch.members.includes(userId));
}
