import { getApiUrl } from "@/lib/query-client";
import { getSessionToken } from "@/lib/storage";

async function authHeaders(): Promise<HeadersInit> {
  const token = await getSessionToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function buildUrl(path: string): string {
  const base = getApiUrl().replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

async function safeError(res: Response): Promise<string> {
  try {
    const j = await res.json();
    return j?.error || `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

async function get(path: string) {
  const headers = await authHeaders();
  const res = await fetch(buildUrl(path), { headers });
  if (!res.ok) throw new Error(await safeError(res));
  return res.json();
}

async function post(path: string, body: object) {
  const headers = await authHeaders();
  const res = await fetch(buildUrl(path), { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await safeError(res));
  return res.json();
}

async function patch(path: string, body: object = {}) {
  const headers = await authHeaders();
  const res = await fetch(buildUrl(path), { method: "PATCH", headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await safeError(res));
  return res.json();
}

async function del(path: string, body?: object) {
  const headers = await authHeaders();
  const res = await fetch(buildUrl(path), {
    method: "DELETE", headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) throw new Error(await safeError(res));
  return res.json();
}

export interface SocialUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  isPremium?: boolean;
  collectionVisible?: boolean;
}

export interface FriendsData {
  friends: SocialUser[];
  pendingReceived: SocialUser[];
  pendingSent: SocialUser[];
}

export interface InboxMessage {
  id: string;
  subject: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  senderId: string;
  senderUsername: string;
  senderDisplayName: string;
  senderAvatarUrl?: string | null;
}

export interface SentMessage {
  id: string;
  subject: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  recipientId: string;
  recipientUsername: string;
  recipientDisplayName: string;
  recipientAvatarUrl?: string | null;
}

export interface AdminReport {
  id: string;
  contentType: string;
  contentId: string;
  reason: string;
  contentSnapshot: string | null;
  status: string;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  reporterUsername: string;
  reporterDisplayName: string;
  reportedUserUsername: string | null;
  reportedUserDisplayName: string | null;
  reviewedByUsername: string | null;
}

export interface ChatroomMessage {
  id: string;
  senderId: string;
  senderUsername: string;
  senderDisplayName: string;
  senderAvatarUrl?: string | null;
  body: string;
  createdAt: string;
}

export const socialApi = {
  getFriends: (): Promise<FriendsData> => get("api/social/friends"),
  sendFriendRequest: (targetUserId: string) => post("api/social/friend-request", { targetUserId }),
  respondToFriend: (requesterId: string, action: "accept" | "decline") =>
    post("api/social/friend-respond", { requesterId, action }),
  removeFriend: (friendId: string) => del("api/social/friend-remove", { friendId }),
  searchUsers: (q: string): Promise<{ users: SocialUser[] }> => get(`api/social/user-search?q=${encodeURIComponent(q)}`),

  getInbox: (): Promise<{ messages: InboxMessage[] }> => get("api/social/messages/inbox"),
  getSent: (): Promise<{ messages: SentMessage[] }> => get("api/social/messages/sent"),
  getUnreadCount: (): Promise<{ count: number }> => get("api/social/messages/unread-count"),
  sendMessage: (recipientId: string, subject: string, body: string) =>
    post("api/social/messages/send", { recipientId, subject, body }),
  markRead: (id: string) => patch(`api/social/messages/${id}/read`),
  deleteMessage: (id: string) => del(`api/social/messages/${id}`),

  submitReport: (
    contentType: "message" | "listing",
    contentId: string,
    reason: string,
    contentSnapshot?: object | null,
    reportedUserId?: string | null
  ) => post("api/social/report", { contentType, contentId, reason, contentSnapshot, reportedUserId }),

  getAdminReports: (): Promise<{ reports: AdminReport[] }> => get("api/admin/reports"),
  updateReport: (id: string, status: "reviewed" | "dismissed", reviewNote?: string) =>
    patch(`api/admin/reports/${id}`, { status, reviewNote }),

  getFriendCollection: (userId: string): Promise<{ collection: any[]; owner: SocialUser }> =>
    get(`api/collection/user/${userId}`),
  setCollectionVisibility: (visible: boolean) =>
    patch("api/user/collection-visible", { visible }),

  getChatroomMessages: (): Promise<{ messages: ChatroomMessage[] }> => get("api/chatroom/messages"),
  sendChatroomMessage: (body: string): Promise<{ message: ChatroomMessage }> =>
    post("api/chatroom/messages", { body }),
  deleteChatroomMessage: (id: string) => del(`api/chatroom/messages/${id}`),
  muteChatUser: (userId: string, minutes: number) => post("api/chatroom/mute", { userId, minutes }),
  unmuteChatUser: (userId: string) => post("api/chatroom/unmute", { userId }),
  banChatUser: (userId: string, minutes: number) => post("api/chatroom/ban", { userId, minutes }),
  unbanChatUser: (userId: string) => post("api/chatroom/unban", { userId }),
};
